/**
 * Bearer-token verification against Supabase Auth.
 *
 * Uses the public anon key — token verification only needs to validate the
 * JWT against the Supabase project, not perform admin actions. The user id
 * is always resolved server-side from the token, never trusted from the body.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { AccountDeletionInProgressError, assertAccountWritable } from "./account-deletion-state.js";

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

export type CoachFactAccountEligibility = {
  eligible: boolean;
  reason:
    | "eligible"
    | "missing_or_malformed_metadata"
    | "deleted"
    | "banned"
    | "administratively_prohibited"
    | "indeterminate_ban_status";
};

export type VerifiedUser = {
  id: string;
  email: string | null;
  /**
   * Always populated by verifyBearerToken at runtime. Optional only to retain
   * source compatibility for non-Fact-Context route tests that construct a
   * minimal authenticated-user fixture; the Fact Context route denies absence.
   */
  coachFactAccount?: CoachFactAccountEligibility;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Determines whether a Supabase account is safe to use the consent-gated Fact
 * Context path. Supabase app_metadata is server/admin-owned, unlike
 * user_metadata, and is used only to enforce administrative prohibitions.
 *
 * The supplied Supabase user object is returned by auth.getUser(token), not
 * decoded from the client-provided JWT. Missing or malformed metadata/status
 * is deliberately not interpreted as permission.
 */
export function getCoachFactAccountEligibility(user: {
  app_metadata?: unknown;
  deleted_at?: unknown;
  banned_until?: unknown;
}): CoachFactAccountEligibility {
  if (user.deleted_at !== undefined && user.deleted_at !== null) {
    return { eligible: false, reason: "deleted" };
  }

  if (user.banned_until !== undefined && user.banned_until !== null) {
    if (typeof user.banned_until !== "string") {
      return { eligible: false, reason: "indeterminate_ban_status" };
    }
    const bannedUntil = new Date(user.banned_until);
    if (Number.isNaN(bannedUntil.getTime())) {
      return { eligible: false, reason: "indeterminate_ban_status" };
    }
    if (bannedUntil.getTime() > Date.now()) {
      return { eligible: false, reason: "banned" };
    }
  }

  if (!isPlainRecord(user.app_metadata)) {
    return { eligible: false, reason: "missing_or_malformed_metadata" };
  }
  for (const key of ["suspended", "disabled"] as const) {
    const value = user.app_metadata[key];
    if (value !== undefined && typeof value !== "boolean") {
      return { eligible: false, reason: "missing_or_malformed_metadata" };
    }
    if (value === true) {
      return { eligible: false, reason: "administratively_prohibited" };
    }
  }
  if (user.app_metadata.status !== undefined) {
    if (typeof user.app_metadata.status !== "string") {
      return { eligible: false, reason: "missing_or_malformed_metadata" };
    }
    if (user.app_metadata.status !== "active") {
      return { eligible: false, reason: "administratively_prohibited" };
    }
  }
  return { eligible: true, reason: "eligible" };
}

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

  try {
    await assertAccountWritable(data.user.id);
  } catch (error) {
    // Treat a deletion tombstone as an unusable credential for normal API
    // routes. The dedicated account endpoint verifies with the Admin client so
    // it can still retry a partially completed deletion.
    if (error instanceof AccountDeletionInProgressError) return null;
    throw error;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    coachFactAccount: getCoachFactAccountEligibility(data.user),
  };
}
