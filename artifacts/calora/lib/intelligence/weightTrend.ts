import type { WeightEntry } from '@/context/CaloraContext';

export type WeightTrendDirection = 'up' | 'down' | 'stable';

export type WeightShortTrend = {
  direction: WeightTrendDirection;
  deltaKg: number;
  entryCount: number;
  earlierEntryCount: number;
  recentEntryCount: number;
  start: string;
  end: string;
};

type DailyObservation = { date: string; kg: number };

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

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * Produces one conservative local observation from date-level medians only.
 * It intentionally rejects malformed/future input instead of guessing.
 */
export function calculateWeightShortTrend(
  weights: readonly WeightEntry[],
  todayKey: string,
  timezone: string,
): WeightShortTrend | null {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    return null;
  }
  const earlierStart = addCalendarDays(todayKey, -27);
  const earlierEnd = addCalendarDays(todayKey, -14);
  const recentStart = addCalendarDays(todayKey, -13);
  if (!earlierStart || !earlierEnd || !recentStart) return null;

  const byDate = new Map<string, number[]>();
  for (const weight of weights) {
    if (!parseCalendarKey(weight.date) || weight.date > todayKey || !Number.isFinite(weight.kg) || weight.kg <= 0) return null;
    if (weight.date < earlierStart || weight.date > todayKey) continue;
    const values = byDate.get(weight.date) ?? [];
    values.push(weight.kg);
    byDate.set(weight.date, values);
  }

  const observations: DailyObservation[] = [...byDate.entries()]
    .map(([date, values]) => ({ date, kg: median(values) }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const earlier = observations.filter((entry) => entry.date >= earlierStart && entry.date <= earlierEnd);
  const recent = observations.filter((entry) => entry.date >= recentStart && entry.date <= todayKey);
  if (observations.length < 4 || earlier.length < 2 || recent.length < 2) return null;

  const deltaKg = median(recent.map((entry) => entry.kg)) - median(earlier.map((entry) => entry.kg));
  return {
    direction: deltaKg >= 0.5 ? 'up' : deltaKg <= -0.5 ? 'down' : 'stable',
    deltaKg,
    entryCount: observations.length,
    earlierEntryCount: earlier.length,
    recentEntryCount: recent.length,
    start: earlierStart,
    end: todayKey,
  };
}