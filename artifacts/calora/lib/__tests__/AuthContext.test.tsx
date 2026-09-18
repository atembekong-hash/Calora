// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, onAuthStateChangeMock, clearSettledOAuthCodeExchangesMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  clearSettledOAuthCodeExchangesMock: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

vi.mock('../auth', () => ({
  clearSettledOAuthCodeExchanges: clearSettledOAuthCodeExchangesMock,
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  signOut: vi.fn(),
}));

import { AuthProvider, useAuth } from '../../context/AuthContext';

describe('AuthProvider bootstrap ordering', () => {
  let authStateChangeCallback: (event: string, session: unknown) => void;
  let resolveInitialSession: (value: { data: { session: unknown } }) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockReturnValue(new Promise((resolve) => {
      resolveInitialSession = resolve;
    }));
    onAuthStateChangeMock.mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  function AuthState() {
    const { user, isLoading } = useAuth();
    return <output>{isLoading ? 'loading' : user?.id ?? 'signed-out'}</output>;
  }

  it('does not let a delayed initial getSession overwrite a newer auth event', async () => {
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    const currentSession = { user: { id: 'current-user' } };
    act(() => {
      authStateChangeCallback('SIGNED_IN', currentSession);
    });
    expect(screen.getByRole('status').textContent).toBe('current-user');

    await act(async () => {
      resolveInitialSession({ data: { session: null } });
      await Promise.resolve();
    });

    expect(screen.getByRole('status').textContent).toBe('current-user');
  });
});