/**
 * Server-observable referral qualification.
 *
 * The diary is local-first, so the server must not trust a client's bare
 * claim that a first food log happened. A redemption only becomes eligible
 * for rewards once the server holds a durable diary entry for the user
 * (persisted via POST /v1/diary/first-log or, later, full diary sync).
 * A capture-analysis preview is NOT a log and never qualifies.
 */

import { eq } from "drizzle-orm";
import { db, diaryEntriesTable, usersTable } from "@workspace/db";

/**
 * Whether the user has at least one server-persisted diary entry. Referral
 * tables key by the Supabase Auth user id while diary entries key by
 * calora_users, so the lookup goes through calora_users.external_id.
 */
export async function hasSyncedDiaryEntry(supabaseUserId: string): Promise<boolean> {
  const rows = await db
    .select({ id: diaryEntriesTable.id })
    .from(diaryEntriesTable)
    .innerJoin(usersTable, eq(diaryEntriesTable.userId, usersTable.id))
    .where(eq(usersTable.externalId, supabaseUserId))
    .limit(1);
  return rows.length > 0;
}
