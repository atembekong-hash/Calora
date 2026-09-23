/**
 * Shared helper: resolve (creating if needed) the calora_users row for a
 * Supabase Auth user. Most server tables key by calora_users.id (uuid) while
 * authentication yields the Supabase user id (text) — this is the bridge.
 */

import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { assertAccountWritable } from "./account-deletion-state.js";

/**
 * Resolves an existing internal user row without creating an account/email
 * linkage. Read-only authorization and consent-status paths must use this
 * helper so merely checking Coach sharing never persists personal data.
 */
export async function findUserRow(externalId: string): Promise<string | null> {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.externalId, externalId))
    .limit(1);
  return existing[0]?.id ?? null;
}

export async function ensureUserRow(externalId: string, email: string | null): Promise<string> {
  await assertAccountWritable(externalId);
  const existing = await findUserRow(externalId);
  if (existing) return existing;

  const inserted = await db
    .insert(usersTable)
    .values({ externalId, email })
    .onConflictDoNothing({ target: usersTable.externalId })
    .returning({ id: usersTable.id });
  if (inserted.length > 0) return inserted[0].id;

  // Concurrent insert won the unique index — reuse it.
  const again = await findUserRow(externalId);
  if (!again) throw new Error("Failed to resolve user row");
  return again;
}
