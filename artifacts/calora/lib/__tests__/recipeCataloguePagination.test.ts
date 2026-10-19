import { describe, expect, it } from 'vitest';
import type { PremiumRecipe, Recipe } from '@workspace/api-client-react';
import {
  applyDiscoverCataloguePage,
  createDiscoverCatalogueState,
  discoverCatalogueEntries,
  nextDiscoverPaginationOffset,
  resetDiscoverCatalogueState,
} from '../discoverCatalogueState';
import {
  applyPremiumDetailDenial,
  canApplyPremiumPage,
  nextPremiumPaginationOffset,
} from '../premiumCatalogueState';
import {
  DISCOVER_RECIPE_REQUEST_OPTIONS,
  DISCOVER_RECIPE_REQUEST_TIMEOUT_MS,
  shouldRetryDiscoverRecipeRequest,
} from '../discoverRecipeRequest';

function recipe(id: string): Recipe {
  return {
    id,
    name: `Recipe ${id}`,
    image: null,
    category: null,
    area: null,
    instructions: '',
    ingredients: [],
    tags: [],
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    nutritionConfidence: 'estimated',
    source: 'TheMealDB',
    sourceUrl: `https://www.themealdb.com/meal/${id}`,
  } as Recipe;
}

describe('Discover catalogue page ledger', () => {
  it('replaces a successful nonzero page refetch instead of appending the same cards twice', () => {
    let state = createDiscoverCatalogueState<Recipe>('for-you');
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 0,
      recipes: [recipe('a'), recipe('b')],
      nextOffset: 2,
    });
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 2,
      recipes: [recipe('c'), recipe('d')],
      nextOffset: 4,
    });
    const refetched = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 2,
      recipes: [recipe('c'), recipe('d')],
      nextOffset: 4,
    });

    expect(discoverCatalogueEntries(refetched).map((entry) => entry.recipe.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(discoverCatalogueEntries(refetched).map((entry) => entry.feedEntryKey)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps only the first ordered occurrence when neighboring provider pages overlap', () => {
    let state = createDiscoverCatalogueState<Recipe>('for-you');
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 0,
      recipes: [recipe('a'), recipe('b'), recipe('c')],
      nextOffset: 3,
    });
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 3,
      recipes: [recipe('c'), recipe('d'), recipe('e')],
      nextOffset: 6,
    });

    expect(discoverCatalogueEntries(state).map((entry) => entry.recipe.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ignores an old filter generation after a reset even if the abandoned request resolves last', () => {
    const first = createDiscoverCatalogueState<Recipe>('for-you');
    const current = resetDiscoverCatalogueState(first, 'chicken');
    const stale = applyDiscoverCataloguePage(current, {
      generation: first.generation,
      filterKey: 'for-you',
      offset: 18,
      recipes: [recipe('stale')],
      nextOffset: 36,
    });

    expect(stale).toBe(current);
    expect(discoverCatalogueEntries(stale)).toEqual([]);
  });

  it('continues through one hundred advancing pages with exactly one stable card per source id', () => {
    let state = createDiscoverCatalogueState<Recipe>('for-you');
    for (let page = 0; page < 100; page += 1) {
      const offset = page * 2;
      state = applyDiscoverCataloguePage(state, {
        generation: state.generation,
        filterKey: 'for-you',
        offset,
        recipes: [recipe(`recipe-${offset}`), recipe(`recipe-${offset + 1}`)],
        nextOffset: offset + 2,
      });
    }

    const entries = discoverCatalogueEntries(state);
    expect(entries).toHaveLength(200);
    expect(new Set(entries.map((entry) => entry.recipe.id)).size).toBe(200);
    expect(state.nextOffset).toBe(200);
  });

  it('claims each of one hundred Discover cursors once despite repeated layout and scroll events', () => {
    const requestedOffsets: number[] = [];
    let nextOffset: number | null = 0;
    for (let page = 0; page < 100; page += 1) {
      let inFlight = false;
      for (let event = 0; event < 100; event += 1) {
        const claimed = nextDiscoverPaginationOffset({
          activeSection: 'discover',
          nextOffset,
          isFetching: false,
          isLoadingMore: inFlight,
        });
        if (claimed != null) {
          requestedOffsets.push(claimed);
          inFlight = true;
        }
      }
      nextOffset = page === 99 ? null : (page + 1) * 2;
    }

    expect(requestedOffsets).toHaveLength(100);
    expect(new Set(requestedOffsets).size).toBe(100);
    expect(requestedOffsets).toEqual(Array.from({ length: 100 }, (_, index) => index * 2));
  });

  it('stops a circular response once it offers no unseen card, rather than looping requests or materializing duplicate rows', () => {
    let state = createDiscoverCatalogueState<Recipe>('for-you');
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 0,
      recipes: [recipe('a'), recipe('b')],
      nextOffset: 2,
    });
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 2,
      recipes: [recipe('a'), recipe('b')],
      nextOffset: 4,
    });

    expect(discoverCatalogueEntries(state).map((entry) => entry.recipe.id)).toEqual(['a', 'b']);
    expect(state.nextOffset).toBeNull();
    expect(state.terminalReason).toMatch(/already been shown/i);
  });

  it('stops a repeated or nonadvancing source cursor instead of retrying it indefinitely', () => {
    let state = createDiscoverCatalogueState<Recipe>('for-you');
    state = applyDiscoverCataloguePage(state, {
      generation: state.generation,
      filterKey: 'for-you',
      offset: 0,
      recipes: [recipe('a')],
      nextOffset: 0,
    });

    expect(state.nextOffset).toBeNull();
    expect(state.terminalReason).toMatch(/advancing/i);
  });
});

