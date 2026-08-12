/**
 * CaloraApp — Supabase client singleton.
 *
 * This is the single application-wide Supabase instance.  Import `supabase`
 * from this module wherever SDK access is needed.
 *
 * ─── Security contract ────────────────────────────────────────────────────
 *  • Only EXPO_PUBLIC_* variables appear here — they are safe to bundle into
 *    the Expo application.
 *  • SUPABASE_SERVICE_ROLE_KEY must NEVER be imported, referenced, or used
 *    in any file reachable by the mobile client.  It belongs exclusively on
 *    the API server.
 *  • detectSessionInUrl is false because React Native has no window.location.
 *    Session tokens arrive explicitly through the OAuth callback screen.
 *  • On native platforms (iOS / Android), session tokens are stored in the
 *    platform keychain / keystore via expo-secure-store.
 *  • On Expo web preview, expo-secure-store is unavailable; Supabase falls
 *    back to in-memory storage — sessions do not persist across reloads on web.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Configuration — values sourced from environment, never hardcoded
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
        'Set these variables in the EAS environment selected by the build profile, then rebuild. ' +
        'Do not add Supabase credentials to source control.',
    );
  }

  // The missing-value guard above makes these values present at runtime.
  return { url: SUPABASE_URL!, anonKey: SUPABASE_ANON_KEY! };
}

const supabaseConfig = requireSupabaseConfig();

// ---------------------------------------------------------------------------
// Secure storage adapter
// ---------------------------------------------------------------------------

/**
 * Storage adapter backed by expo-secure-store (iOS Keychain / Android Keystore).
 *
 * Passing `undefined` on web tells Supabase to use its default in-memory store.
 * SecureStore is not available in a browser environment.
 */
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

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    storage: nativeSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    /**
     * Must be false for React Native.  There is no window.location to parse.
     * Session tokens are delivered explicitly through handleOAuthCallbackUrl()
     * called from the auth/callback screen or from signInWithGoogle().
     */
    detectSessionInUrl: false,
  },
});
