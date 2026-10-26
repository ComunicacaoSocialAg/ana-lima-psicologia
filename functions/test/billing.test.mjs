import test from "node:test";
import assert from "node:assert/strict";
import {
  policy,
  preview,
  cents,
  date,
  providerStatus,
} from "../lib/billing.mjs";
const p = { id: "patient", name: "Pessoa sintética", status: "active" };
const makePolicy = (mode, other = {}) => ({
  ...policy({
    mode,
    priceCents: 60000,
    dueDay: 5,
    billingType: "PIX",
    effectiveFrom: "2026-09-01",
    automatic: false,
    ...other,
  }),
  version: 1,
});
const session = (id, other = {}) => ({
  id,
  patientId: "patient",
  date: "2026-09-10",
  startTime: "10:00",
  status: "completed",
  price: 200,
  ...other,
});
const run = (mode, sessions, payments = [], other = {}) =>
  preview({
    patient: p,
    policy: makePolicy(mode),
    sessions,
    payments,
    month: "2026-09",
    today: "2026-10-01",
    ...other,
  });
test("individual: charges only performed/chargeable sessions, never future appointments", () => {
  const result = run("per_session", [
    session("a"),
    session("b", { status: "scheduled" }),
    session("c", { status: "canceled" }),
    session("d", { status: "missed_non_chargeable" }),
    session("e", { status: "missed_chargeable" }),
    session("f", { date: "2026-11-01" }),
  ]);
  assert.equal(result.drafts.length, 2);
  assert.equal(result.drafts[0].amountCents, 20000);
});
test("monthly closing totals cents, excludes paid sessions and links pending legacy payments", () => {
  const result = run(
    "monthly",
    [session("a"), session("b"), session("c", { price: 150.15 })],
    [
      { id: "paid", sessionId: "a", status: "paid" },
      { id: "legacy", sessionId: "b", status: "pending" },
    ],
  );
  assert.equal(result.drafts.length, 1);
  assert.equal(result.drafts[0].amountCents, 35015);
  assert.deepEqual(result.drafts[0].legacyPaymentIds, ["legacy"]);
  assert.equal(result.drafts[0].dueDate, "2026-10-05");
});
test("monthly closing is unavailable for an open month", () =>
  assert.equal(
    run("monthly", [session("a")], [], { today: "2026-09-28" }).drafts.length,
    0,
  ));
test("plan charges fixed amount once and puts the fifth session under review", () => {
  const result = run(
    "plan",
    [1, 2, 3, 4, 5].map((x) => session(String(x))),
  );
  assert.equal(result.drafts.length, 1);
  assert.equal(result.drafts[0].amountCents, 60000);
  assert.equal(result.drafts[0].sessionIds.length, 4);
  assert.match(result.review[0], /sem cobrança automática/);
});
test("plan cannot hide pre-existing individually paid sessions", () =>
  assert.equal(
    run("plan", [session("a")], [{ sessionId: "a", status: "paid" }]).drafts
      .length,
    0,
  ));
test("social has no inferred cadence, price or automatic billing", () => {
  const pol = makePolicy("social", { automatic: true });
  assert.equal(pol.automatic, false);
  assert.equal(pol.priceCents, null);
  assert.equal(run("social", [session("a")]).drafts.length, 0);
});
test("cutover and partial plan months never backbill automatically", () => {
  const result = run("plan", [session("a")], [], {
    policy: makePolicy("plan", { effectiveFrom: "2026-09-15" }),
  });
  assert.equal(result.drafts.length, 0);
});
test("unlinked legacy payment blocks emission rather than guessing its coverage", () =>
  assert.equal(
    run(
      "monthly",
      [session("a")],
      [{ id: "manual", status: "pending", dueDate: "2026-09-20" }],
    ).drafts.length,
    0,
  ));
test("same intent has stable charge id; edits invalidate preview hash", () => {
  const a = run("monthly", [session("a")]).drafts[0];
  const b = run("monthly", [session("a", { price: 210 })]).drafts[0];
  assert.equal(a.id, b.id);
  assert.notEqual(a.previewHash, b.previewHash);
  assert.equal(
    a.previewHash,
    run("monthly", [session("a")]).drafts[0].previewHash,
  );
});
test("money, policy, dates and payment modes reject invalid values", () => {
  for (const v of [0, -1, 1.1, NaN, Infinity, 100000001])
    assert.throws(() => cents(v));
  assert.throws(() => date("2026-02-30"));
  assert.throws(() => makePolicy("bad"));
  assert.throws(() => makePolicy("monthly", { dueDay: 31 }));
  assert.throws(() => makePolicy("plan", { billingType: "UNKNOWN" }));
});
test("provider confirmation differs from funds available; refunds/chargebacks require dedicated states", () => {
  assert.equal(providerStatus("CONFIRMED"), "confirmed");
  assert.equal(providerStatus("RECEIVED"), "received");
  assert.equal(providerStatus("REFUNDED"), "refunded");
  assert.equal(providerStatus("CHARGEBACK_DISPUTE"), "disputed");
  assert.equal(providerStatus("FUTURE_STATUS"), "review");
});
test("tax IDs must pass check digits before provider customer creation", async () => {
  const { validTaxId } = await import("../lib/billing.mjs");
  assert.equal(validTaxId("529.982.247-25"), true);
  assert.equal(validTaxId("11.222.333/0001-81"), true);
  for (const n of ["11111111111", "52998224726", "123", "00000000000000"])
    assert.equal(validTaxId(n), false);
});
