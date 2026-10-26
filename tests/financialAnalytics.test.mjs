import test from 'node:test';
import assert from 'node:assert/strict';

// Test implementation of pure logic
import {
  filterPaymentsByPeriod,
  calculateFinancialMetrics,
  getPreviousPeriod,
  generatePaymentMethodDistribution,
  generateMonthlyHistory,
} from '../src/utils/financialAnalytics.ts';

const mockPayments = [
  {
    id: 'p1',
    patientId: 'pat1',
    patientName: 'Carlos Silva',
    amount: 250,
    dueDate: '2026-10-05',
    paidDate: '2026-10-05',
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p2',
    patientId: 'pat1',
    patientName: 'Carlos Silva',
    amount: 250,
    dueDate: '2026-10-12',
    paidDate: '2026-10-12',
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p3',
    patientId: 'pat2',
    patientName: 'Mariana Costa',
    amount: 200,
    dueDate: '2026-10-20',
    status: 'pending',
    paymentMethod: 'transfer',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'p4',
    patientId: 'pat2',
    patientName: 'Mariana Costa',
    amount: 200,
    dueDate: '2026-09-15',
    paidDate: '2026-09-15',
    status: 'paid',
    paymentMethod: 'cash',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'p5',
    patientId: 'pat3',
    patientName: 'Lucas Lima',
    amount: 300,
    dueDate: '2025-11-10',
    paidDate: '2025-11-10',
    status: 'paid',
    paymentMethod: 'card',
    createdAt: '2025-11-01T10:00:00Z',
  },
];

test('filterPaymentsByPeriod: correctly filters by month', () => {
  const period = {
    type: 'month',
    year: 2026,
    month: 10,
    label: 'Outubro de 2026',
  };

  const filtered = filterPaymentsByPeriod(mockPayments, period);
  assert.equal(filtered.length, 3);
  assert.deepEqual(filtered.map(p => p.id), ['p1', 'p2', 'p3']);
});

test('filterPaymentsByPeriod: correctly filters by year', () => {
  const period = {
    type: 'year',
    year: 2026,
    label: 'Ano de 2026',
  };

  const filtered = filterPaymentsByPeriod(mockPayments, period);
  assert.equal(filtered.length, 4);
  assert.deepEqual(filtered.map(p => p.id), ['p1', 'p2', 'p3', 'p4']);
});

test('calculateFinancialMetrics: computes totals and comparative difference', () => {
  const currentPeriod = {
    type: 'month',
    year: 2026,
    month: 10,
    label: 'Outubro de 2026',
  };
  const prevPeriod = getPreviousPeriod(currentPeriod);
  assert.equal(prevPeriod.month, 9);
  assert.equal(prevPeriod.year, 2026);

  const currentPayments = filterPaymentsByPeriod(mockPayments, currentPeriod);
  const previousPayments = filterPaymentsByPeriod(mockPayments, prevPeriod);

  const metrics = calculateFinancialMetrics(currentPayments, previousPayments);

  assert.equal(metrics.totalReceived, 500); // 250 + 250
  assert.equal(metrics.totalPending, 200);
  assert.equal(metrics.totalProjected, 700);
  assert.equal(metrics.receivedCount, 2);
  assert.equal(metrics.pendingCount, 1);
  assert.equal(metrics.ticketAverage, 250);
  assert.equal(metrics.previousPeriodReceived, 200); // Setembro: 200
  assert.equal(metrics.diffVsPreviousPeriodAmount, 300); // 500 - 200
  assert.equal(metrics.diffVsPreviousPeriodPercentage, 150); // (500 - 200)/200 * 100 = 150%
});

test('generatePaymentMethodDistribution: computes method shares', () => {
  const currentPeriod = {
    type: 'month',
    year: 2026,
    month: 10,
    label: 'Outubro de 2026',
  };
  const currentPayments = filterPaymentsByPeriod(mockPayments, currentPeriod);
  const dist = generatePaymentMethodDistribution(currentPayments);

  const pix = dist.find(d => d.method === 'pix');
  assert.ok(pix);
  assert.equal(pix.amount, 500);
  assert.equal(pix.count, 2);
  assert.equal(pix.percentage, 100); // all paid in Oct were pix
});

test('getPreviousPeriod: handles January boundary to December of previous year', () => {
  const jan = {
    type: 'month',
    year: 2026,
    month: 1,
    label: 'Janeiro de 2026',
  };
  const prev = getPreviousPeriod(jan);
  assert.equal(prev.year, 2025);
  assert.equal(prev.month, 12);
  assert.equal(prev.label, 'Dezembro de 2025');
});

test('filterPaymentsByPeriod: correctly filters by quarter and custom date range', () => {
  // Q4 of 2026 (Oct, Nov, Dec)
  const q4 = {
    type: 'quarter',
    year: 2026,
    quarter: 4,
    label: '4º Trimestre de 2026',
  };
  const q4Filtered = filterPaymentsByPeriod(mockPayments, q4);
  assert.equal(q4Filtered.length, 3); // p1, p2, p3 are Oct 2026

  // Custom date range: 2026-09-01 to 2026-10-06
  const custom = {
    type: 'custom',
    year: 2026,
    startDate: '2026-09-01',
    endDate: '2026-10-06',
    label: 'Personalizado',
  };
  const customFiltered = filterPaymentsByPeriod(mockPayments, custom);
  assert.equal(customFiltered.length, 2); // p1 (2026-10-05) and p4 (2026-09-15)
  assert.deepEqual(customFiltered.map(p => p.id), ['p1', 'p4']);
});

test('generateMonthlyHistory: generates correct historical buckets', () => {
  const history = generateMonthlyHistory(mockPayments, 6, new Date('2026-10-26'));
  assert.equal(history.length, 6);
  const oct = history.find(h => h.monthKey === '2026-10');
  assert.ok(oct);
  assert.equal(oct.received, 500);
  assert.equal(oct.pending, 200);
});
