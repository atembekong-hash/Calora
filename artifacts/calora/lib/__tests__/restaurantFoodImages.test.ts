import { describe, expect, it } from 'vitest';
import { restaurantFoodImageAssetKey, restaurantFoodImageKey, restaurantFoodImageLabel } from '../restaurantFoodImageSelection';

describe('restaurantFoodImageKey', () => {
  it('assigns representative photos to branded menu items', () => {
    expect(restaurantFoodImageKey({ brandName: 'Chipotle', name: 'Chicken Burrito Bowl' })).toBe('bowl');
    expect(restaurantFoodImageKey({ brandName: "Wendy's", name: 'Dave’s Single' })).toBe('main');
    expect(restaurantFoodImageKey({ brandName: 'Burger King', name: 'Whopper' })).toBe('main');
  });

  it('uses item names so searched restaurants receive the same treatment', () => {
    const salad = restaurantFoodImageKey({ brandName: 'Local Restaurant', name: 'Garden Salad' });
    const drink = restaurantFoodImageKey({ brandName: 'Local Restaurant', name: 'Iced Tea' });

    expect(salad).toBe('salad');
    expect(drink).toBe('drink');
  });

  it('does not let restaurant brand names misclassify the menu item photo', () => {
    expect(restaurantFoodImageKey({ brandName: 'Coffee Bean & Tea Leaf', name: 'Turkey Sandwich' }))
      .toBe('wrap');
    expect(restaurantFoodImageKey({ brandName: 'Taco Bell', name: 'Cheeseburger' }))
      .toBe('main');
  });

  it('keeps compound menu names in the most specific visual category', () => {
    expect(restaurantFoodImageKey({ name: 'Side Salad' })).toBe('salad');
    expect(restaurantFoodImageKey({ name: 'Chicken Burrito Bowl' })).toBe('bowl');
    expect(restaurantFoodImageKey({ name: 'Coffee Cake' })).toBe('snack');
  });

  it('round-trips a stable representative asset identity for diary thumbnails', () => {
    const assetKey = restaurantFoodImageAssetKey({ name: 'Garden Salad' });
    expect(assetKey).toBe('restaurant:salad');
  });

  it('labels local category imagery as representative instead of exact dish photography', () => {
    expect(restaurantFoodImageLabel({ brandName: 'Local Restaurant', name: 'Garden Salad' }))
      .toBe('Representative salad image for Garden Salad');
  });
});