/**
 * CaloraApp — Supabase client singleton.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Configuration — Hardcoded for production stability
// ---------------------------------------------------------------------------

// Based on forensic verification of the active Supabase project
const SUPABASE_URL = 'https://pzdulhkpwbrbrgskwwwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-3cvYunhb4ov7hJej3DAzg_WadMe74u';

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: nativeSecureStorage,
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
