import { describe, expect, it } from 'vitest';
import { plannerCatalog } from '@/data/planner';
import { caloraOriginalRecipes } from '@/lib/caloraOriginalRecipes';
import { recipeNutritionLabel, recipeProvenance, recipeSourceLabel } from '@/lib/recipeModel';

describe('Calora original recipe projection', () => {
  it('projects every planner catalog meal to a stable recipe identity', () => {
    expect(caloraOriginalRecipes).toHaveLength(plannerCatalog.length);
    expect(caloraOriginalRecipes.map((recipe) => recipe.id)).toEqual(
      plannerCatalog.map((meal) => `calora-original:${meal.id}`),
    );
  });

  it('keeps catalog ingredients and nutrition aligned with Planner', () => {
    const catalogMeal = plannerCatalog.find((meal) => meal.name === 'Chia seed pudding');
    const recipe = caloraOriginalRecipes.find((item) => item.name === catalogMeal?.name);

    expect(recipe).toMatchObject({
      id: `calora-original:${catalogMeal?.id}`,
      ingredients: catalogMeal?.ingredients,
      calories: catalogMeal?.calories,
      proteinG: catalogMeal?.proteinG,
      carbsG: catalogMeal?.carbsG,
      fatG: catalogMeal?.fatG,
      sourceType: 'calora_catalog',
    });
  });

  it('keeps Calora originals distinct from open and user-created recipes', () => {
    const recipe = caloraOriginalRecipes[0];
    expect(recipeProvenance(recipe)).toMatchObject({
      sourceType: 'calora_catalog',
      sourceProvider: 'Calora',
      nutritionConfidence: 'estimated',
    });
    expect(recipeSourceLabel(recipe)).toBe('Calora original');
    expect(recipeNutritionLabel(recipe)).toBe('Estimated nutrition');
    expect(recipe.isLocal).toBe(false);
  });
});