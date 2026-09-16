import { describe, expect, it } from 'vitest';
import {
  formatRecipeNutrition,
  getRecipeNutritionState,
  hasCompleteNutrition,
  isFiniteNutritionValue,
} from '../recipeNutrition';

describe('recipe nutrition presentation contracts', () => {
  it('distinguishes available, loading, unavailable, and error nutrition deterministically', () => {
    expect(getRecipeNutritionState({ calories: 420 })).toBe('available');
    expect(getRecipeNutritionState({ pending: true })).toBe('loading');
    expect(getRecipeNutritionState({ loading: true })).toBe('loading');
    expect(getRecipeNutritionState({ unavailable: true })).toBe('unavailable');
    expect(getRecipeNutritionState({ error: true, calories: 420 })).toBe('error');
  });

  it('preserves zero when supplied by a provider and never converts missing values to zero', () => {
    expect(getRecipeNutritionState({ calories: 0 })).toBe('available');
    expect(formatRecipeNutrition(0, ' kcal')).toBe('0 kcal');
    expect(formatRecipeNutrition(null, ' kcal')).toBe('—');
    expect(formatRecipeNutrition(undefined, ' kcal')).toBe('—');
    expect(formatRecipeNutrition(Number.NaN, ' kcal')).toBe('—');
  });

  it('identifies incomplete nutrition without treating it as a complete record', () => {
    expect(hasCompleteNutrition({ calories: 420, proteinG: 30, carbsG: 45, fatG: 12 })).toBe(true);
    expect(hasCompleteNutrition({ calories: 420, proteinG: null, carbsG: 45, fatG: 12 })).toBe(false);
    expect(isFiniteNutritionValue(0)).toBe(true);
  });
});