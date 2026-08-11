/**
 * Server-observable referral qualification.
 *
 * The diary is local-first, so the server must not trust a client's bare
 * claim that a first food log happened. A redemption only becomes eligible
 * for rewards once the user has completed the verified first-log flow:
 * an authenticated capture analysis whose session was atomically claimed
 * (reviewed_at stamped) by POST /v1/diary/first-log alongside the synced
 * entry. A bare diary row (e.g. POST /v1/diary) and a capture-analysis
 * preview that was never claimed do NOT qualify — otherwise a scripted
 * diary payload could farm referral rewards.
 */

import { and, eq, isNotNull } from "drizzle-orm";
import { db, aiCaptureSessionsTable, usersTable } from "@workspace/db";

/**
 * Whether the user has completed at least one verified first-log sync.
 * `reviewed_at` is only ever stamped by the first-log route's atomic
 * session claim, after the server has checked session ownership, freshness,
 * and nutrition consistency — so its presence is the qualification proof.
 * Referral tables key by the Supabase Auth user id while capture sessions
 * key by calora_users, so the lookup goes through calora_users.external_id.
 */
export async function hasSyncedDiaryEntry(supabaseUserId: string): Promise<boolean> {
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
