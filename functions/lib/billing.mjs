import { createHash } from "node:crypto";
export function date(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw Error("Data inválida.");
  return value;
}
export function cents(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100000000)
    throw Error("Valor deve ser informado em centavos positivos.");
  return value;
}
export function policy(input) {
  const modes = ["per_session", "monthly", "plan", "social"];
  if (!input || !modes.includes(input.mode))
    throw Error("Modalidade inválida.");
  if (input.mode !== "social") cents(input.priceCents);
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 28)
    throw Error("Vencimento deve ser de 1 a 28.");
  if (!["PIX", "BOLETO", "CREDIT_CARD"].includes(input.billingType))
    throw Error("Forma de cobrança inválida.");
  return {
    mode: input.mode,
    priceCents: input.mode === "social" ? null : input.priceCents,
    effectiveFrom: date(input.effectiveFrom),
    dueDay: input.dueDay,
    billingType: input.billingType,
    includedSessions: 4,
    extraSessionPolicy: "review",
    automatic: input.mode === "social" ? false : input.automatic === true,
    payer: input.payer === "guardian" ? "guardian" : "patient",
    noticeEnabled: false,
  };
}
export const sha = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function preview({
  patient,
  policy: p,
  sessions,
  payments,
  month,
  today,
}) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error("Mês inválido.");
  date(today);
  if (!p || p.mode === "social")
    return {
      drafts: [],
      review: [
        "Atendimento social exige cobrança manual com valor e vencimento explícitos.",
      ],
    };
  const eligible = sessions
    .filter(
      (s) =>
        s.patientId === patient.id &&
        s.date.startsWith(month) &&
        s.date >= p.effectiveFrom &&
        s.date <= today &&
        ["completed", "missed_chargeable"].includes(s.status),
    )
    .sort((a, b) =>
      (a.date + a.startTime + a.id).localeCompare(b.date + b.startTime + b.id),
    );
  const paid = new Set(
    payments.filter((x) => x.status === "paid").map((x) => x.sessionId),
  );
  const unpaid = eligible.filter((s) => !paid.has(s.id));
  const review = [];
  let drafts = [];
  if (
    payments.some(
      (p) =>
        !p.sessionId &&
        p.status !== "waived" &&
        (p.sessionDate || p.dueDate || "").startsWith(month),
    )
  )
    return {
      drafts: [],
      review: [
        "Há lançamento avulso sem vínculo com sessão neste período. Concilie antes de emitir.",
      ],
    };
  const next = new Date(`${month}-01T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const due = `${next.toISOString().slice(0, 7)}-${String(p.dueDay).padStart(2, "0")}`;
  const make = (key, items, amount, dueDate) => {
    const base = {
      patientId: patient.id,
      mode: p.mode,
      month,
      sessionIds: items.map((s) => s.id),
      amountCents: cents(amount),
      dueDate: date(dueDate),
      billingType: p.billingType,
      policyVersion: p.version,
      payer: p.payer,
      legacyPaymentIds: payments
        .filter(
          (x) =>
            x.status === "pending" && items.some((s) => s.id === x.sessionId),
        )
        .map((x) => x.id)
        .sort(),
    };
    return { ...base, id: sha(`${patient.id}:${key}`), previewHash: sha(base) };
  };
  if (p.mode === "per_session")
    drafts = unpaid.map((s) =>
      make(
        "session:" + s.id,
        [s],
        Math.round(s.price * 100),
        s.date < today ? today : s.date,
      ),
    );
  if (p.mode === "monthly") {
    if (month >= today.slice(0, 7))
      review.push("Fechamento mensal disponível após encerrar o mês.");
    else if (unpaid.length)
      drafts = [
        make(
          "period:" + month,
          unpaid,
          unpaid.reduce((sum, s) => sum + Math.round(s.price * 100), 0),
          due < today ? today : due,
        ),
      ];
  }
  if (p.mode === "plan") {
    if (p.effectiveFrom > `${month}-01`)
      review.push(
        "Plano exige vigência no início do mês; mês parcial precisa de revisão.",
      );
    else if (eligible.some((s) => paid.has(s.id)))
      review.push(
        "Há sessões pagas avulsas neste mês. Revise antes de emitir o plano para evitar cobrança duplicada.",
      );
    else {
      drafts = [
        make(
          "period:" + month,
          eligible.slice(0, 4),
          p.priceCents,
          `${month}-${String(p.dueDay).padStart(2, "0")}` < today
            ? today
            : `${month}-${String(p.dueDay).padStart(2, "0")}`,
        ),
      ];
      if (eligible.length > 4)
        review.push(
          `${eligible.length - 4} sessão(ões) além das quatro: revisão obrigatória, sem cobrança automática.`,
        );
    }
  }
  return { drafts, review };
}
export function providerStatus(status) {
  const map = {
    PENDING: "pending",
    OVERDUE: "overdue",
    CONFIRMED: "confirmed",
    RECEIVED: "received",
    RECEIVED_IN_CASH: "received",
    REFUNDED: "refunded",
    REFUND_REQUESTED: "refund_pending",
    REFUND_IN_PROGRESS: "refund_pending",
    CHARGEBACK_REQUESTED: "disputed",
    CHARGEBACK_DISPUTE: "disputed",
    AWAITING_CHARGEBACK_REVERSAL: "disputed",
    DELETED: "canceled",
    DUNNING_REQUESTED: "overdue",
    DUNNING_RECEIVED: "received",
  };
  return map[status] || "review";
}

export function validTaxId(value) {
  const n = String(value || "").replace(/\D/g, "");
  if (/^(\d)\1+$/.test(n)) return false;
  if (n.length === 11) {
    for (let size = 9; size <= 10; size++) {
      const total = [...n.slice(0, size)].reduce(
        (sum, d, i) => sum + Number(d) * (size + 1 - i),
        0,
      );
      const digit = ((total * 10) % 11) % 10;
      if (digit !== Number(n[size])) return false;
    }
    return true;
  }
  if (n.length === 14) {
    for (let size = 12; size <= 13; size++) {
      let weight = size - 7;
      const total = [...n.slice(0, size)].reduce((sum, d) => {
        const result = sum + Number(d) * weight;
        weight = weight === 2 ? 9 : weight - 1;
        return result;
      }, 0);
      const rest = total % 11;
      const digit = rest < 2 ? 0 : 11 - rest;
      if (digit !== Number(n[size])) return false;
    }
    return true;
  }
  return false;
}
