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

  it('keeps a valid URL even when the source is missing', () => {
    expect(normalizeImageMetadata('https://images.openfoodfacts.org/a.png', undefined)).toEqual({
      imageUrl: 'https://images.openfoodfacts.org/a.png',
      imageSource: null,
    });
  });
});
