import writeXlsxFile from 'write-excel-file/browser';
import { Patient, Session, Payment, Assessment, ClinicalRecord, PatientStatus, SessionStatus } from '../types';
import { formatDateBR } from '../utils/dateUtils';
import { auditService } from './auditService';

/**
 * Prevenção rigorosa de CSV Injection / Formula Injection (OWASP).
 * Se um campo começar com '=', '+', '-', '@', TAB ou CR, prefixa com apóstrofo
 * para impedir execução inadvertida de macros ou fórmulas no Microsoft Excel.
 */
export function sanitizeFormula(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=\+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function getPatientStatusLabel(status: PatientStatus): string {
  switch (status) {
    case 'active':
      return 'Em Acompanhamento';
    case 'waiting_list':
      return 'Fila de Espera';
    case 'paused':
      return 'Em Pausa';
    case 'discharged':
      return 'Alta';
    case 'abandoned':
      return 'Abandono';
    default:
      return status;
  }
}

export function getSessionStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'completed':
      return 'Realizada';
    case 'scheduled':
      return 'Agendada';
    case 'confirmed':
      return 'Confirmada';
    case 'canceled':
      return 'Cancelada';
    case 'missed_chargeable':
      return 'Falta (Cobrável)';
    case 'missed_non_chargeable':
      return 'Falta (Não Cobrável)';
    default:
      return status;
  }
}

/**
 * Gera e dispara o download de um arquivo CSV configurado especificamente
 * para o Microsoft Excel e LibreOffice em português (UTF-8 com BOM e separador ';').
 */
function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const sanitized = sanitizeFormula(cell);
            return `"${String(sanitized).replace(/"/g, '""')}"`;
          })
          .join(';')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta a lista de pacientes para CSV.
 */
