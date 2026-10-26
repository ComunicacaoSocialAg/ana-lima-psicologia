import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";
const source = await readFile(
  new URL("../../src/services/financialLedger.ts", import.meta.url),
  "utf8",
);
const { code } = await transform(source, { loader: "ts", format: "esm" });
const { buildLedgerPayments } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
test("integrated charge replaces its legacy receivable rather than counting twice", () => {
  const legacy = [
    {
      id: "legacy",
      patientId: "p",
      patientName: "Synthetic",
      amount: 200,
      dueDate: "2026-09-20",
      status: "pending",
      createdAt: "",
    },
  ];
  const charge = {
    id: "invoice",
    patientId: "p",
    amountCents: 20000,
    dueDate: "2026-09-20",
    status: "received",
    createdAt: "",
  };
  const ledger = buildLedgerPayments(legacy, [charge], ["legacy"]);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].amount, 200);
  assert.equal(ledger[0].status, "paid");
});
test("partial refunds reduce the represented revenue; canceled bills do not count as pending", () => {
  const ledger = buildLedgerPayments(
    [],
    [
      {
        id: "one",
        patientId: "p",
        amountCents: 20000,
        refundCents: 5000,
        dueDate: "2026-09-20",
        status: "partially_refunded",
        createdAt: "",
      },
      {
        id: "two",
        patientId: "p",
        amountCents: 30000,
        dueDate: "2026-09-20",
        status: "canceled",
        createdAt: "",
      },
    ],
    [],
  );
  assert.equal(ledger[0].amount, 150);
  assert.equal(ledger[0].status, "paid");
  assert.equal(ledger[1].status, "waived");
});
