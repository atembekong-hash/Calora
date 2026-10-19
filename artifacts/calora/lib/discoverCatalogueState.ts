export type DiscoverRecipeIdentity = { id: string; image?: string | null };

export type DiscoverCataloguePage<T extends DiscoverRecipeIdentity> = {
  offset: number;
  recipes: readonly T[];
  nextOffset: number | null;
  terminalReason: string | null;
  /** The server explicitly declares an unfiltered browse feed may repeat after one source pass. */
  continuousBrowse: boolean;
  /** Server-owned cycle identity. Never infer a cycle from a viewport event. */
  browseCycle: number;
  /** Server-owned cardinality needed when a requested page crosses a cycle boundary. */
  browsePoolSize: number | null;
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
  /** Stable per-source identity; circular pages are intentionally distinct only across server-declared cycles. */
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

function hasUsableImage(recipe: DiscoverRecipeIdentity): boolean {
  return typeof recipe.image === 'string' && recipe.image.trim().length > 0;
}

/**
 * Prefer the first provider position but retain a later valid thumbnail for the
 * same stable identity. The display policy still validates the URL before use.
 */
function uniqueRecipes<T extends DiscoverRecipeIdentity>(recipes: readonly T[]): T[] {
  const positionById = new Map<string, number>();
  const result: T[] = [];
  for (const recipe of recipes) {
    const id = stableRecipeId(recipe);
    if (!id) continue;
    const position = positionById.get(id);
    if (position == null) {
      positionById.set(id, result.length);
      result.push(recipe);
      continue;
    }
    if (!hasUsableImage(result[position]!) && hasUsableImage(recipe)) result[position] = recipe;
  }
  return result;
}

function pageRecipesOutsideOffset<T extends DiscoverRecipeIdentity>(
  pages: readonly DiscoverCataloguePage<T>[],
  offset: number,
): T[] {
  return pages
    .filter((page) => page.offset !== offset)
    .flatMap((page) => page.recipes);
}

function entryKey<T extends DiscoverRecipeIdentity>(page: DiscoverCataloguePage<T>, recipe: T, index: number): string {
  const id = stableRecipeId(recipe);
  const cycle = page.browsePoolSize && page.browsePoolSize > 0
    ? Math.floor((page.offset + index) / page.browsePoolSize)
    : page.browseCycle;
  return page.continuousBrowse ? `cycle:${cycle}:${id}` : id;
}

/**
 * Returns every currently known card in stable offset order. Provider overlap
 * never adds a duplicate within a server-declared cycle. A deliberate circular
 * browse cycle uses a distinct key so the catalogue can continue truthfully
 * without pretending repeated source rows are accidental refetches.
 */
export function discoverCatalogueEntries<T extends DiscoverRecipeIdentity>(
  state: DiscoverCatalogueState<T>,
): DiscoverCatalogueEntry<T>[] {
  const positionByKey = new Map<string, number>();
  const entries: DiscoverCatalogueEntry<T>[] = [];
  for (const page of [...state.pages].sort((left, right) => left.offset - right.offset)) {
    for (const [index, recipe] of page.recipes.entries()) {
      const id = stableRecipeId(recipe);
      if (!id) continue;
      const feedEntryKey = entryKey(page, recipe, index);
      const position = positionByKey.get(feedEntryKey);
      if (position == null) {
        positionByKey.set(feedEntryKey, entries.length);
        entries.push({ recipe, feedEntryKey });
      } else if (!hasUsableImage(entries[position]!.recipe) && hasUsableImage(recipe)) {
        entries[position] = { recipe, feedEntryKey };
      }
    }
  }
  return entries;
}

/**
 * Reconcile one server page into the current filter generation. Re-applying an
 * offset replaces that offset's page instead of appending it. Ordinary finite
 * queries stop when the provider repeats identities. Only the documented
 * unfiltered continuous-browse response may introduce a new cycle of those
 * source identities.
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
    continuousBrowse?: boolean;
    browseCycle?: number | null;
    browsePoolSize?: number | null;
  },
): DiscoverCatalogueState<T> {
  if (input.generation !== current.generation || input.filterKey !== current.filterKey) {
    return current;
  }

  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset)) : 0;
  const continuousBrowse = input.continuousBrowse === true;
  const browseCycle = continuousBrowse && Number.isFinite(input.browseCycle)
    ? Math.max(0, Math.floor(input.browseCycle!))
    : 0;
  const browsePoolSize = continuousBrowse && Number.isFinite(input.browsePoolSize) && input.browsePoolSize! > 0
    ? Math.floor(input.browsePoolSize!)
    : null;
  // A circular page can cross a provider-pool boundary. Preserve every valid
  // position so `offset + index` can assign each deliberate repeat to its
  // actual server-owned cycle; finite results still reconcile overlaps here.
  const pageRecipes = continuousBrowse
    ? input.recipes.filter((recipe) => Boolean(stableRecipeId(recipe)))
    : uniqueRecipes(input.recipes);
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
  const repeatedFinitePage = !continuousBrowse && isNewOffset && pageRecipes.length > 0 && !addsAnyNewRecipe;
  const terminalReason = invalidCursor
    ? 'Recipe source did not provide an advancing page cursor.'
    : repeatedFinitePage
      ? 'Every available unique recipe in this source has already been shown.'
      : requestedNextOffset == null
        ? (input.terminalReason ?? 'No more recipes are available for this query.')
        : null;
  const nextOffset = invalidCursor || repeatedFinitePage ? null : requestedNextOffset;
  const page: DiscoverCataloguePage<T> = {
    offset,
    recipes: pageRecipes,
    nextOffset,
    terminalReason,
    continuousBrowse,
    browseCycle,
    browsePoolSize,
  };

  return {
    ...current,
    pages: [...retainedPages, page].sort((left, right) => left.offset - right.offset),
    nextOffset,
    terminalReason,
  };
}
