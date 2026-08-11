/**
 * Referral qualification signals.
 *
 * ── Trust levels ─────────────────────────────────────────────────────────────
 * Two paths can qualify a referral redemption.  They have different trust levels
 * and the distinction must be kept explicit.
 *
 *   Path 1 — SERVER-VERIFIED (capture-analysis first-log):
 *     1. POST /v1/capture/analyze  — server records the AI session
 *     2. POST /v1/diary/first-log  — server atomically claims the session
 *        (reviewed_at stamped inside a transaction after nutrition checks).
 *   The server independently observed and analysed the user's food input before
 *   writing any qualifying record.  A session that was analysed but never logged
 *   via first-log does NOT qualify.
 *
 *   Path 2 — SESSION-VERIFIED (outbox sync with image/barcode provenance):
 *     POST /v1/sync with at least one diaryEntry upsert mutation that carries a
 *     server-verified non-text capture session anchor (capture_session_id IS NOT
 *     NULL, mode != 'text').  The sync handler verifies the session belongs to
 *     the authenticated user and is not text-mode before writing it; the query
 *     below re-verifies via JOIN so forged rows without a real session anchor
 *     never qualify.
 *
 *   When SYNC_QUALIFICATION_REQUIRE_SESSION=false (policy rollout gate) the
 *   old behaviour is restored: any sync entry with a non-NULL client_id counts,
 *   regardless of capture session mode.  This flag should be removed once the
 *   new column is backfilled and the gate has been validated in production.
 *
 *   A bare POST /v1/diary (no client_id) never qualifies under either path.
 *
 * ── Anti-farming mitigations ─────────────────────────────────────────────────
 *  a) Cap on referrer rewards — at most 4 confirmed referred rewards per
 *     referrer per calendar month.  A farming ring abusing Path 2 can earn its
 *     controller at most 4 × REWARD_DAYS days of Pro per month.
 *
 *  b) One redemption per referred account (unique index on referred_user_id).
 *     Each fresh Supabase account must be registered with a valid email.
 *
 *  c) Text-mode capture exclusion (LIVE on both paths): ai_capture_sessions
 *     with mode = 'text' are excluded from Path 1 qualification.  The
 *     first-log route also rejects text-mode sessions at write time so
 *     reviewed_at is never stamped on them.  Path 2 now also requires a
 *     server-verified non-text session anchor: sync entries without a
 *     capture_session_id or with a text-mode session do not qualify.
 */

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db, aiCaptureSessionsTable, diaryEntriesTable, usersTable } from "@workspace/db";

/**
 * Capture session modes that prove the user submitted a real food image or
 * barcode scan — the only inputs the server independently observes before
 * analysis.
 *
 * - `food`            — AI analysis of a camera food photo.
 * - `barcode`         — UPC scan; server looks up verified nutritional data.
 * - `nutrition_label` — AI extraction from a product nutrition-facts label image.
 *
 * Text, voice, and receipt modes are explicitly excluded: they cannot carry
 * the same image/barcode provenance guarantee that makes Path 1 and Path 2
 * meaningful anti-farming signals.
 */
export const QUALIFYING_CAPTURE_MODES = ["food", "barcode", "nutrition_label"] as const;
export type QualifyingCaptureMode = typeof QUALIFYING_CAPTURE_MODES[number];

/**
 * When true (the default), Path 2 only qualifies sync entries that carry a
 * server-verified non-text capture session anchor.  Set
 * SYNC_QUALIFICATION_REQUIRE_SESSION=false in the environment to restore the
 * legacy behaviour (any client_id-bearing sync entry qualifies) while rolling
 * out the new column to existing data.
 */
const REQUIRE_SESSION_FOR_SYNC =
  process.env.SYNC_QUALIFICATION_REQUIRE_SESSION !== "false";

/**
 * Returns true when the authenticated user has at least one qualifying
 * food-logging signal — either a server-verified capture session (Path 1) or
 * an authenticated outbox sync entry anchored to a non-text capture session
 * (Path 2, image/barcode provenance required).
 *
 * See the module comment above for the trust-level distinction between the two
 * paths and the farming-risk context.
 */
export async function hasSyncedDiaryEntry(supabaseUserId: string): Promise<boolean> {
  // Path 1: server-verified capture-analysis first-log.
  // reviewed_at is only ever stamped by the first-log route's atomic session
  // claim after server-side nutrition consistency checks pass.
  const captureSessions = await db
    .select({ id: aiCaptureSessionsTable.id })
    .from(aiCaptureSessionsTable)
    .innerJoin(usersTable, eq(aiCaptureSessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(usersTable.externalId, supabaseUserId),
        isNotNull(aiCaptureSessionsTable.reviewedAt),
        // Only explicitly approved image/barcode modes qualify.  Using an
        // allowlist (rather than excluding 'text') ensures that voice,
        // receipt, or any future non-image mode is never silently promoted
        // to a qualifying signal.  The first-log route already rejects
        // non-qualifying modes at write time; this filter is defence-in-depth.
        inArray(aiCaptureSessionsTable.mode, [...QUALIFYING_CAPTURE_MODES]),
      ),
    )
    .limit(1);
  if (captureSessions.length > 0) return true;

  // Path 2: outbox sync with server-verified image/barcode provenance.
  //
  // When REQUIRE_SESSION_FOR_SYNC is true (the default), the diary row must
  // carry a capture_session_id that points to a non-text capture session
  // belonging to the authenticated user.  The sync handler already verifies
  // this at write time; the JOIN here is defence-in-depth.
  //
  // When REQUIRE_SESSION_FOR_SYNC is false (legacy/rollout mode), any sync
  // entry with a non-NULL client_id qualifies — same as the pre-hardening
  // behaviour.
  if (REQUIRE_SESSION_FOR_SYNC) {
    // Require a non-text session anchor on the diary row.
    const syncedEntries = await db
      .select({ id: diaryEntriesTable.id })
      .from(diaryEntriesTable)
      .innerJoin(usersTable, eq(diaryEntriesTable.userId, usersTable.id))
      .innerJoin(
        aiCaptureSessionsTable,
        eq(diaryEntriesTable.captureSessionId, aiCaptureSessionsTable.id),
      )
      .where(
        and(
          eq(usersTable.externalId, supabaseUserId),
          isNotNull(diaryEntriesTable.clientId),
          isNotNull(diaryEntriesTable.captureSessionId),
          inArray(aiCaptureSessionsTable.mode, [...QUALIFYING_CAPTURE_MODES]),
        ),
      )
      .limit(1);
    return syncedEntries.length > 0;
  }

  // Legacy path (REQUIRE_SESSION_FOR_SYNC=false): any client_id-bearing sync
  // entry qualifies.  This branch exists only as a rollout gate and should be
  // removed once the new column is backfilled and verified in production.
  // WARNING: this path does not verify capture provenance.  An authenticated
  // client that sends a single valid /v1/sync upsert qualifies.
  const syncedEntries = await db
    .select({ id: diaryEntriesTable.id })
    .from(diaryEntriesTable)
    .innerJoin(usersTable, eq(diaryEntriesTable.userId, usersTable.id))
    .where(
      and(
        eq(usersTable.externalId, supabaseUserId),
        isNotNull(diaryEntriesTable.clientId),
      ),
    )
    .limit(1);
  return syncedEntries.length > 0;
}
