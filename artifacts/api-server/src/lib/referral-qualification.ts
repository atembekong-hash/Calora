/**
 * Referral qualification is deliberately method-agnostic: a referred account
 * qualifies after its first legitimate meal has been successfully persisted by
 * an authenticated Calora diary save. Capture provenance is useful nutrition
 * metadata, but it is not a separate referral rule.
 *
 * The check remains server-owned. It joins the diary record to the internal
 * user mapped from the verified Supabase identity, so a client cannot qualify
 * another account or qualify merely by posting an activation request.
 */
import { eq } from "drizzle-orm";
import { db, diaryEntriesTable, usersTable } from "@workspace/db";

/** Returns true when the authenticated user owns at least one saved meal. */
export async function hasSavedDiaryEntry(supabaseUserId: string): Promise<boolean> {
  const savedMeals = await db
    .select({ id: diaryEntriesTable.id })
    .from(diaryEntriesTable)
    .innerJoin(usersTable, eq(diaryEntriesTable.userId, usersTable.id))
    .where(eq(usersTable.externalId, supabaseUserId))
    .limit(1);
  return savedMeals.length > 0;
}
