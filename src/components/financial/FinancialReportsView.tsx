import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Award,
} from 'lucide-react';
import { Payment } from '../../types';
import {
  FinancialPeriod,
  generateMonthlyHistory,
  generatePaymentMethodDistribution,
  generatePatientRevenueRanking,
  formatBRL,
  calculateFinancialMetrics,
  filterPaymentsByPeriod,
} from '../../utils/financialAnalytics';

interface FinancialReportsViewProps {
  allPayments: Payment[];
  periodPayments: Payment[];
  period: FinancialPeriod;
  isPrivacyMode?: boolean;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  allPayments,
  periodPayments,
  period,
  isPrivacyMode,
}) => {
  const privacyClass = isPrivacyMode ? 'privacy-blur select-none' : '';

  // Série histórica dos últimos 12 meses para o gráfico principal
  const monthlyData = React.useMemo(() => {
    return generateMonthlyHistory(allPayments, 12);
  }, [allPayments]);

  // Distribuição por meio de pagamento no período selecionado
  const methodData = React.useMemo(() => {
    return generatePaymentMethodDistribution(periodPayments);
  }, [periodPayments]);

  // Ranking de pacientes no período selecionado
  const patientRanking = React.useMemo(() => {
    return generatePatientRevenueRanking(periodPayments, 6);
  }, [periodPayments]);

  // Comparativo ano a ano (Ano atual vs Ano anterior)
  const annualComparison = React.useMemo(() => {
    const currentYear = period.year;
    const currentYearPayments = filterPaymentsByPeriod(allPayments, {
      type: 'year',
      year: currentYear,
      label: `Ano de ${currentYear}`,
    });

    const previousYearPayments = filterPaymentsByPeriod(allPayments, {
      type: 'year',
      year: currentYear - 1,
      label: `Ano de ${currentYear - 1}`,
    });

    const currMetrics = calculateFinancialMetrics(currentYearPayments);
    const prevMetrics = calculateFinancialMetrics(previousYearPayments);

    const diffAmount = currMetrics.totalReceived - prevMetrics.totalReceived;
    const diffPercentage =
      prevMetrics.totalReceived > 0
        ? (diffAmount / prevMetrics.totalReceived) * 100
        : currMetrics.totalReceived > 0
          ? 100
          : 0;

    return {
      currentYear,
      currentYearTotal: currMetrics.totalReceived,
      previousYear: currentYear - 1,
      previousYearTotal: prevMetrics.totalReceived,
      diffAmount,
      diffPercentage,
    };
  }, [allPayments, period.year]);

  return (
    <div className="space-y-6">
      {/* 1. Gráfico Principal: Evolução Mensal dos Últimos 12 Meses */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Evolução do Faturamento Mensal (Últimos 12 Meses)
            </h3>
            <p className="text-xs text-slate-500">
              Receita Realizada (quitada em caixa) versus Receita Pendente
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-teal-700">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              Realizado
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Pendente
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <XAxis
                dataKey="monthLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  isPrivacyMode ? '••••••' : formatBRL(Number(value)),
                  name === 'received' ? 'Realizado' : 'Pendente',
                ]}
                labelFormatter={(label) => `Competência: ${label}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="received"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                name="received"
              />
              <Bar
                dataKey="pending"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                name="pending"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Grid de Comparativo Anual & Distribuição por Meio de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Comparativo Anual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Comparativo de Exercício Anual ({annualComparison.currentYear} vs. {annualComparison.previousYear})
            </h3>
            <p className="text-xs text-slate-500">
              Desempenho acumulado de receitas entre os anos
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                Ano {annualComparison.previousYear}
              </span>
              <p className={`text-xl font-bold text-slate-700 mt-1 ${privacyClass}`}>
                {formatBRL(annualComparison.previousYearTotal)}
              </p>
              <span className="text-[11px] text-slate-400">Total apurado</span>
            </div>

            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100">
              <span className="text-[11px] text-teal-800 uppercase font-semibold">
                Ano {annualComparison.currentYear} (Vigente)
              </span>
              <p className={`text-xl font-bold text-teal-900 mt-1 ${privacyClass}`}>
                {formatBRL(annualComparison.currentYearTotal)}
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-teal-700 mt-0.5">
                <span>
                  {annualComparison.diffPercentage >= 0 ? '+' : ''}
                  {annualComparison.diffPercentage.toFixed(1)}% vs. {annualComparison.previousYear}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span>Diferença absoluta acumulada:</span>
            <strong
              className={`font-bold ${
                annualComparison.diffAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'
              } ${privacyClass}`}
            >
              {annualComparison.diffAmount >= 0 ? '+' : ''}
              {formatBRL(annualComparison.diffAmount)}
            </strong>
          </div>
        </div>

        {/* Card Formas de Pagamento no Período */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-teal-600" />
              Meios de Pagamento ({period.label})
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição percentual dos honorários quitados
            </p>
          </div>

          {methodData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum pagamento quitado registrado neste período.
            </div>
          ) : (
            <div className="space-y-3">
              {methodData.map((item) => (
                <div key={item.method} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label} ({item.count})
                    </span>
                    <span className="font-bold text-slate-800">
                      <span className={privacyClass}>{formatBRL(item.amount)}</span>{' '}
                      <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Maiores Atendimentos no Período Apurado */}
      {patientRanking.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-600" />
              Atendimentos de Maior Volume no Período ({period.label})
            </h3>
            <p className="text-xs text-slate-500">
              Pacientes com maior concentração de honorários quitados no intervalo
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patientRanking.map((p, idx) => (
              <div
                key={p.patientId}
                className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-teal-700 uppercase">
                    #{idx + 1}
                  </span>
                  <p className={`font-bold text-xs text-slate-800 ${privacyClass}`}>
                    {p.patientName}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {p.count} {p.count === 1 ? 'sessão' : 'sessões'} • {p.percentage}% da receita
                  </span>
                </div>

                <span className={`font-bold text-sm text-slate-900 ${privacyClass}`}>
                  {formatBRL(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
