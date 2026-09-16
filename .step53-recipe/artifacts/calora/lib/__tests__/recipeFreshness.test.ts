import { describe, expect, it } from 'vitest';
import {
  RecipeFreshnessSession,
  clearRecipeFreshnessSessions,
  dedupeRecipes,
  getRecipeFreshnessSession,
  mergeRecipePages,
} from '../recipeFreshness';

const recipes = ['a', 'b', 'c', 'd'].map((id) => ({ id, image: `https://images.example/${id}.jpg` }));

describe('recipe freshness sessions', () => {
  it('deduplicates within and across pages by stable recipe ID, never image URL', () => {
    expect(dedupeRecipes([{ ...recipes[0], image: 'https://images.example/updated.jpg' }, recipes[0], recipes[1]]).map((recipe) => recipe.id)).toEqual(['a', 'b']);
    expect(mergeRecipePages([recipes[0], recipes[1]], [recipes[1], recipes[2]]).map((recipe) => recipe.id)).toEqual(['a', 'b', 'c']);
  });

  it('deprioritizes recently shown recipes deterministically and rotates a small exhausted pool', () => {
    const session = new RecipeFreshnessSession(4, 1_000);
    const firstVisit = session.beginVisit(0);
    session.remember([recipes[0], recipes[1]], 0);

    expect(session.order(recipes, firstVisit, 0).map((recipe) => recipe.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(session.order([recipes[0], recipes[1]], session.beginVisit(1), 1).map((recipe) => recipe.id)).toEqual(['a', 'b']);
  });

  it('bounds and expires recent history without fabricating recipes', () => {
    const session = new RecipeFreshnessSession(2, 10);
    session.remember(recipes.slice(0, 3), 0);
    expect(session.recentIdsSnapshot(0)).toEqual(['b', 'c']);
    expect(session.order([recipes[0]], session.beginVisit(20), 20)).toEqual([recipes[0]]);
    expect(session.recentIdsSnapshot(20)).toEqual([]);
  });

  it('keeps Discover and Plus histories isolated by account and surface scope', () => {
    clearRecipeFreshnessSessions();
    const discoverA = getRecipeFreshnessSession('discover:account-a');
    const plusA = getRecipeFreshnessSession('plus:account-a');
    const discoverB = getRecipeFreshnessSession('discover:account-b');
    discoverA.remember([recipes[0]], 0);

    expect(discoverA.recentIdsSnapshot(0)).toEqual(['a']);
    expect(plusA.recentIdsSnapshot(0)).toEqual([]);
    expect(discoverB.recentIdsSnapshot(0)).toEqual([]);
  });
});