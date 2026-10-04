import { dateFromKey, dateKey, dateList } from '@/lib/dates';

export const HEALTH_HISTORY_DAY_COUNT = 7;

/**
 * A provider-measured calendar-day aggregate. `null` means the provider did
 * not supply a measurement for that day; it is deliberately distinct from a
 * measured zero.
 */
export type HealthDailyMetric = {
  date: string;
  steps: number | null;
  activeEnergyKcal: number | null;
};

export type LocalHealthHistoryRange = {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  dates: string[];
};

function nonNegativeNumberOrNull(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateFromKey(value);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

/**
 * Returns seven device-local calendar days ending at `now`. The current day
 * ends at `now`; completed days end at their following local midnight so DST
 * boundaries stay provider-aligned.
 */
export function localHealthHistoryRange(
  now = new Date(),
  days = HEALTH_HISTORY_DAY_COUNT,
): LocalHealthHistoryRange {
  const dates = dateList(dateKey(now), days);
  const startDate = dateFromKey(dates[0]!);
  return {
    startDate,
    endDate: now,
    startTime: startDate.toISOString(),
    endTime: now.toISOString(),
    dates,
  };
}

/**
 * Produces an explicit seven-day series from provider aggregates. Missing
 * records remain `null`, so charts never invent zero activity or calories.
 */
export function buildHealthDailyMetrics(
  values: ReadonlyMap<string, Partial<Omit<HealthDailyMetric, 'date'>>>,
  now = new Date(),
): HealthDailyMetric[] {
  return localHealthHistoryRange(now).dates.map((date) => {
    const value = values.get(date);
    return {
      date,
      steps: nonNegativeNumberOrNull(value?.steps) ?? null,
      activeEnergyKcal: nonNegativeNumberOrNull(value?.activeEnergyKcal) ?? null,
    };
  });
}

/**
 * Normalizes persisted provider history defensively. It accepts only valid
 * local-date keys and finite non-negative values, keeps the newest seven
 * unique records, and drops malformed input rather than presenting it.
 */
export function normalizeHealthDailyMetrics(value: unknown): HealthDailyMetric[] {
  if (!Array.isArray(value)) return [];

  const byDate = new Map<string, HealthDailyMetric>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const metric = entry as Partial<HealthDailyMetric>;
    if (!validDateKey(metric.date)) continue;
    const steps = nonNegativeNumberOrNull(metric.steps);
    const activeEnergyKcal = nonNegativeNumberOrNull(metric.activeEnergyKcal);
    if (steps === undefined || activeEnergyKcal === undefined) continue;
    byDate.set(metric.date, { date: metric.date, steps, activeEnergyKcal });
  }

  return [...byDate.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-HEALTH_HISTORY_DAY_COUNT);
}

export function healthMetricForDate(
  metrics: readonly HealthDailyMetric[] | undefined,
  date: string,
): HealthDailyMetric | undefined {
  return metrics?.find((metric) => metric.date === date);
}
