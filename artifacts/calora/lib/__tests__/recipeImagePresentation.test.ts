import { describe, expect, it } from 'vitest';
import { recipeImageRole } from '../recipeImagePresentation';

describe('recipe image presentation roles', () => {
  it('uses semantic recipe metadata to choose a fallback role', () => {
    expect(recipeImageRole({ name: 'Berry smoothie' })).toBe('drink');
    expect(recipeImageRole({ name: 'Hummus plate', tags: ['Snack'] })).toBe('snack');
    expect(recipeImageRole({ name: 'Overnight oats', category: 'Breakfast' })).toBe('breakfast');
    expect(recipeImageRole({ name: 'Salmon bowl', category: 'Dinner' })).toBe('main');
  });

  it('does not treat an unavailable provider image as a canonical photo', () => {
    expect(recipeImageRole({ name: 'Iced tea', category: 'Drink' })).toBe('drink');
  });
});