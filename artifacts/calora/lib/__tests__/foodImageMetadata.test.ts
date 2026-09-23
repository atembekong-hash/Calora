import { describe, expect, it } from 'vitest';
import {
  foodImageCategory,
  normalizeFoodImageEvidence,
  normalizeFoodImageMetadata,
  normalizeFoodImageUrl,
  normalizeGeneratedRecipeImageUrl,
  resolveFoodImage,
} from '../foodImageMetadata';
import { verifiedFoods } from '@/data/foods';

const exactEvidence = (contentId: string, locator: string) => ({
  version: 1 as const,
  semanticRole: 'exact' as const,
  contentId,
  provider: 'Open Food Facts',
  providerItemId: contentId,
  imageId: 'front',
  locator,
  retrievedAt: '2026-09-23T12:00:00.000Z',
  rightsReviewState: 'approved' as const,
});

const GENERATED_IMAGE_ID = '123e4567-e89b-42d3-a456-426614174000';
const signedGeneratedImageUrl = (imageId = GENERATED_IMAGE_ID, host = 'storage.example') =>
  `https://${host}/private/recipe-photos/account-a/${imageId}.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test%2F20260923%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260923T120000Z&X-Amz-Expires=518400&X-Amz-SignedHeaders=host&X-Amz-Signature=${'a'.repeat(64)}`;

describe('normalizeFoodImageUrl', () => {
  it('keeps durable HTTPS provider images', () => {
    expect(normalizeFoodImageUrl('https://images.openfoodfacts.org/apple.jpg')).toBe(
      'https://images.openfoodfacts.org/apple.jpg',
    );
  });

  it('rejects temporary, embedded, and insecure image locations', () => {
    expect(normalizeFoodImageUrl('file:///tmp/capture.jpg')).toBeUndefined();
    expect(normalizeFoodImageUrl('data:image/jpeg;base64,abc')).toBeUndefined();
    expect(normalizeFoodImageUrl('http://images.example.com/apple.jpg')).toBeUndefined();
    expect(normalizeFoodImageUrl('https://untrusted.example/apple.jpg')).toBeUndefined();
  });

  it('drops invalid sources and never leaves a source without a trusted image', () => {
    expect(normalizeFoodImageMetadata('data:image/jpeg;base64,abc', 'provider')).toEqual({
      imageUrl: undefined,
      imageSource: undefined,
    });
    expect(normalizeFoodImageMetadata('https://images.unsplash.com/photo.jpg', 'untrusted')).toEqual({
      imageUrl: 'https://images.unsplash.com/photo.jpg',
      imageSource: undefined,
    });
  });

  it('preserves representative restaurant provenance without inventing a remote URL', () => {
    expect(normalizeFoodImageMetadata(undefined, 'restaurant_representative')).toEqual({
      imageUrl: undefined,
      imageSource: 'restaurant_representative',
    });
  });

  it('accepts only the server-signed private recipe-photo capability for its image ID', () => {
    expect(normalizeGeneratedRecipeImageUrl(signedGeneratedImageUrl(), GENERATED_IMAGE_ID, 'account-a')).toBe(signedGeneratedImageUrl());
    expect(normalizeGeneratedRecipeImageUrl(signedGeneratedImageUrl(), '223e4567-e89b-42d3-a456-426614174000', 'account-a')).toBeUndefined();
    expect(normalizeGeneratedRecipeImageUrl(signedGeneratedImageUrl(), GENERATED_IMAGE_ID, 'account-b')).toBeUndefined();
    expect(normalizeGeneratedRecipeImageUrl('https://untrusted.example/private/recipe-photos/account-a/123e4567-e89b-42d3-a456-426614174000.png', GENERATED_IMAGE_ID, 'account-a')).toBeUndefined();
    expect(normalizeGeneratedRecipeImageUrl(signedGeneratedImageUrl(GENERATED_IMAGE_ID, 'localhost'), GENERATED_IMAGE_ID, 'account-a')).toBeUndefined();
  });

  it('retains a signed generated locator only with generated evidence', () => {
    const evidence = {
      version: 1 as const,
      semanticRole: 'generated' as const,
      contentId: 'recipe:local-1',
      imageId: GENERATED_IMAGE_ID,
      accountScope: 'account-a',
      locator: signedGeneratedImageUrl(),
      rightsReviewState: 'approved' as const,
    };
    expect(normalizeFoodImageMetadata(signedGeneratedImageUrl(), 'generated', evidence)).toMatchObject({
      imageUrl: signedGeneratedImageUrl(),
      imageSource: 'generated',
      imageEvidence: evidence,
    });
    expect(normalizeFoodImageMetadata(undefined, undefined, evidence)).toMatchObject({
      imageUrl: signedGeneratedImageUrl(),
      imageSource: 'generated',
      imageEvidence: evidence,
    });
    expect(normalizeFoodImageMetadata('https://untrusted.example/arbitrary.png', 'provider', evidence)).toMatchObject({
      imageUrl: signedGeneratedImageUrl(),
      imageSource: 'generated',
    });
    expect(normalizeFoodImageMetadata(signedGeneratedImageUrl(), 'generated')).toEqual({
      imageUrl: undefined,
      imageSource: undefined,
    });
  });
});

