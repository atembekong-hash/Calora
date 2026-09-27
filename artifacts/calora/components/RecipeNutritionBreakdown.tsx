import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RecipeNutritionEstimate } from "@workspace/api-client-react";
import { RECIPE_NUTRIENT_UNIT_BASIS } from "@workspace/api-zod/recipe-nutrition";

export type RecipeNutritionPalette = {
  foreground: string;
  mutedForeground: string;
  border: string;
};

type NutrientRow = {
  label: string;
  unit: "kcal" | "g" | "mg" | "mcg";
  unitBasis?: string;
  value: number | undefined;
  dailyValue?: number;
};

type NutritionSection = { title: string; rows: NutrientRow[] };

/** FDA adult Daily Values, shown only where a published reference applies. */
const DAILY_VALUES = {
  totalFatG: 78,
  saturatedFatG: 20,
  cholesterolMg: 300,
  sodiumMg: 2300,
  carbsG: 275,
  fiberG: 28,
  addedSugarsG: 50,
  proteinG: 50,
  potassiumMg: 4700,
  calciumMg: 1300,
  ironMg: 18,
  magnesiumMg: 420,
  zincMg: 11,
  phosphorusMg: 1250,
  seleniumMcG: 55,
  copperMg: 0.9,
  vitaminAMcG: 900,
  vitaminCMg: 90,
  vitaminDMcG: 20,
  vitaminEMg: 15,
  vitaminKMcG: 120,
  thiaminMg: 1.2,
  riboflavinMg: 1.3,
  niacinMg: 16,
  vitaminB5Mg: 5,
  vitaminB6Mg: 1.7,
  vitaminB12McG: 2.4,
  folateMcG: 400,
  cholineMg: 550,
} as const;

