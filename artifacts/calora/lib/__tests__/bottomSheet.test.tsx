// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomSheet } from '@/components/BottomSheet';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

describe('BottomSheet dismissal policy', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('routes ordinary backdrop taps through the guarded onRequestClose callback', () => {
    const onRequestClose = vi.fn();
    render(
      <BottomSheet visible onRequestClose={onRequestClose}>
        <div>Sheet content</div>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByLabelText('Close sheet'));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('supports an explicit opt-out for non-dismissible pending flows', () => {
    const onRequestClose = vi.fn();
    render(
      <BottomSheet
        visible
        onRequestClose={onRequestClose}
        dismissOnBackdropPress={false}
        dismissOnPanDown={false}
      >
        <div>Pending operation</div>
      </BottomSheet>,
    );

    expect(screen.queryByLabelText('Close sheet')).toBeNull();
    fireEvent.click(screen.getByLabelText('Sheet handle'));
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it('routes drag-handle activation through the same guarded close callback', () => {
    const onRequestClose = vi.fn();
    render(
      <BottomSheet visible onRequestClose={onRequestClose}>
        <div>Sheet content</div>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByLabelText('Swipe down or activate to close sheet'));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('preserves a caller-specific guarded backdrop handler', () => {
    const onRequestClose = vi.fn();
    const onBackdropPress = vi.fn();
    render(
      <BottomSheet
        visible
        onRequestClose={onRequestClose}
        onBackdropPress={onBackdropPress}
      >
        <div>Guarded sheet</div>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByLabelText('Close sheet'));
    expect(onBackdropPress).toHaveBeenCalledTimes(1);
    expect(onRequestClose).not.toHaveBeenCalled();
  });
});
