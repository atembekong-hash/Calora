import { isPremiumRecipeAuthenticationError } from './premiumRecipeRequest';

export type PremiumRecipeRouteState = 'idle' | 'loading' | 'authentication' | 'unavailable';
export type PremiumSavedRecipeRestorationState = 'ready' | 'authentication' | 'unavailable';

export type PremiumRequestFailure = {
  isError?: boolean;
  error?: unknown;
};

/**
 * Choose an explicit routed-detail state before a recipe object exists. This
 * prevents a deep link from silently leaving the user on an empty screen.
 */
export function premiumRecipeRouteState(input: {
  active: boolean;
  signedIn: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
}): PremiumRecipeRouteState {
  if (!input.active) return 'idle';
  if (!input.signedIn || isPremiumRecipeAuthenticationError(input.error)) return 'authentication';
  if (input.isError) return 'unavailable';
  if (input.isLoading || input.isFetching) return 'loading';
  return 'loading';
}

/**
 * Saved Plus entries are protected. Preserve that distinction so expired
 * credentials never appear as a generic connectivity outage.
 */
export function premiumSavedRecipeRestorationState(
  failures: readonly PremiumRequestFailure[],
): PremiumSavedRecipeRestorationState {
  const failed = failures.filter((query) => query.isError);
  if (!failed.length) return 'ready';
  if (failed.some((query) => isPremiumRecipeAuthenticationError(query.error))) {
    return 'authentication';
  }
  return 'unavailable';
}

/**
 * A retained neighboring pager pane must never drive Plus pagination with its
 * own layout or scroll measurements.
 */
export function shouldLoadMorePremiumRecipes(input: {
  section: 'discover' | 'premium' | 'create';
  activeSection: 'discover' | 'premium' | 'create';
  offsetY: number;
  viewportHeight: number;
  contentHeight: number;
  prefetchDistance: number;
}): boolean {
  return input.section === 'premium'
    && input.activeSection === 'premium'
    && input.viewportHeight > 0
    && input.offsetY + input.viewportHeight >= input.contentHeight - input.prefetchDistance;
}
