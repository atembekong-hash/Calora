/**
 * CaloraApp authentication utilities with deep diagnostics.
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
  raw?: any;
}

export type AuthResult =
  | { success: true; session: Session }
  | { success: false; error: AuthError };

export type AuthStatusCallback = (message: string) => void;

export async function signInWithGoogle(onStatus?: AuthStatusCallback): Promise<AuthResult> {
  try {
    onStatus?.('DIAGNOSTIC: Generating PKCE verifier...');
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
      onStatus?.('DIAGNOSTIC: Verifier stored successfully.');
    }

    onStatus?.('DIAGNOSTIC: Requesting Google URL...');
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
        error: { code: 'provider', message: `Supabase OAuth Error: ${oauthError?.message || 'No URL returned'}`, raw: oauthError },
      };
    }

    onStatus?.('DIAGNOSTIC: Opening browser...');
    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);

    if (browserResult.type !== 'success') {
      return { success: false, error: { code: 'cancelled', message: `Browser closed: ${browserResult.type}` } };
    }

    return handleOAuthCallbackUrl(browserResult.url, onStatus);
  } catch (err) {
    return { success: false, error: { code: 'unknown', message: `Critical Error: ${err instanceof Error ? err.message : String(err)}` } };
  }
}

export async function handleOAuthCallbackUrl(url: string, onStatus?: AuthStatusCallback): Promise<AuthResult> {
  onStatus?.(`DIAGNOSTIC: Received URL: ${url.substring(0, 30)}...`);

  try {
    const urlObj = new URL(url.replace('#', '?'));
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');
    const errorDescription = urlObj.searchParams.get('error_description');

    if (error) {
      return { success: false, error: { code: 'provider', message: `Provider Error: ${errorDescription || error}` } };
    }

    if (!code && !urlObj.searchParams.get('access_token')) {
      return { success: false, error: { code: 'token', message: 'No code or token found in redirect URL.' } };
    }

    onStatus?.('DIAGNOSTIC: Exchanging credentials with Supabase...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);

    if (exchangeError) {
      // THIS IS THE KEY DIAGNOSTIC: Show the exact server error
      return { 
        success: false, 
        error: { 
          code: 'token', 
          message: `SERVER ERROR: [${exchangeError.status}] ${exchangeError.message}`,
          raw: exchangeError
        } 
      };
    }

    if (data?.session) return { success: true, session: data.session };
    return { success: false, error: { code: 'unknown', message: 'Exchange completed but no session returned.' } };
  } catch (err) {
    return { success: false, error: { code: 'unknown', message: `Parse Error: ${err instanceof Error ? err.message : String(err)}` } };
  }
}

// Keep other functions minimal for now
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: OAUTH_REDIRECT_URI } });
  if (error) return { success: false, error: { code: 'unknown', message: error.message } };
  return data.session ? { success: true, session: data.session } : { success: false, error: { code: 'token', message: 'Check email.' } };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { success: false, error: { code: 'unknown', message: error.message } } : { success: true, session: data!.session! };
}

export const signOut = () => supabase.auth.signOut();
export const getSession = async () => (await supabase.auth.getSession()).data.session;
