import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const restaurantsScreen = readFileSync(
  resolve(process.cwd(), 'app/restaurants.tsx'),
  'utf8',
);

describe('restaurant category illustration screen integration', () => {
  it('renders the local disclosure-bearing illustration in both results and details', () => {
    expect(restaurantsScreen).toContain("import { RestaurantCategoryIllustration } from '@/components/RestaurantCategoryIllustration';");
    expect(restaurantsScreen).toContain('<RestaurantCategoryIllustration compact food={food} />');
    expect(restaurantsScreen).toContain('<RestaurantCategoryIllustration food={detail} />');
  });

  it('propagates the stable category identity and representative image source to review', () => {
    expect(restaurantsScreen).toContain('const imageAssetKey = restaurantFoodImageAssetKey(providerDetail)');
    expect(restaurantsScreen).toContain('imageAssetKey,');
    expect(restaurantsScreen).toContain("imageSource: 'restaurant_representative'");
    expect(restaurantsScreen).toContain('RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL');
  });
});
