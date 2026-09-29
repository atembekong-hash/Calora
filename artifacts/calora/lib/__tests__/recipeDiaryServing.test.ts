import { describe, expect, it } from "vitest";
import { scaleRecipeNutritionForDiary } from "@/lib/recipeDiaryServing";

describe("recipe diary portion scaling", () => {
  const recipe = {
    calories: 420,
    proteinG: 25,
    carbsG: 46.5,
    fatG: 14,
  };

  it("uses the explicit diary quantity rather than a detail-screen selection", () => {
    expect(scaleRecipeNutritionForDiary(recipe, 2)).toEqual({
      calories: 840,
      proteinG: 50,
      carbsG: 93,
      fatG: 28,
    });
    expect(scaleRecipeNutritionForDiary(recipe, 0.5)).toEqual({
      calories: 210,
      proteinG: 13,
      carbsG: 23,
      fatG: 7,
    });
  });

  it("preserves unknown nutrition rather than inventing a zero", () => {
    expect(
      scaleRecipeNutritionForDiary(
        { calories: 100, proteinG: null, carbsG: undefined, fatG: -1 },
        2,
      ),
    ).toEqual({ calories: 200, proteinG: null, carbsG: null, fatG: null });
  });

  it("fails safely to one portion for an invalid diary quantity", () => {
    expect(scaleRecipeNutritionForDiary(recipe, Number.NaN)).toEqual({
      calories: 420, proteinG: 25, carbsG: 47, fatG: 14,
    });
  });
});