export function exportPatientsToCsv(patients: Patient[]): void {
  const now = new Date().toISOString().slice(0, 10);
  const filename = `pacientes-ana-lima-${now}.csv`;

  const headers = [
    'Nome Completo',
    'Status',
    'Modalidade Preferencial',
    'Valor Acordado (R$)',
    'CPF',
    'RG',
    'Data de Nascimento',
    'Telefone',
    'E-mail',
    'Profissão',
    'Estado Civil',
    'Endereço',
    'Contato de Emergência (Nome)',
    'Contato de Emergência (Tel)',
    'Contato de Emergência (Parentesco)',
    'Responsável Legal (Nome)',
    'Responsável Legal (CPF)',
    'Horário Habitual',
    'Origem / Indicação',
    'Data de Início',
    'Data de Cadastro',
  ];

  const rows = patients.map((p) => {
    const guardianName =
      p.guardianName || (typeof p.legalGuardian === 'object' ? p.legalGuardian?.name : '') || '-';
    const guardianCpf =
      p.guardianCpf || (typeof p.legalGuardian === 'object' ? p.legalGuardian?.cpf : '') || '-';

    return [
      p.name,
      getPatientStatusLabel(p.status),
      p.preferredModality === 'online' ? 'Online' : 'Presencial',
      (p.agreedPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      p.cpf || '-',
      p.rg || '-',
      p.birthDate ? formatDateBR(p.birthDate) : '-',
      p.phone || '-',
      p.email || '-',
      p.profession || '-',
      p.maritalStatus || '-',
      p.address || '-',
      p.emergencyContact?.name || '-',
      p.emergencyContact?.phone || '-',
      p.emergencyContact?.relationship || '-',
      guardianName,
      guardianCpf,
      p.usualSchedule || '-',
      p.referralSource || '-',
      p.startDate ? formatDateBR(p.startDate) : '-',
      p.createdAt ? formatDateBR(p.createdAt) : '-',
    ];
  });

  downloadCsvFile(filename, headers, rows);
  auditService.log('export_csv', {
    details: `Exportação de ${patients.length} pacientes em formato CSV`,
  });
}

/**
 * Exporta lançamentos financeiros para CSV.
 */
export function exportFinancialToCsv(
  payments: Payment[],
  patients: Patient[],
  options?: { periodLabel?: string; filenamePrefix?: string }
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
    const refDate = pay.sessionDate || pay.paidDate || pay.dueDate || pay.createdAt;
    const paidDate = pay.paidDate ? formatDateBR(pay.paidDate) : '-';
    const dueDate = pay.dueDate ? formatDateBR(pay.dueDate) : '-';

    const patientCpf = patient?.cpf || '-';
    const guardianName =
      patient?.guardianName ||
      (typeof patient?.legalGuardian === 'object' ? patient.legalGuardian?.name : '') ||
      '-';
    const guardianCpf =
      patient?.guardianCpf ||
      (typeof patient?.legalGuardian === 'object' ? patient.legalGuardian?.cpf : '') ||
      '-';

    const formattedAmount = (pay.amount || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const statusLabel =
      pay.status === 'paid' ? 'Pago' : pay.status === 'pending' ? 'Pendente' : 'Isento';

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

  const now = new Date().toISOString().slice(0, 10);
  const prefix = options?.filenamePrefix || 'financeiro-ana-lima';
  const periodSlug = options?.periodLabel
    ? `-${options.periodLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`
    : `-${now}`;

  const filename = `${prefix}${periodSlug}.csv`;
  downloadCsvFile(filename, headers, rows);

  auditService.log('export_csv', {
    details: `Exportação de ${payments.length} lançamentos financeiros em formato CSV (${options?.periodLabel || now})`,
  });
}

/**
 * Interface com todos os dados para a exportação completa em Excel (.xlsx).
 */
export interface CompleteExportData {
  patients: Patient[];
  sessions: Session[];
  payments: Payment[];
  assessments: Assessment[];
  records?: ClinicalRecord[];
  includeClinicalRecords?: boolean;
}

/**
 * Exporta TODOS os dados da clínica em uma única pasta de trabalho Excel (.xlsx) com múltiplas abas:
 *  - Aba 1: Pacientes
 *  - Aba 2: Sessões & Consultas
 *  - Aba 3: Financeiro & Honorários
 *  - Aba 4: Escalas Psicométricas (PHQ-9 / GAD-7)
 *  - Aba 5: Prontuários & Evoluções (opcional, com conformidade ética CFP e LGPD)
 */
export async function exportAllDataToXlsx({
  patients,
  sessions,
  payments,
  assessments,
  records = [],
  includeClinicalRecords = false,
}: CompleteExportData): Promise<void> {
  const patientMap = new Map<string, Patient>();
  patients.forEach((p) => patientMap.set(p.id, p));

  // 1. Aba Pacientes
  const patientsSheetData: any[] = [
    [
      { value: 'Nome Completo', fontWeight: 'bold' },
      { value: 'Status', fontWeight: 'bold' },
      { value: 'Modalidade', fontWeight: 'bold' },
      { value: 'Valor da Sessão (R$)', fontWeight: 'bold' },
      { value: 'CPF', fontWeight: 'bold' },
      { value: 'RG', fontWeight: 'bold' },
      { value: 'Data de Nascimento', fontWeight: 'bold' },
      { value: 'Telefone', fontWeight: 'bold' },
      { value: 'E-mail', fontWeight: 'bold' },
      { value: 'Profissão', fontWeight: 'bold' },
      { value: 'Estado Civil', fontWeight: 'bold' },
      { value: 'Endereço', fontWeight: 'bold' },
      { value: 'Contato Emergência', fontWeight: 'bold' },
      { value: 'Telefone Emergência', fontWeight: 'bold' },
      { value: 'Parentesco Emergência', fontWeight: 'bold' },
      { value: 'Responsável Legal', fontWeight: 'bold' },
      { value: 'CPF Responsável', fontWeight: 'bold' },
      { value: 'Horário Habitual', fontWeight: 'bold' },
      { value: 'Origem / Indicação', fontWeight: 'bold' },
      { value: 'Data de Início', fontWeight: 'bold' },
      { value: 'Data de Cadastro', fontWeight: 'bold' },
    ],
    ...patients.map((p) => {
      const guardianName =
        p.guardianName || (typeof p.legalGuardian === 'object' ? p.legalGuardian?.name : '') || '-';
      const guardianCpf =
        p.guardianCpf || (typeof p.legalGuardian === 'object' ? p.legalGuardian?.cpf : '') || '-';

      return [
        { value: sanitizeFormula(p.name) },
        { value: getPatientStatusLabel(p.status) },
        { value: p.preferredModality === 'online' ? 'Online' : 'Presencial' },
        { value: Number(p.agreedPrice || 0), type: Number, format: '#,##0.00' },
        { value: sanitizeFormula(p.cpf || '-') },
        { value: sanitizeFormula(p.rg || '-') },
        { value: p.birthDate ? formatDateBR(p.birthDate) : '-' },
        { value: sanitizeFormula(p.phone || '-') },
        { value: sanitizeFormula(p.email || '-') },
        { value: sanitizeFormula(p.profession || '-') },
        { value: sanitizeFormula(p.maritalStatus || '-') },
        { value: sanitizeFormula(p.address || '-') },
        { value: sanitizeFormula(p.emergencyContact?.name || '-') },
        { value: sanitizeFormula(p.emergencyContact?.phone || '-') },
        { value: sanitizeFormula(p.emergencyContact?.relationship || '-') },
        { value: sanitizeFormula(guardianName) },
        { value: sanitizeFormula(guardianCpf) },
        { value: sanitizeFormula(p.usualSchedule || '-') },
        { value: sanitizeFormula(p.referralSource || '-') },
        { value: p.startDate ? formatDateBR(p.startDate) : '-' },
        { value: p.createdAt ? formatDateBR(p.createdAt) : '-' },
      ];
    }),
  ];

  // 2. Aba Sessões & Consultas
  const sessionsSheetData: any[] = [
    [
      { value: 'Data', fontWeight: 'bold' },
      { value: 'Horário', fontWeight: 'bold' },
      { value: 'Paciente', fontWeight: 'bold' },
      { value: 'Modalidade', fontWeight: 'bold' },
      { value: 'Status da Sessão', fontWeight: 'bold' },
      { value: 'Valor (R$)', fontWeight: 'bold' },
      { value: 'Status Pagamento', fontWeight: 'bold' },
      { value: 'Prontuário Preenchido', fontWeight: 'bold' },
      { value: 'Anotações', fontWeight: 'bold' },
    ],
    ...sessions.map((s) => [
      { value: s.date ? formatDateBR(s.date) : '-' },
      { value: `${s.startTime || '--:--'} às ${s.endTime || '--:--'}` },
      { value: sanitizeFormula(s.patientName) },
      { value: s.modality === 'online' ? 'Online' : 'Presencial' },
      { value: getSessionStatusLabel(s.status) },
      { value: Number(s.price || 0), type: Number, format: '#,##0.00' },
      {
        value: s.paymentStatus === 'paid' ? 'Pago' : s.paymentStatus === 'pending' ? 'Pendente' : 'Isento',
      },
      { value: s.hasRecord ? 'Sim' : 'Não' },
      { value: sanitizeFormula((s.notes || '').replace(/[\r\n]+/g, ' ')) },
    ]),
  ];

  // 3. Aba Financeiro & Honorários
  const financialSheetData: any[] = [
    [
      { value: 'Data Referência', fontWeight: 'bold' },
      { value: 'Data Pagamento', fontWeight: 'bold' },
      { value: 'Data Vencimento', fontWeight: 'bold' },
      { value: 'Paciente', fontWeight: 'bold' },
      { value: 'CPF Paciente', fontWeight: 'bold' },
      { value: 'Valor (R$)', fontWeight: 'bold' },
      { value: 'Forma de Pagamento', fontWeight: 'bold' },
      { value: 'Status', fontWeight: 'bold' },
      { value: 'Recibo Fiscal', fontWeight: 'bold' },
      { value: 'Observações', fontWeight: 'bold' },
    ],
    ...payments.map((pay) => {
      const patient = patientMap.get(pay.patientId);
      const refDate = pay.sessionDate || pay.paidDate || pay.dueDate || pay.createdAt;

      return [
        { value: formatDateBR(refDate) },
        { value: pay.paidDate ? formatDateBR(pay.paidDate) : '-' },
        { value: pay.dueDate ? formatDateBR(pay.dueDate) : '-' },
        { value: sanitizeFormula(pay.patientName || patient?.name || 'Paciente') },
        { value: sanitizeFormula(patient?.cpf || '-') },
        { value: Number(pay.amount || 0), type: Number, format: '#,##0.00' },
        { value: (pay.paymentMethod || 'PIX').toUpperCase() },
        {
          value: pay.status === 'paid' ? 'Pago' : pay.status === 'pending' ? 'Pendente' : 'Isento',
        },
        { value: sanitizeFormula(pay.receiptNumber || '-') },
        { value: sanitizeFormula((pay.notes || '').replace(/[\r\n]+/g, ' ')) },
      ];
    }),
  ];

  // 4. Aba Escalas Psicométricas
  const assessmentsSheetData: any[] = [
    [
      { value: 'Data de Aplicação', fontWeight: 'bold' },
      { value: 'Paciente', fontWeight: 'bold' },
      { value: 'Tipo de Escala', fontWeight: 'bold' },
      { value: 'Pontuação Total', fontWeight: 'bold' },
      { value: 'Classificação / Severidade', fontWeight: 'bold' },
      { value: 'Observações Clínicas', fontWeight: 'bold' },
    ],
    ...assessments.map((a) => [
      { value: a.date ? formatDateBR(a.date) : '-' },
      { value: sanitizeFormula(a.patientName) },
      { value: a.type },
      { value: Number(a.totalScore || 0), type: Number },
      { value: sanitizeFormula(a.severity || '-') },
      { value: sanitizeFormula((a.notes || '').replace(/[\r\n]+/g, ' ')) },
    ]),
  ];

  const sheets: any[] = [
    {
      data: patientsSheetData,
      sheet: 'Pacientes',
      columns: [
        { width: 28 },
        { width: 20 },
        { width: 14 },
        { width: 20 },
        { width: 16 },
        { width: 14 },
        { width: 18 },
        { width: 18 },
        { width: 26 },
        { width: 18 },
        { width: 14 },
        { width: 30 },
        { width: 24 },
        { width: 18 },
        { width: 20 },
        { width: 24 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
      ],
    },
    {
      data: sessionsSheetData,
      sheet: 'Sessões',
      columns: [
        { width: 14 },
        { width: 16 },
        { width: 28 },
        { width: 14 },
        { width: 20 },
        { width: 16 },
        { width: 18 },
        { width: 20 },
        { width: 30 },
      ],
    },
    {
      data: financialSheetData,
      sheet: 'Financeiro',
      columns: [
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 28 },
        { width: 16 },
        { width: 16 },
        { width: 18 },
        { width: 14 },
        { width: 16 },
        { width: 30 },
      ],
    },
    {
      data: assessmentsSheetData,
      sheet: 'Escalas Psicométricas',
      columns: [
        { width: 18 },
        { width: 28 },
        { width: 16 },
        { width: 16 },
        { width: 26 },
        { width: 30 },
      ],
    },
  ];

  // 5. Aba Opcional: Prontuários & Evoluções Clínicas
  if (includeClinicalRecords && records.length > 0) {
    const recordsSheetData: any[] = [
      [
        { value: 'Data da Sessão', fontWeight: 'bold' },
        { value: 'Paciente', fontWeight: 'bold' },
        { value: 'Modalidade', fontWeight: 'bold' },
        { value: 'Temas Abordados', fontWeight: 'bold' },
        { value: 'Intervenções & Técnicas', fontWeight: 'bold' },
        { value: 'Estado Emocional', fontWeight: 'bold' },
        { value: 'Evolução Clínica', fontWeight: 'bold' },
        { value: 'Tarefas / Combinados', fontWeight: 'bold' },
        { value: 'Versão do Registro', fontWeight: 'bold' },
        { value: 'Última Atualização', fontWeight: 'bold' },
      ],
      ...records.map((r) => [
        { value: r.sessionDate ? formatDateBR(r.sessionDate) : '-' },
        { value: sanitizeFormula(r.patientName || patientMap.get(r.patientId)?.name || 'Paciente') },
        { value: r.modality === 'online' ? 'Online' : 'Presencial' },
        { value: sanitizeFormula((r.themes || '').replace(/[\r\n]+/g, ' ')) },
        { value: sanitizeFormula((r.interventions || '').replace(/[\r\n]+/g, ' ')) },
        { value: sanitizeFormula((r.emotionalState || '').replace(/[\r\n]+/g, ' ')) },
        { value: sanitizeFormula(r.evolution || '') },
        { value: sanitizeFormula((r.homework || '').replace(/[\r\n]+/g, ' ')) },
        { value: Number(r.version || 1), type: Number },
        { value: r.updatedAt ? formatDateBR(r.updatedAt) : '-' },
      ]),
    ];

    sheets.push({
      data: recordsSheetData,
      sheet: 'Prontuários Clínicos',
      columns: [
        { width: 16 },
        { width: 28 },
        { width: 14 },
        { width: 30 },
        { width: 30 },
        { width: 25 },
        { width: 50 },
        { width: 30 },
        { width: 16 },
        { width: 18 },
      ],
    });
  }

  const now = new Date().toISOString().slice(0, 10);
  const fileName = `clinica-ana-lima-completo-${now}.xlsx`;

  await writeXlsxFile(sheets).toFile(fileName);

  auditService.log('export_excel', {
    details: `Exportação de dados completa em Excel (.xlsx) contendo ${patients.length} pacientes, ${sessions.length} sessões, ${payments.length} honorários, ${assessments.length} escalas e ${includeClinicalRecords ? records.length : 0} prontuários`,
  });
}
