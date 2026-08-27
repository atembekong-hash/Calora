import { describe, expect, it } from 'vitest';
import {
  mergeSavedPremiumRecipes,
  missingSavedPremiumRecipeIds,
} from '../premiumSavedRecipes';

const first = { id: 'premium:provider:first', name: 'First' };
const second = { id: 'premium:provider:second', name: 'Second' };

describe('Premium saved recipe reconstruction', () => {
  it('requests saved Premium IDs missing from the current page or filter', () => {
    expect(missingSavedPremiumRecipeIds(
      [first.id, second.id, 'open:recipe'],
      [second],
    )).toEqual([first.id]);
  });

  it('merges current-session, loaded, and fetched recipes in saved order without duplicates', () => {
    expect(mergeSavedPremiumRecipes(
      [second.id, first.id],
      [first],
      [second, first],
      [second],
    )).toEqual([second, first]);
  });

  it('does not surface recipes after their saved ID is removed', () => {
    expect(mergeSavedPremiumRecipes([], [first], [second])).toEqual([]);
  });
});