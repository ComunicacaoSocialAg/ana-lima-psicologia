import React from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
} from 'lucide-react';
import { FinancialMetrics, formatBRL } from '../../utils/financialAnalytics';

interface FinancialMetricsCardsProps {
  metrics: FinancialMetrics;
  periodLabel: string;
  isPrivacyMode?: boolean;
}

export const FinancialMetricsCards: React.FC<FinancialMetricsCardsProps> = ({
  metrics,
  periodLabel,
  isPrivacyMode,
}) => {
  const privacyClass = isPrivacyMode ? 'privacy-blur select-none' : '';

  const hasComparative = metrics.diffVsPreviousPeriodPercentage !== null;
  const isPositiveGrowth =
    metrics.diffVsPreviousPeriodPercentage !== null &&
    metrics.diffVsPreviousPeriodPercentage >= 0;

  return (
    <div className="space-y-4">
      {/* Grade de 3 Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Receita Realizada (Caixa) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Receita Realizada (Caixa)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <p className={`text-2xl sm:text-3xl font-extrabold text-emerald-700 ${privacyClass}`}>
              {formatBRL(metrics.totalReceived)}
            </p>
          </div>

          {/* Comparativo vs período anterior */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {metrics.receivedCount} {metrics.receivedCount === 1 ? 'recebimento' : 'recebimentos'}
            </span>

            {hasComparative && (
              <span
                className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  isPositiveGrowth
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
                title={`Receita no período anterior: ${formatBRL(metrics.previousPeriodReceived || 0)}`}
              >
                {isPositiveGrowth ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {isPositiveGrowth ? '+' : ''}
                  {metrics.diffVsPreviousPeriodPercentage?.toFixed(1)}%
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Receita Pendente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pendente / Em Aberto
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <p className={`text-2xl sm:text-3xl font-extrabold text-amber-700 ${privacyClass}`}>
              {formatBRL(metrics.totalPending)}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {metrics.pendingCount} {metrics.pendingCount === 1 ? 'cobrança aguardando' : 'cobranças aguardando'}
            </span>
            <span className="text-amber-700 font-semibold text-[11px]">
              {metrics.totalProjected > 0
                ? `${Math.round((metrics.totalPending / metrics.totalProjected) * 100)}% em aberto`
                : '0%'}
            </span>
          </div>
        </div>

        {/* 3. Previsão Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faturamento Previsto
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <p className={`text-2xl sm:text-3xl font-extrabold text-slate-900 ${privacyClass}`}>
              {formatBRL(metrics.totalProjected)}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Projeção para {periodLabel}</span>
            <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full text-[11px]">
              {metrics.collectionRate}% quitado
            </span>
          </div>
        </div>
      </div>

      {/* Faixa Complementar: Ticket Médio e Eficiência */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-600 shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-medium">Ticket Médio / Atendimento</span>
            <strong className={`text-slate-800 text-sm ${privacyClass}`}>
              {formatBRL(metrics.ticketAverage)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-600 shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-medium">Volume Total de Lançamentos</span>
            <strong className="text-slate-800 text-sm">
              {metrics.totalCount} {metrics.totalCount === 1 ? 'registro' : 'registros'}
            </strong>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2 px-2 text-right">
          <span className="text-[11px] text-slate-400">Status do Ciclo:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
              metrics.collectionRate >= 80
                ? 'bg-emerald-100 text-emerald-800'
                : metrics.collectionRate >= 50
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
            }`}
          >
            {metrics.collectionRate >= 80
              ? 'Excelente Liquidez'
              : metrics.collectionRate >= 50
                ? 'Liquidação Regular'
                : 'Ciclo em Andamento'}
          </span>
        </div>
      </div>
    </div>
  );
};
