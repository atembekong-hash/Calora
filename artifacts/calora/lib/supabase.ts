/**
 * Calora — Supabase client singleton.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  createSupabaseSessionStorage,
  createWebSessionStorage,
} from './supabaseSessionStorage';

// ---------------------------------------------------------------------------
// Configuration — sourced from EAS environment variables
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function requireSupabaseConfig(): { url: string; anonKey: string } {
  const missing = [
    !SUPABASE_URL && 'EXPO_PUBLIC_SUPABASE_URL',
    !SUPABASE_ANON_KEY && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `[Calora] Missing required Expo public configuration: ${missing.join(', ')}. ` +
        'Set these variables in your EAS project secrets or environment, then rebuild.'
    );
  }

  return { url: SUPABASE_URL!, anonKey: SUPABASE_ANON_KEY! };
}

const supabaseConfig = requireSupabaseConfig();

// ---------------------------------------------------------------------------
// Secure storage adapter
// ---------------------------------------------------------------------------

function getBrowserPkceStore() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const secureSessionStorage =
  Platform.OS !== 'web'
    ? createSupabaseSessionStorage(SecureStore)
    // Do not allow Supabase to fall back to plaintext localStorage for auth
    // sessions. Only random PKCE verifier keys cross a browser redirect; access
    // and refresh tokens remain process-local and non-durable.
    : createWebSessionStorage(getBrowserPkceStore());

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const SUPABASE_STORAGE_KEY = 'calora-auth-storage';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    storage: secureSessionStorage,
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
