import { Payment, Patient } from '../types';
import { formatDateBR } from './dateUtils';
import { getPaymentReferenceDate } from './financialAnalytics';

export interface CsvExportOptions {
  periodLabel: string;
  filenamePrefix?: string;
}

/**
 * Exporta lançamentos financeiros para planilha CSV (formato compatível com Excel e LibreOffice em PT-BR)
 */
export function exportPaymentsToCsv(
  payments: Payment[],
  patients: Patient[],
  options: CsvExportOptions
): void {
  const patientMap = new Map<string, Patient>();
  patients.forEach((p) => patientMap.set(p.id, p));

  const headers = [
    'Data Referência',
    'Data de Pagamento',
    'Data de Vencimento',
    'Paciente',
    'CPF do Paciente',
    'Responsável Legal/Financeiro',
    'CPF do Responsável',
    'Valor (R$)',
    'Forma de Pagamento',
    'Status',
    'Recibo Fiscal',
    'Observações',
  ];

  const rows = payments.map((pay) => {
    const patient = patientMap.get(pay.patientId);
    const refDate = getPaymentReferenceDate(pay);
    const paidDate = pay.paidDate ? formatDateBR(pay.paidDate) : '-';
    const dueDate = pay.dueDate ? formatDateBR(pay.dueDate) : '-';

    const patientCpf = patient?.cpf || '-';
    const guardianName =
      typeof patient?.legalGuardian === 'object'
        ? patient.legalGuardian?.name || '-'
        : '-';
    const guardianCpf =
      typeof patient?.legalGuardian === 'object'
        ? patient.legalGuardian?.cpf || '-'
        : '-';

    const formattedAmount = (pay.amount || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const statusLabel =
      pay.status === 'paid'
        ? 'Pago'
        : pay.status === 'pending'
          ? 'Pendente'
          : 'Isento';

    const methodLabel = (pay.paymentMethod || 'PIX').toUpperCase();

    return [
      formatDateBR(refDate),
      paidDate,
      dueDate,
      pay.patientName || patient?.name || 'Paciente',
      patientCpf,
      guardianName,
      guardianCpf,
      formattedAmount,
      methodLabel,
      statusLabel,
      pay.receiptNumber || '-',
      (pay.notes || '').replace(/[\r\n]+/g, ' '),
    ];
  });

  // UTF-8 BOM para garantir acentuação perfeita no Microsoft Excel
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(';')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safePeriod = options.periodLabel
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

  const prefix = options.filenamePrefix || 'relatorio-financeiro';
  link.setAttribute('href', url);
  link.setAttribute('download', `${prefix}-${safePeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
