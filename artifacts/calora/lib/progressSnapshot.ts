import type { FoodLog, WeightEntry } from '@/context/CaloraContext';
import type { HealthDailyMetric } from '@/lib/health/weekHistory';
import { dateList } from '@/lib/dates';

export type ProgressSnapshotMetric = {
  value: string;
  detail: string;
  progress: number | null;
};

export type ProgressSnapshot = {
  dates: string[];
  nutritionDays: number;
  nutrition: ProgressSnapshotMetric;
  steps: ProgressSnapshotMetric;
  weight: ProgressSnapshotMetric;
};

function hasQualifiedNutrition(log: FoodLog): boolean {
  return [log.calories, log.protein, log.carbs, log.fat]
    .every((value) => Number.isFinite(value) && value >= 0);
}

/**
 * Builds the Today dashboard's seven-day Progress Snapshot from existing local
 * records and provider aggregates. Missing provider days remain missing rather
 * than being treated as zero activity.
 */
export function calculateProgressSnapshot(
  logs: readonly FoodLog[],
  dailyMetrics: readonly HealthDailyMetric[] | undefined,
  weights: readonly WeightEntry[],
  todayKey: string,
  dailyStepGoal: number,
): ProgressSnapshot {
  const dates = dateList(todayKey, 7);
  const dateSet = new Set(dates);
  const nutritionDates = new Set(
    logs.filter((log) => dateSet.has(log.date) && hasQualifiedNutrition(log)).map((log) => log.date),
  );
  const nutritionDays = nutritionDates.size;

  const recordedSteps = (dailyMetrics ?? [])
    .filter((metric) => dateSet.has(metric.date) && metric.steps !== null && Number.isFinite(metric.steps))
    .map((metric) => metric.steps as number);
  const averageSteps = recordedSteps.length
    ? Math.round(recordedSteps.reduce((sum, value) => sum + value, 0) / recordedSteps.length)
    : null;

  const weeklyWeights = weights.filter((weight) => dateSet.has(weight.date) && Number.isFinite(weight.kg) && weight.kg > 0);

  return {
    dates,
    nutritionDays,
    nutrition: {
      value: `${nutritionDays} day${nutritionDays === 1 ? '' : 's'}`,
      detail: nutritionDays ? `${nutritionDays} active day${nutritionDays === 1 ? '' : 's'}` : 'No nutrition days yet',
      progress: nutritionDays / 7,
    },
    steps: {
      value: averageSteps === null ? '—' : `${averageSteps.toLocaleString()} avg`,
      detail: recordedSteps.length ? `${recordedSteps.length}/7 days recorded` : 'Connect Health to track',
      progress: averageSteps === null || dailyStepGoal <= 0 ? null : Math.min(averageSteps / dailyStepGoal, 1),
    },
    weight: {
      value: weeklyWeights.length ? `${weeklyWeights.length} entr${weeklyWeights.length === 1 ? 'y' : 'ies'}` : '—',
      detail: weeklyWeights.length === 1 ? 'weigh-in this week' : weeklyWeights.length ? 'weigh-ins this week' : 'No weigh-ins yet',
      progress: null,
    },
  };
}
