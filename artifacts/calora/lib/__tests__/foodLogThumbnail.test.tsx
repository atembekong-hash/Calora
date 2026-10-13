// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-image', () => ({
  Image: ({ accessibilityLabel, onError }: { accessibilityLabel?: string; onError?: () => void }) => (
    <img alt={accessibilityLabel} onError={onError} />
  ),
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

vi.mock('@/lib/mealImages', () => ({
  foodImageSource: () => undefined,
}));

import { FoodLogThumbnail } from '@/components/FoodLogThumbnail';

describe('FoodLogThumbnail clean fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an unbound food record as no photo rather than an unrelated category illustration', () => {
    render(
      <FoodLogThumbnail
        log={{
          id: 'memory-entry-1',
          name: 'Custom dinner bowl',
          meal: 'Dinner',
          source: 'Manual',
        }}
      />,
    );

    expect(screen.getByLabelText('Custom dinner bowl, no verified photo available')).toBeTruthy();
    expect(screen.queryByText(/image unavailable/i)).toBeNull();
    expect(screen.queryByText(/food photo unavailable/i)).toBeNull();
  });

  it('fails closed when a provider image is not bound to the exact food item', () => {
    render(
      <FoodLogThumbnail
        log={{
          id: 'memory-entry-2',
          name: 'Provider dinner bowl',
          meal: 'Dinner',
          source: 'Barcode verified',
          imageUrl: 'https://images.openfoodfacts.org/provider-dinner.jpg',
          imageSource: 'provider',
        }}
      />,
    );

    expect(screen.getByLabelText('Provider dinner bowl, no verified photo available')).toBeTruthy();
    expect(screen.queryByText('Unverified provider image')).toBeNull();
    expect(screen.queryByText(/image unavailable/i)).toBeNull();
  });
});
