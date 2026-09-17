import { describe, expect, it } from 'vitest';
import { RecipeFreshnessSession, dedupeRecipes, mergeRecipePages } from '../recipeFreshness';

const recipes = ['a', 'b', 'c', 'd'].map((id) => ({ id, image: `https://images.example/${id}.jpg` }));

describe('recipe freshness', () => {
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