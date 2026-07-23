import React from 'react';
import { PeriodPreset, PeriodFilterState, PRESET_LABELS, getPresetDates, savePeriodFilter } from '../../lib/periodFilter';
import { Calendar, Filter } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface PeriodFilterBarProps {
  filterState: PeriodFilterState;
  onChange: (newState: PeriodFilterState) => void;
  className?: string;
  showGranularity?: boolean;
  granularity?: 'Diário' | 'Semanal' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  onGranularityChange?: (g: 'Diário' | 'Semanal' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual') => void;
}

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({
  filterState,
  onChange,
  className = '',
  showGranularity = false,
  granularity = 'Mensal',
  onGranularityChange,
}) => {
  const handlePresetSelect = (preset: PeriodPreset) => {
    let start = filterState.startDate;
    let end = filterState.endDate;
    if (preset !== 'personalizado') {
      const dates = getPresetDates(preset);
      start = dates.startDate;
      end = dates.endDate;
    }
    const newState: PeriodFilterState = {
      preset,
      startDate: start,
      endDate: end,
    };
    savePeriodFilter(newState);
    onChange(newState);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', val: string) => {
    const newState: PeriodFilterState = {
      ...filterState,
      preset: 'personalizado',
      [field]: val,
    };
    savePeriodFilter(newState);
    onChange(newState);
  };

  return (
    <div
      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${className}`}
    >
      {/* Left: Current Filter Indicator */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período Ativo</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              {PRESET_LABELS[filterState.preset] || 'Personalizado'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {formatDate(filterState.startDate)} até {formatDate(filterState.endDate)}
          </p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Quick Presets Dropdown */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterState.preset}
            onChange={(e) => handlePresetSelect(e.target.value as PeriodPreset)}
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((key) => (
              <option key={key} value={key}>
                {PRESET_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Range Date Pickers */}
        {filterState.preset === 'personalizado' && (
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <input
              type="date"
              value={filterState.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              value={filterState.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-200"
            />
          </div>
        )}

        {/* Optional Chart Granularity Selector */}
        {showGranularity && onGranularityChange && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400">Visão:</span>
            <select
              value={granularity}
              onChange={(e) => onGranularityChange(e.target.value as any)}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="Diário">Diário</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensal">Mensal</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
