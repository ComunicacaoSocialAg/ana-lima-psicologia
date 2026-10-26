import { encryptArchive } from "./lib/recovery.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import { timingSafeEqual, createHmac } from "node:crypto";
import {
  policy,
  preview,
  sha,
  cents,
  date,
  providerStatus,
  validTaxId,
} from "./lib/billing.mjs";
initializeApp();
const db = getFirestore();
const OWNER = "psHLxoIeGfRNqQSwTbPUVxFCU8H2";
const API = defineSecret("ASAAS_API_KEY");
const HOOK = defineSecret("ASAAS_WEBHOOK_TOKEN");
const INTAKE = defineSecret("INTAKE_RATE_SALT");
const BACKUP = defineSecret("CLINICAL_BACKUP_PASSPHRASE");
const ENV = defineString("ASAAS_ENVIRONMENT", { default: "production" });
const LIVE = defineString("ASAAS_PRODUCTION_ENABLED", { default: "true" });
const BUCKET = defineString("CLINICAL_BACKUP_BUCKET", { default: "" });
const region = "southamerica-east1";
const options = { region, enforceAppCheck: true, maxInstances: 5 };
const root = () => db.collection("users").doc(OWNER);
const now = () => new Date().toISOString();
const day = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function auth(req, recent = false) {
  if (req.auth?.uid !== OWNER)
    throw new HttpsError("permission-denied", "Acesso restrito.");
  if (
    recent &&
    (!Number.isFinite(Number(req.auth.token?.auth_time)) ||
      Date.now() / 1000 - Number(req.auth.token.auth_time) > 900)
  )
    throw new HttpsError("unauthenticated", "Confirme sua conta novamente.");
}
function id(s) {
  if (typeof s !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(s))
    throw new HttpsError("invalid-argument", "Identificador inválido.");
  return s;
}
function environment() {
  const e = ENV.value();
  if (!["sandbox", "production"].includes(e)) throw Error("Ambiente inválido.");
  if (e === "production" && LIVE.value() !== "true")
    throw new HttpsError(
      "failed-precondition",
      "Emissão em produção ainda não liberada.",
    );
  return e;
}
class ProviderError extends Error {
  constructor(definitive) {
    super("Falha na comunicação com Asaas.");
    this.definitive = definitive;
  }
}
async function asaas(path, { method = "GET", body } = {}) {
  const e = environment();
  const token = API.value();
  if (!token)
    throw new HttpsError(
      "failed-precondition",
      "Credencial Asaas não configurada.",
    );
  let response;
  try {
    response = await fetch(
      `https://${e === "sandbox" ? "api-sandbox" : "api"}.asaas.com/v3${path}`,
      {
        method,
        headers: {
          access_token: token,
          "Content-Type": "application/json",
          "User-Agent": "AnaLimaBilling/3",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch {
    throw new ProviderError(false);
  }
  if (!response.ok)
    throw new ProviderError(
      response.status >= 400 &&
        response.status < 500 &&
        ![408, 409, 429].includes(response.status),
    );
  if (response.status === 204) return {};
  return response.json();
}
const read = async (reader, ref) =>
  reader === db ? ref.get() : reader.get(ref);
async function domain(reader, patientId, month) {
  const pRef = root().collection("patients").doc(id(patientId));
  const [p, pol, s, pay] = await Promise.all([
    read(reader, pRef),
    read(reader, root().collection("billingPolicies").doc(patientId)),
    read(
      reader,
      root().collection("sessions").where("patientId", "==", patientId),
    ),
    read(
      reader,
      root().collection("payments").where("patientId", "==", patientId),
    ),
  ]);
  if (!p.exists || !pol.exists)
    throw new HttpsError(
      "failed-precondition",
      "Configure o paciente e sua modalidade de cobrança.",
    );
  return {
    patient: { ...p.data(), id: p.id },
    policy: pol.data(),
    sessions: s.docs.map((d) => ({ ...d.data(), id: d.id })),
    payments: pay.docs.map((d) => ({ ...d.data(), id: d.id })),
    month,
    today: day(),
  };
}
async function audit(action, chargeId) {
  await root()
    .collection("audit_logs")
    .add({ action, chargeId, timestamp: now(), userId: OWNER });
}
export const saveBillingPolicy = onCall(options, async (req) => {
  auth(req);
  const patientId = id(req.data?.patientId);
  let p;
  try {
    p = policy(req.data?.policy);
  } catch (e) {
    throw new HttpsError("invalid-argument", e.message);
  }
  const patient = await root().collection("patients").doc(patientId).get();
  if (!patient.exists)
    throw new HttpsError("not-found", "Paciente não encontrado.");
  if (patient.data().isMinor && p.payer !== "guardian")
    throw new HttpsError(
      "failed-precondition",
      "Selecione o responsável como pagador.",
    );
  const ref = root().collection("billingPolicies").doc(patientId);
  await db.runTransaction(async (t) => {
    const old = await t.get(ref);
    t.set(ref, {
      ...p,
      version: (old.data()?.version || 0) + 1,
      updatedAt: now(),
      patientId,
    });
    if (["per_session", "monthly"].includes(p.mode))
      t.set(
        root().collection("patients").doc(patientId),
        { agreedPrice: p.priceCents / 100 },
        { merge: true },
      );
  });
  await audit("billing_policy_saved", patientId);
  return { ok: true };
});
export const exportBillingArchive = onCall(options, async (req) => {
  auth(req, true);
  const data = {};
  for (const name of [
    "billingPolicies",
    "charges",
    "billingClaims",
    "billingPeriods",
    "legacyCoverage",
    "asaasCustomers",
  ]) {
    const snapshot = await root().collection(name).get();
    data[name] = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
  }
  return data;
});
export const previewBilling = onCall(options, async (req) => {
  auth(req);
  const d = await domain(db, id(req.data?.patientId), req.data?.month);
  return { ...preview(d), policy: d.policy };
});
async function reserve(patientId, month, wantedHash, automatic = false) {
  return db.runTransaction(async (t) => {
    const d = await domain(t, patientId, month);
    if (automatic && (!d.policy.automatic || d.patient.status !== "active"))
      return null;
    const result = preview(d);
    const draft = result.drafts.find((x) => x.previewHash === wantedHash);
    if (!draft)
      throw new HttpsError(
        "failed-precondition",
        "A prévia mudou. Recarregue os valores antes de emitir.",
      );
    if (automatic && d.policy.mode === "plan" && draft.sessionIds.length !== 4)
      return null;
    const env = environment();
    const chargeId = `${env}_${draft.id}`;
    const ref = root().collection("charges").doc(chargeId);
    const period = root()
      .collection("billingPeriods")
      .doc(sha(`${patientId}:${month}`));
    const existing = await t.get(ref);
    if (existing.exists) {
      const old = existing.data();
      if (
        old.amountCents !== draft.amountCents ||
        sha(old.sessionIds) !== sha(draft.sessionIds)
      )
        t.update(ref, {
          needsReview: true,
          reviewReason: "coverage_or_value_changed",
          updatedAt: now(),
        });
      return { id: chargeId, ...old };
    }
    const periodSnap = await t.get(period);
    if (
      periodSnap.exists &&
      (periodSnap.data().mode !== draft.mode ||
        periodSnap.data().environment !== env)
    )
      throw new HttpsError(
        "failed-precondition",
        "Período já vinculado a outra modalidade/ambiente. Revisão necessária.",
      );
    const claimRefs = draft.sessionIds.map((s) =>
      root().collection("billingClaims").doc(s),
    );
    const paymentClaims = draft.legacyPaymentIds.map((p) =>
      root().collection("legacyCoverage").doc(p),
    );
    for (const claim of [...claimRefs, ...paymentClaims]) {
      if ((await t.get(claim)).exists)
        throw new HttpsError(
          "already-exists",
          "Sessão ou lançamento já coberto por outra cobrança.",
        );
    }
    const charge = {
      ...draft,
      id: chargeId,
      patientName: d.patient.name,
      environment: env,
      status: "reserved",
      createdAt: now(),
      updatedAt: now(),
      policySnapshot: d.policy,
      automatic,
      needsReview: result.review.length > 0,
      reviewMessages: result.review,
    };
    t.create(ref, charge);
    t.set(
      period,
      {
        mode: draft.mode,
        environment: env,
        chargeId: charge.mode === "per_session" ? null : chargeId,
        month,
        patientId,
      },
      { merge: true },
    );
    for (const claim of [...claimRefs, ...paymentClaims])
      t.create(claim, { chargeId, patientId, createdAt: now() });
    return { id: chargeId, ...charge };
  });
}
async function customer(charge) {
  const ref = root()
    .collection("asaasCustomers")
    .doc(
      `${charge.environment}_${charge.patientId}_${charge.policySnapshot.payer}`,
    );
  const saved = await ref.get();
  if (saved.data()?.asaasId) return saved.data().asaasId;
  const p = (
    await root().collection("patients").doc(charge.patientId).get()
  ).data();
  if (!p) throw new HttpsError("failed-precondition", "Paciente indisponível.");
  const guardian = typeof p.legalGuardian === "object" ? p.legalGuardian : {};
  const payer =
    charge.policySnapshot.payer === "guardian"
      ? {
          name: guardian.name || p.guardianName,
          cpf: guardian.cpf || p.guardianCpf,
          phone: guardian.phone || p.guardianPhone,
        }
      : p;
  const cpf = String(payer.cpf || "").replace(/\D/g, "");
  if (!payer.name || !validTaxId(cpf))
    throw new HttpsError(
      "failed-precondition",
      "Confira nome e CPF/CNPJ do pagador antes da cobrança.",
    );
  const reference = `ana-${charge.environment}-${charge.patientId}-${charge.policySnapshot.payer}`;
  const found = await asaas(
    "/customers?externalReference=" + encodeURIComponent(reference),
  );
  if (found.data?.length > 1)
    throw new HttpsError(
      "failed-precondition",
      "Pagador duplicado no Asaas. Concilie antes de emitir.",
    );
  let c = found.data?.[0];
  if (!c) {
    const mayCreate = await db.runTransaction(async (t) => {
      const current = await t.get(ref);
      if (current.exists && current.data().status !== "rejected") return false;
      t.set(ref, { status: "creating", createdAt: now() });
      return true;
    });
    if (!mayCreate)
      throw new HttpsError(
        "failed-precondition",
        "Cadastro do pagador pendente de conciliação.",
      );
    try {
      c = await asaas("/customers", {
        method: "POST",
        body: {
          name: payer.name,
          cpfCnpj: cpf,
          mobilePhone: String(payer.phone || "").replace(/\D/g, ""),
          notificationDisabled: true,
          externalReference: reference,
        },
      });
    } catch (error) {
      if (error instanceof ProviderError && error.definitive)
        await ref.set({ status: "rejected", updatedAt: now() });
      throw error;
    }
  }

  if (!c.id) throw Error("Resposta inválida do Asaas.");
  await ref.set({
    asaasId: c.id,
    environment: charge.environment,
    createdAt: now(),
  });
  return c.id;
}
function invoiceUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" &&
      (u.hostname === "asaas.com" || u.hostname.endsWith(".asaas.com"))
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
async function attach(chargeId, payment) {
  const ref = root().collection("charges").doc(chargeId);
  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw Error("Cobrança interna inexistente.");
    const c = snap.data();
    if (
      !c.asaasCustomerId ||
      payment.externalReference !== chargeId ||
      Math.round(payment.value * 100) !== c.amountCents ||
      (c.asaasCustomerId && payment.customer !== c.asaasCustomerId)
    )
      throw Error("Divergência de conciliação.");
    let status = payment.deleted ? "canceled" : providerStatus(payment.status);
    const ranks = { pending: 0, overdue: 0, confirmed: 1, received: 2 };
    if ((ranks[c.status] ?? -1) > (ranks[status] ?? -1) && status in ranks)
      status = c.status;
    if (
      ["refunded", "refund_pending", "disputed"].includes(c.status) &&
      status in ranks
    )
      status = c.status;
    const refundCents = (payment.refunds || [])
      .filter((r) => r.status === "DONE")
      .reduce((sum, r) => sum + Math.round(Number(r.value) * 100), 0);
    if (refundCents > 0 && refundCents < c.amountCents)
      status = "partially_refunded";
    const data = {
      providerId: payment.id,
      status,
      refundCents,
      providerStatus: payment.status,
      invoiceUrl: invoiceUrl(payment.invoiceUrl),
      paidAt: payment.paymentDate || payment.clientPaymentDate || null,
      availableAt: payment.creditDate || null,
      netCents:
        typeof payment.netValue === "number"
          ? Math.round(payment.netValue * 100)
          : null,
      updatedAt: now(),
    };
    t.update(ref, data);
  });
}
async function issue(chargeId) {
  const ref = root().collection("charges").doc(chargeId);
  const snap = await ref.get();
  if (!snap.exists) throw Error("Cobrança não encontrada.");
  const c = { id: chargeId, ...snap.data() };
  if (c.providerId) return c;
  if (c.environment !== environment())
    throw new HttpsError(
      "failed-precondition",
      "Ambiente da cobrança diferente do backend.",
    );
  // Once a POST has been attempted, only reconcile. Never blindly retry an ambiguous request.
  if (c.status !== "reserved") return reconcile(chargeId);
  const lease = await db.runTransaction(async (t) => {
    const latest = await t.get(ref);
    if (latest.data().status !== "reserved") return false;
    t.update(ref, { status: "issuing", updatedAt: now() });
    return true;
  });
  if (!lease) return { id: chargeId, status: "issuing" };
  try {
    const customerId = await customer(c);
    await ref.update({ asaasCustomerId: customerId });
    const existing = await asaas(
      "/payments?externalReference=" + encodeURIComponent(chargeId),
    );
    if (existing.data?.length > 1)
      throw Error("Cobranças externas duplicadas.");
    let payment = existing.data?.[0];
    if (!payment) {
      await ref.update({ postAttemptedAt: now() });
      payment = await asaas("/payments", {
        method: "POST",
        body: {
          customer: customerId,
          billingType: c.billingType,
          value: c.amountCents / 100,
          dueDate: c.dueDate,
          description: "Serviços profissionais — " + c.month,
          externalReference: chargeId,
          postalService: false,
        },
      });
    }
    await attach(chargeId, payment);
    if (c.billingType === "PIX" && payment.id) {
      try {
        const qr = await asaas(
          "/payments/" + encodeURIComponent(payment.id) + "/pixQrCode",
        );
        if (qr?.payload) {
          await ref.update({
            pixPayload: qr.payload,
            pixEncodedImage: qr.encodedImage,
            pixExpirationDate: qr.expirationDate || null,
          });
        }
      } catch {
        // Non-fatal: QR code can still be retrieved on demand via getPixQrCode
      }
    }
    await audit("charge_issued", chargeId);
    return { id: chargeId, ...(await ref.get()).data() };
  } catch (e) {
    await ref.update({
      status: "review",
      lastErrorCode:
        e instanceof ProviderError
          ? e.definitive
            ? "provider_rejected"
            : "provider_uncertain"
          : "configuration_or_reconciliation",
      updatedAt: now(),
    });
    throw new HttpsError(
      "failed-precondition",
      "Emissão não confirmada. Use Conciliar antes de qualquer nova tentativa.",
    );
  }
}
async function reconcile(chargeId) {
  const ref = root().collection("charges").doc(id(chargeId));
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Cobrança inexistente.");
  const c = snap.data();
  if (c.environment !== environment())
    throw new HttpsError(
      "failed-precondition",
      "Selecione o ambiente da cobrança.",
    );
  const result = c.providerId
    ? { data: [await asaas("/payments/" + encodeURIComponent(c.providerId))] }
    : await asaas(
        "/payments?externalReference=" + encodeURIComponent(chargeId),
      );
  if (result.data?.length === 1) await attach(chargeId, result.data[0]);
  else if (result.data?.length > 1)
    throw new HttpsError(
      "failed-precondition",
      "Duplicidade externa: revisão necessária.",
    );
  return { id: chargeId, ...(await ref.get()).data() };
}
export const issueBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req, true);
    const c = await reserve(
      id(req.data?.patientId),
      req.data?.month,
      req.data?.previewHash,
    );
    return issue(c.id);
  },
);
export const reconcileBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req);
    return reconcile(id(req.data?.chargeId));
  },
);
export const getPixQrCode = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req);
    const chargeId = id(req.data?.chargeId);
    const ref = root().collection("charges").doc(chargeId);
    const snap = await ref.get();
    if (!snap.exists)
      throw new HttpsError("not-found", "Cobrança não encontrada.");
    const c = snap.data();
    if (!c.providerId)
      throw new HttpsError(
        "failed-precondition",
        "Cobrança ainda não emitida no Asaas.",
      );
    try {
      const qr = await asaas(
        "/payments/" + encodeURIComponent(c.providerId) + "/pixQrCode",
      );
      if (qr?.payload) {
        await ref.update({
          pixPayload: qr.payload,
          pixEncodedImage: qr.encodedImage,
          pixExpirationDate: qr.expirationDate || null,
          updatedAt: now(),
        });
      }
      return qr;
    } catch {
      throw new HttpsError(
        "unavailable",
        "Não foi possível obter o QR Code Pix no momento.",
      );
    }
  },
);
export const socialBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req, true);
    const patientId = id(req.data?.patientId);
    const policySnap = await root()
      .collection("billingPolicies")
      .doc(patientId)
      .get();
    if (policySnap.data()?.mode !== "social")
      throw new HttpsError(
        "failed-precondition",
        "Modalidade social não configurada.",
      );
    let amountCents, dueDate;
    try {
      amountCents = cents(req.data.amountCents);
      dueDate = date(req.data.dueDate);
      if (dueDate < day()) throw Error("Vencimento passado.");
    } catch (e) {
      throw new HttpsError("invalid-argument", e.message);
    }
    const sessionIds = [...new Set(req.data.sessionIds || [])].map(id);
    if (!sessionIds.length || sessionIds.length > 30)
      throw new HttpsError(
        "invalid-argument",
        "Selecione de uma a 30 sessões cobráveis.",
      );
    const operation = id(req.data.operationId);
    const chargeId = `${environment()}_social_${sha(operation)}`;
    const ref = root().collection("charges").doc(chargeId);
    await db.runTransaction(async (t) => {
      const existing = await t.get(ref);
      if (existing.exists) {
        const old = existing.data();
        if (
          old.amountCents !== amountCents ||
          old.patientId !== patientId ||
          old.dueDate !== dueDate ||
          sha(old.sessionIds) !== sha(sessionIds)
        )
          throw new HttpsError(
            "failed-precondition",
            "Operação já usada com outros valores.",
          );
        return;
      }
      const p = await t.get(root().collection("patients").doc(patientId));
      if (!p.exists) throw new HttpsError("not-found", "Paciente inexistente.");
      const claims = sessionIds.map((s) =>
        root().collection("billingClaims").doc(s),
      );
      const socialPeriods = new Map();
      for (let n = 0; n < sessionIds.length; n++) {
        const session = await t.get(
          root().collection("sessions").doc(sessionIds[n]),
        );
        if (
          !session.exists ||
          session.data().patientId !== patientId ||
          !["completed", "missed_chargeable"].includes(session.data().status) ||
          session.data().date > day()
        )
          throw new HttpsError("failed-precondition", "Sessão não cobrável.");
        const period = root()
          .collection("billingPeriods")
          .doc(sha(`${patientId}:${session.data().date.slice(0, 7)}`));
        const ps = await t.get(period);
        if (ps.exists && ps.data().mode !== "social")
          throw new HttpsError(
            "failed-precondition",
            "Período coberto por outra modalidade.",
          );
        socialPeriods.set(period.path, period);
        if ((await t.get(claims[n])).exists)
          throw new HttpsError("already-exists", "Sessão já coberta.");
      }
      const pay = await t.get(
        root().collection("payments").where("patientId", "==", patientId),
      );
      if (
        pay.docs.some(
          (d) =>
            d.data().status === "paid" &&
            sessionIds.includes(d.data().sessionId),
        )
      )
        throw new HttpsError(
          "failed-precondition",
          "Existe sessão paga neste conjunto.",
        );
      const legacy = pay.docs
        .filter(
          (d) =>
            d.data().status === "pending" &&
            sessionIds.includes(d.data().sessionId),
        )
        .map((d) => d.id);
      for (const pid of legacy)
        if ((await t.get(root().collection("legacyCoverage").doc(pid))).exists)
          throw new HttpsError("already-exists", "Lançamento já vinculado.");
      t.create(ref, {
        patientId,
        patientName: p.data().name,
        amountCents,
        dueDate,
        billingType: policySnap.data().billingType,
        policySnapshot: policySnap.data(),
        mode: "social",
        month: dueDate.slice(0, 7),
        sessionIds,
        legacyPaymentIds: legacy,
        status: "reserved",
        environment: environment(),
        createdAt: now(),
      });
      for (const period of socialPeriods.values())
        t.set(
          period,
          { patientId, mode: "social", environment: environment() },
          { merge: true },
        );
      for (const claim of claims)
        t.create(claim, { chargeId, patientId, createdAt: now() });
      for (const pid of legacy)
        t.create(root().collection("legacyCoverage").doc(pid), {
          chargeId,
          patientId,
          createdAt: now(),
        });
    });
    return issue(chargeId);
  },
);
export const cancelBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req, true);
    const chargeId = id(req.data?.chargeId);
    const current = await reconcile(chargeId);
    if (!current.providerId || !["pending", "overdue"].includes(current.status))
      throw new HttpsError(
        "failed-precondition",
        "Somente cobranças não pagas podem ser canceladas.",
      );
    try {
      await asaas("/payments/" + encodeURIComponent(current.providerId), {
        method: "DELETE",
      });
    } catch {
      throw new HttpsError(
        "unavailable",
        "Cancelamento incerto. Concilie antes de tentar novamente.",
      );
    }
    await root()
      .collection("charges")
      .doc(chargeId)
      .update({ status: "canceled", canceledAt: now(), updatedAt: now() });
    await audit("charge_canceled", chargeId);
    return { ok: true };
  },
);
export const refundBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req, true);
    const chargeId = id(req.data?.chargeId);
    const c = await reconcile(chargeId);
    if (!["confirmed", "received"].includes(c.status))
      throw new HttpsError(
        "failed-precondition",
        "Cobrança não elegível para estorno.",
      );
    const ref = root().collection("charges").doc(chargeId);
    await db.runTransaction(async (t) => {
      const s = await t.get(ref);
      if (s.data().refundAttemptedAt)
        throw new HttpsError(
          "already-exists",
          "Estorno já solicitado. Concilie.",
        );
      t.update(ref, { refundAttemptedAt: now(), status: "refund_pending" });
    });
    try {
      await asaas("/payments/" + encodeURIComponent(c.providerId) + "/refund", {
        method: "POST",
        body: { value: c.amountCents / 100 },
      });
      await audit("charge_refund_requested", chargeId);
      return { ok: true };
    } catch {
      throw new HttpsError(
        "unavailable",
        "Estorno não confirmado. Consulte o Asaas e concilie; não repita a operação.",
      );
    }
  },
);
export const asaasWebhook = onRequest(
  { region, secrets: [HOOK], maxInstances: 5 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.sendStatus(405);
      return;
    }
    if (req.rawBody?.length > 65536) {
      res.sendStatus(413);
      return;
    }
    const expected = HOOK.value();
    const actual = req.get("asaas-access-token") || "";
    if (
      expected.length < 32 ||
      Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    ) {
      res.sendStatus(401);
      return;
    }
    const event = req.body;
    if (
      !event ||
      typeof event.id !== "string" ||
      event.id.length > 200 ||
      typeof event.payment?.id !== "string" ||
      event.payment.id.length > 120
    ) {
      res.sendStatus(400);
      return;
    }
    const ref = db.collection("asaasWebhookInbox").doc(sha(event.id));
    try {
      await ref.create({
        eventId: event.id,
        paymentId: event.payment.id,
        eventType: String(event.event).slice(0, 80),
        receivedAt: now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 90 * 86400000),
        processed: false,
      });
    } catch (e) {
      if (e.code !== 6) {
        res.sendStatus(503);
        return;
      }
    }
    res.sendStatus(200);
  },
);
export const processAsaasEvent = onDocumentCreated(
  {
    document: "asaasWebhookInbox/{eventId}",
    region,
    secrets: [API],
    retry: true,
  },
  async (event) => {
    const ref = event.data.ref;
    const saved = (await ref.get()).data();
    if (saved.processed) return;
    const p = await asaas("/payments/" + encodeURIComponent(saved.paymentId));
    const chargeId = p.externalReference;
    if (
      typeof chargeId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,120}$/.test(chargeId)
    ) {
      await ref.update({ processed: true, ignored: true });
      return;
    }
    const charge = await root().collection("charges").doc(chargeId).get();
    if (!charge.exists) {
      await ref.update({ processed: true, ignored: true });
      return;
    }
    await attach(chargeId, p);
    await ref.update({ processed: true, processedAt: now() });
  },
);
export const submitIntake = onCall(
  { ...options, secrets: [INTAKE] },
  async (req) => {
    const data = req.data || {};
    const allowed = [
      "name",
      "phone",
      "preferredModality",
      "preferredShift",
      "isMinor",
      "consent",
      "noticeVersion",
    ];
    if (
      Object.keys(data).some((k) => !allowed.includes(k)) ||
      typeof data.name !== "string" ||
      data.name.trim().length < 2 ||
      data.name.length > 120 ||
      typeof data.phone !== "string" ||
      !/^\+?[\d\s()-]{10,20}$/.test(data.phone) ||
      !["presencial", "online"].includes(data.preferredModality) ||
      !["Manhã", "Tarde", "Noite", "A combinar"].includes(
        data.preferredShift,
      ) ||
      typeof data.isMinor !== "boolean" ||
      data.consent !== true ||
      data.noticeVersion !== "2026-10-23-v2"
    )
      throw new HttpsError("invalid-argument", "Confira os dados de contato.");
    const salt = INTAKE.value();
    if (salt.length < 32)
      throw new HttpsError(
        "failed-precondition",
        "Proteção do formulário indisponível.",
      );
    const rateId = createHmac("sha256", salt)
      .update((req.rawRequest.ip || "unknown") + day())
      .digest("hex");
    const rate = db.collection("intakeRateLimits").doc(rateId);
    const intake = db.collection("public_intakes").doc();
    await db.runTransaction(async (t) => {
      const n = await t.get(rate);
      if ((n.data()?.count || 0) >= 5)
        throw new HttpsError(
          "resource-exhausted",
          "Limite de solicitações atingido. Contate a clínica.",
        );
      t.set(rate, {
        count: (n.data()?.count || 0) + 1,
        expiresAt: Timestamp.fromMillis(Date.now() + 172800000),
      });
      t.create(intake, {
        id: intake.id,
        name: data.name.trim(),
        phone: data.phone.replace(/\D/g, ""),
        status: "waiting_list",
        isPreRegistration: true,
        isMinor: data.isMinor,
        preferredModality: data.preferredModality,
        agreedPrice: 0,
        startDate: day(),
        createdAt: now(),
        updatedAt: now(),
        preRegistrationData: {
          consentLgpd: true,
          noticeVersion: data.noticeVersion,
          submittedAt: now(),
          preferredShift: data.preferredShift,
        },
      });
    });
    return { received: true };
  },
);
export const dailyBilling = onSchedule(
  {
    schedule: "15 9 * * *",
    timeZone: "America/Sao_Paulo",
    region,
    secrets: [API],
    maxInstances: 1,
  },
  async () => {
    const policies = await root()
      .collection("billingPolicies")
      .where("automatic", "==", true)
      .get();
    const today = day();
    const previous = new Date(today.slice(0, 7) + "-01T12:00:00Z");
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    for (const doc of policies.docs) {
      const p = doc.data();
      if (p.mode === "social") continue;
      const months =
        p.mode === "monthly"
          ? [previous.toISOString().slice(0, 7)]
          : [previous.toISOString().slice(0, 7), today.slice(0, 7)];
      for (const month of months) {
        try {
          const result = preview(await domain(db, doc.id, month));
          if (result.review.length)
            await root()
              .collection("billingAlerts")
              .doc(sha(doc.id + month))
              .set({
                patientId: doc.id,
                month,
                reason: "review_required",
                updatedAt: now(),
              });
          for (const draft of result.drafts) {
            const c = await reserve(doc.id, month, draft.previewHash, true);
            if (c) await issue(c.id);
          }
        } catch {
          await root()
            .collection("billingAlerts")
            .doc(sha(doc.id + month))
            .set({
              patientId: doc.id,
              month,
              reason: "review_required",
              updatedAt: now(),
            });
        }
      }
    }
  },
);
export const encryptedClinicalBackup = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "America/Sao_Paulo",
    region,
    secrets: [BACKUP],
    maxInstances: 1,
  },
  async () => {
    const pass = BACKUP.value();
    const bucket = BUCKET.value();
    if (pass.length < 20 || !bucket) throw Error("Backup não configurado.");
    const names = [
      "patients",
      "sessions",
      "records",
      "anamnesis",
      "assessments",
      "payments",
      "settings",
      "audit_logs",
      "billingPolicies",
      "charges",
      "billingClaims",
      "billingPeriods",
      "legacyCoverage",
      "asaasCustomers",
    ];
    const data = {};
    for (const name of names) {
      const snap = await root().collection(name).get();
      data[name] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    }
    if (!data.patients.length && !data.records.length)
      throw Error("Backup vazio recusado. Verifique origem e permissões.");
    const envelope = encryptArchive(
      { schema: 3, exportedAt: now(), data },
      pass,
    );
    const target = getStorage().bucket(bucket);
    const stamp = now().replace(/[:.]/g, "-");
    await target
      .file("daily/" + stamp + ".enc.json")
      .save(JSON.stringify(envelope), {
        resumable: false,
        contentType: "application/json",
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    const d = new Date();
    if (d.getUTCDay() === 0)
      await target
        .file("weekly/" + stamp + ".enc.json")
        .save(JSON.stringify(envelope), { resumable: false });
    if (d.getUTCDate() === 1)
      await target
        .file("monthly/" + stamp + ".enc.json")
        .save(JSON.stringify(envelope), { resumable: false });
    await root()
      .collection("backupRuns")
      .add({
        createdAt: now(),
        counts: Object.fromEntries(names.map((n) => [n, data[n].length])),
        status: "stored",
        schema: 3,
      });
  },
);
// Explicit retry is allowed only when no payment POST occurred, or the provider definitively rejected it.
export const retryBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req, true);
    const chargeId = id(req.data?.chargeId);
    const c = await reconcile(chargeId);
    if (c.providerId) return c;
    if (c.postAttemptedAt && c.lastErrorCode !== "provider_rejected")
      throw new HttpsError(
        "failed-precondition",
        "Resposta externa incerta. Concilie com o Asaas; uma segunda emissão está bloqueada.",
      );
    const ref = root().collection("charges").doc(chargeId);
    await db.runTransaction(async (t) => {
      const latest = await t.get(ref);
      const current = latest.data();
      if (current.providerId)
        throw new HttpsError("already-exists", "Cobrança já emitida.");
      if (current.status !== "review")
        throw new HttpsError(
          "failed-precondition",
          "Emissão em andamento. Concilie antes de tentar novamente.",
        );
      if (
        current.postAttemptedAt &&
        current.lastErrorCode !== "provider_rejected"
      )
        throw new HttpsError(
          "failed-precondition",
          "Resposta externa incerta. Concilie com o Asaas.",
        );
      t.update(ref, { status: "reserved", retryApprovedAt: now() });
    });
    return issue(chargeId);
  },
);
export const reissueBilling = onCall(
  { ...options, secrets: [API] },
  async (req) => {
    auth(req, true);
    const oldId = id(req.data?.chargeId);
    const operation = id(req.data?.operationId);
    let dueDate;
    try {
      dueDate = date(req.data?.dueDate);
      if (dueDate < day()) throw Error();
    } catch {
      throw new HttpsError("invalid-argument", "Informe um vencimento válido.");
    }
    const newId = `${environment()}_reissue_${sha(operation)}`;
    const oldRef = root().collection("charges").doc(oldId),
      newRef = root().collection("charges").doc(newId);
    await db.runTransaction(async (t) => {
      const [old, existing] = await Promise.all([t.get(oldRef), t.get(newRef)]);
      if (existing.exists) {
        if (
          existing.data().previousChargeId !== oldId ||
          existing.data().dueDate !== dueDate
        )
          throw new HttpsError(
            "failed-precondition",
            "Identificador já utilizado.",
          );
        return;
      }
      const c = old.data();
      if (
        !c ||
        c.environment !== environment() ||
        c.status !== "canceled" ||
        !c.canceledAt ||
        c.reissuedAs
      )
        throw new HttpsError(
          "failed-precondition",
          "Somente cobrança com cancelamento confirmado pode ser reemitida.",
        );
      const claims = (c.sessionIds || [])
        .map((s) => root().collection("billingClaims").doc(s))
        .concat(
          (c.legacyPaymentIds || []).map((p) =>
            root().collection("legacyCoverage").doc(p),
          ),
        );
      for (const ref of claims) {
        const claim = await t.get(ref);
        if (claim.data()?.chargeId !== oldId)
          throw new HttpsError(
            "failed-precondition",
            "Cobertura alterada: revisão necessária.",
          );
      }
      const {
        providerId,
        providerStatus,
        invoiceUrl,
        paidAt,
        availableAt,
        netCents,
        postAttemptedAt,
        refundAttemptedAt,
        reissuedAs,
        canceledAt,
        ...base
      } = c;
      t.create(newRef, {
        ...base,
        id: newId,
        previousChargeId: oldId,
        dueDate,
        status: "reserved",
        createdAt: now(),
        updatedAt: now(),
      });
      t.update(oldRef, { reissuedAs: newId, updatedAt: now() });
      for (const ref of claims) t.update(ref, { chargeId: newId });
      const period = root()
        .collection("billingPeriods")
        .doc(sha(`${c.patientId}:${c.month}`));
      t.set(period, { chargeId: newId }, { merge: true });
    });
    await audit("charge_reissue_approved", newId);
    return issue(newId);
  },
);
