import { describe, expect, it } from 'vitest';
import {
  clearRecipeFreshnessSessions,
  getRecipeFreshnessSession,
  mergeRecipePages,
} from '../recipeFreshness';

type Surface = 'discover' | 'plus';
type Recipe = { id: string; name: string };

const firstProviderPage: Recipe[] = Array.from({ length: 18 }, (_, index) => ({
  id: `recipe-${index + 1}`,
  name: `Recipe ${index + 1}`,
}));
const secondProviderPage: Recipe[] = Array.from({ length: 18 }, (_, index) => ({
  id: `recipe-${index + 19}`,
  name: `Recipe ${index + 19}`,
}));
const pageSize = 18;

/**
 * Models the screen lifecycle used by both recipe catalogues:
 * provider pages stay cached while the surface is reopened, each active
 * session begins a new freshness visit, and the displayed front page is
 * remembered before the next reopen.
 */
function openRecipeSurface(surface: Surface, accountId: string, loadedRecipes: Recipe[], now: number) {
  const session = getRecipeFreshnessSession(`${surface}:${accountId}:all`);
  const visit = session.beginVisit(now);
  const ordered = session.order(loadedRecipes, visit, now);
  const frontPage = ordered.slice(0, pageSize);
  session.remember(frontPage, now);
  return {
    visit,
    frontPage,
    frontPageIds: frontPage.map((recipe) => recipe.id),
  };
}

describe('recipe rotation end-to-end reopen lifecycle', () => {
  it('changes the Discover front page across six reopens without changing its recipe set', () => {
    clearRecipeFreshnessSessions();
    const loadedRecipes = mergeRecipePages([], firstProviderPage);
    const opens = Array.from({ length: 6 }, (_, reopen) =>
      openRecipeSurface('discover', 'qa-account', loadedRecipes, reopen),
    );

    expect(opens.map((open) => open.visit)).toEqual([1, 2, 3, 4, 5, 6]);
    for (let index = 1; index < opens.length; index += 1) {
      expect(opens[index].frontPageIds).not.toEqual(opens[index - 1].frontPageIds);
    }
    for (const open of opens) {
      expect(new Set(open.frontPageIds)).toEqual(new Set(firstProviderPage.map((recipe) => recipe.id)));
    }
  });

  it('changes the Plus front page after pagination while retaining both provider pages', () => {
    clearRecipeFreshnessSessions();
    const loadedRecipes = mergeRecipePages(firstProviderPage, secondProviderPage);
    const opens = Array.from({ length: 4 }, (_, reopen) =>
      openRecipeSurface('plus', 'qa-account', loadedRecipes, reopen),
    );

    expect(opens.map((open) => open.frontPageIds.length)).toEqual([pageSize, pageSize, pageSize, pageSize]);
    expect(opens[1].frontPageIds).not.toEqual(opens[0].frontPageIds);
    expect(opens[2].frontPageIds).not.toEqual(opens[1].frontPageIds);
    expect(new Set(opens[0].frontPageIds)).toEqual(new Set(firstProviderPage.map((recipe) => recipe.id)));
    expect(new Set(loadedRecipes.map((recipe) => recipe.id))).toHaveLength(36);
  });

  it('keeps Discover and Plus reopen histories isolated for the same account', () => {
    clearRecipeFreshnessSessions();
    const loadedRecipes = mergeRecipePages([], firstProviderPage);
    const discoverFirst = openRecipeSurface('discover', 'same-account', loadedRecipes, 0);
    openRecipeSurface('plus', 'same-account', loadedRecipes, 0);
    const discoverSecond = openRecipeSurface('discover', 'same-account', loadedRecipes, 1);
    const plusSecond = openRecipeSurface('plus', 'same-account', loadedRecipes, 1);

    expect(discoverFirst.visit).toBe(1);
    expect(discoverSecond.visit).toBe(2);
    expect(plusSecond.visit).toBe(2);
    expect(discoverSecond.frontPageIds).toEqual(plusSecond.frontPageIds);
    expect(discoverSecond.frontPageIds).not.toEqual(discoverFirst.frontPageIds);
  });

  it('does not leak a previous account’s reopen history into a new account', () => {
    clearRecipeFreshnessSessions();
    const loadedRecipes = mergeRecipePages([], firstProviderPage);
    const accountA = openRecipeSurface('discover', 'account-a', loadedRecipes, 0);
    const accountB = openRecipeSurface('discover', 'account-b', loadedRecipes, 0);

    expect(accountA.visit).toBe(1);
    expect(accountB.visit).toBe(1);
    expect(accountB.frontPageIds).toEqual(accountA.frontPageIds);
  });
});
