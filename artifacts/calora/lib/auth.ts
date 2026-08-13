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
    
    // Generate PKCE verifier
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

    // Persist verifier for the callback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (supabase.auth as any).storage;
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(PKCE_VERIFIER_KEY, verifier);
    }

    onStatus?.('Connecting to Google\u2026');

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
// Multi-Flow Handler (PKCE, Implicit, OTP)
// ---------------------------------------------------------------------------

/**
 * Robustly handles any authentication callback URL.
 * Detects whether the link is PKCE (code), Implicit (access_token), or OTP (token/type).
 */
export async function handleOAuthCallbackUrl(
  url: string, 
  onStatus?: AuthStatusCallback
): Promise<AuthResult> {
  onStatus?.('Verifying credentials\u2026');

  try {
    const urlObj = new URL(url.replace('#', '?')); // Normalize fragment to query for easier parsing
    const code = urlObj.searchParams.get('code');
    const accessToken = urlObj.searchParams.get('access_token');
    const refreshToken = urlObj.searchParams.get('refresh_token');
    const token = urlObj.searchParams.get('token');
    const type = urlObj.searchParams.get('type');
    const error = urlObj.searchParams.get('error');
    const errorDescription = urlObj.searchParams.get('error_description');

    if (error) {
      return {
        success: false,
        error: { code: 'provider', message: errorDescription || error },
      };
    }

    onStatus?.('Finalizing sign-in\u2026');

    // Case 1: PKCE Flow (Google)
    if (code) {
      onStatus?.('Exchanging code\u2026');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
      
      if (exchangeError) {
        // If PKCE fails due to verifier issues, it might be an environment mismatch
        return {
          success: false,
          error: { code: 'token', message: exchangeError.message },
        };
      }
      
      if (data?.session) return { success: true, session: data.session };
    }

    // Case 2: Implicit Flow (Tokens in fragment/query)
    if (accessToken) {
      onStatus?.('Setting session\u2026');
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      
      if (sessionError) {
        return {
          success: false,
          error: { code: 'token', message: sessionError.message },
        };
      }
      
      if (data?.session) return { success: true, session: data.session };
    }

    // Case 3: Email OTP / Confirmation (token + type)
    if (token && type) {
      onStatus?.('Verifying link\u2026');
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        token,
        type: type as any,
        options: { redirectTo: OAUTH_REDIRECT_URI }
      });
      
      if (otpError) {
        return {
          success: false,
          error: { code: 'token', message: otpError.message },
        };
      }
      
      if (data?.session) return { success: true, session: data.session };
    }

    return {
      success: false,
      error: { code: 'unknown', message: 'No valid authentication data found in link.' },
    };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Remaining flows
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
  return { success: false, error: { code: 'unknown', message } };
}

function resolveUserMessage(code: AuthErrorCode, raw: string): string {
  if (code === 'token') return 'We couldn\'t verify your sign-in data. ' + raw;
  return 'Something went wrong: ' + raw;
}
