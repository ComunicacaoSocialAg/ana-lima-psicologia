import { jsPDF } from 'jspdf';
import { Patient, ClinicSettings, ClinicalRecord } from '../types';
import { auditService } from './auditService';

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
