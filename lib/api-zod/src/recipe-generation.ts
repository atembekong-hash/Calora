import type {
  GeneratedRecipeInput,
  GeneratedRecipeResponse,
  RecipeConceptInput,
  RecipeConceptResponse,
} from "./generated/types";
import {
  GenerateGuestRecipeConceptsBody,
  GenerateGuestRecipeConceptsResponse,
  GenerateRecipeBody,
  GenerateRecipeConceptsBody,
  GenerateRecipeConceptsResponse,
  GenerateRecipeResponse,
} from "./generated/api";

export type RecipeContractParseResult<T> =
  { success: true; data: T } | { success: false };

const CONCEPT_KEYS = new Set([
  "ingredients",
  "mealType",
  "servings",
  "maxMinutes",
  "preferences",
  "request",
]);
const GENERATED_RECIPE_KEYS = new Set(["title", "summary", "servings"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: Set<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

function isNonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseConceptInput(
  value: unknown,
  schema:
    typeof GenerateRecipeConceptsBody | typeof GenerateGuestRecipeConceptsBody,
): RecipeContractParseResult<RecipeConceptInput> {
  if (!isRecord(value) || !hasOnlyKeys(value, CONCEPT_KEYS))
    return { success: false };
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { success: false };
  const data = parsed.data as RecipeConceptInput;
  if (
    data.ingredients?.some((ingredient) => !isNonblank(ingredient)) ||
    data.preferences?.some((preference) => !isNonblank(preference)) ||
    (data.mealType !== undefined && !isNonblank(data.mealType)) ||
    (data.request !== undefined && !isNonblank(data.request)) ||
    (!data.ingredients?.length && !isNonblank(data.request))
  ) {
    return { success: false };
  }
  return { success: true, data };
}

export function parseRecipeConceptInput(
  value: unknown,
): RecipeContractParseResult<RecipeConceptInput> {
  return parseConceptInput(value, GenerateRecipeConceptsBody);
}

export function parseGuestRecipeConceptInput(
  value: unknown,
): RecipeContractParseResult<RecipeConceptInput> {
  return parseConceptInput(value, GenerateGuestRecipeConceptsBody);
}

export function parseGeneratedRecipeInput(
  value: unknown,
): RecipeContractParseResult<GeneratedRecipeInput> {
  if (!isRecord(value) || !hasOnlyKeys(value, GENERATED_RECIPE_KEYS))
    return { success: false };
  const parsed = GenerateRecipeBody.strict().safeParse(value);
  if (!parsed.success) return { success: false };
  const data = parsed.data as GeneratedRecipeInput;
  if (
    !isNonblank(data.title) ||
    (data.summary !== undefined && !isNonblank(data.summary))
  ) {
    return { success: false };
  }
  return { success: true, data };
}

export const RecipeConceptResponseSchema =
  GenerateRecipeConceptsResponse.strict();
export const GuestRecipeConceptResponseSchema =
  GenerateGuestRecipeConceptsResponse.strict();
export const GeneratedRecipeResponseSchema = GenerateRecipeResponse.strict();

export type RecipeGenerationConceptInput = RecipeConceptInput;
export type RecipeGenerationGeneratedInput = GeneratedRecipeInput;
export type StrictRecipeConceptResponse = RecipeConceptResponse;
export type StrictGeneratedRecipeResponse = GeneratedRecipeResponse;

export const RECIPE_GENERATION_NUTRITION_NOTE =
  "AI-estimated nutrition per serving; confirm ingredients and portions for your needs.";
