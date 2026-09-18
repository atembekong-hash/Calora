import type { PremiumRecipe } from '@workspace/api-client-react';

export type PremiumCatalogueState = {
  userId: string | null;
  recipes: PremiumRecipe[];
  freshnessDay?: string;
  search?: string;
  category?: string;
  offset?: number;
  cycle?: number;
  nextOffset?: number | null;
  terminalReason?: string | null;
  scrollY?: number;
};

export function utcFreshnessDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * A default catalogue is a day session. Filtered provider results are never
 * freshness-ranked, so they can safely retain their cursor across midnight.
 */
export function restorePremiumCatalogueSession(
  state: PremiumCatalogueState,
  userId: string | null,
  today: string,
): PremiumCatalogueState {
  if (!userId || state.userId !== userId) return { userId: null, recipes: [] };
  const filtered = Boolean(state.search || state.category);
  if (filtered || state.freshnessDay === today) return state;
  return {
    ...state,
    freshnessDay: today,
    offset: 0,
    cycle: 0,
    nextOffset: null,
    terminalReason: null,
    scrollY: 0,
  };
}

/** Page zero replaces a freshness session; later real pages append uniquely. */
export function mergePremiumCataloguePage(
  current: PremiumRecipe[],
  page: PremiumRecipe[],
  offset: number,
  options: { appendAtZero?: boolean; allowRepeatedCycle?: boolean } = {},
): PremiumRecipe[] {
  if (offset === 0 && !options.appendAtZero) return page;
  if (options.allowRepeatedCycle) return [...current, ...page];
  const seen = new Set(current.map((recipe) => recipe.id));
  return [...current, ...page.filter((recipe) => !seen.has(recipe.id))];
}

export function clearPremiumCatalogueState(): PremiumCatalogueState {
  return { userId: null, recipes: [] };
}

/** One account-wide boundary for either list or detail entitlement denial. */
export function clearPremiumAccountBoundary(actions: {
  removeListQueries: () => void;
  removeDetailQueries: () => void;
  clearSaved: () => void;
  clearCatalogue: () => void;
  closePremiumDetail: () => void;
}): void {
  actions.removeListQueries();
  actions.removeDetailQueries();
  actions.clearSaved();
  actions.clearCatalogue();
  actions.closePremiumDetail();
}

/** Used by the detail effect so denial handling is independently testable. */
export function applyPremiumDetailDenial(status: number | null, clearBoundary: () => void): boolean {
  if (status !== 401 && status !== 403) return false;
  clearBoundary();
  return true;
}

/** Avoid a parent write when a catalogue child republishes the same page. */
export function samePremiumCatalogueState(
  current: PremiumCatalogueState,
  userId: string | null,
  recipes: PremiumRecipe[],
): boolean {
  return current.userId === userId
    && current.recipes.length === recipes.length
    && current.recipes.every((recipe, index) => (
      recipe.id === recipes[index]?.id
      && recipe.image === recipes[index]?.image
    ));
}

export function samePremiumCatalogueSession(current: PremiumCatalogueState, next: PremiumCatalogueState): boolean {
  return samePremiumCatalogueState(current, next.userId, next.recipes)
    && current.freshnessDay === next.freshnessDay
    && (current.search ?? '') === (next.search ?? '')
    && (current.category ?? '') === (next.category ?? '')
    && (current.offset ?? 0) === (next.offset ?? 0)
    && (current.cycle ?? 0) === (next.cycle ?? 0)
    && current.nextOffset === next.nextOffset
    && current.terminalReason === next.terminalReason;
}

/** Previous-offset placeholder data must never advance pagination state. */
export function canApplyPremiumPage(isPlaceholderData: boolean): boolean {
  return !isPlaceholderData;
}