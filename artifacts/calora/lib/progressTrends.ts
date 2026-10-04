import { dateFromKey, dateList } from '@/lib/dates';
import type { WaterLog } from '@/context/CaloraContext';
import type { HealthDailyMetric } from '@/lib/health/weekHistory';

export type ProgressTrendPoint = {
  date: string;
  label: string;
  value: number | null;
};

function weekdayLabel(date: string): string {
  const localDate = dateFromKey(date);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(localDate);
}

/**
 * Derives a seven-day provider trend. An absent provider aggregate remains
 * `null`, allowing the chart to show a gap instead of a fabricated zero.
 */
export function deriveWeeklyHealthTrend(
  metrics: readonly HealthDailyMetric[] | undefined,
  key: 'steps' | 'activeEnergyKcal',
  endDate: string,
): ProgressTrendPoint[] {
  const byDate = new Map(metrics?.map((metric) => [metric.date, metric]) ?? []);
  return dateList(endDate, 7).map((date) => ({
    date,
    label: weekdayLabel(date),
    value: byDate.get(date)?.[key] ?? null,
  }));
}

/**
 * Derives seven locally logged hydration points. Presence is checked by key so
 * an intentional measured zero stays distinct from an unlogged day.
 */
export function deriveWeeklyWaterTrend(waterLogs: WaterLog, endDate: string): ProgressTrendPoint[] {
  return dateList(endDate, 7).map((date) => ({
    date,
    label: weekdayLabel(date),
    value: Object.prototype.hasOwnProperty.call(waterLogs, date)
      ? waterLogs[date] ?? 0
      : null,
  }));
}
