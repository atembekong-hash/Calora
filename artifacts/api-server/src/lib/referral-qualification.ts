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
 *   Path 2 — AUTHENTICATED-ONLY (outbox sync, POLICY DECISION):
 *     POST /v1/sync with at least one diaryEntry upsert mutation causes the
 *     server to write a diary row with a non-NULL client_id.  The server does
 *     not independently verify the nutritional content; it trusts the
 *     authenticated client's payload.  This is intentionally weaker than Path 1
 *     and is a product policy choice, not a server-side verification.
 *
 *   Consequence: an authenticated user who scripts one valid /v1/sync request
 *   CAN qualify a redemption.  The controls below bound—but do not eliminate—
 *   the farming risk.  Any tightening (e.g. requiring image/barcode provenance
 *   or rate-limiting the sync endpoint itself) must be implemented before the
 *   cap or these mitigations become the binding constraint.
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
 *  c) Future hardening: exclude Manual/text provenance sync entries; require
 *     image or barcode provenance verified by the capture pipeline; or introduce
 *     a server-issued sync token that proves a capture session was completed
 *     before the diary entry was synced.
 */

import { and, eq, isNotNull } from "drizzle-orm";
import { db, aiCaptureSessionsTable, diaryEntriesTable, usersTable } from "@workspace/db";

/**
 * Returns true when the authenticated user has at least one qualifying
 * food-logging signal — either a server-verified capture session (Path 1) or
 * an authenticated outbox sync entry (Path 2, policy-level trust only).
 *
 * See the module comment above for the trust-level distinction between the two
 * paths and the known farming-risk implications of Path 2.
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
      ),
    )
    .limit(1);
  if (captureSessions.length > 0) return true;

  // Path 2: authenticated outbox sync (policy-level qualification only).
  // client_id is always present in POST /v1/sync diary upserts and is written
  // to the row.  A bare POST /v1/diary leaves client_id NULL and does NOT
  // qualify — only the authenticated sync path does.
  // WARNING: the server does not verify the nutritional content of sync
  // payloads.  An authenticated client that sends a single valid /v1/sync
  // upsert qualifies.  See module comment for farming-risk context.
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
