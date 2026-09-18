/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = {
  access_token: 'account-test-token',
  user: { email: 'alex@example.com', identities: [{ provider: 'email' }] },
};
const harness = vi.hoisted(() => ({
  clearProfilePhoto: vi.fn(async () => undefined),
  signOut: vi.fn(async () => ({ error: null })),
}));

vi.mock('react-native', () => {
  const element = (tag: string) => ({ children, onPress, onChangeText, accessibilityLabel, style: _style, ...props }: any) => React.createElement(
    tag,
    { ...props, ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}), ...(onPress ? { onClick: onPress } : {}), ...(onChangeText ? { onChange: onChangeText } : {}) },
    children,
  );
  return {
    ActivityIndicator: element('span'),
    Alert: { alert: vi.fn() },
    Modal: ({ visible, children }: any) => visible ? React.createElement('div', { role: 'dialog' }, children) : null,
    Pressable: element('button'),
    StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 },
    Text: element('span'),
    TextInput: ({ onChangeText, style: _style, ...props }: any) => React.createElement('input', { ...props, onChange: (event: any) => onChangeText(event.target.value) }),
    View: element('div'),
  };
});
vi.mock('@expo/vector-icons', () => ({ Feather: () => null }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('@/context/CaloraContext', () => ({
  useCalora: () => ({
    colors: {
      foreground: '#111', background: '#fff', card: '#fff', border: '#ddd',
      primary: '#337ab7', primaryForeground: '#fff', muted: '#eee',
      mutedForeground: '#666', accent: '#def', accentForeground: '#123',
      destructive: '#c33', input: '#ccc',
    },
    clearProfilePhoto: harness.clearProfilePhoto,
  }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ session, signOut: harness.signOut }),
}));
vi.mock('@/lib/api-config', () => ({ getApiBaseUrl: () => 'https://api.example.test' }));

import { ACCOUNT_DELETION_TIMEOUT_MS, AccountSection } from '@/components/auth/AccountSection';

describe('AccountSection account deletion timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a request that does not settle and returns the user to an actionable state', async () => {
    render(<AccountSection clearAllData={vi.fn(async () => undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.change(screen.getByPlaceholderText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm account deletion' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACCOUNT_DELETION_TIMEOUT_MS);
    });
    expect(screen.getByText('Account deletion is taking too long. Check your connection and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm account deletion' }).hasAttribute('disabled')).toBe(false);
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/v1/account', expect.objectContaining({
      method: 'DELETE',
      signal: expect.any(AbortSignal),
    }));
  });
});