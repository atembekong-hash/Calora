export type RecipeSuggestionCandidate = {
  id: string;
  name: string;
  category?: string | null;
  area?: string | null;
  mealType?: string | null;
  tags?: string[];
};

export type RecipeSuggestionRows<T extends RecipeSuggestionCandidate> = T[][];

function mealTypeOf(recipe: RecipeSuggestionCandidate): string | null {
  return typeof recipe.mealType === 'string' ? recipe.mealType : null;
}

function score(candidate: RecipeSuggestionCandidate, current: RecipeSuggestionCandidate): number {
  let value = 0;
  if (candidate.category && current.category && candidate.category.toLowerCase() === current.category.toLowerCase()) value += 4;
  if (candidate.area && current.area && candidate.area.toLowerCase() === current.area.toLowerCase()) value += 3;
  const candidateMealType = mealTypeOf(candidate);
  const currentMealType = mealTypeOf(current);
  if (candidateMealType && currentMealType && candidateMealType.toLowerCase() === currentMealType.toLowerCase()) value += 3;
  const currentTags = new Set((current.tags ?? []).map((tag) => tag.toLowerCase()));
  value += (candidate.tags ?? []).filter((tag) => currentTags.has(tag.toLowerCase())).length;
  return value;
}

export function getCatalogRecipeSuggestions<T extends RecipeSuggestionCandidate>(
  pool: readonly T[],
  current: RecipeSuggestionCandidate,
  limit: number,
  excludedIds: ReadonlySet<string> = new Set(),
): T[] {
  const seen = new Set(excludedIds);
  return pool
    .filter((candidate) => candidate.id !== current.id && !seen.has(candidate.id) && seen.add(candidate.id))
    .sort((a, b) => score(b, current) - score(a, current) || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limit));
}

/**
 * Build the two detail rows from already-loaded Plus and Discover catalog data.
 * This function only selects existing records; it never invokes recipe or image
 * generation and prevents the same catalog record appearing in both rows.
 */
export function buildCatalogRecipeSuggestionRows<T extends RecipeSuggestionCandidate>({
  plus,
  discover,
  current,
  perRow = 20,
}: {
  plus: readonly T[];
  discover: readonly T[];
  current: RecipeSuggestionCandidate | null;
  perRow?: number;
}): RecipeSuggestionRows<T> {
  if (!current) return [];
  const plusRow = getCatalogRecipeSuggestions(plus, current, perRow);
  const used = new Set(plusRow.map((recipe) => recipe.id));
  const discoverRow = getCatalogRecipeSuggestions(discover, current, perRow, used);
  return [plusRow, discoverRow].filter((row) => row.length > 0);
}
