/**
 * Unit tests for the shared, defensive image-metadata validation used by the
 * diary, first-log, sync, and capture routes.
 *
 * The contract these tests pin down:
 *   - Only absolute HTTPS URLs from known providers are accepted; everything else → null.
 *   - Over-length URLs and blank/non-string values → null.
 *   - imageSource is trimmed and clamped, and is forced to null whenever the
 *     accompanying URL is invalid (no orphan source labels).
 */
import { describe, it, expect } from 'vitest';
import {
  safeImageUrl,
  safeImageSource,
  matchesCaptureImageEvidence,
  normalizeImageEvidence,
  normalizeImageMetadata,
} from '../lib/image-metadata.js';

describe('safeImageUrl', () => {
  it('accepts absolute https URLs', () => {
    expect(safeImageUrl('https://images.openfoodfacts.org/x.jpg')).toBe(
      'https://images.openfoodfacts.org/x.jpg',
    );
  });

  it('rejects absolute HTTP URLs', () => {
    expect(safeImageUrl('http://images.openfoodfacts.org/a.png')).toBeNull();
  });

  it('trims surrounding whitespace before validating', () => {
    expect(safeImageUrl('  https://images.openfoodfacts.org/a.png  ')).toBe('https://images.openfoodfacts.org/a.png');
  });

  it('rejects javascript: and data: URLs', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
    expect(safeImageUrl('data:image/png;base64,AAAA')).toBeNull();
  });

  it('rejects non-http protocols and relative paths', () => {
    expect(safeImageUrl('file:///etc/passwd')).toBeNull();
    expect(safeImageUrl('ftp://example.com/a.png')).toBeNull();
    expect(safeImageUrl('/relative/path.png')).toBeNull();
    expect(safeImageUrl('not a url')).toBeNull();
    expect(safeImageUrl('https://images.openfoodfacts.org.evil.example/a.png')).toBeNull();
    expect(safeImageUrl('https://untrusted.example/a.png')).toBeNull();
  });

  it('rejects blank, non-string, and over-length values', () => {
    expect(safeImageUrl('')).toBeNull();
    expect(safeImageUrl('   ')).toBeNull();
    expect(safeImageUrl(null)).toBeNull();
    expect(safeImageUrl(undefined)).toBeNull();
    expect(safeImageUrl(42)).toBeNull();
    expect(safeImageUrl(`https://images.openfoodfacts.org/${'a'.repeat(3000)}`)).toBeNull();
  });
});

describe('safeImageSource', () => {
  it('trims and returns a label', () => {
    expect(safeImageSource('  Open Food Facts ')).toBe('Open Food Facts');
  });

  it('clamps to 80 characters', () => {
    expect(safeImageSource('x'.repeat(200))).toHaveLength(80);
  });

  it('returns null for blank or non-string input', () => {
    expect(safeImageSource('')).toBeNull();
    expect(safeImageSource('   ')).toBeNull();
    expect(safeImageSource(null)).toBeNull();
    expect(safeImageSource(123)).toBeNull();
  });
});

describe('normalizeImageMetadata', () => {
  it('keeps a valid URL and its source', () => {
    expect(
      normalizeImageMetadata('https://images.openfoodfacts.org/a.png', 'Open Food Facts'),
    ).toEqual({ imageUrl: 'https://images.openfoodfacts.org/a.png', imageSource: 'Open Food Facts' });
  });

  it('drops the source when the URL is invalid (no orphan source)', () => {
    expect(normalizeImageMetadata('javascript:alert(1)', 'Open Food Facts')).toEqual({
      imageUrl: null,
      imageSource: null,
    });
  });

  it('returns nulls when both are absent', () => {
    expect(normalizeImageMetadata(undefined, undefined)).toEqual({
      imageUrl: null,
      imageSource: null,
    });
  });

  it('preserves the local restaurant representative marker without a URL', () => {
    expect(normalizeImageMetadata(undefined, 'restaurant_representative')).toEqual({
      imageUrl: null,
      imageSource: 'restaurant_representative',
    });
  });

  it('keeps a valid URL even when the source is missing', () => {
    expect(normalizeImageMetadata('https://images.openfoodfacts.org/a.png', undefined)).toEqual({
      imageUrl: 'https://images.openfoodfacts.org/a.png',
      imageSource: null,
    });
  });
});

