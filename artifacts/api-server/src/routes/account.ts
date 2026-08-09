/**
 * Account management routes.
 *
 * DELETE /api/v1/account
 *   Permanently removes the caller's Supabase Auth user record.
 *   Requires a valid Bearer token in the Authorization header.
 *   The token is verified server-side; the user ID is never trusted
 *   from the request body.
 */

import { Router, type IRouter } from "express";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";

const router: IRouter = Router();

router.delete("/v1/account", async (req, res) => {
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

  // ── 3. Delete the auth record ───────────────────────────────────────────
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("[account] Failed to delete user %s: %s", userId, deleteError.message);
    res.status(502).json({ message: "Account deletion failed on the server. Please try again or contact support." });
    return;
  }

  res.status(200).json({ message: "Account permanently deleted." });
});

export default router;
