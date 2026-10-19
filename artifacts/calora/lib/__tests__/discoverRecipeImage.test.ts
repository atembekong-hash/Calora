import { describe, expect, it } from 'vitest';
import { resolveDiscoverRecipeImageSource } from '../discoverRecipeImage';

describe('Discover recipe image source resolution', () => {
  it('uses the verified bundled planner asset for a Calora catalogue recipe whose serialized remote URL is empty', () => {
    expect(resolveDiscoverRecipeImageSource({
      id: 'calora-original:berry-oats',
      name: 'Overnight oats with berries',
      image: '',
      sourceType: 'calora_catalog',
      sourceId: 'berry-oats',
    })).toBeTruthy();
  });

  it('refuses an untrusted external URL rather than substituting an unrelated food photo', () => {
    expect(resolveDiscoverRecipeImageSource({
      id: 'open-unsafe',
      name: 'Untrusted recipe',
      image: 'https://images.example.invalid/not-a-food.jpg',
      sourceType: 'open',
    })).toBeNull();
  });
});
