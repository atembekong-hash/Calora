import { describe, expect, it } from 'vitest';
import { restaurantFoodImageKey } from '../restaurantFoodImageSelection';

describe('restaurantFoodImageKey', () => {
  it('assigns representative photos to branded menu items', () => {
    expect(restaurantFoodImageKey({ brandName: 'Chipotle', name: 'Chicken Burrito Bowl' })).toBe('tacos');
    expect(restaurantFoodImageKey({ brandName: "Wendy's", name: 'Dave’s Single' })).toBe('main');
    expect(restaurantFoodImageKey({ brandName: 'Burger King', name: 'Whopper' })).toBe('main');
  });

  it('uses item names so searched restaurants receive the same treatment', () => {
    const salad = restaurantFoodImageKey({ brandName: 'Local Restaurant', name: 'Garden Salad' });
    const drink = restaurantFoodImageKey({ brandName: 'Local Restaurant', name: 'Iced Tea' });

    expect(salad).toBe('salad');
    expect(drink).toBe('drink');
  });
});