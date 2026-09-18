import { describe, expect, it } from 'vitest';
import {
  clearDuplicatePremiumRecipeImages,
  normalizePremiumRecipeImageUrl,
} from '../premiumRecipeImages';

describe('premium recipe image identity', () => {
  it('normalizes provider variants before comparing image identity', () => {
    expect(normalizePremiumRecipeImageUrl('https://images.example/meal.jpg?w=320#crop')).toBe(
      'https://images.example/meal.jpg',
    );
  });

  it('clears a duplicate that appears on a later loaded page', () => {
    const firstPage = [
      { id: 'one', image: 'https://images.example/meal.jpg?w=320' },
    ];
    const secondPage = [
      { id: 'two', image: 'https://images.example/meal.jpg?q=80' },
      { id: 'three', image: 'https://images.example/other.jpg' },
    ];

    expect(clearDuplicatePremiumRecipeImages([...firstPage, ...secondPage])).toEqual([
      firstPage[0],
      { id: 'two', image: null },
      secondPage[1],
    ]);
  });

  it('does not alter recipes without an image or distinct provider photos', () => {
    const recipes = [
      { id: 'one', image: null },
      { id: 'two', image: 'https://images.example/one.jpg' },
      { id: 'three', image: 'https://images.example/two.jpg' },
    ];

    expect(clearDuplicatePremiumRecipeImages(recipes)).toEqual(recipes);
  });
});