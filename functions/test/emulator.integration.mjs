import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.GCLOUD_PROJECT !== "demo-ana-lima-secure"
)
  throw Error("Integration tests require the isolated demo emulator.");
process.env.ASAAS_API_KEY = "synthetic-key";
process.env.ASAAS_ENVIRONMENT = "sandbox";
process.env.ASAAS_WEBHOOK_TOKEN =
  "synthetic-webhook-secret-at-least-32-characters";
process.env.INTAKE_RATE_SALT = "synthetic-rate-secret-at-least-32-characters";
const OWNER = "psHLxoIeGfRNqQSwTbPUVxFCU8H2";
let env, backend, admin;
let paymentPosts = 0,
  customerPosts = 0;
let refunds = 0;
let rejectPayment = false;
let ambiguous = false;
let currentStatus = "PENDING";
const customers = [];
const payments = [];
const request = (data, uid = OWNER) => ({
  data,
  auth: uid
    ? { uid, token: { auth_time: Math.floor(Date.now() / 1000) } }
    : undefined,
});
const response = (data) => ({ ok: true, status: 200, json: async () => data });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (raw, opts = {}) => {
  const u = new URL(raw);
  if (u.hostname === "127.0.0.1" || u.hostname === "localhost")
    return originalFetch(raw, opts);
  assert.equal(u.hostname, "api-sandbox.asaas.com");
  if (u.pathname === "/v3/customers" && (!opts.method || opts.method === "GET"))
    return response({
      data: customers.filter(
        (c) => c.externalReference === u.searchParams.get("externalReference"),
      ),
    });
  if (u.pathname === "/v3/customers" && opts.method === "POST") {
    customerPosts++;
    const body = JSON.parse(opts.body);
    assert.equal(body.notificationDisabled, true);
    assert.equal(body.notes, undefined);
    const c = { ...body, id: "cus_" + customers.length };
    customers.push(c);
    return response(c);
  }
  if (u.pathname === "/v3/payments" && opts.method === "POST") {
    paymentPosts++;
    if (rejectPayment) {
      rejectPayment = false;
      return { ok: false, status: 400 };
    }
    const body = JSON.parse(opts.body);
    assert.ok(!body.description.includes("Psicoterapia"));
    await new Promise((r) => setTimeout(r, 10));
    const p = {
      ...body,
      id: "pay_" + payments.length,
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/synthetic",
    };
    payments.push(p);
    if (ambiguous) {
      ambiguous = false;
      throw Error("Synthetic lost response after provider commit");
    }
    return response(p);
  }
  if (u.pathname === "/v3/payments")
    return response({
      data: payments.filter(
        (p) => p.externalReference === u.searchParams.get("externalReference"),
      ),
    });
  if (u.pathname.endsWith("/refund") && opts.method === "POST") {
    refunds++;
    currentStatus = "REFUNDED";
    return response({ status: "REFUNDED" });
  }
  if (u.pathname.endsWith("/pixQrCode")) {
    return response({
      encodedImage: "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6synthetic",
      payload: "00020126580014br.gov.bcb.pix0136syntheticpayload",
      expirationDate: "2026-12-31 23:59:59",
    });
  }
  if (u.pathname.startsWith("/v3/payments/")) {
    const p = payments.find((p) => p.id === u.pathname.split("/").pop());
    if (p) {
      if (opts.method === "DELETE") p.deleted = true;
      return response({ ...p, status: currentStatus });
    }
  }
  throw Error("Unexpected provider operation in test");
};
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ana-lima-secure",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile(
        new URL("../../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  backend = await import("../index.mjs");
  const { getFirestore } = await import("firebase-admin/firestore");
  admin = getFirestore();
  await env.clearFirestore();
  await originalFetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-ana-lima-recovery/databases/(default)/documents",
    { method: "DELETE" },
  );
});
after(async () => {
  await env?.cleanup();
  await admin?.terminate();
});
async function seed(pid = "p1", mode = "per_session") {
  await admin
    .doc(`users/${OWNER}/patients/${pid}`)
    .set({
      id: pid,
      name: "Synthetic person",
      cpf: "52998224725",
      phone: "31999999999",
      status: "active",
    });
  await admin
    .doc(`users/${OWNER}/sessions/s_${pid}`)
    .set({
      id: "s_" + pid,
      patientId: pid,
      date: "2026-09-10",
      startTime: "10:00",
      price: 200,
      status: "completed",
    });
  await backend.saveBillingPolicy.run(
    request({
      patientId: pid,
      policy: {
        mode,
        priceCents: 20000,
        dueDay: 5,
        effectiveFrom: "2026-09-01",
        billingType: "PIX",
        automatic: false,
      },
    }),
  );
}
test("rules reject anonymous/other users and direct public-intake writes", async () => {
  const anon = env.unauthenticatedContext().firestore(),
    other = env.authenticatedContext("not-owner").firestore();
  await assertFails(
    setDoc(doc(anon, "public_intakes", "spam"), {
      name: "Synthetic",
      phone: "31999999999",
    }),
  );
  await assertFails(getDoc(doc(other, `users/${OWNER}/patients/p1`)));
});
test("clinical, audit and server financial records cannot be erased or forged by the client", async () => {
  const owner = env.authenticatedContext(OWNER).firestore();
  const record = doc(owner, `users/${OWNER}/records/r1`);
  await assertSucceeds(
    setDoc(record, { version: 1, history: [], evolution: "Synthetic" }),
  );
  await assertFails(deleteDoc(record));
  const audit = doc(owner, `users/${OWNER}/audit_logs/a1`);
  await assertSucceeds(setDoc(audit, { action: "synthetic" }));
  await assertFails(updateDoc(audit, { action: "changed" }));
  await assertFails(deleteDoc(audit));
  for (const collection of [
    "charges",
    "billingPolicies",
    "billingClaims",
    "legacyCoverage",
    "asaasCustomers",
  ])
    await assertFails(
      setDoc(doc(owner, `users/${OWNER}/${collection}/forged`), { value: 1 }),
    );
});
test("backend authorization rejects missing auth and unrelated accounts", async () => {
  await assert.rejects(
    backend.previewBilling.run(
      request({ patientId: "p1", month: "2026-09" }, null),
    ),
    (e) => e.code === "permission-denied",
  );
  await assert.rejects(
    backend.saveBillingPolicy.run(request({ patientId: "p1" }, "other")),
    (e) => e.code === "permission-denied",
  );
});
test("two concurrent approvals create one provider payment and reserve the session once", async () => {
  await seed();
  const view = await backend.previewBilling.run(
    request({ patientId: "p1", month: "2026-09" }),
  );
  const input = {
    patientId: "p1",
    month: "2026-09",
    previewHash: view.drafts[0].previewHash,
  };
  const before = paymentPosts;
  const result = await Promise.allSettled([
    backend.issueBilling.run(request(input)),
    backend.issueBilling.run(request(input)),
  ]);
  assert.ok(result.some((r) => r.status === "fulfilled"));
  assert.equal(paymentPosts - before, 1);
  assert.equal(customerPosts, 1);
  const claim = await admin.doc(`users/${OWNER}/billingClaims/s_p1`).get();
  assert.ok(claim.exists);
  const owner = env.authenticatedContext(OWNER).firestore();
  await assertFails(
    updateDoc(doc(owner, `users/${OWNER}/sessions/s_p1`), { price: 1 }),
  );
  await assertSucceeds(
    updateDoc(doc(owner, `users/${OWNER}/sessions/s_p1`), { hasRecord: true }),
  );
});
test("a provider timeout after creation is reconciled without a second POST", async () => {
  await seed("timeout");
  const view = await backend.previewBilling.run(
    request({ patientId: "timeout", month: "2026-09" }),
  );
  const input = {
    patientId: "timeout",
    month: "2026-09",
    previewHash: view.drafts[0].previewHash,
  };
  const before = paymentPosts;
  ambiguous = true;
  await assert.rejects(backend.issueBilling.run(request(input)));
  const retry = await backend.issueBilling.run(request(input));
  assert.equal(paymentPosts - before, 1);
  assert.equal(retry.status, "pending");
  assert.ok(retry.providerId);
});
test("paid legacy data prevents duplicate billing and stale previews are rejected", async () => {
  await seed("stale");
  const view = await backend.previewBilling.run(
    request({ patientId: "stale", month: "2026-09" }),
  );
  await admin.doc(`users/${OWNER}/sessions/s_stale`).update({ price: 220 });
  await assert.rejects(
    backend.issueBilling.run(
      request({
        patientId: "stale",
        month: "2026-09",
        previewHash: view.drafts[0].previewHash,
      }),
    ),
    (e) => e.code === "failed-precondition",
  );
  await admin
    .doc(`users/${OWNER}/payments/legacy_paid`)
    .set({
      patientId: "stale",
      sessionId: "s_stale",
      status: "paid",
      amount: 220,
    });
  const paid = await backend.previewBilling.run(
    request({ patientId: "stale", month: "2026-09" }),
  );
  assert.equal(paid.drafts.length, 0);
});
test("webhook authentication and duplicate delivery: one inbox event, authoritative payment state", async () => {
  const payment = payments[0];
  const body = {
    id: "evt_synthetic",
    event: "PAYMENT_RECEIVED",
    payment: { id: payment.id },
  };
  const call = async (token) => {
    let status;
    await backend.asaasWebhook(
      { method: "POST", get: () => token, body },
      {
        sendStatus: (s) => {
          status = s;
        },
      },
    );
    return status;
  };
  assert.equal(await call("wrong"), 401);
  assert.equal(await call(process.env.ASAAS_WEBHOOK_TOKEN), 200);
  assert.equal(await call(process.env.ASAAS_WEBHOOK_TOKEN), 200);
  const inbox = await admin.collection("asaasWebhookInbox").get();
  assert.equal(inbox.size, 1);
  currentStatus = "RECEIVED";
  await backend.processAsaasEvent.run({ data: inbox.docs[0] });
  const charge = await admin
    .doc(`users/${OWNER}/charges/${payment.externalReference}`)
    .get();
  assert.equal(charge.data().status, "received");
  // A stale subsequent observation cannot downgrade received money to pending.
  currentStatus = "PENDING";
  await backend.reconcileBilling.run(
    request({ chargeId: payment.externalReference }),
  );
  assert.equal((await charge.ref.get()).data().status, "received");
});
test("social cannot infer automatic charges; manual amount and due date are mandatory", async () => {
  await seed("social", "social");
  const result = await backend.previewBilling.run(
    request({ patientId: "social", month: "2026-09" }),
  );
  assert.equal(result.drafts.length, 0);
  await assert.rejects(
    backend.socialBilling.run(
      request({
        patientId: "social",
        sessionIds: ["s_social"],
        operationId: "test",
      }),
    ),
  );
});
test("intake rejects health data and extra fields, keeps only minimized contact, rate limits", async () => {
  const data = {
    name: "Synthetic contact",
    phone: "31999999999",
    preferredModality: "online",
    preferredShift: "Tarde",
    isMinor: false,
    consent: true,
    noticeVersion: "2026-10-23-v2",
  };
  const call = (d) =>
    backend.submitIntake.run({ data: d, rawRequest: { ip: "127.0.0.123" } });
  await assert.rejects(
    call({ ...data, initialComplaint: "should never be accepted" }),
  );
  for (let n = 0; n < 5; n++) await call(data);
  await assert.rejects(call(data), (e) => e.code === "resource-exhausted");
  const rows = await admin.collection("public_intakes").get();
  assert.equal(rows.size, 5);
  assert.ok(
    rows.docs.every(
      (d) => !("cpf" in d.data()) && !("initialComplaint" in d.data()),
    ),
  );
});
test("cancellation/reissue transfers coverage once and full refund cannot repeat", async () => {
  currentStatus = "PENDING";
  await seed("cancel");
  const view = await backend.previewBilling.run(
    request({ patientId: "cancel", month: "2026-09" }),
  );
  const first = await backend.issueBilling.run(
    request({
      patientId: "cancel",
      month: "2026-09",
      previewHash: view.drafts[0].previewHash,
    }),
  );
  await backend.cancelBilling.run(request({ chargeId: first.id }));
  const input = {
    chargeId: first.id,
    dueDate: "2099-01-01",
    operationId: "synthetic-reissue",
  };
  const before = paymentPosts;
  const replacement = await backend.reissueBilling.run(request(input));
  await backend.reissueBilling.run(request(input));
  assert.equal(paymentPosts - before, 1);
  assert.equal(
    (await admin.doc(`users/${OWNER}/billingClaims/s_cancel`).get()).data()
      .chargeId,
    replacement.id,
  );
  currentStatus = "RECEIVED";
  await backend.refundBilling.run(request({ chargeId: replacement.id }));
  await assert.rejects(
    backend.refundBilling.run(request({ chargeId: replacement.id })),
  );
  assert.equal(refunds, 1);
  assert.equal(
    (await admin.doc(`users/${OWNER}/charges/${replacement.id}`).get()).data()
      .status,
    "refunded",
  );
});
test("changing policy cannot bypass a pre-existing plan period with a social invoice", async () => {
  currentStatus = "PENDING";
  await seed("plan", "plan");
  for (let n = 2; n <= 5; n++)
    await admin
      .doc(`users/${OWNER}/sessions/extra_${n}`)
      .set({
        id: "extra_" + n,
        patientId: "plan",
        date: "2026-09-11",
        startTime: "10:00",
        price: 200,
        status: "completed",
      });
  const view = await backend.previewBilling.run(
    request({ patientId: "plan", month: "2026-09" }),
  );
  const plan = await backend.issueBilling.run(
    request({
      patientId: "plan",
      month: "2026-09",
      previewHash: view.drafts[0].previewHash,
    }),
  );
  const extra = ["s_plan", "extra_2", "extra_3", "extra_4", "extra_5"].find(
    (s) => !plan.sessionIds.includes(s),
  );
  await backend.saveBillingPolicy.run(
    request({
      patientId: "plan",
      policy: {
        mode: "social",
        dueDay: 5,
        effectiveFrom: "2026-09-01",
        billingType: "PIX",
        automatic: false,
      },
    }),
  );
  await assert.rejects(
    backend.socialBilling.run(
      request({
        patientId: "plan",
        sessionIds: [extra],
        operationId: "social-after-plan",
        amountCents: 10000,
        dueDate: "2099-01-01",
      }),
    ),
    (e) => e.code === "failed-precondition",
  );
});
test("a server archive restores and verifies into an empty demo project only", async () => {
  const { encryptArchive } = await import("../lib/recovery.mjs");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const dir = await mkdtemp(join(tmpdir(), "ana-recovery-"));
  const file = join(dir, "synthetic.enc.json");
  try {
    const data = {
      patients: [{ id: "synthetic", name: "Synthetic person" }],
      sessions: [],
      records: [],
      anamnesis: [],
      assessments: [],
      payments: [],
      settings: [{ id: "clinic" }],
    };
    await writeFile(
      file,
      JSON.stringify(
        encryptArchive({ schema: 3, data }, "SyntheticArchivePassword#2026"),
      ),
    );
    const result = spawnSync(
      process.execPath,
      [
        "functions/tools/restore-isolated.mjs",
        file,
        "--project",
        "demo-ana-lima-recovery",
        "--apply",
      ],
      {
        env: {
          ...process.env,
          BACKUP_PASSPHRASE: "SyntheticArchivePassword#2026",
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /restored_and_verified/);
    const denied = spawnSync(
      process.execPath,
      [
        "functions/tools/restore-isolated.mjs",
        file,
        "--project",
        "ana-lima-psi-app",
        "--apply",
      ],
      {
        env: {
          ...process.env,
          BACKUP_PASSPHRASE: "SyntheticArchivePassword#2026",
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(denied.status, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("correcting an invalid payer allows recovery; concurrent approved retries issue once", async () => {
  currentStatus = "PENDING";
  await seed("retry");
  await admin
    .doc(`users/${OWNER}/patients/retry`)
    .update({ cpf: "00000000000" });
  const view = await backend.previewBilling.run(
    request({ patientId: "retry", month: "2026-09" }),
  );
  const input = {
    patientId: "retry",
    month: "2026-09",
    previewHash: view.drafts[0].previewHash,
  };
  await assert.rejects(backend.issueBilling.run(request(input)));
  const chargeId = "sandbox_" + view.drafts[0].id;
  await admin
    .doc(`users/${OWNER}/patients/retry`)
    .update({ cpf: "52998224725" });
  rejectPayment = true;
  await assert.rejects(backend.retryBilling.run(request({ chargeId })));
  const before = paymentPosts;
  const results = await Promise.allSettled([
    backend.retryBilling.run(request({ chargeId })),
    backend.retryBilling.run(request({ chargeId })),
  ]);
  assert.ok(results.some((r) => r.status === "fulfilled"));
  assert.equal(paymentPosts - before, 1);
  assert.ok(
    (await admin.doc(`users/${OWNER}/charges/${chargeId}`).get()).data()
      .providerId,
  );
});
