export type DiscoverRecipeIdentity = { id: string };

export type DiscoverCataloguePage<T extends DiscoverRecipeIdentity> = {
  offset: number;
  recipes: readonly T[];
  nextOffset: number | null;
  terminalReason: string | null;
};

export type DiscoverCatalogueState<T extends DiscoverRecipeIdentity> = {
  generation: number;
  filterKey: string;
  pages: readonly DiscoverCataloguePage<T>[];
  nextOffset: number | null;
  terminalReason: string | null;
};

export type DiscoverCatalogueEntry<T extends DiscoverRecipeIdentity> = {
  recipe: T;
  /** A stable provider identity, never an offset-qualified duplicate key. */
  feedEntryKey: string;
};

export function createDiscoverCatalogueState<T extends DiscoverRecipeIdentity>(
  filterKey: string,
): DiscoverCatalogueState<T> {
  return {
    generation: 0,
    filterKey,
    pages: [],
    nextOffset: 0,
    terminalReason: null,
  };
}

/**
 * Claims a single valid Discover cursor. Scroll, layout, drag-end, and
 * momentum-end events can all arrive for the same viewport, so a caller must
 * keep its in-flight latch true until a non-placeholder page is reconciled.
 */
export function nextDiscoverPaginationOffset(input: {
  activeSection: 'discover' | 'premium' | 'create';
  nextOffset: number | null | undefined;
  isFetching: boolean;
  isLoadingMore: boolean;
}): number | null {
  if (
    input.activeSection !== 'discover'
    || input.nextOffset == null
    || !Number.isFinite(input.nextOffset)
    || input.nextOffset < 0
    || input.isFetching
    || input.isLoadingMore
  ) {
    return null;
  }
  return Math.floor(input.nextOffset);
}

/**
 * A changed search/category starts a fresh generation. Results that still
 * resolve for an abandoned generation are deliberately ignored by apply.
 */
export function resetDiscoverCatalogueState<T extends DiscoverRecipeIdentity>(
  current: DiscoverCatalogueState<T>,
  filterKey: string,
): DiscoverCatalogueState<T> {
  if (current.filterKey === filterKey && current.pages.length === 0 && current.nextOffset === 0) {
    return current;
  }
  return {
    generation: current.generation + 1,
    filterKey,
    pages: [],
    nextOffset: 0,
    terminalReason: null,
  };
}

function stableRecipeId(recipe: DiscoverRecipeIdentity): string {
  return recipe.id.trim();
}

function uniqueRecipes<T extends DiscoverRecipeIdentity>(recipes: readonly T[]): T[] {
  const seen = new Set<string>();
  return recipes.filter((recipe) => {
    const id = stableRecipeId(recipe);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function pageRecipesOutsideOffset<T extends DiscoverRecipeIdentity>(
  pages: readonly DiscoverCataloguePage<T>[],
  offset: number,
): T[] {
  return pages
    .filter((page) => page.offset !== offset)
    .flatMap((page) => page.recipes);
}

/**
 * Returns every currently known card in stable offset order. A provider may
 * overlap adjacent pages; the first result keeps its position and later
 * occurrences never become visually distinct cards.
 */
export function discoverCatalogueEntries<T extends DiscoverRecipeIdentity>(
  state: DiscoverCatalogueState<T>,
): DiscoverCatalogueEntry<T>[] {
  const seen = new Set<string>();
  return [...state.pages]
    .sort((left, right) => left.offset - right.offset)
    .flatMap((page) => page.recipes)
    .flatMap((recipe) => {
      const id = stableRecipeId(recipe);
      if (!id || seen.has(id)) return [];
      seen.add(id);
      return [{ recipe, feedEntryKey: id }];
    });
}

/**
 * Reconcile one server page into the current filter generation. Re-applying an
 * offset replaces that offset's page instead of appending it. A newly seen
 * page that contains only earlier recipe identities is treated as a truthful
 * terminal condition: the client will not manufacture an endless duplicate
 * grid merely because an upstream circular cursor keeps advancing.
 */
export function applyDiscoverCataloguePage<T extends DiscoverRecipeIdentity>(
  current: DiscoverCatalogueState<T>,
  input: {
    generation: number;
    filterKey: string;
    offset: number;
    recipes: readonly T[];
    nextOffset?: number | null;
    terminalReason?: string | null;
  },
): DiscoverCatalogueState<T> {
  if (input.generation !== current.generation || input.filterKey !== current.filterKey) {
    return current;
  }

  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset)) : 0;
  const pageRecipes = uniqueRecipes(input.recipes);
  // A page-zero refresh defines the source ordering anew. Later cached pages
  // belong to the previous root response and must not survive beside it.
  const retainedPages = offset === 0
    ? []
    : current.pages.filter((page) => page.offset !== offset);
  const priorIds = new Set(pageRecipesOutsideOffset(current.pages, offset).map(stableRecipeId));
  const isNewOffset = !current.pages.some((page) => page.offset === offset);
  const addsAnyNewRecipe = pageRecipes.some((recipe) => !priorIds.has(stableRecipeId(recipe)));
  const requestedNextOffset = input.nextOffset == null
    ? null
    : Number.isFinite(input.nextOffset)
      ? Math.max(0, Math.floor(input.nextOffset))
      : null;
  const invalidCursor = requestedNextOffset !== null && requestedNextOffset <= offset;
  const repeatedCircularPage = isNewOffset && pageRecipes.length > 0 && !addsAnyNewRecipe;
  const terminalReason = invalidCursor
    ? 'Recipe source did not provide an advancing page cursor.'
    : repeatedCircularPage
      ? 'Every available unique recipe in this source has already been shown.'
      : requestedNextOffset == null
        ? (input.terminalReason ?? 'No more recipes are available for this query.')
        : null;
  const nextOffset = invalidCursor || repeatedCircularPage ? null : requestedNextOffset;
  const page: DiscoverCataloguePage<T> = {
    offset,
    recipes: pageRecipes,
    nextOffset,
    terminalReason,
  };

  return {
    ...current,
    pages: [...retainedPages, page].sort((left, right) => left.offset - right.offset),
    nextOffset,
    terminalReason,
  };
}
