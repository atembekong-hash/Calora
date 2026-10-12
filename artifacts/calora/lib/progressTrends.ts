import { addDays, dateFromKey, dateKey, dateList, type DateRange } from '@/lib/dates';
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


function bucketFor(range: DateRange): 'day' | 'week' | 'month' {
  const days = Math.round((dateFromKey(range.end).getTime() - dateFromKey(range.start).getTime()) / 86400000) + 1;
  return days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';
}
function bucketKey(date: string, bucket: 'day' | 'week' | 'month'): string {
  if (bucket === 'day') return date;
  const source = dateFromKey(date);
  if (bucket === 'month') return `${source.getFullYear()}-${String(source.getMonth() + 1).padStart(2, '0')}-01`;
  const weekStart = new Date(source);
  weekStart.setDate(source.getDate() - source.getDay());
  return dateKey(weekStart);
}
function rangePoints(values: Map<string, number | null>, range: DateRange): ProgressTrendPoint[] {
  const bucket = bucketFor(range);
  const keys: string[] = [];
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
    const key = bucketKey(date, bucket);
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys.map((key, index) => {
    const start = key < range.start ? range.start : key;
    const end = keys[index + 1] ? addDays(keys[index + 1], -1) : range.end;
    let total = 0; let present = false;
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const value = values.get(date);
      if (typeof value === 'number' && Number.isFinite(value)) { total += value; present = true; }
    }
    const localDate = dateFromKey(start);
    const label = bucket === 'day'
      ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }).format(localDate)
      : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(localDate);
    return { date: start, label, value: present ? Math.round(total) : null };
  });
}

export function deriveHealthTrend(metrics: readonly HealthDailyMetric[] | undefined, key: 'steps' | 'activeEnergyKcal', range: DateRange): ProgressTrendPoint[] {
  return rangePoints(new Map(metrics?.map((metric) => [metric.date, metric[key]]) ?? []), range);
}
export function deriveWaterTrend(waterLogs: WaterLog, range: DateRange): ProgressTrendPoint[] {
  return rangePoints(new Map(Object.entries(waterLogs).map(([date, value]) => [date, value ?? null] as const)), range);
}
export function deriveCalorieTrend(logs: readonly { date: string; calories: number }[], range: DateRange): ProgressTrendPoint[] {
  const values = new Map<string, number>();
  for (const log of logs) values.set(log.date, (values.get(log.date) ?? 0) + Math.max(0, Number(log.calories) || 0));
  return rangePoints(values, range);
}

export type MacroTrendPoint = ProgressTrendPoint & {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export function deriveMacroTrend(
  logs: readonly { date: string; protein: number; carbs: number; fat: number }[],
  range: DateRange,
): MacroTrendPoint[] {
  const protein = new Map<string, number>();
  const carbs = new Map<string, number>();
  const fat = new Map<string, number>();
  for (const log of logs) {
    protein.set(log.date, (protein.get(log.date) ?? 0) + Math.max(0, Number(log.protein) || 0));
    carbs.set(log.date, (carbs.get(log.date) ?? 0) + Math.max(0, Number(log.carbs) || 0));
    fat.set(log.date, (fat.get(log.date) ?? 0) + Math.max(0, Number(log.fat) || 0));
  }
  const proteinPoints = rangePoints(protein, range);
  const carbsPoints = rangePoints(carbs, range);
  const fatPoints = rangePoints(fat, range);
  return proteinPoints.map((point, index) => ({
    ...point,
    protein: point.value,
    carbs: carbsPoints[index]?.value ?? null,
    fat: fatPoints[index]?.value ?? null,
  }));
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
