import { describe, expect, it } from 'vitest';
import { shoppingItemUsageLabel } from '../shoppingItemPresentation';

describe('shopping item presentation', () => {
  it('labels planner aggregation as planned-meal occurrences, not a unit quantity', () => {
    expect(shoppingItemUsageLabel({ quantity: 1 })).toBe('Used in 1 planned meal');
    expect(shoppingItemUsageLabel({ quantity: 3 })).toBe('Used in 3 planned meals');
  });

  it('keeps manually selected recipe ingredients distinct from planner aggregation', () => {
    expect(shoppingItemUsageLabel({ quantity: 1, recipeSource: true })).toBe('Added from recipe');
  });
});
