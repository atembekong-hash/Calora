/**
 * Server-observable referral qualification.
 *
 * ── Qualification signal ────────────────────────────────────────────────────
 * A referral redemption is qualified when the referee has completed the
 * verified first-log flow:
 *   1. POST /v1/capture/analyze  — server records the session (ai_capture_sessions)
 *   2. POST /v1/diary/first-log  — atomically claims that session (reviewed_at stamped)
 *
 * The reviewed_at stamp is only written once, inside a transaction, after
 * server-side nutrition consistency checks pass.  A session that was analysed
 * but never logged does NOT qualify, preventing pre-generated session farming.
 *
 * A bare POST /v1/diary (no verified capture session) does NOT qualify.
 * Diary entries written via POST /v1/sync are synced for continuity but are
 * NOT a qualification signal (see hasSyncedDiaryEntry below for a future path).
 *
 * ── Anti-farming measures ────────────────────────────────────────────────────
 * Text-mode capture (a one-line food description) is the cheapest signal to
 * script, so the following controls raise the cost of abuse:
 *
 *  a) Rate limiting — POST /v1/capture/analyze enforces a per-user/IP sliding
 *     window of 30 requests per hour.  Legitimate users logging 3–4 meals with
 *     multiple items will never approach this limit; a farming script hitting
 *     the endpoint repeatedly receives HTTP 429 with a Retry-After header.
 *     The limit is applied before any AI inference, protecting AI spend too.
 *
 *  b) Cap on referrer rewards — the referral table allows at most 4 confirmed
 *     rewards per referrer per month, bounding total damage even if one user
 *     farms with multiple referee accounts.
 *
 *  c) Future: exclude text-mode sessions from qualification once diary sync
 *     (POST /v1/sync) becomes the primary long-term signal.  Image/barcode
 *     modes are materially harder to script at scale.
 *
 * ── Future qualification via sync ────────────────────────────────────────────
 * hasSyncedDiaryEntry() below is a planned alternate qualification path that
 * would count server-verified sync entries.  It is not wired to the reward
 * grant yet and must not be enabled until the text-mode farming risk is
 * addressed (e.g. via the text exclusion mentioned above).
 */

import { and, eq, isNotNull } from "drizzle-orm";
import { db, aiCaptureSessionsTable, usersTable } from "@workspace/db";

/**
 * Returns true when the JWT user has at least one server-verifiable proof of
 * genuine food logging via the capture-analysis first-log flow.
 *
 * The lookup goes through calora_users.external_id so the referral table's
 * Supabase user-id key maps to the internal user row.
 */
export async function hasSyncedDiaryEntry(supabaseUserId: string): Promise<boolean> {
  // reviewed_at is only ever stamped by the first-log route's atomic
  // session claim after server-side nutrition consistency checks.
  // A session that was never claimed (analyzed but not logged) does not
  // qualify, preventing pre-generated sessions from farming rewards.
  const rows = await db
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
  return rows.length > 0;
}
