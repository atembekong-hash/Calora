import type {
  RecipeNutritionEstimate,
  RecipeNutritionEstimateInput,
} from "./generated/types";
import {
  EstimateRecipeNutritionBody,
  EstimateRecipeNutritionResponse,
} from "./generated/api";

export type RecipeNutritionEstimateParseResult<T> =
  { success: true; data: T } | { success: false };

const ESTIMATE_INPUT_KEYS = new Set([
  "recipeId",
  "title",
  "ingredients",
  "sourceYield",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every((key) => ESTIMATE_INPUT_KEYS.has(key));
}

function nonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Enforces the documented bounded recipe payload before it reaches an AI
 * provider. The output preserves only normalized display input; the server
 * derives its opaque cache identity from this normalized content instead of
 * persisting the client recipe id or any account identity.
 */
export function parseRecipeNutritionEstimateInput(
  value: unknown,
): RecipeNutritionEstimateParseResult<RecipeNutritionEstimateInput> {
  if (!isRecord(value) || !hasOnlyKeys(value)) return { success: false };
  const parsed = EstimateRecipeNutritionBody.strict().safeParse(value);
  if (!parsed.success) return { success: false };

  const input = parsed.data as RecipeNutritionEstimateInput;
  if (
    !nonblank(input.recipeId) ||
    !nonblank(input.title) ||
    input.ingredients.some((ingredient) => !nonblank(ingredient))
  ) {
    return { success: false };
  }

  return {
    success: true,
    data: {
      recipeId: input.recipeId.trim(),
      title: input.title.trim(),
      ingredients: input.ingredients.map((ingredient) => ingredient.trim()),
      ...(input.sourceYield == null ? {} : { sourceYield: input.sourceYield }),
    },
  };
}

export const RecipeNutritionEstimateResponseSchema =
  EstimateRecipeNutritionResponse.strict();

export type StrictRecipeNutritionEstimate = RecipeNutritionEstimate;

export const AI_RECIPE_NUTRITION_NOTE =
  "AI-generated ingredient estimate per serving; confirm ingredients and portions for your needs.";
