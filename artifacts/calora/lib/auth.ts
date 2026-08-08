/**
 * CaloraApp authentication utilities.
 *
 * All Supabase auth operations are encapsulated here so the rest of the
 * application uses a typed, CaloraApp-specific interface rather than calling
 * the Supabase SDK directly.
 *
 * ─── Canonical OAuth redirect URI ─────────────────────────────────────────
 *
 *   caloraapp://auth/callback
 *
 * This is the only redirect URI registered in Supabase and passed to every
 * OAuth flow.  It maps to app/auth/callback.tsx via Expo Router file-system
 * routing.  The custom URL scheme "caloraapp" is declared in app.json and
 * registered automatically in AndroidManifest.xml and Info.plist by Expo.
 *
 * ─── Google OAuth flow ────────────────────────────────────────────────────
 *
 *   1. Request the Supabase OAuth URL (skipBrowserRedirect: true — caller
 *      controls when the browser opens, not Supabase).
 *   2. Open the URL in a secure system browser via expo-web-browser:
 *        • iOS   → ASWebAuthenticationSession (captures the redirect natively)
 *        • Android → Chrome Custom Tab (captures the redirect via intent)
 *   3. expo-web-browser waits for the browser to redirect back to
 *      caloraapp://auth/callback and returns the full URL as result.url.
 *   4. handleOAuthCallbackUrl() exchanges the code / tokens for a session.
 *
 * ─── Security contract ────────────────────────────────────────────────────
 *  • Client-supplied user IDs are never trusted.  The API server resolves
 *    identity from the verified JWT, not from request body fields.
 *  • skipBrowserRedirect: true is mandatory.  Without it, Supabase opens the
 *    browser itself and expo-web-browser cannot capture the redirect URL.
 *  • The service-role key must never appear in this file or any file it imports.
 */

import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Canonical redirect URI — single source of truth for all OAuth flows
// ---------------------------------------------------------------------------

/**
 * The canonical deep-link URI that Supabase redirects to after OAuth.
 *
 * This exact string must be registered as an Allowed Redirect URL in the
 * Supabase dashboard → Authentication → URL Configuration.
 */
export const OAUTH_REDIRECT_URI = 'caloraapp://auth/callback' as const;

// ---------------------------------------------------------------------------
// Result and error types
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | 'cancelled' // User dismissed the browser or cancelled the provider flow
  | 'network' // Network unreachable during auth
  | 'provider' // OAuth provider rejected the request
  | 'token' // Token exchange or JWT validation failed
  | 'expired' // Auth link or OTP has expired
  | 'duplicate' // Account already exists under a different provider
  | 'unknown'; // Unexpected / unclassified error

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthResult =
  | { success: true; session: Session }
  | { success: false; error: AuthError };

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------

/**
 * Opens the Google OAuth flow through Supabase and resolves the result.
 *
 * Returns AuthResult.  Always check result.success before proceeding.
 * Never throws — all error paths return { success: false, error }.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: OAUTH_REDIRECT_URI,
        /**
         * skipBrowserRedirect: true — do not let Supabase open the browser.
         * We hand the URL to expo-web-browser so it can capture the redirect.
         */
        skipBrowserRedirect: true,
      },
    });

    if (oauthError || !data?.url) {
      return {
        success: false,
        error: {
          code: 'provider',
          message:
            oauthError?.message ??
            'Failed to initiate Google sign-in. Please try again.',
        },
      };
    }

    // Warm up Android Chrome Custom Tabs before opening (no-op on iOS/web).
    await WebBrowser.warmUpAsync().catch(() => {});

    const browserResult = await WebBrowser.openAuthSessionAsync(
      data.url,
      OAUTH_REDIRECT_URI,
    );

    await WebBrowser.coolDownAsync().catch(() => {});

    if (
      browserResult.type === 'cancel' ||
      browserResult.type === 'dismiss'
    ) {
      return {
        success: false,
        error: { code: 'cancelled', message: 'Sign-in was cancelled.' },
      };
    }

    if (browserResult.type !== 'success' || !browserResult.url) {
      return {
        success: false,
        error: {
          code: 'unknown',
          message: 'Authentication did not complete. Please try again.',
        },
      };
    }

    // Exchange the callback URL for a session (handles both PKCE and implicit).
    return handleOAuthCallbackUrl(browserResult.url);
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// OAuth callback handler — shared by signInWithGoogle and the callback screen
// ---------------------------------------------------------------------------

/**
 * Exchanges an OAuth callback URL for a Supabase session.
 *
 * Handles both:
 *   PKCE flow    — caloraapp://auth/callback?code=...
 *   Implicit flow — caloraapp://auth/callback#access_token=...&refresh_token=...
 *
 * Called from two places:
 *   1. signInWithGoogle() — with the URL captured by openAuthSessionAsync.
 *   2. app/auth/callback.tsx — when the app receives the deep link externally
 *      (email magic link, Android deep-link edge case, future providers).
 */
export async function handleOAuthCallbackUrl(url: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url);

    if (error) {
      const lower = error.message?.toLowerCase() ?? '';
      const code: AuthErrorCode = lower.includes('expired')
        ? 'expired'
        : lower.includes('duplicate') || lower.includes('already')
          ? 'duplicate'
          : 'token';

      return {
        success: false,
        error: { code, message: resolveUserMessage(code, error.message) },
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: {
          code: 'token',
          message: 'No session was returned. Please sign in again.',
        },
      };
    }

    return { success: true, session: data.session };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

/**
 * Signs the user out of Supabase and clears all local session state.
 *
 * Important: this does NOT delete the CaloraApp account, remove cloud data,
 * cancel any subscription, or erase local nutrition data.
 * The AuthContext onAuthStateChange listener sets session to null after this.
 */
export async function signOut(): Promise<{ error?: AuthError }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: { code: 'unknown', message: error.message } };
    }
    return {};
  } catch (err) {
    const result = classifyError(err);
    return { error: result.error };
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/** Returns the currently active Supabase session, or null. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Returns the currently authenticated Supabase user, or null. */
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

function classifyError(err: unknown): { success: false; error: AuthError } {
  const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const lower = message.toLowerCase();

  const code: AuthErrorCode =
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('connect') ||
    lower.includes('offline')
      ? 'network'
      : lower.includes('expired')
        ? 'expired'
        : 'unknown';

  return {
    success: false,
    error: { code, message: resolveUserMessage(code, message) },
  };
}

function resolveUserMessage(code: AuthErrorCode, rawMessage: string): string {
  switch (code) {
    case 'cancelled':
      return 'Sign-in was cancelled.';
    case 'network':
      return 'No internet connection. Please check your network and try again.';
    case 'expired':
      return 'This sign-in link has expired. Please request a new one.';
    case 'duplicate':
      return 'An account already exists with this email. Try signing in with the original provider.';
    case 'provider':
      return 'Unable to connect to the sign-in provider. Please try again.';
    case 'token':
      return 'Sign-in could not be completed. Please try again.';
    default:
      // In development, surface the raw message to aid debugging.
      // In production, keep it generic so no internals are exposed to users.
      return __DEV__
        ? rawMessage
        : 'Something went wrong. Please try again.';
  }
}
