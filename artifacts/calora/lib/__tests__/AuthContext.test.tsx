// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSessionMock,
  onAuthStateChangeMock,
  clearSettledOAuthCodeExchangesMock,
  signInWithEmailMock,
  signUpWithEmailMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  clearSettledOAuthCodeExchangesMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
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
  signInWithEmail: signInWithEmailMock,
  signUpWithEmail: signUpWithEmailMock,
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
    const { user, isLoading, restoreStatus, restoreError, retrySessionRestore } = useAuth();
    return (
      <>
        <output data-testid="identity-state">{isLoading ? 'loading' : user?.id ?? 'signed-out'}</output>
        <output data-testid="restore-state">{restoreStatus}:{restoreError ?? 'none'}</output>
        <button onClick={() => { void retrySessionRestore(); }}>retry</button>
      </>
    );
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
    expect(screen.getByTestId('identity-state').textContent).toBe('current-user');

    await act(async () => {
      resolveInitialSession({ data: { session: null } });
      await Promise.resolve();
    });

    expect(screen.getByTestId('identity-state').textContent).toBe('current-user');
  });

  it('exposes a failed restore instead of silently mounting a guest identity, then recovers on retry', async () => {
    getSessionMock
      .mockRejectedValueOnce(new Error('SecureStore unavailable'))
      .mockResolvedValueOnce({ data: { session: { user: { id: 'restored-user' } } }, error: null });

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('restore-state').textContent).toBe('failed:session_restore');
    });
    // The loading screen is dismissed only into an explicit failed state, not a
    // false guest-ready state selected from a storage exception.
    expect(screen.getByTestId('identity-state').textContent).toBe('signed-out');

    await act(async () => {
      screen.getByRole('button', { name: 'retry' }).click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('restore-state').textContent).toBe('ready:none');
      expect(screen.getByTestId('identity-state').textContent).toBe('restored-user');
    });
  });

  it('marks successful email and signup actions as ordinary post-auth transitions', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    signInWithEmailMock.mockResolvedValue({ success: true, session: { user: { id: 'email-user' } } });
    signUpWithEmailMock.mockResolvedValue({ success: true, session: { user: { id: 'signup-user' } } });

    function AuthActions() {
      const {
        postAuthIntent,
        restoreStatus,
        restoreError,
        signInWithEmail,
        signUpWithEmail,
      } = useAuth();
      return (
        <>
          <output data-testid="post-auth-intent">{postAuthIntent}</output>
          <output data-testid="action-restore-state">{restoreStatus}:{restoreError ?? 'none'}</output>
          <button onClick={() => { void signInWithEmail('email@example.com', 'password'); }}>email</button>
          <button onClick={() => { void signUpWithEmail('signup@example.com', 'password'); }}>signup</button>
        </>
      );
    }

    render(<AuthProvider><AuthActions /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('action-restore-state').textContent).toBe('ready:none'));

    await act(async () => { screen.getByRole('button', { name: 'email' }).click(); });
    expect(screen.getByTestId('post-auth-intent').textContent).toBe('ordinary');

    await act(async () => { screen.getByRole('button', { name: 'signup' }).click(); });
    expect(screen.getByTestId('post-auth-intent').textContent).toBe('ordinary');
  });

  it('treats a refreshed session as an ordinary authenticated transition', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    render(<AuthProvider><AuthState /></AuthProvider>);
    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    act(() => {
      authStateChangeCallback('TOKEN_REFRESHED', { user: { id: 'refreshed-user' } });
    });

    expect(screen.getByTestId('identity-state').textContent).toBe('refreshed-user');
    expect(screen.getByTestId('restore-state').textContent).toBe('ready:none');
  });
});
