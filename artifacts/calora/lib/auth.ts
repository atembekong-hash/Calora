/**
 * CaloraApp authentication utilities.
 *
 * Encapsulates all Supabase auth operations behind a typed, CaloraApp-specific
 * interface.  The rest of the application should import from here, not from
 * @supabase/supabase-js directly.
 *
 * ─── Canonical redirect URI ───────────────────────────────────────────────
 *
 *   caloraapp://auth/callback
 *
 * This is the only redirect URI registered in Supabase → Authentication →
 * URL Configuration → Redirect URLs.  It maps to app/auth/callback.tsx via
 * Expo Router file-system routing.  The "caloraapp" URL scheme is declared in
 * app.json and registered automatically in AndroidManifest.xml and Info.plist.
 *
 * ─── Google OAuth flow ────────────────────────────────────────────────────
 *
 *   1. Request the Supabase OAuth URL (skipBrowserRedirect: true).
 *   2. Open it in a system browser via expo-web-browser:
 *        iOS   → ASWebAuthenticationSession (captures the redirect natively)
 *        Android → Chrome Custom Tab (captures via intent)
 *   3. expo-web-browser returns the redirect URL as result.url.
 *   4. handleOAuthCallbackUrl() exchanges it for a session.
 *
 * ─── Email auth ───────────────────────────────────────────────────────────
 *
 *   signUpWithEmail   — create account, may require email confirmation
 *   signInWithEmail   — password sign-in
 *   sendPasswordReset — send recovery email to caloraapp://auth/callback
 *   updatePassword    — set new password (called after PASSWORD_RECOVERY event)
 *   resendVerification — resend the confirmation email
 *
 * ─── Security contract ────────────────────────────────────────────────────
 *  • SUPABASE_SERVICE_ROLE_KEY must never appear here or in any client file.
 *  • Client-supplied user IDs are never trusted for authorisation.
 *  • User IDs must be resolved server-side from the verified JWT.
 */

import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Canonical redirect URI — single source of truth
// ---------------------------------------------------------------------------

export const OAUTH_REDIRECT_URI = 'caloraapp://auth/callback' as const;

// ---------------------------------------------------------------------------
// Result and error types
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | 'cancelled'           // User dismissed the browser or cancelled
  | 'network'             // Network unreachable
  | 'provider'            // OAuth provider rejected the request
  | 'token'               // Token exchange / JWT validation failed
  | 'expired'             // Auth link or OTP expired
  | 'duplicate'           // Account already exists under a different provider
  | 'invalid_credentials' // Wrong email or password
  | 'verify_email'        // Sign-up OK but email confirmation required
  | 'unknown';

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

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: OAUTH_REDIRECT_URI,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError || !data?.url) {
      return {
        success: false,
        error: {
          code: 'provider',
          message: oauthError?.message ?? 'Failed to initiate Google sign-in. Please try again.',
        },
      };
    }

    await WebBrowser.warmUpAsync().catch(() => {});
    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);
    await WebBrowser.coolDownAsync().catch(() => {});

    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      return { success: false, error: { code: 'cancelled', message: 'Sign-in was cancelled.' } };
    }

    // iOS can return 'locked' when an ASWebAuthenticationSession is already in progress.
    if (browserResult.type === 'locked') {
      return { success: false, error: { code: 'cancelled', message: 'Sign-in was cancelled.' } };
    }

    if (browserResult.type !== 'success' || !browserResult.url) {
      return {
        success: false,
        error: { code: 'unknown', message: 'Authentication did not complete. Please try again.' },
      };
    }

    // Check whether the OAuth provider returned an error in the redirect URL
    // before attempting the token exchange.  Google reports access_denied when
    // the user explicitly denies consent; other values indicate a provider
    // or configuration error.
    //
    // Example: caloraapp://auth/callback?error=access_denied&error_description=…
    const redirectError = (() => {
      try { return new URL(browserResult.url).searchParams.get('error'); } catch { return null; }
    })();

    if (redirectError) {
      const isUserDenied = redirectError === 'access_denied';
      return {
        success: false,
        error: isUserDenied
          ? { code: 'cancelled', message: 'Sign-in was cancelled.' }
          : { code: 'provider', message: resolveUserMessage('provider', redirectError) },
      };
    }

    return handleOAuthCallbackUrl(browserResult.url);
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Email sign-up
// ---------------------------------------------------------------------------

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: OAUTH_REDIRECT_URI },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes('already registered') || lower.includes('already exists')) {
        return {
          success: false,
          error: {
            code: 'duplicate',
            message: 'An account with this email already exists. Try signing in instead.',
          },
        };
      }
      return { success: false, error: { code: 'unknown', message: error.message } };
    }

    // Supabase returns a session immediately when email confirmations are
    // disabled.  When confirmations are required, session is null and the user
    // must verify their email before signing in.
    if (!data.session) {
      return {
        success: false,
        error: {
          code: 'verify_email',
          message: 'Check your email and tap the confirmation link to activate your account.',
        },
      };
    }

    return { success: true, session: data.session };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Email sign-in
