export const MIN_RECIPE_PORTIONS = 1;
export const MAX_RECIPE_PORTIONS = 8;

/**
 * Returns a trustworthy source recipe yield when the provider supplied one.
 * An absent or malformed yield must not be silently treated as a measured fact.
 */
export function sourceRecipeYield(recipe: unknown): number | null {
  const servings =
    recipe && typeof recipe === "object"
      ? (recipe as { servings?: unknown }).servings
      : undefined;
  if (
    typeof servings !== "number" ||
    !Number.isFinite(servings) ||
    servings <= 0
  ) {
    return null;
  }
  return Math.round(servings);
}

export function nextRecipePortions(
  current: number,
  direction: -1 | 1,
  minimum = MIN_RECIPE_PORTIONS,
  maximum = MAX_RECIPE_PORTIONS,
): number {
  const next = current + direction;
  return Math.min(maximum, Math.max(minimum, Math.round(next)));
}

export function formatRecipePortions(portions: number): string {
  return String(Math.round(portions));
}

export function recipePortionLabel(portions: number): string {
  return portions === 1 ? "portion" : "portions";
}
