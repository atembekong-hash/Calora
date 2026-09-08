import type { PlannerMeal } from '@workspace/api-client-react';

export type PlannerRecipeSource = 'discover' | 'plus' | 'create';

export type PlannerMealRecipeLink = {
  recipeId: string;
  recipeSource: PlannerRecipeSource;
};

type PlannerMealWithRecipeLink = PlannerMeal & {
  recipeId?: string;
  recipeSource?: PlannerRecipeSource;
};

export function getPlannerMealRecipeLink(meal: PlannerMeal): PlannerMealRecipeLink | null {
  const linkedMeal = meal as PlannerMealWithRecipeLink;
  if (!linkedMeal.recipeId || !linkedMeal.recipeSource) return null;
  return {
    recipeId: linkedMeal.recipeId,
    recipeSource: linkedMeal.recipeSource,
  };
}