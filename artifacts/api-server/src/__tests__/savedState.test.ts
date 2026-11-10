import { describe, expect, it } from 'vitest';
import { mergeState, publicState } from '../routes/savedState.js';

describe('saved-state synchronization', () => {
  const meal = { id: 'meal-a', name: 'Oats', kind: 'meal' as const, foodIds: ['food-a'], calories: 300, protein: 10, carbs: 40, fat: 8 };
  it('merges additions from two devices without dropping either account-owned item', () => {
    const merged = mergeState({ savedMeals: [meal], savedRecipeIds: ['recipe-a'], deletedMealIds: [], deletedRecipeIds: [], clientUpdatedAt: '2026-01-01T00:00:00.000Z' }, { savedMeals: [{ ...meal, id: 'meal-b', name: 'Soup' }], savedRecipeIds: ['recipe-b'], deletedMealIds: [], deletedRecipeIds: [], clientUpdatedAt: '2026-01-02T00:00:00.000Z' });
    expect(merged.savedMeals.map((item) => item.id)).toEqual(['meal-a', 'meal-b']);
    expect(merged.savedRecipeIds).toEqual(['recipe-a', 'recipe-b']);
  });
  it('keeps deletions as tombstones and never exposes deleted items', () => {
    const merged = mergeState({ savedMeals: [meal], savedRecipeIds: ['recipe-a'], deletedMealIds: [], deletedRecipeIds: [] , clientUpdatedAt: '2026-01-01T00:00:00.000Z' }, { savedMeals: [], savedRecipeIds: [], deletedMealIds: ['meal-a'], deletedRecipeIds: ['recipe-a'], clientUpdatedAt: '2026-01-02T00:00:00.000Z' });
    expect(merged.deletedMealIds).toContain('meal-a');
    expect(merged.deletedRecipeIds).toContain('recipe-a');
    expect(publicState(merged)).toEqual({ savedMeals: [], savedRecipeIds: [], updatedAt: '2026-01-02T00:00:00.000Z' });
  });
  it('does not allow a later stale addition to resurrect a tombstoned item', () => {
    const merged = mergeState({ savedMeals: [], savedRecipeIds: [], deletedMealIds: ['meal-a'], deletedRecipeIds: ['recipe-a'], clientUpdatedAt: '2026-01-02T00:00:00.000Z' }, { savedMeals: [meal], savedRecipeIds: ['recipe-a'], deletedMealIds: [], deletedRecipeIds: [], clientUpdatedAt: '2026-01-01T00:00:00.000Z' });
    expect(publicState(merged).savedMeals).toEqual([]);
    expect(publicState(merged).savedRecipeIds).toEqual([]);
  });
});
