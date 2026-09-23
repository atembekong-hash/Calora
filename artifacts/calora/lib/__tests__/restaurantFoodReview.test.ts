import { describe, expect, it } from 'vitest';
import type { RestaurantFood, RestaurantFoodServing } from '@workspace/api-client-react';
import { restaurantFoodReviewState } from '../restaurantFoodReview';
import { sourceComponentsToDraft } from '../foodMemory';
import { restaurantFoodImageAssetKey } from '../restaurantFoodImageSelection';

const serving: RestaurantFoodServing = {
  servingId: 'serving-1',
  description: '1 burger',
  calories: 320,
  proteinG: 17,
  carbsG: 31,
  fatG: 15,
  fiberG: 2,
  sugarG: 7,
  sodiumMg: 710,
};

const detail: RestaurantFood = {
  id: 'fatsecret-food:123',
  sourceId: '123',
  name: 'Cheeseburger',
  brandName: 'Example Burger',
  foodUrl: null,
  serving: serving.description,
  servingId: serving.servingId,
  calories: serving.calories,
  proteinG: serving.proteinG,
  carbsG: serving.carbsG,
  fatG: serving.fatG,
  fiberG: serving.fiberG,
  sugarG: serving.sugarG,
  sodiumMg: serving.sodiumMg,
  servings: [serving],
  sourceProvider: 'FatSecret',
  nutritionConfidence: 'verified',
  nutritionSource: 'FatSecret nutrition data',
};

describe('restaurantFoodReviewState', () => {
  it('does not allow a nutrition-complete search result to substitute for missing detail', () => {
    expect(restaurantFoodReviewState({
      detail: undefined,
      serving,
      isFetching: false,
      isError: true,
    })).toBe('error');
  });

  it('allows review only after a successful nutrition-complete detail response', () => {
    expect(restaurantFoodReviewState({
      detail,
      serving,
      isFetching: false,
      isError: false,
    })).toBe('ready');
  });

  it('blocks detail responses that omit a required macro', () => {
    expect(restaurantFoodReviewState({
      detail,
      serving: { ...serving, carbsG: null },
      isFetching: false,
      isError: false,
    })).toBe('unavailable');
  });

  it('carries the stable representative category identity and source into the diary review draft', () => {
    const draft = sourceComponentsToDraft({
      inputType: 'text',
      title: 'Example Burger Cheeseburger',
      date: '2026-09-23',
      meal: 'Dinner',
      components: [{
        id: `fatsecret-${detail.sourceId}-${serving.servingId}`,
        name: detail.name,
        brand: detail.brandName,
        serving: serving.description,
        calories: serving.calories ?? 0,
        proteinG: serving.proteinG ?? 0,
        carbsG: serving.carbsG ?? 0,
        fatG: serving.fatG ?? 0,
        included: true,
        eatenFraction: 1,
        provenance: 'verified_restaurant',
        sourceLabel: detail.nutritionSource,
        confidence: 78,
        confidenceDimensions: { identity: 96, portion: 92, nutritionSource: 96, preparation: 78 },
        assumptions: [],
        reviewQuestions: [],
      }],
      sourceLabel: detail.nutritionSource,
      provenance: 'verified_restaurant',
      assumptions: ['Representative category illustration — no verified menu photo.'],
      imageAssetKey: restaurantFoodImageAssetKey(detail),
      imageSource: 'restaurant_representative',
      now: '2026-09-23T12:00:00.000Z',
    });

    expect(draft).toMatchObject({
      imageAssetKey: 'restaurant:main',
      imageSource: 'restaurant_representative',
      assumptions: expect.arrayContaining(['Representative category illustration — no verified menu photo.']),
    });
  });
});
