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

  it('keeps transient search failures actionable without duplicating the shared sheet handle', () => {
    expect(restaurantsScreen).toContain('accessibilityLabel="Retry restaurant search"');
    expect(restaurantsScreen).toContain('void searchResult.refetch();');
    expect(restaurantsScreen).toContain('onSubmitEditing={() => setSearchQuery(query.trim())}');
    expect(restaurantsScreen).not.toContain('styles.sheetHandle');
    expect(restaurantsScreen).not.toContain('sheetHandle:');
  });

  it('keeps an unavailable Restaurant provider retryable without changing the current search', () => {
    expect(restaurantsScreen).toContain('accessibilityLabel="Retry restaurant provider"');
    expect(restaurantsScreen).toContain("statusMessage ? (");
    expect(restaurantsScreen).toContain("Retry provider");
  });
});