function usable(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function scale(value: number | undefined, servingCount: number) {
  return usable(value)
    ? Math.round(value * servingCount * 100) / 100
    : undefined;
}

function amount(value: number, unit: NutrientRow["unit"], unitBasis?: string) {
  const maximumFractionDigits =
    unit === "kcal" ? 0 : value < 1 ? 2 : value < 10 ? 1 : 0;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)} ${unitBasis ?? unit}`;
}

function percentDailyValue(value: number, dailyValue?: number) {
  if (!dailyValue) return null;
  return Math.round((value / dailyValue) * 100);
}

export function buildAiRecipeNutritionSections(
  nutrition: RecipeNutritionEstimate,
  servingCount: number,
): NutritionSection[] {
  const row = (
    label: string,
    unit: NutrientRow["unit"],
    value: number | undefined,
    dailyValue?: number,
    unitBasis?: string,
  ): NutrientRow => ({
    label,
    unit,
    unitBasis,
    value: scale(value, servingCount),
    dailyValue,
  });

  return [
    {
      title: "Key nutrients",
      rows: [
        row("Calories", "kcal", nutrition.calories),
        row("Protein", "g", nutrition.proteinG, DAILY_VALUES.proteinG),
        row("Dietary fiber", "g", nutrition.fiberG, DAILY_VALUES.fiberG),
        row(
          "Saturated fat",
          "g",
          nutrition.saturatedFatG,
          DAILY_VALUES.saturatedFatG,
        ),
        row(
          "Cholesterol",
          "mg",
          nutrition.cholesterolMg,
          DAILY_VALUES.cholesterolMg,
        ),
        row("Sodium", "mg", nutrition.sodiumMg, DAILY_VALUES.sodiumMg),
        row("Potassium", "mg", nutrition.potassiumMg, DAILY_VALUES.potassiumMg),
        row("Calcium", "mg", nutrition.calciumMg, DAILY_VALUES.calciumMg),
        row("Iron", "mg", nutrition.ironMg, DAILY_VALUES.ironMg),
      ],
    },
    {
      title: "Carbohydrate details",
      rows: [
        row("Total carbohydrates", "g", nutrition.carbsG, DAILY_VALUES.carbsG),
        row("Dietary fiber", "g", nutrition.fiberG, DAILY_VALUES.fiberG),
        row("Total sugars", "g", nutrition.sugarsG),
        row(
          "Added sugars",
          "g",
          nutrition.addedSugarsG,
          DAILY_VALUES.addedSugarsG,
        ),
      ],
    },
    {
      title: "Fat details",
      rows: [
        row("Total fat", "g", nutrition.fatG, DAILY_VALUES.totalFatG),
        row(
          "Saturated fat",
          "g",
          nutrition.saturatedFatG,
          DAILY_VALUES.saturatedFatG,
        ),
        row("Trans fat", "g", nutrition.transFatG),
        row("Monounsaturated fat", "g", nutrition.monounsaturatedFatG),
        row("Polyunsaturated fat", "g", nutrition.polyunsaturatedFatG),
      ],
    },
    {
      title: "Minerals",
      rows: [
        row("Sodium", "mg", nutrition.sodiumMg, DAILY_VALUES.sodiumMg),
        row("Potassium", "mg", nutrition.potassiumMg, DAILY_VALUES.potassiumMg),
        row("Calcium", "mg", nutrition.calciumMg, DAILY_VALUES.calciumMg),
        row("Iron", "mg", nutrition.ironMg, DAILY_VALUES.ironMg),
        row("Magnesium", "mg", nutrition.magnesiumMg, DAILY_VALUES.magnesiumMg),
        row("Zinc", "mg", nutrition.zincMg, DAILY_VALUES.zincMg),
        row(
          "Phosphorus",
          "mg",
          nutrition.phosphorusMg,
          DAILY_VALUES.phosphorusMg,
        ),
        row("Selenium", "mcg", nutrition.seleniumMcG, DAILY_VALUES.seleniumMcG),
        row("Copper", "mg", nutrition.copperMg, DAILY_VALUES.copperMg),
      ],
    },
    {
      title: "Vitamins",
      rows: [
        row(
          "Vitamin A",
          "mcg",
          nutrition.vitaminAMcG,
          DAILY_VALUES.vitaminAMcG,
          RECIPE_NUTRIENT_UNIT_BASIS.vitaminAMcG,
        ),
        row("Vitamin C", "mg", nutrition.vitaminCMg, DAILY_VALUES.vitaminCMg),
        row(
          "Vitamin D",
          "mcg",
          nutrition.vitaminDMcG,
          DAILY_VALUES.vitaminDMcG,
        ),
        row(
          "Vitamin E",
          "mg",
          nutrition.vitaminEMg,
          DAILY_VALUES.vitaminEMg,
          RECIPE_NUTRIENT_UNIT_BASIS.vitaminEMg,
        ),
        row(
          "Vitamin K",
          "mcg",
          nutrition.vitaminKMcG,
          DAILY_VALUES.vitaminKMcG,
        ),
        row("Thiamin (B1)", "mg", nutrition.thiaminMg, DAILY_VALUES.thiaminMg),
        row(
          "Riboflavin (B2)",
          "mg",
          nutrition.riboflavinMg,
          DAILY_VALUES.riboflavinMg,
        ),
        row(
          "Niacin (B3)",
          "mg",
          nutrition.niacinMg,
          DAILY_VALUES.niacinMg,
          RECIPE_NUTRIENT_UNIT_BASIS.niacinMg,
        ),
        row(
          "Vitamin B5",
          "mg",
          nutrition.vitaminB5Mg,
          DAILY_VALUES.vitaminB5Mg,
        ),
        row(
          "Vitamin B6",
          "mg",
          nutrition.vitaminB6Mg,
          DAILY_VALUES.vitaminB6Mg,
        ),
        row(
          "Vitamin B12",
          "mcg",
          nutrition.vitaminB12McG,
          DAILY_VALUES.vitaminB12McG,
        ),
        row(
          "Folate",
          "mcg",
          nutrition.folateMcG,
          DAILY_VALUES.folateMcG,
          RECIPE_NUTRIENT_UNIT_BASIS.folateMcG,
        ),
        row("Choline", "mg", nutrition.cholineMg, DAILY_VALUES.cholineMg),
      ],
    },
  ]
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => usable(row.value)),
    }))
    .filter((section) => section.rows.length > 0);
}

export function RecipeNutritionBreakdown({
  nutrition,
  servingCount,
  colors,
}: {
  nutrition: RecipeNutritionEstimate;
  servingCount: number;
  colors: RecipeNutritionPalette;
}) {
  const sections = useMemo(
    () => buildAiRecipeNutritionSections(nutrition, servingCount),
    [nutrition, servingCount],
  );

  return (
    <View>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {section.title}
          </Text>
          <View
            style={[styles.columnHeader, { borderBottomColor: colors.border }]}
          >
            <Text
              style={[styles.columnName, { color: colors.mutedForeground }]}
            >
              NUTRIENT
            </Text>
            <Text
              style={[styles.columnAmount, { color: colors.mutedForeground }]}
            >
              AMOUNT
            </Text>
            <Text style={[styles.columnDv, { color: colors.mutedForeground }]}>
              % DV
            </Text>
          </View>
          {section.rows.map((item) => {
            const value = item.value as number;
            const percent = percentDailyValue(value, item.dailyValue);
            return (
              <View
                key={item.label}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <Text style={[styles.amount, { color: colors.foreground }]}>
                  {amount(value, item.unit, item.unitBasis)}
                </Text>
                <Text style={[styles.dv, { color: colors.mutedForeground }]}>
                  {percent === null ? "—" : `${percent}%`}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={[styles.disclosure, { color: colors.mutedForeground }]}>
        % Daily Value is based on FDA adult reference values and is not
        established for every nutrient.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 12, marginBottom: 6 },
  columnHeader: {
    flexDirection: "row",
    paddingBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  columnName: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  columnAmount: {
    width: 86,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  columnDv: {
    width: 46,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingRight: 6,
  },
  amount: {
    width: 86,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  dv: {
    width: 46,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  disclosure: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 14,
  },
});
