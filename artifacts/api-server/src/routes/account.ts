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
import { db, usersTable } from "@workspace/db";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";

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
    `);

    // All user-owned records reference calora_users with ON DELETE CASCADE.
    await tx.delete(usersTable).where(eq(usersTable.externalId, externalUserId));
  });
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

  // ── 3. Remove application data before deleting the login ────────────────
  // The database transaction means a cleanup failure leaves both the app data
  // and Auth identity intact. Auth is deliberately deleted last because it is
  // an external system and cannot participate in the database transaction.
  try {
    await deleteApplicationData(userId);
  } catch {
    req.log.error("Account deletion application-data cleanup failed");
    res.status(502).json({ message: "Account deletion failed on the server. Please try again or contact support." });
    return;
  }

  // ── 4. Delete the auth record ───────────────────────────────────────────
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    req.log.error("Account deletion auth-provider operation failed");
    res.status(502).json({ message: "Account deletion failed on the server. Please try again or contact support." });
    return;
  }

  res.status(200).json({ message: "Account permanently deleted." });
});

export default router;
