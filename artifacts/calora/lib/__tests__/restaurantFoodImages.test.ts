import { restaurantFoodImageSource } from '../restaurantFoodImages';

describe('restaurantFoodImageSource', () => {
  it('returns a photo for branded menu items', () => {
    expect(restaurantFoodImageSource({ brandName: 'Chipotle', name: 'Chicken Burrito Bowl' })).toBeTruthy();
    expect(restaurantFoodImageSource({ brandName: "Wendy's", name: 'Dave’s Single' })).toBeTruthy();
    expect(restaurantFoodImageSource({ brandName: 'Burger King', name: 'Whopper' })).toBeTruthy();
  });

  it('uses item names so searched restaurants receive the same treatment', () => {
    const salad = restaurantFoodImageSource({ brandName: 'Local Restaurant', name: 'Garden Salad' });
    const drink = restaurantFoodImageSource({ brandName: 'Local Restaurant', name: 'Iced Tea' });

    expect(salad).toBeTruthy();
    expect(drink).toBeTruthy();
    expect(salad).not.toBe(drink);
  });
});