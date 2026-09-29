export type RecipeDiaryNutritionSource = {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
};

export type RecipeDiaryNutrition = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

function usable(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Produces the nutrition that is actually committed by the diary sheet.
 * Detail and planner controls retain their own portion selection; callers must
 * pass the deliberate diary quantity rather than an implicit detail default.
 */
export function scaleRecipeNutritionForDiary(
  recipe: RecipeDiaryNutritionSource,
  diaryServings: number,
): RecipeDiaryNutrition {
  const portions =
    usable(diaryServings) && diaryServings > 0 ? diaryServings : 1;
  const scale = (value: unknown) => (usable(value) ? Math.round(value * portions) : null);
  return {
    calories: scale(recipe.calories),
    proteinG: scale(recipe.proteinG),
    carbsG: scale(recipe.carbsG),
    fatG: scale(recipe.fatG),
  };
}
