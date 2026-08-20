import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type AccountDeletionState = "active" | "deleting" | "deleted";

function identityFingerprint(externalUserId: string): string {
  return createHash("sha256").update(externalUserId).digest("hex");
}

/**
 * Acquires a shared row lock while an authenticated route resolves its local
 * user row. Account deletion takes the corresponding exclusive lock, so a
 * deletion cannot succeed alongside a newly-created local record.
 */
export async function assertAccountWritable(externalUserId: string): Promise<void> {
  const fingerprint = identityFingerprint(externalUserId);
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
      VALUES (${fingerprint}, 'active')
      ON CONFLICT (identity_fingerprint) DO NOTHING
    `);
    const result = await tx.execute<{ state: AccountDeletionState }>(sql`
      SELECT state
      FROM calora_account_deletion_states
      WHERE identity_fingerprint = ${fingerprint}
      FOR SHARE
    `);
    if (result.rows[0]?.state !== "active") {
      throw new AccountDeletionInProgressError();
    }
  });
}

export async function beginAccountDeletion(externalUserId: string): Promise<AccountDeletionState> {
  const fingerprint = identityFingerprint(externalUserId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
      VALUES (${fingerprint}, 'active')
      ON CONFLICT (identity_fingerprint) DO NOTHING
    `);
    const current = await tx.execute<{ state: AccountDeletionState }>(sql`
      SELECT state
      FROM calora_account_deletion_states
      WHERE identity_fingerprint = ${fingerprint}
      FOR UPDATE
    `);
    const state = current.rows[0]?.state;
    if (state === "deleted") return state;
    await tx.execute(sql`
      UPDATE calora_account_deletion_states
      SET state = 'deleting', requested_at = COALESCE(requested_at, now()), updated_at = now(), last_error = NULL
      WHERE identity_fingerprint = ${fingerprint}
    `);
    return "deleting";
  });
}

export async function markAccountDeletionFailed(externalUserId: string): Promise<void> {
  const fingerprint = identityFingerprint(externalUserId);
  await db.execute(sql`
    UPDATE calora_account_deletion_states
    SET state = 'deleting', updated_at = now(), last_error = 'retry_required'
    WHERE identity_fingerprint = ${fingerprint}
  `);
}

export async function completeAccountDeletion(externalUserId: string): Promise<void> {
  const fingerprint = identityFingerprint(externalUserId);
  await db.execute(sql`
    UPDATE calora_account_deletion_states
    SET state = 'deleted', completed_at = now(), updated_at = now(), last_error = NULL
    WHERE identity_fingerprint = ${fingerprint}
  `);
}

export class AccountDeletionInProgressError extends Error {
  constructor() {
    super("Account deletion is in progress.");
  }
}