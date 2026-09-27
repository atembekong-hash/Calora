/**
 * Source-agnostic optional nutrition facts for recipe detail experiences.
 *
 * Core recipe macros stay explicit fields in the public API. These optional
 * fields are additive: providers, estimates, and user-created recipes may
 * expose only the facts they can support without manufacturing a value.
 * Values are stored in the unit encoded by the key suffix. The four nutrient
 * keys below use the FDA-qualified bases shown in RECIPE_NUTRIENT_UNIT_BASIS:
 * values from a provider that cannot supply that basis must be omitted rather
 * than re-labeled or used for a % Daily Value calculation.
 */
export const RECIPE_NUTRIENT_KEYS = [
  "saturatedFatG",
  "transFatG",
  "monounsaturatedFatG",
  "polyunsaturatedFatG",
  "fiberG",
  "sugarsG",
  "addedSugarsG",
  "cholesterolMg",
  "sodiumMg",
  "potassiumMg",
  "calciumMg",
  "ironMg",
  "magnesiumMg",
  "zincMg",
  "phosphorusMg",
  "seleniumMcG",
  "copperMg",
  "vitaminAMcG",
  "vitaminCMg",
  "vitaminDMcG",
  "vitaminEMg",
  "vitaminKMcG",
  "thiaminMg",
  "riboflavinMg",
  "niacinMg",
  "vitaminB5Mg",
  "vitaminB6Mg",
  "vitaminB12McG",
  "folateMcG",
  "cholineMg",
] as const;

export type RecipeNutrientKey = (typeof RECIPE_NUTRIENT_KEYS)[number];
export type RecipeNutritionFacts = Partial<
  Record<RecipeNutrientKey, number | null>
>;

/**
 * Display and source-normalization contract for facts whose FDA Daily Value is
 * defined in a qualified unit rather than generic mg/mcg. Unlisted facts use
 * the unit encoded in their key name.
 */
export const RECIPE_NUTRIENT_UNIT_BASIS: Partial<
  Record<RecipeNutrientKey, string>
> = {
  vitaminAMcG: "mcg RAE",
  vitaminEMg: "mg alpha-tocopherol",
  niacinMg: "mg NE",
  folateMcG: "mcg DFE",
};

/** Rejects malformed, negative, and implausibly large values at every source boundary. */
export function normalizeRecipeNutritionValue(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100_000
  )
    return null;
  return Math.round(value * 100) / 100;
}

/**
 * Preserves only explicitly supplied usable facts. Missing facts remain absent
 * instead of becoming a misleading zero in downstream detail panels.
 */
export function normalizeRecipeNutritionFacts(
  value: unknown,
): RecipeNutritionFacts {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const normalized: RecipeNutritionFacts = {};
  for (const key of RECIPE_NUTRIENT_KEYS) {
    const parsed = normalizeRecipeNutritionValue(raw[key]);
    if (parsed !== null) normalized[key] = parsed;
  }
  return normalized;
}
