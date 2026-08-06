import type { DailyActivity, FoodLog, MealType, Mood, ActivityLog, MoodLog, WaterLog } from '@/context/CaloraContext';
import type { PlannerMeal } from '@workspace/api-client-react';

export const LIVING_MEMORY_SCHEMA_VERSION = 1;

export type LivingMemory = {
  schemaVersion: number;
  mealObservations: Record<string, { date: string; meal: MealType }>;
  waterObservations: Record<string, { ounces: number }>;
  moodObservations: Record<string, { mood: Mood }>;
  activityObservations: Record<string, { activity: DailyActivity }>;
  plannerObservations: Record<string, { day: string; meal: PlannerMeal['meal'] }>;
};

type LivingMemorySources = {
  logs: FoodLog[];
  waterLogs: WaterLog;
  moodLogs: MoodLog;
  activityLogs: ActivityLog;
  plannerMeals: PlannerMeal[];
};

export function emptyLivingMemory(): LivingMemory {
  return {
    schemaVersion: LIVING_MEMORY_SCHEMA_VERSION,
    mealObservations: {},
    waterObservations: {},
    moodObservations: {},
    activityObservations: {},
    plannerObservations: {},
  };
}

export function buildLivingMemory(sources: LivingMemorySources): LivingMemory {
  const memory = emptyLivingMemory();
  sources.logs.forEach((log) => {
    memory.mealObservations[log.id] = { date: log.date, meal: log.meal };
  });
  Object.entries(sources.waterLogs).forEach(([date, ounces]) => {
    if (ounces > 0) memory.waterObservations[date] = { ounces };
  });
  Object.entries(sources.moodLogs).forEach(([date, mood]) => {
    memory.moodObservations[date] = { mood };
  });
  Object.entries(sources.activityLogs).forEach(([date, activity]) => {
    memory.activityObservations[date] = { activity };
  });
  sources.plannerMeals.forEach((meal) => {
    if (!meal.day || meal.id.startsWith('starter-')) return;
    memory.plannerObservations[meal.id] = { day: meal.day, meal: meal.meal };
  });
  return memory;
}

export function mergeLivingMemory(saved: Partial<LivingMemory> | null | undefined, current: LivingMemory): LivingMemory {
  if (!saved || saved.schemaVersion !== LIVING_MEMORY_SCHEMA_VERSION) return current;
  return {
    schemaVersion: LIVING_MEMORY_SCHEMA_VERSION,
    mealObservations: Object.fromEntries(
      Object.entries(current.mealObservations).map(([id, observation]) => [
        id,
        { ...saved.mealObservations?.[id], ...observation },
      ]),
    ),
    waterObservations: Object.fromEntries(
      Object.entries(current.waterObservations).map(([date, observation]) => [
        date,
        { ...saved.waterObservations?.[date], ...observation },
      ]),
    ),
    moodObservations: Object.fromEntries(
      Object.entries(current.moodObservations).map(([date, observation]) => [
        date,
        { ...saved.moodObservations?.[date], ...observation },
      ]),
    ),
    activityObservations: Object.fromEntries(
      Object.entries(current.activityObservations).map(([date, observation]) => [
        date,
        { ...saved.activityObservations?.[date], ...observation },
      ]),
    ),
    plannerObservations: Object.fromEntries(
      Object.entries(current.plannerObservations).map(([id, observation]) => [
        id,
        { ...saved.plannerObservations?.[id], ...observation },
      ]),
    ),
  };
}

export function upsertMealObservation(memory: LivingMemory, id: string, date: string, meal: MealType): LivingMemory {
  return { ...memory, mealObservations: { ...memory.mealObservations, [id]: { date, meal } } };
}

export function removeMealObservation(memory: LivingMemory, id: string): LivingMemory {
  const { [id]: _removed, ...remaining } = memory.mealObservations;
  return { ...memory, mealObservations: remaining };
}

export function upsertWaterObservation(memory: LivingMemory, date: string, ounces: number): LivingMemory {
  if (!Number.isFinite(ounces) || ounces <= 0) return memory;
  return { ...memory, waterObservations: { ...memory.waterObservations, [date]: { ounces } } };
}

export function upsertMoodObservation(memory: LivingMemory, date: string, mood: Mood): LivingMemory {
  return { ...memory, moodObservations: { ...memory.moodObservations, [date]: { mood } } };
}

export function upsertActivityObservation(memory: LivingMemory, date: string, activity: DailyActivity): LivingMemory {
  return { ...memory, activityObservations: { ...memory.activityObservations, [date]: { activity } } };
}

export function upsertPlannerObservations(memory: LivingMemory, meals: PlannerMeal[]): LivingMemory {
  const plannerObservations = { ...memory.plannerObservations };
  meals.forEach((meal) => {
    if (!meal.day || meal.id.startsWith('starter-')) return;
    plannerObservations[meal.id] = { day: meal.day, meal: meal.meal };
  });
  return { ...memory, plannerObservations };
}

export function replacePlannerObservations(memory: LivingMemory, meals: PlannerMeal[]): LivingMemory {
  return { ...memory, plannerObservations: upsertPlannerObservations(emptyLivingMemory(), meals).plannerObservations };
}