import { describe, expect, it } from 'vitest';
import { inspectDiscoverRecipeImage, resolveDiscoverRecipeImageSource } from '../discoverRecipeImage';

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

  it('classifies safe no-image outcomes without retaining a recipe title or external URL in diagnostics', () => {
    expect(inspectDiscoverRecipeImage({
      id: 'open-missing',
      name: 'Missing provider thumbnail',
      image: null,
      sourceType: 'open',
    })).toEqual({ source: null, reason: 'missing' });
    expect(inspectDiscoverRecipeImage({
      id: 'open-unsafe',
      name: 'Untrusted recipe',
      image: 'https://images.example.invalid/not-a-food.jpg',
      sourceType: 'open',
    })).toEqual({ source: null, reason: 'untrusted' });
  });

  it('keeps the verified bundled Calora catalogue source even if its serialized remote image is malformed', () => {
    const result = inspectDiscoverRecipeImage({
      id: 'calora-original:berry-oats',
      name: 'Overnight oats with berries',
      image: 'javascript:wrong-photo',
      sourceType: 'calora_catalog',
      sourceId: 'berry-oats',
    });
    expect(result.reason).toBe('catalogue_asset');
    expect(result.source).toBeTruthy();
  });
});
