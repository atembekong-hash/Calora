// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders an unbound food record with a clean representative illustration and no technical failure copy', () => {
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

    expect(screen.getByAltText('Custom dinner bowl, representative Calora main meal illustration')).toBeTruthy();
    expect(screen.queryByText(/image unavailable/i)).toBeNull();
    expect(screen.queryByText(/food photo unavailable/i)).toBeNull();
  });

  it('removes remote-image disclosure overlays after a load error and keeps a clean fallback image', () => {
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

    expect(screen.getByText('Unverified provider image')).toBeTruthy();
    fireEvent.error(screen.getByAltText('Provider dinner bowl provider image; exact item binding is not verified'));

    expect(screen.getByAltText('Provider dinner bowl, representative Calora main meal illustration')).toBeTruthy();
    expect(screen.queryByText('Unverified provider image')).toBeNull();
    expect(screen.queryByText(/image unavailable/i)).toBeNull();
  });
});
