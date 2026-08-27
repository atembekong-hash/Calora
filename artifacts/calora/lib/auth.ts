/**
 * CaloraApp authentication utilities.
 */

import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const OAUTH_REDIRECT_URI = 'caloraapp://auth/callback' as const;

export type AuthErrorCode =
  | 'cancelled'
  | 'network'
  | 'provider'
  | 'token'
  | 'unknown'
  | 'invalid_credentials'
  | 'verify_email'
  | 'expired';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthResult =
  | { success: true; session: Session }
  | { success: false; error: AuthError };

export type AuthStatusCallback = (message: string) => void;

/**
 * Deliberately small client-side gate for forms. The provider remains the
 * authority for account existence, but malformed addresses should never be
 * sent as a credential attempt.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// ---------------------------------------------------------------------------
// Google OAuth Flow (PKCE)
// ---------------------------------------------------------------------------

export async function signInWithGoogle(onStatus?: AuthStatusCallback): Promise<AuthResult> {
  try {
    onStatus?.('Connecting to Google\u2026');
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
        error: { code: 'provider', message: oauthError?.message || 'Failed to connect to Google.' },
      };
    }

    onStatus?.('Opening browser\u2026');
    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);

    if (browserResult.type !== 'success' || !browserResult.url) {
      return { success: false, error: { code: 'cancelled', message: 'Sign-in was cancelled.' } };
    }

    return handleOAuthCallbackUrl(browserResult.url, onStatus);
  } catch (err) {
    return classifyError(err);
  }
}

/**
 * Processes the deep-link callback URL and exchanges the code for a session.
 */
export async function handleOAuthCallbackUrl(url: string, onStatus?: AuthStatusCallback): Promise<AuthResult> {
  onStatus?.('Verifying credentials\u2026');

  try {
    const urlObj = new URL(url.replace('#', '?'));
    const code = urlObj.searchParams.get('code');
    const accessToken = urlObj.searchParams.get('access_token');
    const refreshToken = urlObj.searchParams.get('refresh_token');
    const error = urlObj.searchParams.get('error');
    const errorDescription = urlObj.searchParams.get('error_description');

    if (error) {
      return { success: false, error: { code: 'provider', message: errorDescription || error } };
    }

    onStatus?.('Finalizing sign-in\u2026');

    // Case 1: PKCE Flow (Authorization Code)
    // Used by Google OAuth and modern email links.
    if (code) {
      onStatus?.('Exchanging code\u2026');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) return { success: false, error: { code: 'token', message: exchangeError.message } };
      if (data?.session) return { success: true, session: data.session };
    }

    // Case 2: Implicit Flow Fallback (Access Token)
    // Preserved for compatibility with legacy email confirmation links.
    if (accessToken) {
      onStatus?.('Setting session\u2026');
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      if (sessionError) return { success: false, error: { code: 'token', message: sessionError.message } };
      if (data?.session) return { success: true, session: data.session };
    }

    return { success: false, error: { code: 'unknown', message: 'No valid authentication data found.' } };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Email/Password Flows
// ---------------------------------------------------------------------------

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: OAUTH_REDIRECT_URI },
    });
    if (error) return { success: false, error: { code: 'unknown', message: error.message } };
    if (!data.session) return { success: false, error: { code: 'verify_email', message: 'Check your email for a confirmation link.' } };
    return { success: true, session: data.session };
  } catch (err) { return classifyError(err); }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { success: false, error: { code: 'invalid_credentials', message: error.message } };
    if (!data.session) return { success: false, error: { code: 'token', message: 'Sign-in failed.' } };
    return { success: true, session: data.session };
  } catch (err) { return classifyError(err); }
}

// ---------------------------------------------------------------------------
// Account Recovery & Management
// ---------------------------------------------------------------------------

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: OAUTH_REDIRECT_URI });
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function resendVerificationEmail(email: string) {
  return supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: OAUTH_REDIRECT_URI } });
}

export async function signOut() {
  // Normal sign-out is device-scoped. This matches the UI promise, avoids
  // unexpectedly signing the user out everywhere, and does not depend on a
  // network round trip before the local session can be cleared.
  return supabase.auth.signOut({ scope: 'local' });
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

function classifyError(err: unknown): { success: false; error: AuthError } {
  const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const lower = message.toLowerCase();
  const code: AuthErrorCode =
    lower.includes('network') || lower.includes('fetch') || lower.includes('offline')
      ? 'network'
      : lower.includes('expired')
        ? 'expired'
        : 'unknown';
  return { success: false, error: { code, message: resolveUserMessage(code, message) } };
}

function resolveUserMessage(code: AuthErrorCode, raw: string): string {
  switch (code) {
    case 'cancelled': return 'Sign-in was cancelled.';
    case 'network': return 'No internet connection. Please check your network and try again.';
    case 'expired': return 'This sign-in link has expired. Please request a new one.';
    case 'provider': return 'Unable to connect to the sign-in provider. Please try again.';
    case 'invalid_credentials': return 'Incorrect email or password. Please try again.';
    case 'verify_email': return 'Please verify your email address before signing in.';
    case 'token': return 'Sign-in could not be completed. Please try again.';
    default: return __DEV__ ? raw : 'Something went wrong. Please try again.';
  }
}
