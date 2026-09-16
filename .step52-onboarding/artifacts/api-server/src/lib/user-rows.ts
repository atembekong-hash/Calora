/**
 * Shared helper: resolve (creating if needed) the calora_users row for a
 * Supabase Auth user. Most server tables key by calora_users.id (uuid) while
 * authentication yields the Supabase user id (text) — this is the bridge.
 */

import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { assertAccountWritable } from "./account-deletion-state.js";

export async function ensureUserRow(externalId: string, email: string | null): Promise<string> {
  await assertAccountWritable(externalId);
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.externalId, externalId))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  const inserted = await db
    .insert(usersTable)
    .values({ externalId, email })
    .onConflictDoNothing({ target: usersTable.externalId })
    .returning({ id: usersTable.id });
  if (inserted.length > 0) return inserted[0].id;

  // Concurrent insert won the unique index — reuse it.
  const again = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.externalId, externalId))
    .limit(1);
  if (again.length === 0) throw new Error("Failed to resolve user row");
  return again[0].id;
}
