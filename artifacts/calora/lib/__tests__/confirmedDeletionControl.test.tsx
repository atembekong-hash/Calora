/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  const element = (tag: string) => ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    style: _style,
    testID,
    ...props
  }: any) => React.createElement(
    tag,
    {
      ...props,
      ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
      ...(accessibilityHint ? { 'aria-description': accessibilityHint } : {}),
      ...(accessibilityRole ? { role: accessibilityRole } : {}),
      ...(onPress ? { onClick: onPress } : {}),
      ...(testID ? { 'data-testid': testID } : {}),
    },
    children,
  );

  return {
    StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 },
    Text: element('span'),
    View: element('div'),
  };
});

vi.mock('@/components/ScalePressable', () => ({
  ScalePressable: ({ children, onPress, accessibilityLabel, accessibilityHint, testID }: any) => React.createElement(
    'button',
    {
      onClick: onPress,
      'aria-label': accessibilityLabel,
      'aria-description': accessibilityHint,
      'data-testid': testID,
    },
    children,
  ),
}));

vi.mock('@expo/vector-icons', () => ({ Feather: () => null }));

import { ConfirmedDeletionControl } from '@/components/ConfirmedDeletionControl';

const colors = {
  destructiveColor: '#B42318',
  foregroundColor: '#111111',
  mutedForegroundColor: '#666666',
  surfaceColor: '#FFFFFF',
  borderColor: '#DDDDDD',
};

function renderControl(onConfirm = vi.fn()) {
  render(
    <ConfirmedDeletionControl
      itemName="Oatmeal"
      onConfirm={onConfirm}
      {...colors}
    />,
  );
  return onConfirm;
}

describe('ConfirmedDeletionControl', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not delete on the initial destructive tap', () => {
    const onConfirm = renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Delete edited entry' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('alert', { name: 'Confirm deletion of Oatmeal' })).toBeTruthy();
    expect(screen.getByText('This action cannot be undone.', { exact: false })).toBeTruthy();
  });

  it('cancels without deleting and restores the guarded trigger', () => {
    const onConfirm = renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Delete edited entry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel entry deletion' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete edited entry' })).toBeTruthy();
  });

  it('deletes exactly once only after the explicit confirmation action', () => {
    const onConfirm = renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Delete edited entry' }));
    const confirmButton = screen.getByRole('button', { name: 'Confirm entry deletion' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
