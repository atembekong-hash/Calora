type IdentifiedRecipe = { id: string };

export function isPremiumRecipeId(id: string): boolean {
  return id.startsWith('premium:');
}

export function missingSavedPremiumRecipeIds(
  savedRecipeIds: readonly string[],
  knownRecipes: readonly IdentifiedRecipe[],
): string[] {
  const knownIds = new Set(knownRecipes.map((recipe) => recipe.id));
  return savedRecipeIds.filter((id) => isPremiumRecipeId(id) && !knownIds.has(id));
}

export function mergeSavedPremiumRecipes<T extends IdentifiedRecipe>(
  savedRecipeIds: readonly string[],
  ...recipeGroups: readonly (readonly T[])[]
): T[] {
  const byId = new Map<string, T>();
  for (const group of recipeGroups) {
    for (const recipe of group) byId.set(recipe.id, recipe);
  }
  return savedRecipeIds
    .filter(isPremiumRecipeId)
    .map((id) => byId.get(id))
    .filter((recipe): recipe is T => recipe !== undefined);
}