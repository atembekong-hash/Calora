import { describe, expect, it } from 'vitest';
import {
  foodImageCategory,
  normalizeFoodImageMetadata,
  normalizeFoodImageUrl,
} from '../foodImageMetadata';

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
});

describe('foodImageCategory', () => {
  it('provides a deterministic offline category for every food', () => {
    expect(foodImageCategory({ name: 'Overnight oats', meal: 'Breakfast' })).toBe('breakfast');
    expect(foodImageCategory({ name: 'Honeycrisp apple', meal: 'Snack' })).toBe('snack');
    expect(foodImageCategory({ name: 'Green smoothie', meal: 'Lunch' })).toBe('drink');
    expect(foodImageCategory({ name: 'Chicken rice bowl', meal: 'Dinner' })).toBe('main');
  });
});