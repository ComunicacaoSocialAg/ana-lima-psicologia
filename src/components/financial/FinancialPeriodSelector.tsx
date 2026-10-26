import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  FinancialPeriod,
  PeriodType,
  getMonthNameBR,
} from '../../utils/financialAnalytics';

interface FinancialPeriodSelectorProps {
  period: FinancialPeriod;
  onPeriodChange: (newPeriod: FinancialPeriod) => void;
}

export const FinancialPeriodSelector: React.FC<FinancialPeriodSelectorProps> = ({
  period,
  onPeriodChange,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Navega para o mês/ano anterior
  const handlePrev = () => {
    if (period.type === 'month') {
      const m = period.month ?? currentMonth;
      const y = period.year;
      if (m === 1) {
        onPeriodChange({
          type: 'month',
          year: y - 1,
          month: 12,
          label: `${getMonthNameBR(12)} de ${y - 1}`,
        });
      } else {
        onPeriodChange({
          type: 'month',
          year: y,
          month: m - 1,
          label: `${getMonthNameBR(m - 1)} de ${y}`,
        });
      }
    } else if (period.type === 'year') {
      onPeriodChange({
        type: 'year',
        year: period.year - 1,
        label: `Ano de ${period.year - 1}`,
      });
    }
  };

  // Navega para o próximo mês/ano
  const handleNext = () => {
    if (period.type === 'month') {
      const m = period.month ?? currentMonth;
      const y = period.year;
      if (m === 12) {
        onPeriodChange({
          type: 'month',
          year: y + 1,
          month: 1,
          label: `${getMonthNameBR(1)} de ${y + 1}`,
        });
      } else {
        onPeriodChange({
          type: 'month',
          year: y,
          month: m + 1,
          label: `${getMonthNameBR(m + 1)} de ${y}`,
        });
      }
    } else if (period.type === 'year') {
      onPeriodChange({
        type: 'year',
        year: period.year + 1,
        label: `Ano de ${period.year + 1}`,
      });
    }
  };

  // Atalhos rápidos
  const setQuickPeriod = (type: PeriodType) => {
    if (type === 'month') {
      onPeriodChange({
        type: 'month',
        year: currentYear,
        month: currentMonth,
        label: `${getMonthNameBR(currentMonth)} de ${currentYear}`,
      });
    } else if (type === 'year') {
      onPeriodChange({
        type: 'year',
        year: currentYear,
        label: `Ano de ${currentYear}`,
      });
    } else if (type === 'last12months') {
      onPeriodChange({
        type: 'last12months',
        year: currentYear,
        label: 'Últimos 12 Meses',
      });
    } else if (type === 'all') {
      onPeriodChange({
        type: 'all',
        year: currentYear,
        label: 'Todo o Histórico',
      });
    } else if (type === 'custom') {
      const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const today = now.toISOString().slice(0, 10);
      onPeriodChange({
        type: 'custom',
        year: currentYear,
        startDate: firstDayOfMonth,
        endDate: today,
        label: 'Período Personalizado',
      });
    }
  };

  const isCurrentMonthActive =
    period.type === 'month' &&
    period.year === currentYear &&
    period.month === currentMonth;

  const isLastMonthActive =
    period.type === 'month' &&
    (currentMonth === 1
      ? period.year === currentYear - 1 && period.month === 12
      : period.year === currentYear && period.month === currentMonth - 1);

  const isCurrentYearActive =
    period.type === 'year' && period.year === currentYear;

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navegador Principal com Setas < [Período] > */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrev}
              disabled={period.type !== 'month' && period.type !== 'year'}
              title="Período anterior"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 flex items-center gap-2 text-slate-800 font-bold text-sm min-w-[170px] justify-center">
              <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{period.label}</span>
            </div>

            <button
              onClick={handleNext}
              disabled={period.type !== 'month' && period.type !== 'year'}
              title="Próximo período"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {(period.type === 'month' || period.type === 'year') && (
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Use as setas para alternar
            </span>
          )}
        </div>

        {/* Pílulas de Atalho Rápido */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setQuickPeriod('month')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              isCurrentMonthActive
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Mês Atual
          </button>

          <button
            onClick={() => {
              const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
              const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
              onPeriodChange({
                type: 'month',
                year: prevY,
                month: prevM,
                label: `${getMonthNameBR(prevM)} de ${prevY}`,
              });
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              isLastMonthActive
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Mês Anterior
          </button>

          <button
            onClick={() => setQuickPeriod('year')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              isCurrentYearActive
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ano {currentYear}
          </button>

          <button
            onClick={() => setQuickPeriod('last12months')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              period.type === 'last12months'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            12 Meses
          </button>

          <button
            onClick={() => setQuickPeriod('custom')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              period.type === 'custom'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Personalizado
          </button>

          <button
            onClick={() => setQuickPeriod('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              period.type === 'all'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Histórico Completo
          </button>
        </div>
      </div>

      {/* Barra de Período Personalizado (quando ativo) */}
      {period.type === 'custom' && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50/60 p-3 rounded-xl">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            Intervalo de Datas:
          </span>

          <div className="flex items-center gap-2">
            <label className="text-slate-500">De:</label>
            <input
              type="date"
              value={period.startDate || ''}
              onChange={(e) =>
                onPeriodChange({
                  ...period,
                  startDate: e.target.value,
                  label: `De ${e.target.value} até ${period.endDate || 'hoje'}`,
                })
              }
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500">Até:</label>
            <input
              type="date"
              value={period.endDate || ''}
              onChange={(e) =>
                onPeriodChange({
                  ...period,
                  endDate: e.target.value,
                  label: `De ${period.startDate || 'início'} até ${e.target.value}`,
                })
              }
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
