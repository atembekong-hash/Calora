import type { CoachContext } from '@workspace/api-client-react';
import type {
  ActivityLog,
  CaloraRecipe,
  FoodLog,
  MoodLog,
  Profile,
  SavedMeal,
  ShoppingItem,
  WeightEntry,
  WaterLog,
} from '@/context/CaloraContext';
import type { AcceptedFoodMemory, RepeatPattern } from '@/lib/foodMemory';

type PlannerLike = { day: string; meal: string; name: string };

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dayKey(date);
}

function dateRange(days: number) {
  return { start: dateDaysAgo(days - 1), end: dayKey(new Date()) };
}

function buildDateList(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return dayKey(date);
  });
}

function sumLogs(logs: FoodLog[]) {
  return logs.reduce((total, log) => ({
    calories: total.calories + log.calories,
    proteinG: total.proteinG + log.protein,
    carbsG: total.carbsG + log.carbs,
    fatG: total.fatG + log.fat,
    fiberG: total.fiberG + (log.fiber ?? 0),
    sugarG: total.sugarG + (log.sugar ?? 0),
    sodiumMg: total.sodiumMg + (log.sodium ?? 0),
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 });
}

function buildFoodMemorySummary(memories: AcceptedFoodMemory[], repeatPatterns: RepeatPattern[]) {
  const verified = memories.filter((memory) => memory.provenance.startsWith('verified_') || memory.provenance === 'verified_provider').length;
  const estimated = memories.filter((memory) => memory.provenance === 'photo_estimate' || memory.provenance === 'planner_estimate').length;
  const total = memories.length || 1;
  return {
    acceptedCount: memories.length,
    repeatPatterns: repeatPatterns.slice(0, 20).map((pattern) => pattern.title),
    verifiedShare: Math.round((verified / total) * 100),
    estimatedShare: Math.round((estimated / total) * 100),
  };
}

export function buildCoachContext({
  profile,
  logs,
  waterLogs,
  moodLogs,
  activityLogs,
  weights,
  plannerMeals,
  shoppingItems,
  savedMeals,
  localRecipes,
  savedRecipeIds,
  foodMemories,
  repeatPatterns,
}: {
  profile: Profile | null;
  logs: FoodLog[];
  waterLogs: WaterLog;
  moodLogs: MoodLog;
  activityLogs: ActivityLog;
  weights: WeightEntry[];
  plannerMeals: PlannerLike[];
  shoppingItems: ShoppingItem[];
  savedMeals: SavedMeal[];
  localRecipes: CaloraRecipe[];
  savedRecipeIds: string[];
  foodMemories: AcceptedFoodMemory[];
  repeatPatterns: RepeatPattern[];
}): CoachContext {
  const days = buildDateList(30);
  const recentEntries = logs
    .filter((log) => days.includes(log.date))
    .slice(-80)
    .map((log) => ({
      date: log.date,
      meal: log.meal,
      name: log.name.slice(0, 160),
      calories: Math.max(0, log.calories),
      proteinG: Math.max(0, log.protein),
      carbsG: Math.max(0, log.carbs),
      fatG: Math.max(0, log.fat),
      fiberG: Math.max(0, log.fiber ?? 0),
      sugarG: Math.max(0, log.sugar ?? 0),
      sodiumMg: Math.max(0, log.sodium ?? 0),
      source: log.source,
      confidence: Math.min(100, Math.max(0, Math.round(log.confidence))),
    }));

  const dailySummaries = days.map((date) => {
    const dayLogs = logs.filter((log) => log.date === date);
    const totals = sumLogs(dayLogs);
    return {
      date,
      ...totals,
      meals: new Set(dayLogs.map((log) => log.meal)).size,
      waterOunces: Math.max(0, waterLogs[date] ?? 0),
      mood: moodLogs[date] ?? null,
      activity: activityLogs[date] ?? null,
      hasData: dayLogs.length > 0 || Boolean(waterLogs[date] || moodLogs[date] || activityLogs[date]),
    };
  });

  const waterDays = dailySummaries.filter((day) => day.waterOunces > 0);
  const latestWeight = weights[weights.length - 1]?.kg ?? null;
  const startingWeight = profile?.weightKg ?? weights[0]?.kg ?? null;
  const missingData: string[] = [];
  if (!profile) missingData.push('profile');
  if (!logs.length) missingData.push('approved diary entries');
  if (!waterDays.length) missingData.push('hydration check-ins');
  if (!Object.keys(moodLogs).length) missingData.push('mood check-ins');
  if (!Object.keys(activityLogs).length) missingData.push('activity check-ins');
  if (!weights.length) missingData.push('weight history');

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    currentDate: dayKey(new Date()),
    dateRange: dateRange(30),
    profile: profile ? {
      name: profile.name,
      goal: profile.goal,
      activity: profile.activity,
      diet: profile.diet,
      calorieTarget: profile.calorieTarget,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      age: profile.age,
    } : null,
    dailySummaries,
    recentEntries,
    wellness: {
      waterAverageOunces: waterDays.length ? Math.round(waterDays.reduce((sum, day) => sum + day.waterOunces, 0) / waterDays.length) : 0,
      waterLoggedDays: waterDays.length,
      moodLoggedDays: Object.keys(moodLogs).filter((date) => days.includes(date)).length,
      activityLoggedDays: Object.keys(activityLogs).filter((date) => days.includes(date)).length,
      weightEntries: weights.length,
      latestWeightKg: latestWeight,
      weightChangeKg: latestWeight !== null && startingWeight !== null ? Number((latestWeight - startingWeight).toFixed(1)) : null,
    },
    planning: {
      plannedMealCount: plannerMeals.filter((meal) => days.includes(meal.day)).length,
      shoppingItemCount: shoppingItems.filter((item) => !item.checked).length,
      savedMealNames: savedMeals.slice(0, 20).map((meal) => meal.name.slice(0, 120)),
      savedRecipeCount: savedRecipeIds.length || localRecipes.length,
    },
    foodMemory: buildFoodMemorySummary(foodMemories, repeatPatterns),
    missingData,
  };
}