describe('normalizeImageEvidence', () => {
  const exact = {
    version: 1,
    semanticRole: 'exact',
    contentId: 'food-product:open-food-facts:12345678',
    provider: 'Open Food Facts',
    providerItemId: '12345678',
    imageId: 'front',
    locator: 'https://images.openfoodfacts.org/products/123/front.jpg',
    retrievedAt: '2026-09-23T12:00:00.000Z',
    rightsReviewState: 'approved',
  };
  const generatedImageId = '123e4567-e89b-42d3-a456-426614174000';
  const generatedLocator = `https://storage.example/private/recipe-photos/authenticated-account/${generatedImageId}.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test%2F20260923%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260923T120000Z&X-Amz-Expires=518400&X-Amz-SignedHeaders=host&X-Amz-Signature=${'a'.repeat(64)}`;

  it('derives account scope and downgrades client exact assertions by default', () => {
    expect(normalizeImageEvidence({ ...exact, accountScope: 'forged' }, 'authenticated-account')).toMatchObject({
      accountScope: 'authenticated-account',
      semanticRole: 'unverified',
    });
  });

  it('retains an exact assertion only at a server-verified capture boundary', () => {
    expect(normalizeImageEvidence(exact, 'authenticated-account', undefined, { allowExact: true })).toMatchObject({
      accountScope: 'authenticated-account',
      semanticRole: 'exact',
      providerItemId: '12345678',
    });
  });

  it('retains exact evidence after request schemas coerce observation times to Date', () => {
    expect(normalizeImageEvidence(
      { ...exact, retrievedAt: new Date(exact.retrievedAt) },
      'authenticated-account',
      undefined,
      { allowExact: true },
    )).toMatchObject({
      semanticRole: 'exact',
      retrievedAt: exact.retrievedAt,
    });
  });

  it('retains only a valid signed private generated-photo capability for generated evidence', () => {
    expect(normalizeImageEvidence({
      version: 1,
      semanticRole: 'generated',
      contentId: 'recipe:local-1',
      imageId: generatedImageId,
      locator: generatedLocator,
      expiresAt: '2026-09-29T12:00:00.000Z',
      rightsReviewState: 'approved',
    }, 'authenticated-account')).toMatchObject({
      semanticRole: 'generated',
      imageId: generatedImageId,
      locator: generatedLocator,
    });

    expect(normalizeImageEvidence({
      version: 1,
      semanticRole: 'generated',
      contentId: 'recipe:local-1',
      imageId: generatedImageId,
      locator: 'https://untrusted.example/arbitrary.png',
    }, 'authenticated-account')).not.toHaveProperty('locator');
  });

  it('downgrades exact evidence whose image rights were not approved', () => {
    expect(normalizeImageEvidence(
      { ...exact, rightsReviewState: 'reviewed' },
      'authenticated-account',
      undefined,
      { allowExact: true },
    )).toMatchObject({ semanticRole: 'unverified' });
  });

  it('matches exact evidence only on durable provider and image identity', () => {
    expect(matchesCaptureImageEvidence(exact, exact, 'authenticated-account')).toBe(true);
    expect(matchesCaptureImageEvidence(exact, { ...exact, imageId: 'nutrition' }, 'authenticated-account')).toBe(false);
    expect(matchesCaptureImageEvidence(exact, { ...exact, providerItemId: 'other-product' }, 'authenticated-account')).toBe(false);
  });

  it('falls back conservatively for legacy image fields', () => {
    expect(normalizeImageEvidence(undefined, 'authenticated-account', {
      imageUrl: 'https://images.openfoodfacts.org/legacy.jpg',
      imageSource: 'Open Food Facts',
    })).toMatchObject({
      accountScope: 'authenticated-account',
      semanticRole: 'unverified',
    });
  });
});
