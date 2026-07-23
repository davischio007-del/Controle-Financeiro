export type PeriodPreset =
  | 'hoje'
  | 'ontem'
  | 'esta_semana'
  | 'semana_passada'
  | 'este_mes'
  | 'mes_anterior'
  | 'ultimos_30'
  | 'ultimos_90'
  | 'este_ano'
  | 'ano_anterior'
  | 'personalizado';

export interface PeriodFilterState {
  preset: PeriodPreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  esta_semana: 'Esta semana',
  semana_passada: 'Semana passada',
  este_mes: 'Este mês',
  mes_anterior: 'Mês anterior',
  ultimos_30: 'Últimos 30 dias',
  ultimos_90: 'Últimos 90 dias',
  este_ano: 'Este ano',
  ano_anterior: 'Ano anterior',
  personalizado: 'Período personalizado',
};

function formatDateIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getPresetDates(preset: PeriodPreset, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();
  
  switch (preset) {
    case 'hoje': {
      const todayStr = formatDateIso(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'ontem': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateIso(yest);
      return { startDate: yestStr, endDate: yestStr };
    }
    case 'esta_semana': {
      const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
      const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const mon = new Date(now);
      mon.setDate(mon.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      return { startDate: formatDateIso(mon), endDate: formatDateIso(sun) };
    }
    case 'semana_passada': {
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) - 7;
      const prevMon = new Date(now);
      prevMon.setDate(prevMon.getDate() + diffToMon);
      const prevSun = new Date(prevMon);
      prevSun.setDate(prevSun.getDate() + 6);
      return { startDate: formatDateIso(prevMon), endDate: formatDateIso(prevSun) };
    }
    case 'este_mes': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatDateIso(firstDay), endDate: formatDateIso(lastDay) };
    }
    case 'mes_anterior': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDateIso(firstDay), endDate: formatDateIso(lastDay) };
    }
    case 'ultimos_30': {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 30);
      return { startDate: formatDateIso(past30), endDate: formatDateIso(now) };
    }
    case 'ultimos_90': {
      const past90 = new Date(now);
      past90.setDate(past90.getDate() - 90);
      return { startDate: formatDateIso(past90), endDate: formatDateIso(now) };
    }
    case 'este_ano': {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      return { startDate: formatDateIso(firstDay), endDate: formatDateIso(lastDay) };
    }
    case 'ano_anterior': {
      const firstDay = new Date(now.getFullYear() - 1, 0, 1);
      const lastDay = new Date(now.getFullYear() - 1, 11, 31);
      return { startDate: formatDateIso(firstDay), endDate: formatDateIso(lastDay) };
    }
    case 'personalizado':
    default: {
      const todayStr = formatDateIso(now);
      return {
        startDate: customStart || todayStr,
        endDate: customEnd || todayStr,
      };
    }
  }
}

const STORAGE_KEY = 'fin_app_period_filter_v2';

export function loadSavedPeriodFilter(): PeriodFilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.preset) {
        const computed = getPresetDates(parsed.preset, parsed.startDate, parsed.endDate);
        return {
          preset: parsed.preset,
          startDate: computed.startDate,
          endDate: computed.endDate,
        };
      }
    }
  } catch (e) {
    console.error('Error loading saved period filter', e);
  }
  // Default to este_mes
  const def = getPresetDates('este_mes');
  return {
    preset: 'este_mes',
    startDate: def.startDate,
    endDate: def.endDate,
  };
}

export function savePeriodFilter(state: PeriodFilterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving period filter', e);
  }
}

export function isDateInRange(dateStr: string | undefined | null, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  // standard ISO YYYY-MM-DD string comparison works for YYYY-MM-DD formatted strings!
  const cleanDate = dateStr.split('T')[0];
  return cleanDate >= startDate && cleanDate <= endDate;
}
