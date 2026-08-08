/**
 * CaloraApp — Authentication context.
 *
 * Provides the active Supabase session, the authenticated user, a loading
 * state, and the core auth actions (Google sign-in, sign-out) to the
 * entire component tree.
 *
 * ─── Architecture notes ───────────────────────────────────────────────────
 *  • This context is mounted at the root in _layout.tsx, wrapping both
 *    CaloraContext and all tab screens.
 *  • It manages only authentication / identity state.  Nutrition, diary,
 *    weight, and profile data remain in CaloraContext.
 *  • The Supabase onAuthStateChange listener is the single source of truth
 *    for session updates — state is never mutated directly.
 *  • Identity separation: this context exposes the Supabase session/user
 *    (external identity).  The internal CaloraApp user record
 *    (calora_users.id) is resolved server-side through API auth middleware.
 *  • isLoading is true only during the initial session-restore on launch.
 *    Components that need to wait for the auth check before rendering should
 *    gate on this flag.
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
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  signInWithGoogle as doGoogleSignIn,
  signOut as doSignOut,
} from '@/lib/auth';
import type { AuthError, AuthResult } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  /**
   * The active Supabase session, or null when not authenticated.
   * Contains access_token, refresh_token, and token metadata.
   */
  session: Session | null;

  /**
   * The authenticated Supabase user, or null when not authenticated.
   * Contains email, provider identities, and metadata.
   * Do NOT use user.id as an application-level identifier in queries —
   * use the internal CaloraApp user ID resolved through the API instead.
   */
  user: User | null;

  /**
   * True while the initial session is being restored from secure storage
   * on app launch.  Gate auth-dependent UI on this flag to avoid flashes.
   */
  isLoading: boolean;
}

interface AuthActions {
  /**
   * Opens the Google OAuth flow.  Resolves when the user completes or cancels.
   * Returns an AuthResult — always check result.success before acting.
   * Concurrent calls are dropped (returns an error) while one is in progress.
   */
  signInWithGoogle: () => Promise<AuthResult>;

  /**
   * Signs out of Supabase and clears session state.
   * Does NOT delete the account, remove cloud data, or cancel subscriptions.
   */
  signOut: () => Promise<{ error?: AuthError }>;
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

  // Guard: prevents concurrent Google sign-in attempts
  const signingIn = useRef(false);

  // -------------------------------------------------------------------------
  // Session bootstrap — restore persisted session on mount and subscribe
  // to Supabase auth state changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    // Restore session from SecureStore (or in-memory on web).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    // Subscribe to all subsequent auth events:
    //  SIGNED_IN      — after successful sign-in
    //  SIGNED_OUT     — after sign-out
    //  TOKEN_REFRESHED — after silent token refresh
    //  USER_UPDATED   — after profile update
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Mark loading complete on the first auth event in case getSession()
      // resolves after the event (race guard).
      setIsLoading(false);
    });

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
      return {
        success: false,
        error: {
          code: 'unknown',
          message: 'A sign-in is already in progress.',
        },
      };
    }

    signingIn.current = true;
    try {
      return await doGoogleSignIn();
    } finally {
      signingIn.current = false;
    }
  }, []);

  const signOutAction = useCallback(async () => doSignOut(), []);

  // -------------------------------------------------------------------------
  // Value
  // -------------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      signInWithGoogle,
      signOut: signOutAction,
    }),
    [session, user, isLoading, signInWithGoogle, signOutAction],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the authentication context value.
 * Must be called within a component tree that includes AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
