import type { RestaurantFood, RestaurantFoodServing } from '@workspace/api-client-react';

export type RestaurantFoodReviewState = 'loading' | 'error' | 'unavailable' | 'ready';

export function restaurantFoodReviewState(input: {
  detail: RestaurantFood | undefined;
  serving: RestaurantFoodServing | null;
  isFetching: boolean;
  isError: boolean;
}): RestaurantFoodReviewState {
  if (input.isFetching || !input.detail) return input.isError ? 'error' : 'loading';
  if (input.isError) return 'error';
  const serving = input.serving;
  if (
    !serving
    || serving.calories === null
    || serving.proteinG === null
    || serving.carbsG === null
    || serving.fatG === null
  ) {
    return 'unavailable';
  }
  return 'ready';
}