import { describe, expect, it } from 'vitest';
import {
  restaurantFoodImageAssetKey,
  restaurantFoodImageKey,
  restaurantFoodImageLabel,
  RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL,
} from '../restaurantFoodImageSelection';
import { restaurantFoodIllustration, restaurantFoodIllustrationForAssetKey } from '../restaurantFoodImages';

describe('restaurantFoodImageKey', () => {
  it('assigns representative category illustrations to branded menu items', () => {
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

  it('does not let restaurant brand names misclassify the menu item illustration', () => {
    expect(restaurantFoodImageKey({ brandName: 'Coffee Bean & Tea Leaf', name: 'Turkey Sandwich' }))
      .toBe('wrap');
    expect(restaurantFoodImageKey({ brandName: 'Taco Bell', name: 'Cheeseburger' }))
      .toBe('main');
  });

  it('keeps compound menu names in the most specific visual category', () => {
    expect(restaurantFoodImageKey({ name: 'Side Salad' })).toBe('salad');
    expect(restaurantFoodImageKey({ name: 'Chicken Burrito Bowl' })).toBe('bowl');
    expect(restaurantFoodImageKey({ name: 'Coffee Cake' })).toBe('snack');
    expect(restaurantFoodImageKey({ name: 'Hash Browns' })).toBe('breakfast');
    expect(restaurantFoodImageKey({ name: 'Whopper' })).toBe('main');
  });

  it('round-trips a stable representative asset identity for diary thumbnails', () => {
    const assetKey = restaurantFoodImageAssetKey({ name: 'Garden Salad' });
    expect(assetKey).toBe('restaurant:salad');
  });

  it('labels local category imagery as a non-photo representative illustration', () => {
    expect(restaurantFoodImageLabel({ brandName: 'Local Restaurant', name: 'Garden Salad' }))
      .toBe('Representative category illustration — no verified menu photo. salad category for Garden Salad.');
  });

  it('uses deterministic local icon and gradient metadata instead of photo assets', () => {
    expect(restaurantFoodIllustration({ name: 'Garden Salad' })).toMatchObject({
      title: 'Salad',
      icon: 'feather',
      gradient: ['#3f794f', '#78a96e'],
    });
    expect(restaurantFoodIllustrationForAssetKey('restaurant:salad'))
      .toEqual(restaurantFoodIllustration({ name: 'Garden Salad' }));
    expect(restaurantFoodIllustrationForAssetKey('restaurant:not-a-category')).toBeUndefined();
    expect(RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL)
      .toBe('Representative category illustration — no verified menu photo.');
  });
});
