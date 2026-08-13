/**
 * CaloraApp authentication utilities.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_STORAGE_KEY } from './supabase';

// ---------------------------------------------------------------------------
// Canonical redirect URI — single source of truth
// ---------------------------------------------------------------------------

export const OAUTH_REDIRECT_URI = 'caloraapp://auth/callback' as const;

/**
 * The storage key for the PKCE code verifier.
 */
const PKCE_VERIFIER_KEY = `${SUPABASE_STORAGE_KEY}-code-verifier`;

// ---------------------------------------------------------------------------
// Result and error types
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | 'cancelled'           
  | 'network'             
  | 'provider'            
  | 'token'               
  | 'expired'             
  | 'duplicate'           
  | 'invalid_credentials' 
  | 'verify_email'        
  | 'unknown';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthResult =
  | { success: true; session: Session }
  | { success: false; error: AuthError };

export type AuthStatusCallback = (message: string) => void;

// ---------------------------------------------------------------------------
// Google Sign-In (PKCE)
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
    
    const challenge = base64Challenge
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 2. Persist the verifier using the Supabase client's storage adapter.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (supabase.auth as any).storage;
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(PKCE_VERIFIER_KEY, verifier);
    }

    onStatus?.('Connecting to Google\u2026');

    // 3. Request the OAuth URL from Supabase with the manual challenge
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
          message: oauthError?.message ?? 'Failed to initiate Google sign-in.',
        },
      };
    }

    await WebBrowser.warmUpAsync().catch(() => {});
    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);
    await WebBrowser.coolDownAsync().catch(() => {});

    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss' || browserResult.type === 'locked') {
      return { success: false, error: { code: 'cancelled', message: 'Sign-in was cancelled.' } };
    }

    if (browserResult.type !== 'success' || !browserResult.url) {
      return {
        success: false,
        error: { code: 'unknown', message: 'Authentication did not complete.' },
      };
    }

    return handleOAuthCallbackUrl(browserResult.url, onStatus);
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// OAuth / Magic Link callback exchange
// ---------------------------------------------------------------------------

export async function handleOAuthCallbackUrl(
  url: string, 
  onStatus?: AuthStatusCallback
): Promise<AuthResult> {
  onStatus?.('Verifying credentials\u2026');

  try {
    const urlObj = new URL(url);
    
    // Check for provider errors
    const urlError = urlObj.searchParams.get('error');
    if (urlError) {
      const isUserDenied = urlError === 'access_denied';
      return {
        success: false,
        error: isUserDenied
          ? { code: 'cancelled', message: 'Sign-in was cancelled.' }
          : { code: 'provider', message: 'Provider error: ' + urlError },
      };
    }

    // DIAGNOSTIC: Determine if this is a PKCE flow or an implicit/email flow.
    // PKCE flows have a 'code' parameter. Email confirmation links typically
    // return access_token/refresh_token in the hash (implicit flow).
    const hasCode = urlObj.searchParams.has('code');
    const hasToken = url.includes('access_token=');

    if (!hasCode && !hasToken) {
      return {
        success: false,
        error: { code: 'token', message: 'No valid sign-in data found in the link.' },
      };
    }
  } catch {
    // Malformed URL
  }

  try {
    const exchangePromise = supabase.auth.exchangeCodeForSession(url);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth exchange timed out')), 25000)
    );

    onStatus?.('Finalizing sign-in\u2026');
    const { data, error } = await Promise.race([exchangePromise, timeoutPromise]) as any;

    if (error) {
      const lower = error.message?.toLowerCase() ?? '';
      const code: AuthErrorCode = lower.includes('expired') ? 'expired' : 'token';
      return {
        success: false,
        error: { code, message: resolveUserMessage(code, error.message) },
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: { code: 'token', message: 'No session was returned.' },
      };
    }

    onStatus?.('Success!');
    return { success: true, session: data.session };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Email flows
// ---------------------------------------------------------------------------

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: OAUTH_REDIRECT_URI },
    });
    if (error) return { success: false, error: { code: 'unknown', message: error.message } };
    if (!data.session) return { success: false, error: { code: 'verify_email', message: 'Check your email.' } };
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
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

function classifyError(err: unknown): { success: false; error: AuthError } {
  const message = err instanceof Error ? err.message : String(err);
  return { success: false, error: { code: 'unknown', message: resolveUserMessage('unknown', message) } };
}

function resolveUserMessage(code: AuthErrorCode, raw: string): string {
  if (code === 'token') return 'We couldn\'t verify your sign-in data. Please try again.';
  return 'Something went wrong: ' + raw;
}
