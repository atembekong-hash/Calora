import { describe, expect, it } from "vitest";
import { buildCoachContext } from "../coachContext";
import type {
  ActivityLog,
  FoodLog,
  MoodLog,
  Profile,
  WaterLog,
} from "@/context/CaloraContext";

const profile: Profile = {
  name: "Alex",
  goal: "maintain",
  activity: "moderate",
  diet: "Everything",
  heightCm: 172,
  weightKg: 70,
  targetWeightKg: 70,
  age: 32,
  calorieTarget: 2000,
};

const log: FoodLog = {
  id: "log-1",
  name: "Oatmeal",
  date: new Date().toISOString().slice(0, 10),
  meal: "Breakfast",
  calories: 320,
  protein: 12,
  carbs: 50,
  fat: 8,
  source: "USDA verified",
  confidence: 95,
  time: "08:00",
  serving: "1 bowl",
};

describe("buildCoachContext", () => {
  it("derives daily meal summaries and keeps missing wellness data explicit", () => {
    const today = new Date().toISOString().slice(0, 10);
    const context = buildCoachContext({
      profile,
      logs: [log],
      waterLogs: { [today]: 16 } satisfies WaterLog,
      moodLogs: {} satisfies MoodLog,
      activityLogs: {} satisfies ActivityLog,
      weights: [],
      plannerMeals: [],
      shoppingItems: [],
      savedMeals: [],
      localRecipes: [],
      savedRecipeIds: [],
      foodMemories: [],
      repeatPatterns: [],
    });

    expect(context.schemaVersion).toBe(1);
    expect(context.dailySummaries).toHaveLength(30);
    expect(context.dailySummaries.find((day) => day.date === today)).toMatchObject({
      calories: 320,
      proteinG: 12,
      meals: 1,
      waterOunces: 16,
      hasData: true,
    });
    expect(context.recentEntries[0]).toMatchObject({
      name: "Oatmeal",
      source: "USDA verified",
      confidence: 95,
    });
    expect(context.wellness.waterLoggedDays).toBe(1);
    expect(context.wellness.moodLoggedDays).toBe(0);
    expect(context.wellness.activityLoggedDays).toBe(0);
    expect(context.missingData).toContain("mood check-ins");
    expect(context.missingData).toContain("activity check-ins");
    expect(context.missingData).toContain("weight history");
  });
});