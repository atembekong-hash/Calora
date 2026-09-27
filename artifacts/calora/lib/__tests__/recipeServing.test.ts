import { describe, expect, it } from "vitest";
import {
  MAX_RECIPE_PORTIONS,
  MIN_RECIPE_PORTIONS,
  nextRecipePortions,
  recipeIngredientMultiplier,
  recipePortionLabel,
  sourceRecipeYield,
} from "../recipeServing";

describe("recipe serving normalization", () => {
  it("uses a known source yield as the basis for one selected portion", () => {
    expect(sourceRecipeYield({ servings: 4 })).toBe(4);
    expect(recipeIngredientMultiplier(1, 4)).toBe(0.25);
  });

  it("keeps ingredient quantities relative to the source recipe when its yield is unavailable", () => {
    expect(sourceRecipeYield({ servings: null })).toBeNull();
    expect(sourceRecipeYield({ servings: 0 })).toBeNull();
    expect(sourceRecipeYield({ servings: Number.NaN })).toBeNull();
    expect(recipeIngredientMultiplier(2, null)).toBe(2);
  });

  it("keeps portions finite, half-step based, and within safe bounds", () => {
    expect(nextRecipePortions(1, -1)).toBe(MIN_RECIPE_PORTIONS);
    expect(nextRecipePortions(MIN_RECIPE_PORTIONS, -1)).toBe(
      MIN_RECIPE_PORTIONS,
    );
    expect(nextRecipePortions(MAX_RECIPE_PORTIONS, 1)).toBe(
      MAX_RECIPE_PORTIONS,
    );
    expect(nextRecipePortions(1.5, 1)).toBe(2);
  });

  it("labels the user selection accurately", () => {
    expect(recipePortionLabel(1)).toBe("portion");
    expect(recipePortionLabel(2)).toBe("portions");
  });
});
