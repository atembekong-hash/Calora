import { describe, expect, it } from 'vitest';
import {
  premiumRecipeRouteState,
  premiumSavedRecipeRestorationState,
  shouldLoadMorePremiumRecipes,
} from '../premiumRecipeReliability';

describe('Plus caller reliability decisions', () => {
  it('keeps a routed Plus detail in an explicit sign-in, loading, or retryable state', () => {
    expect(premiumRecipeRouteState({ active: true, signedIn: false, isLoading: false, isFetching: false, isError: false, error: null })).toBe('authentication');
    expect(premiumRecipeRouteState({ active: true, signedIn: true, isLoading: true, isFetching: true, isError: false, error: null })).toBe('loading');
    expect(premiumRecipeRouteState({ active: true, signedIn: true, isLoading: false, isFetching: false, isError: true, error: { status: 502 } })).toBe('unavailable');
    expect(premiumRecipeRouteState({ active: true, signedIn: true, isLoading: false, isFetching: false, isError: true, error: { status: 401 } })).toBe('authentication');
  });

  it('distinguishes protected saved recipe restoration from a provider outage', () => {
    expect(premiumSavedRecipeRestorationState([{ isError: true, error: { status: 401 } }])).toBe('authentication');
    expect(premiumSavedRecipeRestorationState([{ isError: true, error: { status: 403 } }])).toBe('authentication');
    expect(premiumSavedRecipeRestorationState([{ isError: true, error: { status: 502 } }])).toBe('unavailable');
    expect(premiumSavedRecipeRestorationState([{ isError: false, error: null }])).toBe('ready');
  });

  it('allows Plus paging only from the active Plus pane metrics', () => {
    const atEnd = { offsetY: 850, viewportHeight: 600, contentHeight: 1_600, prefetchDistance: 160 };
    expect(shouldLoadMorePremiumRecipes({ ...atEnd, section: 'premium', activeSection: 'premium' })).toBe(true);
    expect(shouldLoadMorePremiumRecipes({ ...atEnd, section: 'discover', activeSection: 'premium' })).toBe(false);
    expect(shouldLoadMorePremiumRecipes({ ...atEnd, section: 'premium', activeSection: 'discover' })).toBe(false);
    expect(shouldLoadMorePremiumRecipes({ ...atEnd, section: 'premium', activeSection: 'premium', offsetY: 0 })).toBe(false);
  });
});
