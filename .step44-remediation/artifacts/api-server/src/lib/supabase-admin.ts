/**
 * Supabase admin client — server-side only.
 *
 * ─── Security contract ────────────────────────────────────────────────────
 *  • This module must NEVER be imported by mobile or browser code.
 *  • SUPABASE_SERVICE_ROLE_KEY grants unrestricted access to all auth data.
 *    It is only safe here because the API server is a server-side process.
 *
 * ─── Lazy initialisation ─────────────────────────────────────────────────
 *  The admin client is created on first use, not at module load time.
 *  This lets the server start (and serve all other endpoints) even when
 *  SUPABASE_SERVICE_ROLE_KEY has not yet been configured.  The account-
 *  deletion route returns a 503 in that case rather than crashing the process.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

/**
 * Returns the lazily-initialised Supabase admin client, or null when the
 * required environment variables are not present.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_adminClient) return _adminClient;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    return null;
  }

  _adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
