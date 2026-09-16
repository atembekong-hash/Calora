import type { ActivityLevel, Goal } from '@/context/CaloraContext';

export type RecommendationInputs = {
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
};

/**
 * Calora's original onboarding estimate. Keep this intentionally small and
 * deterministic: it is a starting estimate, not medical advice.
 */
export function recommendCalories({ weightKg, activity, goal }: RecommendationInputs): number {
  const base = 10 * weightKg + 900;
  const activityMultiplier = activity === 'low' ? 1.25 : activity === 'high' ? 1.55 : 1.4;
  const adjustment = goal === 'lose' ? -250 : goal === 'gain' ? 250 : 0;
  return Math.round((base * activityMultiplier + adjustment) / 50) * 50;
}