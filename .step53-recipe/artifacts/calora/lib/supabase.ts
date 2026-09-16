/**
 * CaloraApp — Supabase client singleton.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
      `[CaloraApp] Missing required Expo public configuration: ${missing.join(', ')}. ` +
        'Set these variables in your EAS project secrets or environment, then rebuild.'
    );
  }

  return { url: SUPABASE_URL!, anonKey: SUPABASE_ANON_KEY! };
}

const supabaseConfig = requireSupabaseConfig();

// ---------------------------------------------------------------------------
// Secure storage adapter
// ---------------------------------------------------------------------------

const nativeSecureStorage =
  Platform.OS !== 'web'
    ? {
        getItem: (key: string): Promise<string | null> =>
          SecureStore.getItemAsync(key),
        setItem: (key: string, value: string): Promise<void> =>
          SecureStore.setItemAsync(key, value),
        removeItem: (key: string): Promise<void> =>
          SecureStore.deleteItemAsync(key),
      }
    : undefined;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const SUPABASE_STORAGE_KEY = 'calora-auth-storage';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    storage: nativeSecureStorage,
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
