import type { Payment, PaymentMethod } from '../types/index';

export type PeriodType = 'month' | 'year' | 'quarter' | 'last12months' | 'custom' | 'all';

export interface FinancialPeriod {
  type: PeriodType;
  year: number;
  month?: number; // 1 to 12
  quarter?: number; // 1 to 4
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  label: string;
}

export interface FinancialMetrics {
  totalReceived: number;
  totalPending: number;
  totalProjected: number;
  receivedCount: number;
  pendingCount: number;
  totalCount: number;
  ticketAverage: number;
  collectionRate: number; // 0 to 100 (%)
  diffVsPreviousPeriodPercentage: number | null; // e.g. +15.5 or -8.2
  diffVsPreviousPeriodAmount: number | null;
  previousPeriodReceived: number | null;
}

export interface MonthlyDataPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Out/26"
  received: number;
  pending: number;
  total: number;
  count: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface PatientRevenueSummary {
  patientId: string;
  patientName: string;
  amount: number;
  count: number;
  percentage: number;
}

const MONTH_NAMES_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_BR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Obtém a data contábil relevante de um lançamento (Regime de Caixa para pagos, Vencimento para pendentes).
 */
export function getPaymentReferenceDate(payment: Payment): string {
  if (payment.status === 'paid' && payment.paidDate) {
    return payment.paidDate.slice(0, 10);
  }
  if (payment.dueDate) {
    return payment.dueDate.slice(0, 10);
  }
  if (payment.sessionDate) {
    return payment.sessionDate.slice(0, 10);
  }
  if (payment.createdAt) {
    return payment.createdAt.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formata moeda BRL de forma consistente
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Retorna o período anterior correspondente para cálculo de comparativos
 */
export function getPreviousPeriod(period: FinancialPeriod): FinancialPeriod {
  if (period.type === 'month') {
    const m = period.month ?? (new Date().getMonth() + 1);
    const y = period.year;
    if (m === 1) {
      return {
        type: 'month',
        year: y - 1,
        month: 12,
        label: `${MONTH_NAMES_BR[11]} de ${y - 1}`,
      };
    }
    return {
      type: 'month',
      year: y,
      month: m - 1,
      label: `${MONTH_NAMES_BR[m - 2]} de ${y}`,
    };
  }

  if (period.type === 'year') {
    return {
      type: 'year',
      year: period.year - 1,
      label: `Ano de ${period.year - 1}`,
    };
  }

  if (period.type === 'quarter') {
    const q = period.quarter ?? 1;
    const y = period.year;
    if (q === 1) {
      return {
        type: 'quarter',
        year: y - 1,
        quarter: 4,
        label: `4º Trimestre de ${y - 1}`,
      };
    }
    return {
      type: 'quarter',
      year: y,
      quarter: q - 1,
      label: `${q - 1}º Trimestre de ${y}`,
    };
  }

  // Para outros tipos (last12months, custom, all), usa o ano anterior como base comparativa
  return {
    type: 'year',
    year: period.year - 1,
    label: `Ano anterior (${period.year - 1})`,
  };
}

/**
 * Filtra pagamentos pertencentes ao período especificado
 */
export function filterPaymentsByPeriod(
  payments: Payment[],
  period: FinancialPeriod
): Payment[] {
  if (period.type === 'all') {
    return payments;
  }

  return payments.filter((p) => {
    const date = getPaymentReferenceDate(p);

    if (period.type === 'month') {
      const monthStr = String(period.month).padStart(2, '0');
      const prefix = `${period.year}-${monthStr}`;
      return date.startsWith(prefix);
    }

    if (period.type === 'year') {
      return date.startsWith(`${period.year}-`);
    }

    if (period.type === 'quarter') {
      const q = period.quarter || 1;
      const quarterMonths: Record<number, string[]> = {
        1: ['01', '02', '03'],
        2: ['04', '05', '06'],
        3: ['07', '08', '09'],
        4: ['10', '11', '12'],
      };
      const allowed = quarterMonths[q] || [];
      return allowed.some((m) => date.startsWith(`${period.year}-${m}`));
    }

    if (period.type === 'last12months') {
      const now = new Date();
      const past = new Date();
      past.setMonth(past.getMonth() - 11);
      past.setDate(1);
      const startStr = past.toISOString().slice(0, 10);
      const endStr = now.toISOString().slice(0, 10);
      return date >= startStr && date <= endStr;
    }

    if (period.type === 'custom') {
      if (period.startDate && date < period.startDate) return false;
      if (period.endDate && date > period.endDate) return false;
      return true;
    }

    return true;
  });
}

/**
 * Calcula os KPIs do período e a variação comparativa com o período anterior
 */
export function calculateFinancialMetrics(
  currentPayments: Payment[],
  previousPayments?: Payment[]
): FinancialMetrics {
  const paidPayments = currentPayments.filter((p) => p.status === 'paid');
  const pendingPayments = currentPayments.filter((p) => p.status === 'pending');

  const totalReceived = paidPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPending = pendingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalProjected = totalReceived + totalPending;

  const receivedCount = paidPayments.length;
  const pendingCount = pendingPayments.length;
  const totalCount = currentPayments.length;

  const ticketAverage = receivedCount > 0 ? totalReceived / receivedCount : 0;
  const collectionRate =
    totalProjected > 0 ? Math.round((totalReceived / totalProjected) * 100) : 100;

  let diffVsPreviousPeriodPercentage: number | null = null;
  let diffVsPreviousPeriodAmount: number | null = null;
  let previousPeriodReceived: number | null = null;

  if (previousPayments && previousPayments.length >= 0) {
    const prevPaid = previousPayments.filter((p) => p.status === 'paid');
    previousPeriodReceived = prevPaid.reduce((acc, p) => acc + (p.amount || 0), 0);
    diffVsPreviousPeriodAmount = totalReceived - previousPeriodReceived;

    if (previousPeriodReceived > 0) {
      diffVsPreviousPeriodPercentage =
        ((totalReceived - previousPeriodReceived) / previousPeriodReceived) * 100;
    } else if (totalReceived > 0) {
      diffVsPreviousPeriodPercentage = 100; // Crescimento a partir de zero
    } else {
      diffVsPreviousPeriodPercentage = 0;
    }
  }

  return {
    totalReceived,
    totalPending,
    totalProjected,
    receivedCount,
    pendingCount,
    totalCount,
    ticketAverage,
    collectionRate,
    diffVsPreviousPeriodPercentage,
    diffVsPreviousPeriodAmount,
    previousPeriodReceived,
  };
}

/**
 * Gera série histórica mensal dos últimos N meses para gráficos (Recharts)
 */
export function generateMonthlyHistory(
  payments: Payment[],
  monthsCount: number = 12,
  baseDate: Date = new Date()
): MonthlyDataPoint[] {
  const result: MonthlyDataPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    const monthLabel = `${MONTH_SHORT_BR[m - 1]}/${String(y).slice(-2)}`;

    const monthPayments = payments.filter((p) => {
      const date = getPaymentReferenceDate(p);
      return date.startsWith(monthKey);
    });

    const received = monthPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pending = monthPayments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    result.push({
      monthKey,
      monthLabel,
      received,
      pending,
      total: received + pending,
      count: monthPayments.length,
    });
  }

  return result;
}

/**
 * Distribuição por forma de pagamento no período
 */
export function generatePaymentMethodDistribution(
  payments: Payment[]
): PaymentMethodBreakdown[] {
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const total = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const config: Record<string, { label: string; color: string }> = {
    pix: { label: 'PIX', color: '#0d9488' }, // teal
    transfer: { label: 'Transferência Bancária', color: '#3b82f6' }, // blue
    cash: { label: 'Dinheiro', color: '#10b981' }, // emerald
    card: { label: 'Cartão de Crédito/Débito', color: '#8b5cf6' }, // purple
    other: { label: 'Outro', color: '#64748b' }, // slate
  };

  const buckets: Record<string, { amount: number; count: number }> = {
    pix: { amount: 0, count: 0 },
    transfer: { amount: 0, count: 0 },
    cash: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 },
    other: { amount: 0, count: 0 },
  };

  paidPayments.forEach((p) => {
    const m = (p.paymentMethod || 'pix').toLowerCase();
    const key = buckets[m] ? m : 'other';
    buckets[key].amount += p.amount || 0;
    buckets[key].count += 1;
  });

  return Object.entries(buckets)
    .filter(([_, data]) => data.count > 0 || total === 0)
    .map(([key, data]) => ({
      method: key,
      label: config[key]?.label || key,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      color: config[key]?.color || '#94a3b8',
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Top pacientes por receita no período
 */
export function generatePatientRevenueRanking(
  payments: Payment[],
  maxItems: number = 8
): PatientRevenueSummary[] {
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const total = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const byPatient = new Map<string, { name: string; amount: number; count: number }>();

  paidPayments.forEach((p) => {
    const id = p.patientId;
    const name = p.patientName || 'Paciente';
    const curr = byPatient.get(id) || { name, amount: 0, count: 0 };
    curr.amount += p.amount || 0;
    curr.count += 1;
    byPatient.set(id, curr);
  });

  return Array.from(byPatient.entries())
    .map(([patientId, data]) => ({
      patientId,
      patientName: data.name,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, maxItems);
}

/**
 * Cria o período padrão (Mês Atual)
 */
export function createDefaultPeriod(date: Date = new Date()): FinancialPeriod {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return {
    type: 'month',
    year: y,
    month: m,
    label: `${MONTH_NAMES_BR[m - 1]} de ${y}`,
  };
}

/**
 * Nome do mês em português
 */
export function getMonthNameBR(monthIndex: number): string {
  return MONTH_NAMES_BR[(monthIndex - 1 + 12) % 12];
}
