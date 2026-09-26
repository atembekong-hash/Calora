// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSessionMock,
  onAuthStateChangeMock,
  clearSettledOAuthCodeExchangesMock,
  signInWithGoogleMock,
  signInWithEmailMock,
  signUpWithEmailMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  clearSettledOAuthCodeExchangesMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
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
  signInWithGoogle: signInWithGoogleMock,
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

  it('finishes an explicit guest restore after Supabase emits an inconclusive null INITIAL_SESSION', async () => {
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    act(() => {
      authStateChangeCallback('INITIAL_SESSION', null);
    });
    // Null INITIAL_SESSION has no storage-error channel, so the explicit read
    // remains authoritative and the guest scope must not mount prematurely.
    expect(screen.getByTestId('restore-state').textContent).toBe('loading:none');

    await act(async () => {
      resolveInitialSession({ data: { session: null } });
      await Promise.resolve();
    });

    expect(screen.getByTestId('restore-state').textContent).toBe('ready:none');
    expect(screen.getByTestId('identity-state').textContent).toBe('signed-out');
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

  it('adopts successful email and signup sessions without waiting for a listener event', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    signInWithEmailMock.mockResolvedValue({ success: true, session: { user: { id: 'email-user' } } });
    signUpWithEmailMock.mockResolvedValue({ success: true, session: { user: { id: 'signup-user' } } });

    function AuthActions() {
      const {
        postAuthIntent,
        restoreStatus,
        restoreError,
        user,
        signInWithEmail,
        signUpWithEmail,
      } = useAuth();
      return (
        <>
          <output data-testid="post-auth-intent">{postAuthIntent}</output>
          <output data-testid="action-restore-state">{restoreStatus}:{restoreError ?? 'none'}</output>
          <output data-testid="action-identity-state">{user?.id ?? 'signed-out'}</output>
          <button onClick={() => { void signInWithEmail('email@example.com', 'password'); }}>email</button>
          <button onClick={() => { void signUpWithEmail('signup@example.com', 'password'); }}>signup</button>
        </>
      );
    }

    render(<AuthProvider><AuthActions /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('action-restore-state').textContent).toBe('ready:none'));

    await act(async () => { screen.getByRole('button', { name: 'email' }).click(); });
    expect(screen.getByTestId('post-auth-intent').textContent).toBe('ordinary');
    expect(screen.getByTestId('action-identity-state').textContent).toBe('email-user');

    await act(async () => { screen.getByRole('button', { name: 'signup' }).click(); });
    expect(screen.getByTestId('post-auth-intent').textContent).toBe('ordinary');
    expect(screen.getByTestId('action-identity-state').textContent).toBe('signup-user');
  });

  it('keeps a completed sign-in session when an empty initial-session event arrives late', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    signInWithEmailMock.mockResolvedValue({ success: true, session: { user: { id: 'late-event-user' } } });

    function AuthActions() {
      const { user, signInWithEmail } = useAuth();
      return (
        <>
          <output data-testid="late-event-identity">{user?.id ?? 'signed-out'}</output>
          <button onClick={() => { void signInWithEmail('email@example.com', 'password'); }}>email</button>
        </>
      );
    }

    render(<AuthProvider><AuthActions /></AuthProvider>);
    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    await act(async () => { screen.getByRole('button', { name: 'email' }).click(); });
    expect(screen.getByTestId('late-event-identity').textContent).toBe('late-event-user');

    act(() => {
      authStateChangeCallback('INITIAL_SESSION', null);
    });
    expect(screen.getByTestId('late-event-identity').textContent).toBe('late-event-user');
  });

  it('adopts a completed Google callback session without waiting for a listener event', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    signInWithGoogleMock.mockResolvedValue({ success: true, session: { user: { id: 'google-user' } } });

    function AuthActions() {
      const { user, signInWithGoogle } = useAuth();
      return (
        <>
          <output data-testid="google-identity">{user?.id ?? 'signed-out'}</output>
          <button onClick={() => { void signInWithGoogle(); }}>google</button>
        </>
      );
    }

    render(<AuthProvider><AuthActions /></AuthProvider>);
    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    await act(async () => { screen.getByRole('button', { name: 'google' }).click(); });
    expect(screen.getByTestId('google-identity').textContent).toBe('google-user');
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

  it('exposes the trusted Supabase password-recovery event for root navigation', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    function RecoveryState() {
      const { isPasswordRecovery, user } = useAuth();
      return (
        <>
          <output data-testid="recovery-state">{String(isPasswordRecovery)}</output>
          <output data-testid="recovery-user">{user?.id ?? 'signed-out'}</output>
        </>
      );
    }

    render(<AuthProvider><RecoveryState /></AuthProvider>);
    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    act(() => {
      authStateChangeCallback('PASSWORD_RECOVERY', { user: { id: 'recovery-user' } });
    });

    expect(screen.getByTestId('recovery-state').textContent).toBe('true');
    expect(screen.getByTestId('recovery-user').textContent).toBe('recovery-user');
  });
});
