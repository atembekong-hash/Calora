import { describe, expect, it } from 'vitest';
import { formatRecipeNutrition, getRecipeNutritionState, hasCompleteNutrition } from '../recipeNutrition';

describe('recipe nutrition states', () => {
  it('keeps zero available while missing values remain unavailable', () => {
    expect(getRecipeNutritionState({ calories: 0 })).toBe('available');
    expect(formatRecipeNutrition(0, ' kcal')).toBe('0 kcal');
    expect(formatRecipeNutrition(null, ' kcal')).toBe('—');
    expect(getRecipeNutritionState({ pending: true })).toBe('loading');
    expect(getRecipeNutritionState({ error: true })).toBe('error');
    expect(hasCompleteNutrition({ calories: 100, proteinG: null, carbsG: 1, fatG: 1 })).toBe(false);
  });
});