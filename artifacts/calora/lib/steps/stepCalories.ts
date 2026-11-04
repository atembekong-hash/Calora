export const ESTIMATED_KCAL_PER_STEP = 0.04;
export const ESTIMATED_KM_PER_STEP = 0.00075;

export type StepCalorieBreakdown = {
  steps: number;
  estimatedCalories: number;
  estimatedDistanceKm: number;
};

/**
 * Provides a clearly-labelled population-average estimate, not a measured
 * Health Connect/HealthKit active-energy value. Actual burn varies with body
 * size, pace, terrain, and stride length.
 */
export function estimateStepCalories(steps: number): StepCalorieBreakdown {
  const safeSteps = Math.max(0, Math.round(steps));
  return {
    steps: safeSteps,
    estimatedCalories: Math.round(safeSteps * ESTIMATED_KCAL_PER_STEP),
    estimatedDistanceKm: Number((safeSteps * ESTIMATED_KM_PER_STEP).toFixed(1)),
  };
}
