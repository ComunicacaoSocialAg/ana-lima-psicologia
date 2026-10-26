import { jsPDF } from 'jspdf';
import { Patient, ClinicSettings, ClinicalRecord, Payment } from '../types';
import { auditService } from './auditService';
import { FinancialMetrics, formatBRL } from '../utils/financialAnalytics';

import { formatDateBR } from '../utils/dateUtils';
export { formatDateBR };

/**
 * Formata um conjunto de datas para exibição em texto no recibo
 * Ex: "19/09/2026" ou "05/09/2026, 12/09/2026 e 19/09/2026"
 */
export const formatSessionDatesListBR = (dates: string[]): { text: string; isPlural: boolean } => {
  if (!dates || dates.length === 0) {
    return {
      text: formatDateBR(new Date().toISOString()),
      isPlural: false,
    };
  }

  const brDates = dates
    .map(d => formatDateBR(d))
    .filter(Boolean);

  if (brDates.length === 1) {
    return { text: brDates[0], isPlural: false };
  }

  if (brDates.length === 2) {
    return { text: `${brDates[0]} e ${brDates[1]}`, isPlural: true };
  }

  const allExceptLast = brDates.slice(0, -1).join(', ');
  const last = brDates[brDates.length - 1];
  return { text: `${allExceptLast} e ${last}`, isPlural: true };
};

/**
 * Gera recibo de pagamento em formato PDF nos padrões do CFP e Receita Federal (IRPF/DMED)
 */
export function generateReceiptPdf(params: {
  patient: Patient;
  settings: ClinicSettings;
  amount: number;
  sessionDates: string[];
  receiptNumber: string;
  paymentMethod?: string;
}): void {
  const { patient, settings, amount, sessionDates, receiptNumber } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const emissionDateBR = formatDateBR(new Date().toISOString());

  // Header / Cabeçalho elegante (#004F3B)
  doc.setFillColor(0, 79, 59); // Verde escuro da clínica
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.psychologistName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Psicóloga Clínica | CRP: ${settings.crp} | CPF: ${settings.cpf}`,
    pageWidth / 2,
    19,
    { align: 'center' }
  );

  // Título do Documento
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO DE HONORÁRIOS PSICOLÓGICOS', pageWidth / 2, 42, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Recibo Nº: ${receiptNumber} | Data de Emissão: ${emissionDateBR}`,
    pageWidth / 2,
    48,
    { align: 'center' }
  );

  // Linha divisória
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 53, pageWidth - 20, 53);

  // Valor em Destaque
  doc.setFillColor(240, 253, 249);
  doc.roundedRect(20, 58, pageWidth - 40, 22, 3, 3, 'F');
  doc.setDrawColor(153, 246, 228);
  doc.roundedRect(20, 58, pageWidth - 40, 22, 3, 3, 'S');

  doc.setTextColor(15, 118, 110);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', 28, 71);
  doc.setFontSize(16);
  doc.text(
    `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    70,
    72
  );

  // Corpo do Recibo em Português do Brasil
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const { text: datesFormattedText, isPlural } = formatSessionDatesListBR(sessionDates);
  const dataLabel = isPlural ? 'nas seguintes datas' : 'na data de';

  const textBody =
    `Recebi de ${patient.name}, portador(a) do CPF ${patient.cpf || 'Não informado'}, ` +
    `a quantia de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, ` +
    `referente a serviços de atendimento psicológico clínico realizados ${dataLabel}: ${datesFormattedText}.`;

  const splitText = doc.splitTextToSize(textBody, pageWidth - 40);
  doc.text(splitText, 20, 92, { lineHeightFactor: 1.5 });

  // Nota legal sobre deduções fiscais e convênios
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Documento válido para comprovação de despesas com saúde para Declaração de Ajuste Anual do Imposto de Renda e reembolso em planos de saúde.',
    20,
    130,
    { maxWidth: pageWidth - 40 }
  );

  // Localidade e data por extenso
  const city = settings.address?.includes('Poços de Caldas')
    ? 'Poços de Caldas - MG'
    : settings.address?.split('-')[0]?.trim() || 'Poços de Caldas - MG';

  const today = new Date();
  const monthsBR = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const dateExtenso = `${city}, ${today.getDate()} de ${monthsBR[today.getMonth()]} de ${today.getFullYear()}`;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(dateExtenso, 20, 150);

  // Assinatura
  const sigY = 180;
  doc.setDrawColor(71, 85, 105);
  doc.line(pageWidth / 2 - 40, sigY, pageWidth / 2 + 40, sigY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(settings.psychologistName, pageWidth / 2, sigY + 6, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Psicóloga - CRP ${settings.crp}`, pageWidth / 2, sigY + 11, { align: 'center' });

  // Rodapé com contato e endereço
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 270, pageWidth - 20, 270);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const footerText = `${settings.address || 'Poços de Caldas/MG'} | Tel/WhatsApp: ${settings.phone} | E-mail: ${settings.email}`;
  doc.text(footerText, pageWidth / 2, 275, { align: 'center' });

  // Salva o PDF
  const filename = `Recibo_${patient.name.replace(/\s+/g, '_')}_${receiptNumber}.pdf`;
  doc.save(filename);
}

