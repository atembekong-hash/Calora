/**
 * CaloraApp authentication utilities.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * HTTPS is intentional here. The production host is associated with this
 * bundle/package on iOS and Android, so the OS—not a globally claimable
 * custom scheme—owns the callback. Keep the path in sync with app.json,
 * the association responses, and Supabase's redirect allow-list.
 */
export const OAUTH_REDIRECT_URI = 'https://calorie-coach-pie35449.replit.app/auth/callback' as const;
const OAUTH_REDIRECT_URL = new URL(OAUTH_REDIRECT_URI);

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

function isTrustedOAuthCallbackUrl(url: URL): boolean {
  return (
    url.protocol === OAUTH_REDIRECT_URL.protocol &&
    url.hostname === OAUTH_REDIRECT_URL.hostname &&
    url.port === OAUTH_REDIRECT_URL.port &&
    url.pathname === OAUTH_REDIRECT_URL.pathname &&
    !url.username &&
    !url.password
  );
}

const OAUTH_CODE_SUCCESS_TTL_MS = 60_000;
const MAX_OAUTH_CODE_EXCHANGES = 8;

type PendingOAuthCodeExchange = {
  kind: 'pending';
  startedAt: number;
  result: Promise<AuthResult>;
};

type SettledOAuthCodeExchange = {
  kind: 'success';
  userId: string;
  settledAt: number;
  expiresAt: number;
  evictionTimer: ReturnType<typeof setTimeout>;
};

type OAuthCodeExchange = PendingOAuthCodeExchange | SettledOAuthCodeExchange;
const oauthCodeExchanges = new Map<string, OAuthCodeExchange>();

function removeOAuthCodeExchange(key: string, expected?: OAuthCodeExchange) {
  const current = oauthCodeExchanges.get(key);
  if (!current || (expected && current !== expected)) return;
  if (current.kind === 'success') clearTimeout(current.evictionTimer);
  oauthCodeExchanges.delete(key);
}

function pruneExpiredOAuthCodeExchanges(now: number) {
  for (const [key, exchange] of oauthCodeExchanges) {
    if (exchange.kind === 'success' && exchange.expiresAt <= now) {
      removeOAuthCodeExchange(key, exchange);
    }
  }
}

function reserveOAuthCodeExchangeSlot(): boolean {
  if (oauthCodeExchanges.size < MAX_OAUTH_CODE_EXCHANGES) return true;

  const oldestSuccess = [...oauthCodeExchanges.entries()]
    .filter((entry): entry is [string, SettledOAuthCodeExchange] => entry[1].kind === 'success')
    .sort((a, b) => a[1].settledAt - b[1].settledAt)[0];
  if (oldestSuccess) removeOAuthCodeExchange(oldestSuccess[0], oldestSuccess[1]);

  return oauthCodeExchanges.size < MAX_OAUTH_CODE_EXCHANGES;
}

export function clearSettledOAuthCodeExchanges() {
  for (const [key, exchange] of oauthCodeExchanges) {
    if (exchange.kind === 'success') removeOAuthCodeExchange(key, exchange);
  }
}

async function getOAuthCodeKey(code: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, code);
}

async function replaySettledOAuthSuccess(
  key: string,
  exchange: SettledOAuthCodeExchange,
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (!error && session?.user?.id === exchange.userId) {
      return { success: true, session };
    }
  } catch {
    // A stale replay must fail closed without changing the current session.
  }

  removeOAuthCodeExchange(key, exchange);
  return {
    success: false,
    error: { code: 'token', message: 'This sign-in callback is no longer current. Please try again.' },
  };
}

async function exchangeOAuthCodeOnce(code: string, onStatus?: AuthStatusCallback): Promise<AuthResult> {
  const key = await getOAuthCodeKey(code);
  const now = Date.now();
  pruneExpiredOAuthCodeExchanges(now);

  const existing = oauthCodeExchanges.get(key);
  if (existing?.kind === 'pending') return existing.result;
  if (existing?.kind === 'success') return replaySettledOAuthSuccess(key, existing);

  if (!reserveOAuthCodeExchangeSlot()) {
    return {
      success: false,
      error: { code: 'provider', message: 'Too many sign-in attempts are already in progress.' },
    };
  }

  const result = (async (): Promise<AuthResult> => {
    onStatus?.('Exchanging code\u2026');
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { success: false, error: { code: 'token', message: error.message } };
      if (data?.session) return { success: true, session: data.session };
      return { success: false, error: { code: 'token', message: 'Sign-in could not be completed.' } };
    } catch (err) {
      return classifyError(err);
    }
  })();

  const pending: PendingOAuthCodeExchange = {
    kind: 'pending',
    startedAt: now,
    result,
  };
  oauthCodeExchanges.set(key, pending);

  void result.then((authResult) => {
    if (oauthCodeExchanges.get(key) !== pending) return;
    const userId = authResult.success ? authResult.session.user?.id : null;
    if (!userId) {
      removeOAuthCodeExchange(key, pending);
      return;
    }

    const settledAt = Date.now();
    const settled: SettledOAuthCodeExchange = {
      kind: 'success',
      userId,
      settledAt,
      expiresAt: settledAt + OAUTH_CODE_SUCCESS_TTL_MS,
      evictionTimer: setTimeout(() => {
        removeOAuthCodeExchange(key, settled);
      }, OAUTH_CODE_SUCCESS_TTL_MS),
    };
    oauthCodeExchanges.set(key, settled);
  }, () => {
    removeOAuthCodeExchange(key, pending);
  });

  return result;
}

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
    if (!isTrustedOAuthCallbackUrl(urlObj)) {
      return {
        success: false,
        error: { code: 'token', message: 'This sign-in callback is not trusted.' },
      };
    }
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
      return exchangeOAuthCodeOnce(code, onStatus);
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
  clearSettledOAuthCodeExchanges();
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