describe('normalizeFoodImageEvidence', () => {
  it('retains a complete exact server binding', () => {
    expect(normalizeFoodImageEvidence({
      ...exactEvidence('product-1', 'https://images.openfoodfacts.org/product-1.jpg'),
      accountScope: 'account-1',
    })).toMatchObject({ semanticRole: 'exact', accountScope: 'account-1', imageId: 'front' });
  });

  it('downgrades exact claims that lack durable provider identity', () => {
    expect(normalizeFoodImageEvidence({
      version: 1,
      semanticRole: 'exact',
      locator: 'https://images.openfoodfacts.org/name-only.jpg',
    })).toMatchObject({ semanticRole: 'unverified' });
  });
});

describe('foodImageCategory', () => {
  it('provides a deterministic offline category for every food', () => {
    expect(foodImageCategory({ name: 'Overnight oats', meal: 'Breakfast' })).toBe('breakfast');
    expect(foodImageCategory({ name: 'Honeycrisp apple', meal: 'Snack' })).toBe('snack');
    expect(foodImageCategory({ name: 'Green smoothie', meal: 'Lunch' })).toBe('drink');
    expect(foodImageCategory({ name: 'Chicken rice bowl', meal: 'Dinner' })).toBe('main');
  });
});

describe('resolveFoodImage', () => {
  it('models every truthful render state with its required disclosure semantics', () => {
    const exact = resolveFoodImage({
      id: 'provider-log',
      name: 'Custom bowl',
      imageUrl: 'https://images.openfoodfacts.org/custom-bowl.jpg',
      imageSource: 'provider',
      imageEvidence: exactEvidence('custom-bowl', 'https://images.openfoodfacts.org/custom-bowl.jpg'),
    });
    const canonical = resolveFoodImage({ id: 'canonical-log', name: 'Overnight oats' });
    const generated = resolveFoodImage({
      id: 'generated-log',
      name: 'Created recipe',
      imageUrl: signedGeneratedImageUrl(),
      imageSource: 'generated',
      imageEvidence: {
        version: 1,
        semanticRole: 'generated',
        contentId: 'recipe-1',
        imageId: GENERATED_IMAGE_ID,
        accountScope: 'account-a',
        locator: signedGeneratedImageUrl(),
      },
    });
    const representative = resolveFoodImage({
      id: 'representative-log',
      name: 'Restaurant bowl',
      source: 'Restaurant verified',
      imageSource: 'restaurant_representative',
      imageAssetKey: 'restaurant:bowl',
    });
    const noImage = resolveFoodImage({
      id: 'no-image-log',
      name: 'Restaurant item',
      source: 'Restaurant verified',
    });
    const fallback = resolveFoodImage({ id: 'fallback-log', name: 'Custom entree', meal: 'Dinner' });

    expect(exact).toMatchObject({
      state: 'exact',
      imageUrl: 'https://images.openfoodfacts.org/custom-bowl.jpg',
      visibleDisclosure: 'Open Food Facts · CC BY-SA',
    });
    expect(canonical).toMatchObject({ state: 'canonical', imageAssetKey: 'overnight-oats' });
    expect(generated).toMatchObject({
      state: 'generated',
      imageUrl: signedGeneratedImageUrl(),
      visibleDisclosure: 'AI-generated image',
    });
    expect(representative).toMatchObject({
      state: 'representative',
      imageAssetKey: 'restaurant:bowl',
      visibleDisclosure: 'Representative image',
    });
    expect(noImage).toMatchObject({ state: 'no-image', visibleDisclosure: 'No photo' });
    expect(fallback).toMatchObject({ state: 'fallback', visibleDisclosure: 'Image unavailable' });
  });

  it('gives a server-bound exact restaurant image precedence over no-photo provenance', () => {
    const resolution = resolveFoodImage({
      id: 'restaurant-exact',
      name: 'Restaurant salad',
      source: 'Restaurant verified',
      imageUrl: 'https://images.openfoodfacts.org/restaurant-salad.jpg',
      imageSource: 'provider',
      imageEvidence: exactEvidence('restaurant-salad', 'https://images.openfoodfacts.org/restaurant-salad.jpg'),
    });

    expect(resolution).toMatchObject({
      state: 'exact',
      imageUrl: 'https://images.openfoodfacts.org/restaurant-salad.jpg',
      accessibilityLabel: 'Restaurant salad exact provider image',
    });
  });

  it('does not infer a canonical image for restaurant content from a matching name', () => {
    const resolution = resolveFoodImage({
      id: 'restaurant-name-collision',
      name: 'Overnight oats',
      source: 'Restaurant verified',
    });

    expect(resolution).toMatchObject({ state: 'no-image', visibleDisclosure: 'No photo' });
  });

  it('keeps planner canonical imagery authoritative while retaining evidence-bound remote precedence elsewhere', () => {
    const planner = resolveFoodImage({
      id: 'planner-oats',
      name: 'Overnight oats',
      imageUrl: 'https://images.openfoodfacts.org/old-oats.jpg',
      imageSource: 'planner',
    });
    const provider = resolveFoodImage({
      id: 'provider-oats',
      name: 'Overnight oats',
      imageUrl: 'https://images.openfoodfacts.org/provider-oats.jpg',
      imageSource: 'provider',
      imageEvidence: exactEvidence('provider-oats', 'https://images.openfoodfacts.org/provider-oats.jpg'),
    });

    expect(planner).toMatchObject({ state: 'canonical', imageAssetKey: 'overnight-oats' });
    expect(provider).toMatchObject({ state: 'exact', imageUrl: 'https://images.openfoodfacts.org/provider-oats.jpg' });
  });

  it('rejects an invalid remote locator and exposes fallback rather than treating it as exact', () => {
    const resolution = resolveFoodImage({
      id: 'invalid-remote',
      name: 'Custom entree',
      imageUrl: 'https://untrusted.example/entree.jpg',
      imageSource: 'provider',
    });

    expect(resolution).toMatchObject({ state: 'fallback', visibleDisclosure: 'Image unavailable' });
  });

  it('does not promote a legacy URL without typed provenance to an exact image', () => {
    const resolution = resolveFoodImage({
      id: 'legacy-url',
      name: 'Custom entree',
      imageUrl: 'https://images.openfoodfacts.org/legacy-entree.jpg',
    });

    expect(resolution).toMatchObject({ state: 'fallback', visibleDisclosure: 'Image unavailable' });
  });

  it('renders a typed provider locator without exact evidence as explicitly unverified', () => {
    const resolution = resolveFoodImage({
      id: 'typed-legacy-url',
      name: 'Custom entree',
      imageUrl: 'https://images.openfoodfacts.org/legacy-entree.jpg',
      imageSource: 'provider',
    });

    expect(resolution).toMatchObject({ state: 'unverified', visibleDisclosure: 'Unverified provider image' });
  });

  it('derives recycle identities from content ID, semantic role, and image identity', () => {
    const original = resolveFoodImage({
      id: 'same-log',
      name: 'Custom entree',
      imageUrl: 'https://images.openfoodfacts.org/one.jpg',
      imageSource: 'provider',
      imageEvidence: exactEvidence('item-one', 'https://images.openfoodfacts.org/one.jpg'),
    });
    const updatedLocator = resolveFoodImage({
      id: 'same-log',
      name: 'Custom entree',
      imageUrl: 'https://images.openfoodfacts.org/two.jpg',
      imageSource: 'provider',
      imageEvidence: exactEvidence('item-two', 'https://images.openfoodfacts.org/two.jpg'),
    });
    const changedContent = resolveFoodImage({
      id: 'new-log',
      name: 'Custom entree',
      imageUrl: 'https://images.openfoodfacts.org/one.jpg',
      imageSource: 'provider',
      imageEvidence: exactEvidence('item-one', 'https://images.openfoodfacts.org/one.jpg'),
    });
    const noImage = resolveFoodImage({ id: 'same-log', name: 'Restaurant item', source: 'Restaurant verified' });

    expect(original.recyclingKey).toContain('same-log:exact:remote:https://images.openfoodfacts.org/one.jpg');
    expect(updatedLocator.recyclingKey).not.toBe(original.recyclingKey);
    expect(changedContent.recyclingKey).not.toBe(original.recyclingKey);
    expect(noImage.recyclingKey).not.toBe(original.recyclingKey);
  });
});

describe('curated Add suggestions', () => {
  it('uses canonical bundled imagery instead of ambiguous provider URLs', () => {
    expect(verifiedFoods).toHaveLength(20);
    expect(verifiedFoods.every((food) => food.imageAssetKey)).toBe(true);
    expect(verifiedFoods.every((food) => food.imageUrl === undefined)).toBe(true);
    expect(verifiedFoods.every((food) => food.imageSource === undefined)).toBe(true);
  });
});
