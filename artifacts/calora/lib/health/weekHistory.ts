import { dateFromKey, dateKey, dateList } from '@/lib/dates';

export const HEALTH_HISTORY_DAY_COUNT = 7;
export const HEALTH_TREND_DAY_COUNT = 60;

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

export type HealthHourlyMetric = {
  hour: string;
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
  days = HEALTH_HISTORY_DAY_COUNT,
): HealthDailyMetric[] {
  return localHealthHistoryRange(now, days).dates.map((date) => {
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
export function normalizeHealthDailyMetrics(value: unknown, maxDays = HEALTH_HISTORY_DAY_COUNT): HealthDailyMetric[] {
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
    .slice(-maxDays);
}

export function healthMetricForDate(
  metrics: readonly HealthDailyMetric[] | undefined,
  date: string,
): HealthDailyMetric | undefined {
  return metrics?.find((metric) => metric.date === date);
}

export function buildHealthHourlyMetrics(
  values: ReadonlyMap<string, Partial<Omit<HealthHourlyMetric, 'hour'>>>,
  now = new Date(),
): HealthHourlyMetric[] {
  const today = dateKey(now);
  return [...values.entries()]
    .filter(([hour]) => /^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(hour) && hour.slice(0, 10) === today)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([hour, value]) => ({
      hour,
      steps: nonNegativeNumberOrNull(value.steps) ?? null,
      activeEnergyKcal: nonNegativeNumberOrNull(value.activeEnergyKcal) ?? null,
    }));
}

export function normalizeHealthHourlyMetrics(value: unknown, now = new Date()): HealthHourlyMetric[] {
  if (!Array.isArray(value)) return [];
  const byHour = new Map<string, HealthHourlyMetric>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const metric = entry as Partial<HealthHourlyMetric>;
    if (typeof metric.hour !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(metric.hour) || metric.hour.slice(0, 10) !== dateKey(now)) continue;
    const steps = nonNegativeNumberOrNull(metric.steps);
    const activeEnergyKcal = nonNegativeNumberOrNull(metric.activeEnergyKcal);
    if (steps === undefined || activeEnergyKcal === undefined) continue;
    byHour.set(metric.hour, { hour: metric.hour, steps, activeEnergyKcal });
  }
  return [...byHour.values()].sort((left, right) => left.hour.localeCompare(right.hour));
}

export function normalizeHealthTrendMetrics(value: unknown): HealthDailyMetric[] {
  return normalizeHealthDailyMetrics(value, HEALTH_TREND_DAY_COUNT);
}
