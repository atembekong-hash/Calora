/**
 * Bearer-token verification against Supabase Auth.
 *
 * Uses the public anon key — token verification only needs to validate the
 * JWT against the Supabase project, not perform admin actions. The user id
 * is always resolved server-side from the token, never trusted from the body.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";

let _client: SupabaseClient | null = null;

function getVerifier(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) return null;

  _client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

export type VerifiedUser = { id: string; email: string | null };

/**
 * Resolves the authenticated Supabase user from the request's Bearer token.
 * Returns null when the header is missing, malformed, or the token is invalid.
 * Throws only when Supabase credentials are not configured at all.
 */
export async function verifyBearerToken(req: Request): Promise<VerifiedUser | null> {
  const verifier = getVerifier();
  if (!verifier) {
    throw new Error("Supabase credentials are not configured");
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data?.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}
