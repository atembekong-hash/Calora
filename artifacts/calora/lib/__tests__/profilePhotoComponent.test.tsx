// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { imageProps } = vi.hoisted(() => ({ imageProps: [] as Array<Record<string, unknown>> }));

vi.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    imageProps.push(props);
    return (
      <button
        data-testid="profile-image"
        onClick={() => (props.onError as (() => void) | undefined)?.()}
        type="button"
      >
        image
      </button>
    );
  },
}));

import { ProfilePhoto } from '@/components/ProfilePhoto';

describe('ProfilePhoto immutable cache identity', () => {
  beforeEach(() => {
    imageProps.length = 0;
  });

  it('changes the source and recycling key for a revisioned replacement', () => {
    const first = 'file:///docs/calora-profile-photo-account-a-revision-1.jpg';
    const second = 'file:///docs/calora-profile-photo-account-a-revision-2.jpg';
    const { rerender } = render(
      <ProfilePhoto uri={first} size={48} accessibilityLabel="Profile photo" fallback={<span>initials</span>} />,
    );

    rerender(
      <ProfilePhoto uri={second} size={48} accessibilityLabel="Profile photo" fallback={<span>initials</span>} />,
    );

    expect(imageProps.at(-1)).toMatchObject({
      source: { uri: second },
      recyclingKey: `profile-photo:${second}`,
    });
    expect(imageProps.map((props) => props.recyclingKey)).toContain(`profile-photo:${first}`);
  });

  it('resets a cached failure when a new immutable revision is selected', async () => {
    const first = 'file:///docs/calora-profile-photo-account-a-revision-1.jpg';
    const second = 'file:///docs/calora-profile-photo-account-a-revision-2.jpg';
    const { rerender } = render(
      <ProfilePhoto uri={first} size={48} accessibilityLabel="Profile photo" fallback={<span>initials</span>} />,
    );

    fireEvent.click(screen.getByTestId('profile-image'));
    expect(screen.getByText('initials')).toBeTruthy();

    rerender(
      <ProfilePhoto uri={second} size={48} accessibilityLabel="Profile photo" fallback={<span>initials</span>} />,
    );

    await waitFor(() => expect(screen.getByTestId('profile-image')).toBeTruthy());
    expect(imageProps.at(-1)).toMatchObject({
      source: { uri: second },
      recyclingKey: `profile-photo:${second}`,
    });
  });
});
