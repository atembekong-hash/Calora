/**
 * Account management routes.
 *
 * DELETE /api/v1/account
 *   Permanently removes the caller's Calora data and Supabase Auth user record.
 *   Requires a valid Bearer token in the Authorization header.
 *   The token is verified server-side; the user ID is never trusted
 *   from the request body.
 */

import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { sql, eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";
import {
  claimAccountDeletion,
  checkpointAccountDeletion,
  completeAccountDeletion,
  listRecoverableAccountDeletions,
  markAccountDeletionFailed,
} from "../lib/account-deletion-state.js";
import { deleteRevenueCatSubscriber } from "../lib/revenuecat.js";

const router: IRouter = Router();

/**
 * Remove data that is linked directly to a Supabase Auth id before deleting
 * the corresponding Calora user row. The latter cascades to all user-owned
 * wellness data. Referral relationships are retained only with an
 * irreversibly random replacement identifier so another user's reward
 * history is not removed along with this account.
 */
async function deleteApplicationData(externalUserId: string): Promise<void> {
  const deletedReferrerId = `deleted:${randomUUID()}`;
  const deletedReferredId = `deleted:${randomUUID()}`;

  await db.transaction(async (tx) => {
    // The database fence blocks ordinary writes after a tombstone. This scoped
    // setting authorizes only this deletion transaction to anonymize a referral
    // relationship when its other participant is concurrently deleting.
    await tx.execute(sql`SELECT set_config('calora.deletion_worker', 'on', true)`);
    await tx.execute(sql`
      DELETE FROM calora_referral_qualifications
      WHERE external_user_id = ${externalUserId}
    `);
    await tx.execute(sql`
      DELETE FROM calora_referral_codes
      WHERE user_id = ${externalUserId}
    `);
    await tx.execute(sql`
      UPDATE calora_referral_redemptions
      SET referrer_user_id = ${deletedReferrerId}, code = 'deleted'
      WHERE referrer_user_id = ${externalUserId}
    `);
    await tx.execute(sql`
      UPDATE calora_referral_redemptions
      SET referred_user_id = ${deletedReferredId}
      WHERE referred_user_id = ${externalUserId}
    `);
    await tx.execute(sql`
      DELETE FROM calora_capture_rate_limits
      WHERE key = ${`user:${externalUserId}`}
         OR key LIKE ${`%:user:${externalUserId}`}
    `);

    // All user-owned records reference calora_users with ON DELETE CASCADE.
    await tx.delete(usersTable).where(eq(usersTable.externalId, externalUserId));
  });
}

export async function runAccountDeletion(externalUserId: string): Promise<"completed" | "in_progress"> {
  // A session-scoped advisory lock remains held throughout external provider
  // calls. Unlike a time lease alone, a slow worker cannot lose ownership and
  // continue concurrently after another worker takes over.
  const client = await pool.connect();
  const lock = await client.query<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",
    [`calora-account-deletion:${externalUserId}`],
  );
  if (!lock.rows[0]?.locked) {
    client.release();
    return "in_progress";
  }

  let operationId: string | null = null;
  try {
    const claim = await claimAccountDeletion(externalUserId);
    if (claim.kind === "completed") return "completed";
    if (claim.kind === "in_progress") return "in_progress";
    operationId = claim.operationId;
    if (claim.stage === "application") {
      await deleteApplicationData(externalUserId);
      if (!await checkpointAccountDeletion(externalUserId, claim.operationId, "revenuecat")) {
        throw new Error("Account deletion ownership was lost before RevenueCat erasure.");
      }
    }
    if (claim.stage === "application" || claim.stage === "revenuecat") {
      await deleteRevenueCatSubscriber(externalUserId);
      if (!await checkpointAccountDeletion(externalUserId, claim.operationId, "auth")) {
        throw new Error("Account deletion ownership was lost before Auth erasure.");
      }
    }
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Supabase Admin is unavailable");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(externalUserId);
    // A prior worker may have completed Auth removal just before crashing.
    // Supabase's not-found response therefore proves this idempotent stage.
    if (error && (error as { status?: number }).status !== 404) throw error;
    if (!await completeAccountDeletion(externalUserId, claim.operationId)) {
      throw new Error("Account deletion ownership was lost before finalization.");
    }
    return "completed";
  } catch (error) {
    // The state helper only mutates a matching operation, so a stale worker
    // cannot overwrite a successor's checkpoint or terminal tombstone.
    if (operationId) {
      await markAccountDeletionFailed(externalUserId, operationId).catch(() => undefined);
    }
    throw error;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [`calora-account-deletion:${externalUserId}`]).catch(() => undefined);
    client.release();
  }
}

/**
 * Server-owned recovery for interrupted deletions. The temporary external id
 * exists only until the terminal state is recorded, so this can safely finish
 * provider erasure after the user's access token has expired.
 */
export async function recoverPendingAccountDeletions(): Promise<void> {
  const pending = await listRecoverableAccountDeletions();
  for (const externalUserId of pending) {
    try {
      await runAccountDeletion(externalUserId);
    } catch {
      // The operation retains its retry checkpoint and will be retried after
      // the lease expires. Individual failures must not block other accounts.
    }
  }
}

router.delete("/v1/account", async (req, res): Promise<void> => {
  // ── 0. Guard: credentials must be configured ────────────────────────────
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(503).json({ message: "Account deletion is not available right now. Please contact support." });
    return;
  }

  // ── 1. Extract Bearer token ─────────────────────────────────────────────
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Missing or invalid Authorization header." });
    return;
  }

  // ── 2. Verify token and resolve user ID ────────────────────────────────
  // getUser() validates the JWT signature against the Supabase project key.
  // We never trust a user-supplied ID.
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    res.status(401).json({ message: "Token is invalid or has expired. Please sign in again." });
    return;
  }

  const userId = userData.user.id;

  // ── 3. Fence writes before removing application data ────────────────────
  // The state is keyed by a one-way identity fingerprint, not the deleted
  // user's Auth id, so it can prevent recreation without retaining PII.
  try {
    const outcome = await runAccountDeletion(userId);
    if (outcome === "in_progress") {
      res.status(202).json({ message: "Account deletion is already in progress. It will continue securely." });
      return;
    }
  } catch (error) {
    req.log.error({ err: error }, "Account deletion operation failed");
    res.status(502).json({ message: "Account deletion failed on the server. Please try again or contact support." });
    return;
  }
  res.status(200).json({ message: "Account permanently deleted." });
});

export default router;
