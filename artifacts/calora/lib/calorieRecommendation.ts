import type { ActivityLevel, Goal } from '@/context/CaloraContext';

export type RecommendationInputs = {
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
};

export const MIN_RECOMMENDATION_WEIGHT_KG = 25;
export const MAX_RECOMMENDATION_WEIGHT_KG = 350;

/**
 * Calora's original onboarding estimate. Keep this intentionally small and
 * deterministic: it is a starting estimate, not medical advice.
 */
export function recommendCalories({ weightKg, activity, goal }: RecommendationInputs): number {
  if (
    !Number.isFinite(weightKg)
    || weightKg < MIN_RECOMMENDATION_WEIGHT_KG
    || weightKg > MAX_RECOMMENDATION_WEIGHT_KG
  ) {
    throw new RangeError(`Weight must be between ${MIN_RECOMMENDATION_WEIGHT_KG} and ${MAX_RECOMMENDATION_WEIGHT_KG} kg.`);
  }
  const base = 10 * weightKg + 900;
  const activityMultiplier = activity === 'low' ? 1.25 : activity === 'high' ? 1.55 : 1.4;
  const adjustment = goal === 'lose' ? -250 : goal === 'gain' ? 250 : 0;
  const recommendation = Math.round((base * activityMultiplier + adjustment) / 50) * 50;
  if (!Number.isFinite(recommendation) || recommendation <= 0) {
    throw new RangeError('Unable to calculate a valid calorie recommendation.');
  }
  return recommendation;
}
