import { describe, expect, it } from 'vitest';
import type { RestaurantFood, RestaurantFoodServing } from '@workspace/api-client-react';
import { restaurantFoodReviewState } from '../restaurantFoodReview';

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
});