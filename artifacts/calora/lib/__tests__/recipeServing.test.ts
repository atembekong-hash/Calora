import { describe, expect, it } from "vitest";
import {
  MAX_RECIPE_PORTIONS,
  MIN_RECIPE_PORTIONS,
  nextRecipePortions,
  recipePortionLabel,
  scaleRecipeIngredients,
  sourceRecipeYield,
} from "../recipeServing";

describe("recipe serving normalization", () => {
  it("uses a known source yield as the basis for one selected portion", () => {
    expect(sourceRecipeYield({ servings: 4 })).toBe(4);
  });

  it("keeps ingredient quantities relative to the source recipe when its yield is unavailable", () => {
    expect(sourceRecipeYield({ servings: null })).toBeNull();
    expect(sourceRecipeYield({ servings: 0 })).toBeNull();
    expect(sourceRecipeYield({ servings: Number.NaN })).toBeNull();
  });

  it("keeps portions finite, whole-number based, and within safe bounds", () => {
    expect(nextRecipePortions(1, -1)).toBe(MIN_RECIPE_PORTIONS);
    expect(nextRecipePortions(MIN_RECIPE_PORTIONS, -1)).toBe(
      MIN_RECIPE_PORTIONS,
    );
    expect(nextRecipePortions(MAX_RECIPE_PORTIONS, 1)).toBe(
      MAX_RECIPE_PORTIONS,
    );
    expect(nextRecipePortions(1.5, 1)).toBe(3);
  });

  it("labels the user selection accurately", () => {
    expect(recipePortionLabel(1)).toBe("portion");
    expect(recipePortionLabel(2)).toBe("portions");
  });

  it("scales trustworthy leading quantities and preserves ambiguous ingredient text", () => {
    expect(scaleRecipeIngredients(["2 cups oats", "1/2 lemon", "salt to taste", "1-2 peppers"], 2, 4)).toEqual([
      { text: "1 cup oats", scaled: true },
      { text: "1/4 lemon", scaled: true },
      { text: "salt to taste", scaled: false },
      { text: "1-2 peppers", scaled: false },
    ]);
  });

  it("does not scale ingredients when the source yield is unknown", () => {
    expect(scaleRecipeIngredients(["2 cups oats"], 2, null)).toEqual([{ text: "2 cups oats", scaled: false }]);
  });
});
