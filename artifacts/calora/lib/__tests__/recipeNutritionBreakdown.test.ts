import { describe, expect, it } from "vitest";
import { buildAiRecipeNutritionSections } from "@/components/RecipeNutritionBreakdown";

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
  nutritionConfidence: "estimated" as const,
  nutritionNote:
    "AI-generated ingredient estimate per serving; confirm ingredients and portions for your needs.",
  servingBasis: "Per typical serving",
};

describe("AI recipe nutrition breakdown", () => {
  it("organizes the openly visible AI estimate into the requested categories", () => {
    const sections = buildAiRecipeNutritionSections(nutrition, 1);

    expect(sections.map((section) => section.title)).toEqual([
      "Key nutrients",
      "Carbohydrate details",
      "Fat details",
      "Minerals",
      "Vitamins",
    ]);
    expect(
      sections.find((section) => section.title === "Key nutrients")?.rows,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Dietary fiber",
          value: 8,
          dailyValue: 28,
        }),
        expect.objectContaining({
          label: "Sodium",
          value: 680,
          dailyValue: 2300,
        }),
        expect.objectContaining({ label: "Iron", value: 3.6, dailyValue: 18 }),
      ]),
    );
    expect(
      sections.find((section) => section.title === "Carbohydrate details")
        ?.rows,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Total carbohydrates", value: 46 }),
        expect.objectContaining({ label: "Total sugars", value: 9 }),
      ]),
    );
  });

  it("uses the same selected-portion multiplier for every displayed AI nutrient", () => {
    const sections = buildAiRecipeNutritionSections(nutrition, 1.5);
    const find = (label: string) =>
      sections
        .flatMap((section) => section.rows)
        .find((row) => row.label === label);

    expect(find("Calories")).toMatchObject({ value: 630 });
    expect(find("Total carbohydrates")).toMatchObject({ value: 69 });
    expect(find("Saturated fat")).toMatchObject({ value: 6 });
    expect(find("Sodium")).toMatchObject({ value: 1020 });
    expect(find("Vitamin B12")).toMatchObject({ value: 1.8 });
  });

  it("does not fabricate omitted AI facts as zero-value rows", () => {
    const sections = buildAiRecipeNutritionSections(
      {
        calories: 250,
        proteinG: 12,
        carbsG: 30,
        fatG: 8,
        nutritionConfidence: "estimated",
        nutritionNote:
          "AI-generated ingredient estimate per serving; confirm ingredients and portions for your needs.",
        servingBasis: "Per typical serving",
      },
      1,
    );
    const rows = sections.flatMap((section) => section.rows);

    expect(rows.some((row) => row.label === "Sodium")).toBe(false);
    expect(rows.some((row) => row.label === "Vitamin C")).toBe(false);
    expect(rows.some((row) => row.label === "Total fat")).toBe(true);
  });

  it("uses FDA-qualified bases where AI data is explicitly supported", () => {
    const rows = buildAiRecipeNutritionSections(
      {
        calories: 250,
        proteinG: 12,
        carbsG: 30,
        fatG: 8,
        vitaminAMcG: 90,
        vitaminEMg: 1.5,
        niacinMg: 3.2,
        folateMcG: 40,
        nutritionConfidence: "estimated",
        nutritionNote:
          "AI-generated ingredient estimate per serving; confirm ingredients and portions for your needs.",
        servingBasis: "Per typical serving",
      },
      1,
    ).flatMap((section) => section.rows);
    const find = (label: string) => rows.find((row) => row.label === label);

    expect(find("Vitamin A")).toMatchObject({
      unitBasis: "mcg RAE",
      dailyValue: 900,
    });
    expect(find("Vitamin E")).toMatchObject({
      unitBasis: "mg alpha-tocopherol",
      dailyValue: 15,
    });
    expect(find("Niacin (B3)")).toMatchObject({
      unitBasis: "mg NE",
      dailyValue: 16,
    });
    expect(find("Folate")).toMatchObject({
      unitBasis: "mcg DFE",
      dailyValue: 400,
    });
  });
});
