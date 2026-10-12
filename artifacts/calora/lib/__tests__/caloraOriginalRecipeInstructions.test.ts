import { describe, expect, it } from "vitest";
import { caloraOriginalRecipes } from "../caloraOriginalRecipes";
import { parseRecipeInstructionSteps } from "../recipe-instructions";

describe("Calora original Discover recipe methods", () => {
  it("provides at least three preparation steps for every built-in recipe", () => {
    expect(caloraOriginalRecipes.length).toBeGreaterThan(0);
    for (const recipe of caloraOriginalRecipes) {
      const steps = parseRecipeInstructionSteps(recipe.instructions);
      expect(steps.length, recipe.id).toBeGreaterThanOrEqual(3);
      expect(
        steps.every((step) => step.length > 4),
        recipe.id,
      ).toBe(true);
    }
  });

  it("restores the Beef and veggie tacos method shown by the reported screen", () => {
    const recipe = caloraOriginalRecipes.find(
      (item) => item.id === "calora-original:beef-tacos",
    );
    expect(recipe?.instructions).toContain("Season and cook the beef");
    expect(recipe?.instructions).toContain("Warm the corn tortillas");
    expect(recipe?.instructions).toContain("pico de gallo");
  });
});
