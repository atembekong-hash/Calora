import { describe, expect, it } from 'vitest';
import { getPlannerMealRecipeLink } from '@/lib/plannerRecipeLink';
import type { PlannerMeal } from '@workspace/api-client-react';

const meal = (extra: Record<string, unknown> = {}): PlannerMeal => ({
  id: 'planned-meal',
  day: '2026-09-07',
  meal: 'Breakfast',
  name: 'Recipe meal',
  image: '',
  serving: '1 serving',
  calories: 300,
  proteinG: 20,
  carbsG: 30,
  fatG: 10,
  ingredients: ['oats'],
  description: 'A planned recipe meal.',
  ...extra,
});

describe('getPlannerMealRecipeLink', () => {
  it.each([
    ['discover', 'discover'],
    ['plus', 'plus'],
    ['create', 'create'],
  ] as const)('preserves the exact %s recipe source', (recipeSource, expectedSource) => {
    expect(getPlannerMealRecipeLink(meal({ recipeId: 'recipe-42', recipeSource }))).toEqual({
      recipeId: 'recipe-42',
      recipeSource: expectedSource,
    });
  });

  it('does not invent a recipe link for catalog or legacy planner meals', () => {
    expect(getPlannerMealRecipeLink(meal())).toBeNull();
  });
});