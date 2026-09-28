import { describe, expect, it } from 'vitest';
import { resolvePremiumRecipeDetailImage } from '../premiumRecipeDetailImage';

const selectedCard = {
  id: 'premium:FatSecret:42',
  sourceId: '42',
  image: 'https://images.fatsecret.com/recipes/42-card.jpg',
};

describe('resolvePremiumRecipeDetailImage', () => {
  it('keeps the selected Plus card image when its matching detail omits a photo', () => {
    expect(resolvePremiumRecipeDetailImage({ ...selectedCard, image: null }, selectedCard)).toEqual(selectedCard);
  });

  it('keeps a trusted detail image instead of replacing it with the card thumbnail', () => {
    const detail = { ...selectedCard, image: 'https://images.fatsecret.com/recipes/42-detail.jpg' };
    expect(resolvePremiumRecipeDetailImage(detail, selectedCard)).toEqual(detail);
  });

  it('never transfers an image between different Plus recipe identities', () => {
    const detail = { id: 'premium:FatSecret:99', sourceId: '99', image: null };
    expect(resolvePremiumRecipeDetailImage(detail, selectedCard)).toEqual(detail);
  });

  it('does not promote an untrusted selected-card URL into the detail screen', () => {
    const untrustedCard = { ...selectedCard, image: 'https://untrusted.example/recipe.jpg' };
    const detail = { ...selectedCard, image: null };
    expect(resolvePremiumRecipeDetailImage(detail, untrustedCard)).toEqual(detail);
  });
});