// ---------------------------------------------------------------------------

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const lower = error.message.toLowerCase();
      const isInvalid =
        lower.includes('invalid login') ||
        lower.includes('invalid credentials') ||
        lower.includes('wrong password') ||
        lower.includes('email not confirmed');
      return {
        success: false,
        error: {
          code: isInvalid ? 'invalid_credentials' : 'unknown',
          message: isInvalid
            ? 'Incorrect email or password. Please try again.'
            : resolveUserMessage('unknown', error.message),
        },
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: { code: 'token', message: 'Sign-in failed. Please try again.' },
      };
    }

    return { success: true, session: data.session };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** Sends a password-reset email.  The link redirects to caloraapp://auth/callback. */
export async function sendPasswordReset(email: string): Promise<{ error?: AuthError }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: OAUTH_REDIRECT_URI },
    );
    if (error) return { error: { code: 'unknown', message: error.message } };
    return {};
  } catch (err) {
    return { error: classifyError(err).error as AuthError };
  }
}

/** Updates the authenticated user's password.  Must be called during PASSWORD_RECOVERY session. */
export async function updatePassword(newPassword: string): Promise<{ error?: AuthError }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: { code: 'unknown', message: error.message } };
    return {};
  } catch (err) {
    return { error: classifyError(err).error as AuthError };
  }
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function resendVerificationEmail(email: string): Promise<{ error?: AuthError }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: OAUTH_REDIRECT_URI },
    });
    if (error) return { error: { code: 'unknown', message: error.message } };
    return {};
  } catch (err) {
    return { error: classifyError(err).error as AuthError };
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<{ error?: AuthError }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: { code: 'unknown', message: error.message } };
    return {};
  } catch (err) {
    return { error: classifyError(err).error as AuthError };
  }
}

// ---------------------------------------------------------------------------
// OAuth callback — shared by signInWithGoogle and the callback screen
// ---------------------------------------------------------------------------

/**
 * Exchanges an OAuth/magic-link/recovery callback URL for a Supabase session.
 * Handles both PKCE (?code=) and implicit (#access_token=) flows.
 *
 * Also handles URLs that carry an error param from the OAuth provider (e.g.
 * access_denied) without attempting a code exchange that would fail anyway.
 */
export async function handleOAuthCallbackUrl(url: string): Promise<AuthResult> {
  // Detect an error param that the provider embedded in the redirect URL before
  // attempting the code exchange.  This covers cases where the callback screen
  // receives the URL directly (deep-link path) and signInWithGoogle() has not
  // already filtered it out.
  try {
    const urlObj = new URL(url);
    const urlError = urlObj.searchParams.get('error');
    if (urlError) {
      const isUserDenied = urlError === 'access_denied';
      return {
        success: false,
        error: isUserDenied
          ? { code: 'cancelled', message: 'Sign-in was cancelled.' }
          : { code: 'provider', message: resolveUserMessage('provider', urlError) },
      };
    }
  } catch {
    // Malformed URL — fall through to exchangeCodeForSession which will surface a
    // clear error of its own.
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url);

    if (error) {
      const lower = error.message?.toLowerCase() ?? '';
      const code: AuthErrorCode = lower.includes('expired')
        ? 'expired'
        : lower.includes('duplicate') || lower.includes('already')
          ? 'duplicate'
          : lower.includes('access_denied') || lower.includes('access denied')
            ? 'provider'
            : 'token';
      return {
        success: false,
        error: { code, message: resolveUserMessage(code, error.message) },
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: { code: 'token', message: 'No session was returned. Please sign in again.' },
      };
    }

    return { success: true, session: data.session };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

function classifyError(err: unknown): { success: false; error: AuthError } {
  const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const lower = message.toLowerCase();
  const code: AuthErrorCode =
    lower.includes('network') || lower.includes('fetch') || lower.includes('offline')
      ? 'network'
      : lower.includes('expired')
        ? 'expired'
        : lower.includes('access_denied') || lower.includes('access denied')
          ? 'provider'
          : 'unknown';
  return { success: false, error: { code, message: resolveUserMessage(code, message) } };
}

function resolveUserMessage(code: AuthErrorCode, raw: string): string {
  switch (code) {
    case 'cancelled': return 'Sign-in was cancelled.';
    case 'network': return 'No internet connection. Please check your network and try again.';
    case 'expired': return 'This sign-in link has expired. Please request a new one.';
    case 'duplicate': return 'An account with this email already exists. Try signing in with the original provider.';
    case 'provider': return 'Unable to connect to the sign-in provider. Please try again.';
    case 'invalid_credentials': return 'Incorrect email or password. Please try again.';
    case 'verify_email': return 'Please verify your email address before signing in.';
    case 'token': return 'Sign-in could not be completed. Please try again.';
    default: return __DEV__ ? raw : 'Something went wrong. Please try again.';
  }
}
