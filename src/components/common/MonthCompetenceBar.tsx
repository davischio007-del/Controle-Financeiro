import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export interface MonthCompetenceBarProps {
  selectedMonth: number; // 1 to 12
  selectedYear: number;
  onChangeMonth: (month: number, year: number) => void;
  title?: string;
  extraControls?: React.ReactNode;
}

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthCompetenceBar: React.FC<MonthCompetenceBarProps> = ({
  selectedMonth,
  selectedYear,
  onChangeMonth,
  title = 'Mês de Competência',
  extraControls,
}) => {
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onChangeMonth(12, selectedYear - 1);
    } else {
      onChangeMonth(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onChangeMonth(1, selectedYear + 1);
    } else {
      onChangeMonth(selectedMonth + 1, selectedYear);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onChangeMonth(now.getMonth() + 1, now.getFullYear());
  };

  const currentNow = new Date();
  const isCurrentMonth = selectedMonth === (currentNow.getMonth() + 1) && selectedYear === currentNow.getFullYear();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            {title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base font-black text-slate-800 dark:text-slate-100">
              {MONTH_NAMES_PT[selectedMonth - 1]} de {selectedYear}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all shadow-none hover:shadow-sm"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            {String(selectedMonth).padStart(2, '0')}/{selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all shadow-none hover:shadow-sm"
            title="Próximo Mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {!isCurrentMonth && (
          <button
            onClick={handleCurrentMonth}
            className="text-xs font-bold px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-xl transition-colors border border-emerald-200/60 dark:border-emerald-800"
          >
            Mês Atual
          </button>
        )}

        {extraControls}
      </div>
    </div>
  );
};
