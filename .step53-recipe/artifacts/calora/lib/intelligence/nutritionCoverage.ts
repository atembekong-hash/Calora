import type { FoodLog } from '@/context/CaloraContext';

export type NutritionSevenDayCoverage = {
  loggedDayCount: number;
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

/**
 * Counts observed local food-log dates only. It deliberately makes no claim
 * about food intake, adherence, or completeness on dates without records.
 */
export function calculateNutritionSevenDayCoverage(
  logs: readonly FoodLog[],
  todayKey: string,
  timezone: string,
): NutritionSevenDayCoverage | null {
  if (!hasValidTimezone(timezone)) return null;
  const start = addCalendarDays(todayKey, -6);
  if (!start) return null;

  const dates = new Set<string>();
  let qualifyingLogCount = 0;
  for (const log of logs) {
    if (!parseCalendarKey(log.date) || log.date > todayKey) return null;
    if (log.date < start) continue;
    dates.add(log.date);
    qualifyingLogCount += 1;
  }
  if (dates.size < 3) return null;
  return { loggedDayCount: dates.size, qualifyingLogCount, start, end: todayKey };
}
