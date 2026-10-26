import type { Payment } from "../types";
export interface IntegratedCharge {
  id: string;
  patientId: string;
  patientName?: string;
  amountCents: number;
  refundCents?: number;
  dueDate: string;
  paidAt?: string;
  status: string;
  createdAt: string;
}
export function buildLedgerPayments(
  legacy: Payment[],
  charges: IntegratedCharge[],
  coverage: string[],
): Payment[] {
  const covered = new Set(coverage);
  return legacy
    .filter((p) => !covered.has(p.id))
    .concat(
      charges.map((c) => ({
        id: c.id,
        patientId: c.patientId,
        patientName: c.patientName || "Cadastro preservado",
        amount: (c.amountCents - (c.refundCents || 0)) / 100,
        dueDate: c.dueDate,
        paidDate: c.paidAt,
        status: ["confirmed", "received", "partially_refunded"].includes(
          c.status,
        )
          ? ("paid" as const)
          : ["reserved", "issuing", "review", "pending", "overdue"].includes(
                c.status,
              )
            ? ("pending" as const)
            : ("waived" as const),
        createdAt: c.createdAt,
      })),
    );
}
