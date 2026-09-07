export type PremiumRecipeImageRecord = {
  id: string;
  image?: string | null;
};

export function normalizePremiumRecipeImageUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Keep the first provider photo in a loaded catalogue and make later
 * collisions use the recipe card's classified fallback. This is intentionally
 * applied to the accumulated list, not just one response page.
 */
export function clearDuplicatePremiumRecipeImages<T extends PremiumRecipeImageRecord>(
  recipes: readonly T[],
): T[] {
  const seen = new Set<string>();
  return recipes.map((recipe) => {
    const identity = normalizePremiumRecipeImageUrl(recipe.image);
    if (!identity || !seen.has(identity)) {
      if (identity) seen.add(identity);
      return recipe;
    }
    return { ...recipe, image: null } as T;
  });
}