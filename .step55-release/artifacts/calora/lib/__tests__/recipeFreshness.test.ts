import { describe, expect, it } from 'vitest';
import { RecipeFreshnessSession, clearRecipeFreshnessSessions, dedupeRecipes, getRecipeFreshnessSession, mergeRecipePages } from '../recipeFreshness';

const recipes = ['a', 'b', 'c', 'd'].map((id) => ({ id, image: `https://images.example/${id}.jpg` }));

describe('recipe freshness', () => {
  it('isolates account, surface, query, and category scopes', () => {
    clearRecipeFreshnessSessions();
    const accountA = getRecipeFreshnessSession('discover:account-a:all:breakfast');
    const accountB = getRecipeFreshnessSession('discover:account-b:all:breakfast');
    const plusA = getRecipeFreshnessSession('plus:account-a:all:breakfast');
    const queryA = getRecipeFreshnessSession('discover:account-a:pasta:breakfast');

    accountA.remember([recipes[0]], 0);
    plusA.remember([recipes[1]], 0);
    queryA.remember([recipes[2]], 0);

    expect(accountB.order(recipes, accountB.beginVisit(1), 1).map((recipe) => recipe.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(accountA.recentIdsSnapshot(1)).toEqual(['a']);
    expect(plusA.recentIdsSnapshot(1)).toEqual(['b']);
    expect(queryA.recentIdsSnapshot(1)).toEqual(['c']);
  });

  it('keeps the 36-ID bound, 24-hour expiry, and eight-scope cap', () => {
    clearRecipeFreshnessSessions();
    const account = getRecipeFreshnessSession('account-a');
    const ids = Array.from({ length: 40 }, (_, index) => ({ id: `recipe-${index}` }));
    account.remember(ids, 0);
    expect(account.recentIdsSnapshot(0)).toHaveLength(36);
    expect(account.recentIdsSnapshot(24 * 60 * 60 * 1000)).toEqual([]);

    const first = getRecipeFreshnessSession('first');
    first.remember([{ id: 'only-first' }], 0);
    for (let index = 0; index < 8; index += 1) getRecipeFreshnessSession(`scope-${index}`);
    expect(getRecipeFreshnessSession('first').recentIdsSnapshot(0)).toEqual([]);
  });

  it('deduplicates provider pages exclusively by stable ID', () => {
    expect(dedupeRecipes([{ ...recipes[0], image: 'https://images.example/new.jpg' }, recipes[0], recipes[1]]).map((recipe) => recipe.id)).toEqual(['a', 'b']);
    expect(mergeRecipePages([recipes[0], recipes[1]], [recipes[1], recipes[2]]).map((recipe) => recipe.id)).toEqual(['a', 'b', 'c']);
  });

  it('deprioritizes recent recipes, rotates finite exhausted pools, and expires history', () => {
    const session = new RecipeFreshnessSession(2, 10);
    session.remember([recipes[0], recipes[1]], 0);
    expect(session.order(recipes, session.beginVisit(0), 0).map((recipe) => recipe.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(session.order([recipes[0], recipes[1]], session.beginVisit(1), 1).map((recipe) => recipe.id)).toEqual(['a', 'b']);
    expect(session.order([recipes[0]], session.beginVisit(11), 11)).toEqual([recipes[0]]);
  });
});