/**
 * Gera Declaração de Comparecimento com datas e horários em PT-BR
 */
export function generateAttendanceDeclaration(params: {
  patient: Patient;
  settings: ClinicSettings;
  sessionDate: string;
  startTime: string;
  endTime: string;
}): void {
  const { patient, settings, sessionDate, startTime, endTime } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const formattedSessionDate = formatDateBR(sessionDate);

  // Header
  doc.setFillColor(0, 79, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.psychologistName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Psicóloga Clínica | CRP: ${settings.crp}`, pageWidth / 2, 19, { align: 'center' });

  // Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARAÇÃO DE COMPARECIMENTO', pageWidth / 2, 50, { align: 'center' });

  // Body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const text =
    `Declaro para os devidos fins que ${patient.name}, portador(a) do CPF ${patient.cpf || 'Não informado'}, ` +
    `compareceu a atendimento psicológico clínico no dia ${formattedSessionDate}, no horário das ${startTime} às ${endTime}.`;

  const splitText = doc.splitTextToSize(text, pageWidth - 40);
  doc.text(splitText, 20, 75, { lineHeightFactor: 1.6 });

  doc.setFontSize(10);
  doc.text('Por ser a expressão da verdade, firmo a presente declaração.', 20, 110);

  // Localidade e data
  const city = settings.address?.includes('Poços de Caldas')
    ? 'Poços de Caldas - MG'
    : settings.address?.split('-')[0]?.trim() || 'Poços de Caldas - MG';

  const today = new Date();
  const monthsBR = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const dateExtenso = `${city}, ${today.getDate()} de ${monthsBR[today.getMonth()]} de ${today.getFullYear()}`;

  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(dateExtenso, 20, 130);

  // Date and Signature
  const sigY = 165;
  doc.setDrawColor(71, 85, 105);
  doc.line(pageWidth / 2 - 40, sigY, pageWidth / 2 + 40, sigY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.psychologistName, pageWidth / 2, sigY + 6, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Psicóloga - CRP ${settings.crp}`, pageWidth / 2, sigY + 11, { align: 'center' });

  const filename = `Declaracao_Comparecimento_${patient.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Exporta Prontuário Clínico Psicológico em PDF com histórico em PT-BR
 */
export function exportClinicalRecordsPdf(params: {
  patient: Patient;
  settings: ClinicSettings;
  records: ClinicalRecord[];
}): void {
  const { patient, settings, records } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 35;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `PRONTUÁRIO CLÍNICO PSICOLÓGICO - ${settings.psychologistName.toUpperCase()} (CRP ${settings.crp})`,
    pageWidth / 2,
    14,
    { align: 'center' }
  );

  // Patient Info Card
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Paciente: ${patient.name}`, 20, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `CPF: ${patient.cpf || 'N/I'} | Nasc: ${formatDateBR(patient.birthDate) || 'N/I'} | Início: ${formatDateBR(patient.startDate)} | Status: ${patient.status}`,
    20,
    currentY
  );
  currentY += 8;

  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 10;

  // Evoluções
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text(`REGISTRO CRONOLÓGICO DE SESSÕES (${records.length} registros)`, 20, currentY);
  currentY += 8;

  if (records.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum registro de evolução encontrado para este paciente.', 20, currentY);
  } else {
    records.forEach((rec, idx) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 25;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, currentY, pageWidth - 40, 7, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Sessão #${records.length - idx} - Data: ${formatDateBR(rec.sessionDate)} (${rec.modality.toUpperCase()}) | Versão: v${rec.version}`,
        23,
        currentY + 5
      );
      currentY += 10;

      if (rec.themes) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Temas / Demandas: ', 23, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(rec.themes, 60, currentY, { maxWidth: pageWidth - 85 });
        currentY += 6;
      }

      if (rec.evolution) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Evolução Clínica:', 23, currentY);
        currentY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const splitEv = doc.splitTextToSize(rec.evolution, pageWidth - 50);
        doc.text(splitEv, 23, currentY);
        currentY += splitEv.length * 4.5 + 6;
      }

      currentY += 4;
    });
  }

  const filename = `Prontuario_${patient.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);

  auditService.log('export_record_pdf', {
    patientId: patient.id,
    patientName: patient.name,
    details: `Exportação de Prontuário em PDF com ${records.length} evoluções clínicas`
  });
}

/**
 * Gera relatório financeiro e demonstrativo de receitas em PDF (Carnê-Leão / IRPF / Contabilidade)
 */
export function generateFinancialReportPdf(params: {
  settings: ClinicSettings;
  periodLabel: string;
  payments: Payment[];
  patients: Patient[];
  metrics: FinancialMetrics;
}): void {
  const { settings, periodLabel, payments, patients, metrics } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const emissionDateBR = formatDateBR(new Date().toISOString());
  const patientMap = new Map<string, Patient>();
  patients.forEach((p) => patientMap.set(p.id, p));

  const drawHeader = (pageNumber: number) => {
    // Faixa Superior Verde da Clínica (#004F3B)
    doc.setFillColor(0, 79, 59);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.psychologistName.toUpperCase(), 15, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Psicóloga Clínica • CRP: ${settings.crp} • CPF: ${settings.cpf || 'Não informado'}`,
      15,
      18
    );

    doc.setFontSize(8);
    doc.text(
      `Página ${pageNumber}`,
      pageWidth - 15,
      18,
      { align: 'right' }
    );
  };

  drawHeader(1);

  // Título do Relatório
  let currentY = 32;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMONSTRATIVO FINANCEIRO & LIVRO-CAIXA CLÍNICO', 15, currentY);

  currentY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Período Apurado: ${periodLabel} • Data de Emissão: ${emissionDateBR} • Emitido pelo Sistema da Clínica`,
    15,
    currentY
  );

  currentY += 8;

  // Quadro de Resumo de Indicadores
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, currentY, pageWidth - 30, 24, 2, 2, 'FD');

  const colWidth = (pageWidth - 30) / 4;

  // Coluna 1: Total Realizado
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITA REALIZADA (CAIXA)', 19, currentY + 7);
  doc.setTextColor(13, 148, 136); // teal-600
  doc.setFontSize(12);
  doc.text(formatBRL(metrics.totalReceived), 19, currentY + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.receivedCount} lançamentos quitados`, 19, currentY + 19);

  // Coluna 2: Total Pendente
  const c2X = 15 + colWidth;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('A RECEBER (PENDENTE)', c2X + 4, currentY + 7);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.setFontSize(12);
  doc.text(formatBRL(metrics.totalPending), c2X + 4, currentY + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.pendingCount} lançamentos em aberto`, c2X + 4, currentY + 19);

  // Coluna 3: Previsão Total
  const c3X = 15 + colWidth * 2;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FATURAMENTO TOTAL', c3X + 4, currentY + 7);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text(formatBRL(metrics.totalProjected), c3X + 4, currentY + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Taxa de quitação: ${metrics.collectionRate}%`, c3X + 4, currentY + 19);

  // Coluna 4: Ticket Médio
  const c4X = 15 + colWidth * 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKET MÉDIO / SESSÃO', c4X + 4, currentY + 7);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text(formatBRL(metrics.ticketAverage), c4X + 4, currentY + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Valor médio realizado', c4X + 4, currentY + 19);

  currentY += 32;

  // Título da Tabela
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Detalhamento dos Lançamentos (${payments.length})`, 15, currentY);

  currentY += 5;

  // Cabeçalho da Tabela
  const drawTableHeader = (y: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, y, pageWidth - 30, 7, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    doc.text('DATA', 18, y + 5);
    doc.text('PACIENTE', 42, y + 5);
    doc.text('CPF', 105, y + 5);
    doc.text('FORMA', 135, y + 5);
    doc.text('RECIBO', 156, y + 5);
    doc.text('VALOR', pageWidth - 18, y + 5, { align: 'right' });
  };

  drawTableHeader(currentY);
  currentY += 8;

  let pageIndex = 1;

  payments.forEach((pay, idx) => {
    // Quebra de página automática
    if (currentY > pageHeight - 25) {
      doc.addPage();
      pageIndex++;
      drawHeader(pageIndex);
      currentY = 32;
      drawTableHeader(currentY);
      currentY += 8;
    }

    const patient = patientMap.get(pay.patientId);
    const dateStr = formatDateBR(pay.paidDate || pay.dueDate || pay.createdAt);
    const patientName = (pay.patientName || patient?.name || 'Paciente').slice(0, 32);
    const cpf = patient?.cpf || '-';
    const method = (pay.paymentMethod || 'PIX').toUpperCase();
    const receipt = pay.receiptNumber || '-';
    const amountStr = formatBRL(pay.amount);

    // Linha zebrada
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY - 3.5, pageWidth - 30, 6, 'F');
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    doc.text(dateStr, 18, currentY);
    doc.text(patientName, 42, currentY);
    doc.text(cpf, 105, currentY);
    doc.text(method, 135, currentY);
    doc.text(receipt, 156, currentY);

    if (pay.status === 'paid') {
      doc.setTextColor(13, 148, 136);
    } else {
      doc.setTextColor(217, 119, 6);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(amountStr, pageWidth - 18, currentY, { align: 'right' });

    currentY += 6;
  });

  // Linha final divisória
  doc.setDrawColor(226, 232, 240);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 8;

  // Bloco de Encerramento e Assinatura
  if (currentY > pageHeight - 35) {
    doc.addPage();
    pageIndex++;
    drawHeader(pageIndex);
    currentY = 32;
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Demonstrativo gerado para controle gerencial, comprovação fiscal e conciliação do Carnê-Leão (Receita Federal do Brasil).',
    15,
    currentY
  );

  currentY += 15;

  const signLineX = pageWidth / 2 - 40;
  doc.setDrawColor(148, 163, 184);
  doc.line(signLineX, currentY, signLineX + 80, currentY);

  currentY += 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(settings.psychologistName, pageWidth / 2, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Psicóloga • CRP: ${settings.crp}`, pageWidth / 2, currentY, { align: 'center' });

  const safeFilename = `Demonstrativo_Financeiro_Ana_Lima_${periodLabel.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`;
  doc.save(safeFilename);

  auditService.log('export_financial_pdf', {
    details: `Exportação de Relatório Financeiro: ${periodLabel} com ${payments.length} lançamentos`
  });
}
