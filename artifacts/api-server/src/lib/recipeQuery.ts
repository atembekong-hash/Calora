export type RecipeListFilters = {
  query: string;
  category: string;
};

export type RecipeListFilterParseResult =
  | { ok: true; value: RecipeListFilters }
  | { ok: false; message: string };

const RECIPE_QUERY_MAX_LENGTH = 120;
const RECIPE_CATEGORY_MAX_LENGTH = 80;

function parseOptionalQueryString(
  value: unknown,
  field: "query" | "category",
  maxLength: number,
): { ok: true; value: string } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, value: "" };
  if (typeof value !== "string") {
    return { ok: false, message: `${field} must be a string.` };
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { ok: false, message: `${field} must be at most ${maxLength} characters.` };
  }
  return { ok: true, value: trimmed };
}

/**
 * Enforces the documented public recipe-list query bounds before an upstream
 * provider request is constructed. Arrays and nested query values are rejected
 * instead of being coerced into provider-bound strings.
 */
export function parseRecipeListFilters(
  query: Record<string, unknown>,
): RecipeListFilterParseResult {
  const parsedQuery = parseOptionalQueryString(
    query.query,
    "query",
    RECIPE_QUERY_MAX_LENGTH,
  );
  if (!parsedQuery.ok) return parsedQuery;

  const parsedCategory = parseOptionalQueryString(
    query.category,
    "category",
    RECIPE_CATEGORY_MAX_LENGTH,
  );
  if (!parsedCategory.ok) return parsedCategory;

  return {
    ok: true,
    value: {
      query: parsedQuery.value,
      category: parsedCategory.value,
    },
  };
}
