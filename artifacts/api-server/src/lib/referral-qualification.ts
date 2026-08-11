/**
 * Server-observable referral qualification.
 *
 * A referral redemption is qualified when the user has completed the
 * verified first-log flow: an authenticated capture analysis whose session
 * was atomically claimed (reviewed_at stamped) by POST /v1/diary/first-log.
 * This path requires the user to have scanned real food, making it the
 * highest-confidence anti-farming signal available.
 *
 * Diary entries written via POST /v1/sync are synced for backup and
 * cross-device continuity but are NOT currently counted as a qualification
 * signal — that upgrade path is gated behind the farming-resistance measures
 * in the dedicated anti-farming task.
 *
 * A bare POST /v1/diary (no verified capture session) does NOT qualify —
 * otherwise a scripted payload could farm referral rewards.
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
