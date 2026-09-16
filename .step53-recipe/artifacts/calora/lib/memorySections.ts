/**
 * Pure helpers that compute the row-data items for each MemorySection.
 *
 * Each function returns an array whose `.length` is exactly what
 * `React.Children.count()` sees when the array is spread as children —
 * zero means the section header is suppressed by the Children.count guard.
 */
import type { DailyActivity, MealType, Mood } from '@/context/CaloraContext';
import type { LivingMemory } from './livingMemory';
import { isStaleDate } from './memoryDateHelpers';

export type DiaryRow = { kind: 'meal'; id: string; date: string; meal: MealType; isStale: boolean };
export type WellnessRow =
  | { kind: 'water'; key: string; date: string; ounces: number; isStale: boolean }
  | { kind: 'mood'; key: string; date: string; mood: Mood; isStale: boolean }
  | { kind: 'activity'; key: string; date: string; activity: DailyActivity; isStale: boolean };
export type PlannerRow = { kind: 'planner'; id: string; day: string; meal: string; isStale: boolean };

/**
 * Row data for the "Diary signals" MemorySection.
 * length === 0  ↔  Children.count === 0  ↔  section header hidden.
 */
export function buildDiaryRows(memory: LivingMemory): DiaryRow[] {
  return Object.entries(memory.mealObservations)
    .map(([id, obs]) => ({ kind: 'meal' as const, id, date: obs.date, meal: obs.meal, isStale: isStaleDate(obs.date) }))
    .sort((a, b) => (a.isStale ? 1 : 0) - (b.isStale ? 1 : 0));
}

/**
 * Row data for the "Wellness check-ins" MemorySection.
 * length === 0  ↔  Children.count === 0  ↔  section header hidden.
 */
export function buildWellnessRows(memory: LivingMemory): WellnessRow[] {
  const rows: WellnessRow[] = [
    ...Object.entries(memory.waterObservations).map(([date, obs]) => ({
      kind: 'water' as const,
      key: `water-${date}`,
      date,
      ounces: obs.ounces,
      isStale: isStaleDate(date),
    })),
    ...Object.entries(memory.moodObservations).map(([date, obs]) => ({
      kind: 'mood' as const,
      key: `mood-${date}`,
      date,
      mood: obs.mood,
      isStale: isStaleDate(date),
    })),
    ...Object.entries(memory.activityObservations).map(([date, obs]) => ({
      kind: 'activity' as const,
      key: `activity-${date}`,
      date,
      activity: obs.activity,
      isStale: isStaleDate(date),
    })),
  ];
  return rows.sort((a, b) => (a.isStale ? 1 : 0) - (b.isStale ? 1 : 0));
}

/**
 * Row data for the "Planning signals" MemorySection.
 * length === 0  ↔  Children.count === 0  ↔  section header hidden.
 */
export function buildPlannerRows(memory: LivingMemory): PlannerRow[] {
  return Object.entries(memory.plannerObservations)
    .map(([id, obs]) => ({ kind: 'planner' as const, id, day: obs.day, meal: obs.meal, isStale: isStaleDate(obs.day) }))
    .sort((a, b) => (a.isStale ? 1 : 0) - (b.isStale ? 1 : 0));
}
