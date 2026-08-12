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
 *  • PKCE code verifiers are manually managed to ensure they survive Android
 *    intent-based app resumes.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Canonical redirect URI — single source of truth
// ---------------------------------------------------------------------------

export const OAUTH_REDIRECT_URI = 'caloraapp://auth/callback' as const;

/**
 * Resolves the Supabase storage key for the PKCE code verifier.
 * This must match the internal logic of @supabase/supabase-js:
 * sb-<project-id>-auth-token-code-verifier
 */
function getPkceVerifierKey(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return 'supabase.auth.token-code-verifier';
  try {
    const hostname = new URL(url).hostname;
    const projectId = hostname.split('.')[0];
    return `sb-${projectId}-auth-token-code-verifier`;
  } catch {
    return 'supabase.auth.token-code-verifier';
  }
}

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

/** Callback for reporting fine-grained auth status updates. */
export type AuthStatusCallback = (message: string) => void;

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------

export async function signInWithGoogle(onStatus?: AuthStatusCallback): Promise<AuthResult> {
  try {
    onStatus?.('Initializing secure session\u2026');
    
    // 1. Generate PKCE verifier and challenge manually.
    const verifier = Crypto.randomUUID();
    const base64Challenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    // Convert base64 to base64url string
    const challenge = base64Challenge
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Store verifier using the client's own storage adapter to ensure consistency.
    // The key must match exactly what the SDK expects to find during exchange.
    const storageKey = getPkceVerifierKey();
    // Supabase auth storage is accessible via the internal property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (supabase.auth as any).storage;
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(storageKey, verifier);
    }

    onStatus?.('Connecting to Google\u2026');

    // 2. Request the OAuth URL from Supabase with the manual challenge
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: OAUTH_REDIRECT_URI,
        skipBrowserRedirect: true,
        queryParams: {
          code_challenge: challenge,
          code_challenge_method: 'S256',
        },
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

    if (browserResult.type === 'locked') {
      return { success: false, error: { code: 'cancelled', message: 'Sign-in was cancelled.' } };
    }

    if (browserResult.type !== 'success' || !browserResult.url) {
      return {
        success: false,
        error: { code: 'unknown', message: 'Authentication did not complete. Please try again.' },
      };
    }

    // Check for provider errors in the redirect URL
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

    return handleOAuthCallbackUrl(browserResult.url, onStatus);
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Email flows (unchanged but included for completeness)
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

export async function updatePassword(newPassword: string): Promise<{ error?: AuthError }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: { code: 'unknown', message: error.message } };
    return {};
  } catch (err) {
    return { error: classifyError(err).error as AuthError };
  }
}

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
 */
export async function handleOAuthCallbackUrl(
  url: string, 
  onStatus?: AuthStatusCallback
): Promise<AuthResult> {
  onStatus?.('Verifying credentials\u2026');

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
    // Malformed URL
  }

  try {
    // Add a 25-second timeout to the exchange to prevent indefinite hanging.
    const exchangePromise = supabase.auth.exchangeCodeForSession(url);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth exchange timed out')), 25000)
    );

    onStatus?.('Finalizing sign-in\u2026');
    const { data, error } = await Promise.race([exchangePromise, timeoutPromise]) as any;

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

    onStatus?.('Success!');
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
    lower.includes('network') || lower.includes('fetch') || lower.includes('offline') || lower.includes('timeout')
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
    case 'network': return 'No internet connection or server timeout. Please try again.';
    case 'expired': return 'This sign-in link has expired. Please request a new one.';
    case 'duplicate': return 'An account with this email already exists under a different provider.';
    case 'invalid_credentials': return 'Incorrect email or password. Please try again.';
    case 'verify_email': return 'Please confirm your email address to activate your account.';
    case 'token': return 'We couldn\'t verify your sign-in data. Please try again.';
    case 'provider': return 'The authentication provider returned an error: ' + raw;
    default: return 'Something went wrong during sign-in. Please try again.';
  }
}
