import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Payment, Patient, ClinicSettings } from '../../types';
import {
  FinancialPeriod,
  FinancialMetrics,
  formatBRL,
} from '../../utils/financialAnalytics';
import { formatDateBR } from '../../utils/dateUtils';
import { exportPaymentsToCsv } from '../../utils/csvExport';
import { generateFinancialReportPdf } from '../../services/pdfService';

interface FinancialClosingViewProps {
  payments: Payment[];
  patients: Patient[];
  settings: ClinicSettings;
  period: FinancialPeriod;
  metrics: FinancialMetrics;
  isPrivacyMode?: boolean;
}

export const FinancialClosingView: React.FC<FinancialClosingViewProps> = ({
  payments,
  patients,
  settings,
  period,
  metrics,
  isPrivacyMode,
}) => {
  const privacyClass = isPrivacyMode ? 'privacy-blur select-none' : '';
  const patientMap = React.useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  // Apenas pagamentos quitados compõem a base tributável do Carnê-Leão (regime de caixa)
  const paidPayments = React.useMemo(() => {
    return payments
      .filter((p) => p.status === 'paid')
      .sort((a, b) => {
        const da = a.paidDate || a.dueDate;
        const db = b.paidDate || b.dueDate;
        return db.localeCompare(da);
      });
  }, [payments]);

  // Verificação de pacientes sem CPF cadastrado
  const patientsMissingCpf = React.useMemo(() => {
    const missing: { patientId: string; name: string; amount: number }[] = [];
    const seen = new Set<string>();

    paidPayments.forEach((p) => {
      const pat = patientMap.get(p.patientId);
      if ((!pat?.cpf || pat.cpf.trim() === '') && !seen.has(p.patientId)) {
        seen.add(p.patientId);
        missing.push({
          patientId: p.patientId,
          name: p.patientName || pat?.name || 'Paciente',
          amount: p.amount || 0,
        });
      }
    });

    return missing;
  }, [paidPayments, patientMap]);

  // Handler Exportar CSV
  const handleExportCsv = () => {
    exportPaymentsToCsv(paidPayments, patients, {
      periodLabel: period.label,
      filenamePrefix: 'carne-leao-ana-lima',
    });
  };

  // Handler Exportar PDF
  const handleExportPdf = () => {
    generateFinancialReportPdf({
      settings,
      periodLabel: period.label,
      payments: paidPayments,
      patients,
      metrics,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Fechamento Contábil */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-full">
            Livro-Caixa & Carnê-Leão • Receita Federal
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-2">
            Fechamento Fiscal do Período ({period.label})
          </h2>
          <p className="text-xs text-slate-500">
            Apuração sob regime de caixa para declaração de IRPF, DMED e envio à contabilidade.
          </p>
        </div>

        {/* Botões de Ação Rápida de Exportação */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            disabled={paidPayments.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV (Excel)</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={paidPayments.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Gerar Demonstrativo PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Dados Fiscais da Psicóloga & Resumo de Rendimentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
            <Building2 className="w-4 h-4 text-teal-600" />
            Profissional Titular
          </div>
          <p className="text-sm font-bold text-slate-800 mt-2">
            {settings.psychologistName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            CRP: <strong className="text-slate-700">{settings.crp}</strong> • CPF: <strong className="text-slate-700">{settings.cpf || 'Não informado'}</strong>
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Base Tributável (Caixa)
          </div>
          <p className={`text-2xl font-extrabold text-emerald-700 mt-2 ${privacyClass}`}>
            {formatBRL(metrics.totalReceived)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {paidPayments.length} honorários quitados em {period.label}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            Recibos Fiscais Emitidos
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">
            {paidPayments.filter((p) => p.receiptNumber).length} de {paidPayments.length}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Com número de recibo registrado no sistema
          </p>
        </div>
      </div>

      {/* 3. Alerta de Inconsistência Fiscal (Pacientes sem CPF) */}
      {patientsMissingCpf.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Atenção para o Carnê-Leão: {patientsMissingCpf.length}{' '}
              {patientsMissingCpf.length === 1 ? 'paciente possui' : 'pacientes possuem'} honorários quitados sem CPF cadastrado
            </span>
          </div>
          <p className="text-amber-800">
            A Receita Federal exige o CPF do paciente ou do responsável financeiro para a dedução no IRPF e prestação de contas na DMED.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {patientsMissingCpf.map((item) => (
              <span
                key={item.patientId}
                className="bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900 font-medium text-[11px]"
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Tabela Discriminada do Carnê-Leão */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              Demonstrativo de Entradas Quitadas ({paidPayments.length})
            </h3>
            <span className="text-xs text-slate-500">
              Ordenado por data decrescente de recebimento
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            Competência: {period.label}
          </span>
        </div>

        {paidPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum lançamento quitado encontrado para o período selecionado ({period.label}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">DATA QUITAÇÃO</th>
                  <th className="py-2.5 px-4">PACIENTE</th>
                  <th className="py-2.5 px-4">CPF</th>
                  <th className="py-2.5 px-4">RESPONSÁVEL</th>
                  <th className="py-2.5 px-4">FORMA</th>
                  <th className="py-2.5 px-4">Nº RECIBO</th>
                  <th className="py-2.5 px-4 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paidPayments.map((pay) => {
                  const pat = patientMap.get(pay.patientId);
                  const guardianName =
                    typeof pat?.legalGuardian === 'object'
                      ? pat.legalGuardian?.name || '-'
                      : '-';

                  return (
                    <tr
                      key={pay.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatDateBR(pay.paidDate || pay.dueDate)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className={privacyClass}>
                          {pay.patientName || pat?.name || 'Paciente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        <span className={privacyClass}>
                          {pat?.cpf || (
                            <span className="text-rose-600 font-bold">Sem CPF</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <span className={privacyClass}>{guardianName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {(pay.paymentMethod || 'PIX').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {pay.receiptNumber ? (
                          <span className="text-teal-700 font-semibold">
                            {pay.receiptNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                        <span className={privacyClass}>{formatBRL(pay.amount)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={6} className="py-3 px-4 text-right">
                    TOTAL APURADO NO PERÍODO:
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800 text-sm whitespace-nowrap">
                    <span className={privacyClass}>
                      {formatBRL(metrics.totalReceived)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
