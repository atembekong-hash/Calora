/**
 * CaloraApp — Authentication context.
 *
 * Provides the active Supabase session, the authenticated user, auth actions,
 * and key state flags to the entire component tree.
 *
 * ─── Architecture ─────────────────────────────────────────────────────────
 *  • Mounted at the root in _layout.tsx, wrapping CaloraProvider and all screens.
 *  • Manages identity state only.  Nutrition/diary/profile state stays in CaloraContext.
 *  • onAuthStateChange is the single source of truth for session updates.
 *  • isLoading: true only during the initial session-restore on app launch.
 *  • isPasswordRecovery: true when Supabase fires PASSWORD_RECOVERY (after the
 *    user taps a reset-password email link).  The callback screen reads this to
 *    redirect to /auth/reset-password instead of the main app.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True while the initial session restore is in flight on app launch. */
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const signingIn = useRef(false);
  const activeUserId = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Session bootstrap
  // -------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    }).catch(() => {
      if (active) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
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
        setIsLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
        }
      },
    );

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
    try {
      return await doGoogleSignIn();
    } finally {
      signingIn.current = false;
    }
  }, []);

  const signInWithEmail = useCallback(
    (email: string, password: string) => doEmailSignIn(email, password),
    [],
  );

  const signUpWithEmail = useCallback(
    (email: string, password: string) => doEmailSignUp(email, password),
    [],
  );

  const sendPasswordReset = useCallback(
    (email: string) => doPasswordReset(email),
    [],
  );

  const updatePassword = useCallback(
    (newPassword: string) => {
      const result = doUpdatePassword(newPassword);
      // Clear recovery state after the password is updated
      void result.then(
        ({ error }) => { if (!error) setIsPasswordRecovery(false); },
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

  // -------------------------------------------------------------------------
  // Value
  // -------------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isPasswordRecovery,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      updatePassword,
      resendVerificationEmail,
      signOut: signOutAction,
    }),
    [
      session, user, isLoading, isPasswordRecovery,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      sendPasswordReset, updatePassword, resendVerificationEmail, signOutAction,
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
