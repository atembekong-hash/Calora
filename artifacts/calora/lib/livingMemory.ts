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
  forgotten: {
    meals: string[];
    water: string[];
    mood: string[];
    activity: string[];
    planner: string[];
  };
};

export type LivingMemoryKind = 'meal' | 'water' | 'mood' | 'activity' | 'planner';

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
    forgotten: { meals: [], water: [], mood: [], activity: [], planner: [] },
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

function applyForgotten(memory: LivingMemory, forgotten: LivingMemory['forgotten']): LivingMemory {
  const next = {
    ...memory,
    forgotten: {
      meals: [...new Set(forgotten.meals)],
      water: [...new Set(forgotten.water)],
      mood: [...new Set(forgotten.mood)],
      activity: [...new Set(forgotten.activity)],
      planner: [...new Set(forgotten.planner)],
    },
  };
  next.forgotten.meals.forEach((id) => delete next.mealObservations[id]);
  next.forgotten.water.forEach((date) => delete next.waterObservations[date]);
  next.forgotten.mood.forEach((date) => delete next.moodObservations[date]);
  next.forgotten.activity.forEach((date) => delete next.activityObservations[date]);
  next.forgotten.planner.forEach((id) => delete next.plannerObservations[id]);
  return next;
}

export function mergeLivingMemory(saved: Partial<LivingMemory> | null | undefined, current: LivingMemory): LivingMemory {
  if (!saved || saved.schemaVersion !== LIVING_MEMORY_SCHEMA_VERSION) return current;
  return applyForgotten({
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
    forgotten: {
      meals: [],
      water: [],
      mood: [],
      activity: [],
      planner: [],
    },
  }, {
    meals: saved.forgotten?.meals ?? [],
    water: saved.forgotten?.water ?? [],
    mood: saved.forgotten?.mood ?? [],
    activity: saved.forgotten?.activity ?? [],
    planner: saved.forgotten?.planner ?? [],
  });
}

export function upsertMealObservation(memory: LivingMemory, id: string, date: string, meal: MealType): LivingMemory {
  return {
    ...memory,
    mealObservations: { ...memory.mealObservations, [id]: { date, meal } },
    forgotten: { ...memory.forgotten, meals: memory.forgotten.meals.filter((item) => item !== id) },
  };
}

export function removeMealObservation(memory: LivingMemory, id: string): LivingMemory {
  const { [id]: _removed, ...remaining } = memory.mealObservations;
  return { ...memory, mealObservations: remaining, forgotten: { ...memory.forgotten, meals: memory.forgotten.meals.filter((item) => item !== id) } };
}

export function upsertWaterObservation(memory: LivingMemory, date: string, ounces: number): LivingMemory {
  if (!Number.isFinite(ounces) || ounces <= 0) return memory;
  return {
    ...memory,
    waterObservations: { ...memory.waterObservations, [date]: { ounces } },
    forgotten: { ...memory.forgotten, water: memory.forgotten.water.filter((item) => item !== date) },
  };
}

export function upsertMoodObservation(memory: LivingMemory, date: string, mood: Mood): LivingMemory {
  return {
    ...memory,
    moodObservations: { ...memory.moodObservations, [date]: { mood } },
    forgotten: { ...memory.forgotten, mood: memory.forgotten.mood.filter((item) => item !== date) },
  };
}

export function upsertActivityObservation(memory: LivingMemory, date: string, activity: DailyActivity): LivingMemory {
  return {
    ...memory,
    activityObservations: { ...memory.activityObservations, [date]: { activity } },
    forgotten: { ...memory.forgotten, activity: memory.forgotten.activity.filter((item) => item !== date) },
  };
}

export function upsertPlannerObservations(memory: LivingMemory, meals: PlannerMeal[]): LivingMemory {
  const plannerObservations = { ...memory.plannerObservations };
  const forgotten = new Set(memory.forgotten.planner);
  meals.forEach((meal) => {
    if (!meal.day || meal.id.startsWith('starter-')) return;
    plannerObservations[meal.id] = { day: meal.day, meal: meal.meal };
    forgotten.delete(meal.id);
  });
  return { ...memory, plannerObservations, forgotten: { ...memory.forgotten, planner: [...forgotten] } };
}

export function replacePlannerObservations(memory: LivingMemory, meals: PlannerMeal[]): LivingMemory {
  const next = upsertPlannerObservations({ ...emptyLivingMemory(), forgotten: memory.forgotten }, meals);
  return { ...memory, plannerObservations: next.plannerObservations, forgotten: next.forgotten };
}

export function forgetLivingObservation(memory: LivingMemory, kind: LivingMemoryKind, id: string): LivingMemory {
  const next = {
    ...memory,
    forgotten: {
      ...memory.forgotten,
      meals: [...memory.forgotten.meals],
      water: [...memory.forgotten.water],
      mood: [...memory.forgotten.mood],
      activity: [...memory.forgotten.activity],
      planner: [...memory.forgotten.planner],
    },
  };
  const key = kind === 'meal' ? 'meals' : kind;
  if (!next.forgotten[key].includes(id)) next.forgotten[key].push(id);
  if (kind === 'meal') delete next.mealObservations[id];
  if (kind === 'water') delete next.waterObservations[id];
  if (kind === 'mood') delete next.moodObservations[id];
  if (kind === 'activity') delete next.activityObservations[id];
  if (kind === 'planner') delete next.plannerObservations[id];
  return next;
}