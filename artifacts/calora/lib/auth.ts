/**
 * CaloraApp authentication utilities.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_STORAGE_KEY } from './supabase';

export const OAUTH_REDIRECT_URI = 'caloraapp://auth/callback' as const;
const PKCE_VERIFIER_KEY = `${SUPABASE_STORAGE_KEY}-code-verifier`;

export type AuthErrorCode = 'cancelled' | 'network' | 'provider' | 'token' | 'unknown';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthResult =
  | { success: true; session: Session }
  | { success: false; error: AuthError };

export type AuthStatusCallback = (message: string) => void;

export async function signInWithGoogle(onStatus?: AuthStatusCallback): Promise<AuthResult> {
  try {
    onStatus?.('Initializing secure session\u2026');
    const verifier = Crypto.randomUUID();
    const base64Challenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    const challenge = base64Challenge.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const storage = (supabase.auth as any).storage;
    if (storage) {
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
        error: { code: 'provider', message: oauthError?.message || 'Failed to connect to Google.' },
      };
    }

    onStatus?.('Opening browser\u2026');
    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);

    if (browserResult.type !== 'success') {
      return { success: false, error: { code: 'cancelled', message: 'Sign-in was cancelled.' } };
    }

    return handleOAuthCallbackUrl(browserResult.url, onStatus);
  } catch (err) {
    return { success: false, error: { code: 'unknown', message: 'An unexpected error occurred.' } };
  }
}

export async function handleOAuthCallbackUrl(url: string, onStatus?: AuthStatusCallback): Promise<AuthResult> {
  onStatus?.('Verifying credentials\u2026');

  try {
    const urlObj = new URL(url.replace('#', '?'));
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');
    const errorDescription = urlObj.searchParams.get('error_description');

    if (error) {
      return { success: false, error: { code: 'provider', message: errorDescription || error } };
    }

    onStatus?.('Finalizing sign-in\u2026');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);

    if (exchangeError) {
      // Automatic fallback for non-PKCE links (like email)
      if (exchangeError.status === 400 && exchangeError.message.includes('code verifier')) {
        const { data: fallbackData, error: fallbackError } = await supabase.auth.exchangeCodeForSession(url);
        if (fallbackError) return { success: false, error: { code: 'token', message: fallbackError.message } };
        if (fallbackData?.session) return { success: true, session: fallbackData.session };
      }
      return { success: false, error: { code: 'token', message: exchangeError.message } };
    }

    if (data?.session) return { success: true, session: data.session };
    return { success: false, error: { code: 'unknown', message: 'Sign-in failed.' } };
  } catch (err) {
    return { success: false, error: { code: 'unknown', message: 'Failed to process authentication link.' } };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: OAUTH_REDIRECT_URI } });
  if (error) return { success: false, error: { code: 'unknown', message: error.message } };
  return data.session ? { success: true, session: data.session } : { success: false, error: { code: 'token', message: 'Check your email for a confirmation link.' } };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { success: false, error: { code: 'unknown', message: error.message } } : { success: true, session: data!.session! };
}

export const signOut = () => supabase.auth.signOut();
export const getSession = async () => (await supabase.auth.getSession()).data.session;
