import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  RecipeNutritionFacts,
  RecipeNutrientKey,
} from "@workspace/api-zod/recipe-nutrition";
import { RECIPE_NUTRIENT_UNIT_BASIS } from "@workspace/api-zod/recipe-nutrition";

type DetailNutrition = {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
} & RecipeNutritionFacts;

type Palette = {
  foreground: string;
  mutedForeground: string;
  card: string;
  border: string;
  primary: string;
};

type NutrientRow = {
  label: string;
  unit: "kcal" | "g" | "mg" | "mcg";
  unitBasis?: string;
  value: number | null | undefined;
  dailyValue?: number;
};

type NutritionSection = { title: string; rows: NutrientRow[] };

/** FDA adult Daily Values used only when a published DV applies to the nutrient. */
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

const FACT = (nutrition: DetailNutrition, key: RecipeNutrientKey) =>
  nutrition[key];

function usable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function formatValue(
  value: number,
  unit: NutrientRow["unit"],
  unitBasis?: string,
) {
  const maximumFractionDigits =
    unit === "kcal" ? 0 : value < 1 ? 2 : value < 10 ? 1 : 0;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)} ${unitBasis ?? unit}`;
}

function scaled(value: number | null | undefined, servingCount: number) {
  return usable(value) ? Math.round(value * servingCount * 100) / 100 : value;
}

function visibleRows(rows: NutrientRow[]) {
  return rows.filter((row) => usable(row.value));
}

export function buildRecipeNutritionSections(
  nutrition: DetailNutrition,
  servingCount: number,
): NutritionSection[] {
  const row = (
    label: string,
    unit: NutrientRow["unit"],
    value: number | null | undefined,
    dailyValue?: number,
    unitBasis?: string,
  ): NutrientRow => ({
    label,
    unit,
    unitBasis,
    value: scaled(value, servingCount),
    dailyValue,
  });
  return [
    {
      title: "Nutrition overview",
      rows: [
        row("Calories", "kcal", nutrition.calories),
        row("Total fat", "g", nutrition.fatG, DAILY_VALUES.totalFatG),
        row("Total carbohydrates", "g", nutrition.carbsG, DAILY_VALUES.carbsG),
        row("Protein", "g", nutrition.proteinG, DAILY_VALUES.proteinG),
      ],
    },
    {
      title: "Carbohydrate details",
      rows: [
        row(
          "Dietary fiber",
          "g",
          FACT(nutrition, "fiberG"),
          DAILY_VALUES.fiberG,
        ),
        row("Total sugars", "g", FACT(nutrition, "sugarsG")),
        row(
          "Added sugars",
          "g",
          FACT(nutrition, "addedSugarsG"),
          DAILY_VALUES.addedSugarsG,
        ),
      ],
    },
    {
      title: "Fat details",
      rows: [
        row(
          "Saturated fat",
          "g",
          FACT(nutrition, "saturatedFatG"),
          DAILY_VALUES.saturatedFatG,
        ),
        row("Trans fat", "g", FACT(nutrition, "transFatG")),
        row("Monounsaturated fat", "g", FACT(nutrition, "monounsaturatedFatG")),
        row("Polyunsaturated fat", "g", FACT(nutrition, "polyunsaturatedFatG")),
        row(
          "Cholesterol",
          "mg",
          FACT(nutrition, "cholesterolMg"),
          DAILY_VALUES.cholesterolMg,
        ),
      ],
    },
    {
      title: "Minerals",
      rows: [
        row("Sodium", "mg", FACT(nutrition, "sodiumMg"), DAILY_VALUES.sodiumMg),
        row(
          "Potassium",
          "mg",
          FACT(nutrition, "potassiumMg"),
          DAILY_VALUES.potassiumMg,
        ),
        row(
          "Calcium",
          "mg",
          FACT(nutrition, "calciumMg"),
          DAILY_VALUES.calciumMg,
        ),
        row("Iron", "mg", FACT(nutrition, "ironMg"), DAILY_VALUES.ironMg),
        row(
          "Magnesium",
          "mg",
          FACT(nutrition, "magnesiumMg"),
          DAILY_VALUES.magnesiumMg,
        ),
        row("Zinc", "mg", FACT(nutrition, "zincMg"), DAILY_VALUES.zincMg),
        row(
          "Phosphorus",
          "mg",
          FACT(nutrition, "phosphorusMg"),
          DAILY_VALUES.phosphorusMg,
        ),
        row(
          "Selenium",
          "mcg",
          FACT(nutrition, "seleniumMcG"),
          DAILY_VALUES.seleniumMcG,
        ),
        row("Copper", "mg", FACT(nutrition, "copperMg"), DAILY_VALUES.copperMg),
      ],
    },
    {
      title: "Vitamins",
      rows: [
        row(
          "Vitamin A",
          "mcg",
          FACT(nutrition, "vitaminAMcG"),
          DAILY_VALUES.vitaminAMcG,
          RECIPE_NUTRIENT_UNIT_BASIS.vitaminAMcG,
        ),
        row(
          "Vitamin C",
          "mg",
          FACT(nutrition, "vitaminCMg"),
          DAILY_VALUES.vitaminCMg,
        ),
        row(
          "Vitamin D",
          "mcg",
          FACT(nutrition, "vitaminDMcG"),
          DAILY_VALUES.vitaminDMcG,
        ),
        row(
          "Vitamin E",
          "mg",
          FACT(nutrition, "vitaminEMg"),
          DAILY_VALUES.vitaminEMg,
          RECIPE_NUTRIENT_UNIT_BASIS.vitaminEMg,
        ),
        row(
          "Vitamin K",
          "mcg",
          FACT(nutrition, "vitaminKMcG"),
          DAILY_VALUES.vitaminKMcG,
        ),
        row(
          "Thiamin (B1)",
          "mg",
          FACT(nutrition, "thiaminMg"),
          DAILY_VALUES.thiaminMg,
        ),
        row(
          "Riboflavin (B2)",
          "mg",
          FACT(nutrition, "riboflavinMg"),
          DAILY_VALUES.riboflavinMg,
        ),
        row(
          "Niacin (B3)",
          "mg",
          FACT(nutrition, "niacinMg"),
          DAILY_VALUES.niacinMg,
          RECIPE_NUTRIENT_UNIT_BASIS.niacinMg,
        ),
        row(
          "Vitamin B5",
          "mg",
          FACT(nutrition, "vitaminB5Mg"),
          DAILY_VALUES.vitaminB5Mg,
        ),
        row(
          "Vitamin B6",
          "mg",
          FACT(nutrition, "vitaminB6Mg"),
          DAILY_VALUES.vitaminB6Mg,
        ),
        row(
          "Vitamin B12",
          "mcg",
          FACT(nutrition, "vitaminB12McG"),
          DAILY_VALUES.vitaminB12McG,
        ),
        row(
          "Folate",
          "mcg",
          FACT(nutrition, "folateMcG"),
          DAILY_VALUES.folateMcG,
          RECIPE_NUTRIENT_UNIT_BASIS.folateMcG,
        ),
        row(
          "Choline",
          "mg",
          FACT(nutrition, "cholineMg"),
          DAILY_VALUES.cholineMg,
        ),
      ],
    },
  ]
    .map((section) => ({ ...section, rows: visibleRows(section.rows) }))
    .filter((section) => section.rows.length > 0);
}

function percentDailyValue(value: number, dailyValue?: number) {
  if (!dailyValue || dailyValue <= 0) return null;
  return Math.round((value / dailyValue) * 100);
}

export function RecipeNutritionDetails({
  nutrition,
  servingCount,
  primaryNutritionAvailable,
  colors,
}: {
  nutrition: DetailNutrition;
  servingCount: number;
  primaryNutritionAvailable: boolean;
  colors: Palette;
}) {
  const [expanded, setExpanded] = useState(false);
  const sections = useMemo(
    () => buildRecipeNutritionSections(nutrition, servingCount),
    [nutrition, servingCount],
  );
  const hasAdditionalFacts = sections.some(
    (section) => section.title !== "Nutrition overview",
  );

  if (!hasAdditionalFacts) {
    return (
      <View
        style={[
          styles.unavailableContainer,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
          Nutrition details
        </Text>
        <Text style={[styles.unavailable, { color: colors.mutedForeground }]}>
          {primaryNutritionAvailable
            ? "This recipe source has not provided additional nutrient facts beyond the nutrition summary."
            : "Detailed nutrition facts are unavailable from this recipe source."}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? "Show less nutrition information"
            : "Show full nutrition information"
        }
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.toggle,
          { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View>
          <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
            Nutrition details
          </Text>
          <Text
            style={[styles.toggleSubtitle, { color: colors.mutedForeground }]}
          >
            {expanded
              ? `Values shown for ${servingCount} ${servingCount === 1 ? "serving" : "servings"}`
              : "Amounts and Daily Value where available"}
          </Text>
        </View>
        <Text style={[styles.toggleAction, { color: colors.primary }]}>
          {expanded ? "Show less" : "Show more"}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.expanded}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {section.title}
              </Text>
              <View
                style={[
                  styles.columnHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.columnName, { color: colors.mutedForeground }]}
                >
                  NUTRIENT
                </Text>
                <Text
                  style={[
                    styles.columnAmount,
                    { color: colors.mutedForeground },
                  ]}
                >
                  AMOUNT
                </Text>
                <Text
                  style={[styles.columnDv, { color: colors.mutedForeground }]}
                >
                  % DV
                </Text>
              </View>
              {section.rows.map((item) => {
                const value = item.value as number;
                const percent = percentDailyValue(value, item.dailyValue);
                return (
                  <View
                    key={item.label}
                    style={[
                      styles.nutrientRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nutrientName,
                        { color: colors.foreground },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.nutrientAmount,
                        { color: colors.foreground },
                      ]}
                    >
                      {formatValue(value, item.unit, item.unitBasis)}
                    </Text>
                    <Text
                      style={[
                        styles.nutrientDv,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {percent === null ? "—" : `${percent}%`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
          <Text style={[styles.disclosure, { color: colors.mutedForeground }]}>
            % Daily Value is based on FDA reference values for adults and is not
            established for every nutrient.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
  },
  unavailableContainer: {
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  toggle: {
    minHeight: 56,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  toggleSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  toggleAction: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  expanded: { paddingHorizontal: 13, paddingBottom: 13 },
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
  nutrientRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nutrientName: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingRight: 6,
  },
  nutrientAmount: {
    width: 86,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  nutrientDv: {
    width: 46,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  unavailable: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  disclosure: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 14,
  },
});
