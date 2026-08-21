import type { FoodLog } from '@/context/CaloraContext';

export type MacroRecordCoverage = {
  qualifiedDayCount: number;
  qualifyingLogCount: number;
  start: string;
  end: string;
};

function parseCalendarKey(key: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function addCalendarDays(key: string, days: number): string | null {
  const parsed = parseCalendarKey(key);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, '0')}-${`${date.getUTCDate()}`.padStart(2, '0')}`;
}

function hasValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function hasCompleteMacroRecord(log: FoodLog): boolean {
  return [log.calories, log.protein, log.carbs, log.fat]
    .every((value) => Number.isFinite(value) && value >= 0);
}

/**
 * Counts only observed dates whose stored food records all contain valid macro
 * fields. It makes no claim about meals, diet quality, or unlogged dates.
 */
export function calculateSevenDayMacroRecordCoverage(
  logs: readonly FoodLog[],
  todayKey: string,
  timezone: string,
): MacroRecordCoverage | null {
  if (!hasValidTimezone(timezone)) return null;
  const start = addCalendarDays(todayKey, -6);
  if (!start) return null;

  const dateStates = new Map<string, { count: number; complete: boolean }>();
  for (const log of logs) {
    if (!parseCalendarKey(log.date) || log.date > todayKey) return null;
    if (log.date < start) continue;
    if (!hasCompleteMacroRecord(log)) return null;
    const state = dateStates.get(log.date) ?? { count: 0, complete: true };
    state.count += 1;
    state.complete = state.complete && hasCompleteMacroRecord(log);
    dateStates.set(log.date, state);
  }

  const qualified = [...dateStates.values()].filter((state) => state.complete);
  if (qualified.length < 3) return null;
  return {
    qualifiedDayCount: qualified.length,
    qualifyingLogCount: qualified.reduce((total, state) => total + state.count, 0),
    start,
    end: todayKey,
  };
}