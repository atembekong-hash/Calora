import { describe, expect, it } from "vitest";
import { buildRecipeNutritionSections } from "@/components/RecipeNutritionDetails";

describe("expandable recipe nutrition details", () => {
  const nutrition = {
    calories: 420,
    proteinG: 25,
    carbsG: 46,
    fatG: 16,
    saturatedFatG: 4,
    fiberG: 8,
    sugarsG: 9,
    sodiumMg: 680,
    potassiumMg: 420,
    calciumMg: 310,
    ironMg: 3.6,
    vitaminCMg: 18,
    vitaminB12McG: 1.2,
  };

  it("organizes only actual source-backed facts into readable sections", () => {
    const sections = buildRecipeNutritionSections(nutrition, 1);

    expect(sections.map((section) => section.title)).toEqual([
      "Nutrition overview",
      "Carbohydrate details",
      "Fat details",
      "Minerals",
      "Vitamins",
    ]);
    expect(
      sections.find((section) => section.title === "Carbohydrate details")
        ?.rows,
    ).toEqual([
      expect.objectContaining({
        label: "Dietary fiber",
        value: 8,
        dailyValue: 28,
      }),
      expect.objectContaining({ label: "Total sugars", value: 9 }),
    ]);
    expect(
      sections.find((section) => section.title === "Vitamins")?.rows,
    ).toEqual([
      expect.objectContaining({
        label: "Vitamin C",
        value: 18,
        dailyValue: 90,
      }),
      expect.objectContaining({
        label: "Vitamin B12",
        value: 1.2,
        dailyValue: 2.4,
      }),
    ]);
  });

  it("uses the same serving multiplier for every visible nutrition fact", () => {
    const sections = buildRecipeNutritionSections(nutrition, 1.5);
    const find = (label: string) =>
      sections
        .flatMap((section) => section.rows)
        .filter((row) => row.label === label)[0];

    expect(find("Calories")).toMatchObject({ value: 630 });
    expect(find("Total carbohydrates")).toMatchObject({ value: 69 });
    expect(find("Saturated fat")).toMatchObject({ value: 6 });
    expect(find("Sodium")).toMatchObject({ value: 1020 });
    expect(find("Vitamin B12")).toMatchObject({ value: 1.8 });
  });

  it("never fabricates missing micronutrients as zero-valued rows", () => {
    const sections = buildRecipeNutritionSections(
      { calories: 250, proteinG: 12, carbsG: 30, fatG: 8 },
      1,
    );
    const rows = sections.flatMap((section) => section.rows);

    expect(rows.some((row) => row.label === "Sodium")).toBe(false);
    expect(rows.some((row) => row.label === "Vitamin C")).toBe(false);
    expect(rows.some((row) => row.label === "Total fat")).toBe(true);
    expect(sections.map((section) => section.title)).toEqual([
      "Nutrition overview",
    ]);
  });

  it("retains FDA-qualified display bases for affected Daily Value nutrients", () => {
    const rows = buildRecipeNutritionSections(
      {
        calories: 250,
        proteinG: 12,
        carbsG: 30,
        fatG: 8,
        vitaminAMcG: 90,
        vitaminEMg: 1.5,
        niacinMg: 3.2,
        folateMcG: 40,
      },
      1,
    ).flatMap((section) => section.rows);
    const find = (label: string) => rows.find((row) => row.label === label);

    expect(find("Vitamin A")).toMatchObject({ unitBasis: "mcg RAE", dailyValue: 900 });
    expect(find("Vitamin E")).toMatchObject({ unitBasis: "mg alpha-tocopherol", dailyValue: 15 });
    expect(find("Niacin (B3)")).toMatchObject({ unitBasis: "mg NE", dailyValue: 16 });
    expect(find("Folate")).toMatchObject({ unitBasis: "mcg DFE", dailyValue: 400 });
  });
});
