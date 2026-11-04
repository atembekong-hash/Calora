import { describe, expect, it } from 'vitest';
import { ESTIMATED_KCAL_PER_STEP, estimateStepCalories } from '../steps/stepCalories';

describe('step calorie estimate', () => {
  it('uses a transparent average conversion and distance estimate', () => {
    expect(ESTIMATED_KCAL_PER_STEP).toBe(0.04);
    expect(estimateStepCalories(10_000)).toEqual({ steps: 10_000, estimatedCalories: 400, estimatedDistanceKm: 7.5 });
  });

  it('normalizes invalid and fractional step inputs safely', () => {
    expect(estimateStepCalories(-25.4)).toEqual({ steps: 0, estimatedCalories: 0, estimatedDistanceKm: 0 });
    expect(estimateStepCalories(1234.6).steps).toBe(1235);
  });
});
