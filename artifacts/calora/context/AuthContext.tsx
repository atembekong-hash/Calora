/**
 * Calora — Authentication context.
 *
 * Provides the active Supabase session, the authenticated user, auth actions,
 * and key state flags to the entire component tree.
 *
 * ─── Architecture ─────────────────────────────────────────────────────────
 *  • Mounted at the root in _layout.tsx, wrapping CaloraProvider and all screens.
 *  • Manages identity state only.  Nutrition/diary/profile state stays in CaloraContext.
 *  • onAuthStateChange is the single source of truth for session updates.
 *  • restoreStatus makes encrypted session-read failures explicit; only a
 *    successful null read may mount the guest account scope.
 *  • isPasswordRecovery: true when Supabase fires PASSWORD_RECOVERY (after the
 *    user taps a reset-password email link). It enables the reset form, while
 *    routing is decided from validated callback intent rather than listener timing.
 *  • Identity separation: this context exposes the Supabase session/user
 *    (external identity).  The internal calora_users.id is resolved server-side.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  signInWithGoogle as doGoogleSignIn,
  signInWithEmail as doEmailSignIn,
  signUpWithEmail as doEmailSignUp,
  sendPasswordReset as doPasswordReset,
  updatePassword as doUpdatePassword,
  resendVerificationEmail as doResendVerification,
  signOut as doSignOut,
  clearSettledOAuthCodeExchanges,
} from '@/lib/auth';
import type { AuthError, AuthResult } from '@/lib/auth';
import {
  getSafeSessionStorageErrorCategory,
} from '@/lib/supabaseSessionStorage';
import type { PostAuthIntent } from '@/lib/postAuthNavigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthRestoreStatus = 'loading' | 'ready' | 'failed';
export type AuthRestoreError = 'secure_storage' | 'session_restore';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** Maintained for existing consumers; use restoreStatus for failure-aware UI. */
  isLoading: boolean;
  /** `failed` is a visible recovery state, never an implicit guest session. */
  restoreStatus: AuthRestoreStatus;
  /** A safe category only; no token, email, URL, or native-provider detail. */
  restoreError: AuthRestoreError | null;
  /** Callback navigation state consumed by the root-level navigation owner. */
  postAuthIntent: PostAuthIntent;
  /**
   * True after Supabase fires PASSWORD_RECOVERY.  The auth/callback screen
   * reads this to route to /auth/reset-password instead of the main tabs.
   * Automatically cleared after the user updates their password or signs out.
   */
  isPasswordRecovery: boolean;
}

interface AuthActions {
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  sendPasswordReset: typeof doPasswordReset;
  updatePassword: typeof doUpdatePassword;
  resendVerificationEmail: typeof doResendVerification;
  signOut: typeof doSignOut;
  retrySessionRestore: () => Promise<void>;
  beginAuthCallback: () => void;
  completeAuthCallback: (result: AuthResult) => void;
}

export type AuthContextValue = AuthState & AuthActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<AuthRestoreStatus>('loading');
  const [restoreError, setRestoreError] = useState<AuthRestoreError | null>(null);
  const [postAuthIntent, setPostAuthIntent] = useState<PostAuthIntent>('none');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const signingIn = useRef(false);
  const activeUserId = useRef<string | null>(null);
  const authStateChangeGeneration = useRef(0);

  const retrySessionRestore = useCallback(async () => {
    const bootstrapGeneration = authStateChangeGeneration.current;
    setRestoreStatus('loading');
    setRestoreError(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      // Auth events win over an older read (for example while a callback or
      // refresh completes), preserving the existing stale-bootstrap protection.
      if (bootstrapGeneration !== authStateChangeGeneration.current) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setRestoreStatus('ready');
    } catch (error) {
      if (bootstrapGeneration !== authStateChangeGeneration.current) return;
      setRestoreError(getSafeSessionStorageErrorCategory(error));
      setRestoreStatus('failed');
    }
  }, []);

  // -------------------------------------------------------------------------
  // Session bootstrap
  // -------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (!active) return;
        // A null INITIAL_SESSION has no storage-error channel, so it cannot
        // supersede the explicit getSession read below. Invalidating that read
        // here leaves restoreStatus at "loading" forever when it later settles.
        // Authenticated sessions and every conclusive later event still win.
        const isInconclusiveInitialSession = event === 'INITIAL_SESSION' && !newSession;
        if (!isInconclusiveInitialSession) {
          authStateChangeGeneration.current += 1;
        }
        const nextUserId = newSession?.user?.id ?? null;
        if (
          event === 'SIGNED_OUT'
          || (activeUserId.current && nextUserId && activeUserId.current !== nextUserId)
        ) {
          clearSettledOAuthCodeExchanges();
        }
        activeUserId.current = nextUserId;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        // A null INITIAL_SESSION callback has no error channel. Only our
        // explicit getSession read may decide that null means guest; otherwise
        // a SecureStore failure could again be misrepresented as signed out.
        if (newSession || event === 'SIGNED_OUT') {
          setRestoreError(null);
          setRestoreStatus('ready');
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
        }
        if (event === 'SIGNED_OUT') {
          setPostAuthIntent('none');
        }
      },
    );

    void retrySessionRestore();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (signingIn.current) {
      return { success: false, error: { code: 'unknown', message: 'A sign-in is already in progress.' } };
    }
    signingIn.current = true;
    setPostAuthIntent('pending');
    try {
      const result = await doGoogleSignIn();
      setPostAuthIntent(result.success ? (result.callbackIntent ?? 'ordinary') : 'none');
      return result;
    } finally {
      signingIn.current = false;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const result = await doEmailSignIn(email, password);
    if (result.success) setPostAuthIntent('ordinary');
    return result;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const result = await doEmailSignUp(email, password);
    if (result.success) setPostAuthIntent('ordinary');
    return result;
  }, []);

  const sendPasswordReset = useCallback(
    (email: string) => doPasswordReset(email),
    [],
  );

  const updatePassword = useCallback(
    (newPassword: string) => {
      const result = doUpdatePassword(newPassword);
      // Root navigation owns the successful recovery completion as well.
      void result.then(
        ({ error }) => {
          if (!error) {
            setIsPasswordRecovery(false);
            setPostAuthIntent('ordinary');
          }
        },
        () => undefined,
      );
      return result;
    },
    [],
  );

  const resendVerificationEmail = useCallback(
    (email: string) => doResendVerification(email),
    [],
  );

  const signOutAction = useCallback(async () => doSignOut(), []);
  const beginAuthCallback = useCallback(() => setPostAuthIntent('pending'), []);
  const completeAuthCallback = useCallback((result: AuthResult) => {
    setPostAuthIntent(result.success ? (result.callbackIntent ?? 'ordinary') : 'none');
  }, []);

  // -------------------------------------------------------------------------
  // Value
  // -------------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading: restoreStatus === 'loading',
      restoreStatus,
      restoreError,
      postAuthIntent,
      isPasswordRecovery,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      updatePassword,
      resendVerificationEmail,
      signOut: signOutAction,
      retrySessionRestore,
      beginAuthCallback,
      completeAuthCallback,
    }),
    [
      session, user, restoreStatus, restoreError, postAuthIntent, isPasswordRecovery,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      sendPasswordReset, updatePassword, resendVerificationEmail, signOutAction,
      retrySessionRestore, beginAuthCallback, completeAuthCallback,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