describe('Plus pagination ownership and terminal contract', () => {
  it('allows only the active Plus pane to claim a cursor across Discover → Plus → Create → Plus', () => {
    const common = {
      nextOffset: 18,
      isFetching: false,
      isLoadingMore: false,
    };
    expect(nextPremiumPaginationOffset({ ...common, ownerSection: 'discover', activeSection: 'discover' })).toBeNull();
    expect(nextPremiumPaginationOffset({ ...common, ownerSection: 'premium', activeSection: 'premium' })).toBe(18);
    expect(nextPremiumPaginationOffset({ ...common, ownerSection: 'create', activeSection: 'create' })).toBeNull();
    expect(nextPremiumPaginationOffset({ ...common, ownerSection: 'premium', activeSection: 'premium' })).toBe(18);
  });

  it('emits one request for a cursor during a layout/scroll event storm and none after terminal', () => {
    const requested: number[] = [];
    let inFlight = false;
    for (let event = 0; event < 100; event += 1) {
      const offset = nextPremiumPaginationOffset({
        ownerSection: 'premium',
        activeSection: 'premium',
        nextOffset: 18,
        isFetching: false,
        isLoadingMore: inFlight,
      });
      if (offset != null) {
        requested.push(offset);
        inFlight = true;
      }
    }
    expect(requested).toEqual([18]);

    for (let event = 0; event < 100; event += 1) {
      expect(nextPremiumPaginationOffset({
        ownerSection: 'premium',
        activeSection: 'premium',
        nextOffset: null,
        isFetching: false,
        isLoadingMore: false,
      })).toBeNull();
    }
  });

  it('does not apply placeholder data as a completed page', () => {
    expect(canApplyPremiumPage(true)).toBe(false);
    expect(canApplyPremiumPage(false)).toBe(true);
  });

  it.each([401, 403])('clears the complete protected Plus boundary for a %s list/detail denial', (status) => {
    const calls: string[] = [];
    const handled = applyPremiumDetailDenial(status, () => calls.push('clear-boundary'));

    expect(handled).toBe(true);
    expect(calls).toEqual(['clear-boundary']);
  });

  it('does not misclassify a provider outage as an account boundary', () => {
    expect(applyPremiumDetailDenial(502, () => {
      throw new Error('must not clear');
    })).toBe(false);
  });
});

describe('Discover bounded request recovery', () => {
  it('uses a caller deadline and retries exactly one transient failure', () => {
    expect(DISCOVER_RECIPE_REQUEST_OPTIONS.timeoutMs).toBe(DISCOVER_RECIPE_REQUEST_TIMEOUT_MS);
    expect(shouldRetryDiscoverRecipeRequest(0, { name: 'ApiRequestTimeoutError' })).toBe(true);
    expect(shouldRetryDiscoverRecipeRequest(0, { status: 502 })).toBe(true);
    expect(shouldRetryDiscoverRecipeRequest(0, { status: 400 })).toBe(false);
    expect(shouldRetryDiscoverRecipeRequest(0, { status: 429 })).toBe(false);
    expect(shouldRetryDiscoverRecipeRequest(1, { status: 502 })).toBe(false);
  });
});
