import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type AccountDeletionState = "active" | "deleting" | "deleted";
export type AccountDeletionStage = "application" | "revenuecat" | "auth";
export type AccountDeletionClaim =
  | { kind: "completed" }
  | { kind: "in_progress" }
  | { kind: "claimed"; operationId: string; stage: AccountDeletionStage };

export const ACCOUNT_DELETION_FENCE_ERROR_CLASS = "account_deletion_fence" as const;
const ACCOUNT_DELETION_FENCE_SQLSTATE = "55000";
const ACCOUNT_DELETION_FENCE_MESSAGE = "account deletion is in progress";

const LEASE_SECONDS = 5 * 60;

export function accountDeletionFenceSignal(route: string, count = 1) {
  return {
    errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
    route,
    count,
  };
}

export interface RecoverableAccountDeletion {
  externalUserId: string;
  identityFingerprint: string;
  stage: AccountDeletionStage;
  requestedAt: Date | null;
  updatedAt: Date;
}

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

export async function claimAccountDeletion(externalUserId: string): Promise<AccountDeletionClaim> {
  const fingerprint = identityFingerprint(externalUserId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
      VALUES (${fingerprint}, 'active')
      ON CONFLICT (identity_fingerprint) DO NOTHING
    `);
    const current = await tx.execute<{
      state: AccountDeletionState;
      stage: AccountDeletionStage | null;
      lease_expires_at: Date | null;
    }>(sql`
      SELECT state, stage, lease_expires_at
      FROM calora_account_deletion_states
      WHERE identity_fingerprint = ${fingerprint}
      FOR UPDATE
    `);
    const row = current.rows[0];
    if (row?.state === "deleted") return { kind: "completed" };
    if (row?.state === "deleting" && row.lease_expires_at && row.lease_expires_at > new Date()) {
      return { kind: "in_progress" };
    }
    const operationId = randomUUID();
    const stage = row?.stage ?? "application";
    await tx.execute(sql`
      UPDATE calora_account_deletion_states
      SET state = 'deleting',
          operation_id = ${operationId}::uuid,
          stage = ${stage},
          recovery_external_user_id = ${externalUserId},
          lease_expires_at = now() + (${LEASE_SECONDS} || ' seconds')::interval,
          requested_at = COALESCE(requested_at, now()),
          updated_at = now(),
          last_error = NULL
      WHERE identity_fingerprint = ${fingerprint}
    `);
    return { kind: "claimed", operationId, stage };
  });
}

export async function checkpointAccountDeletion(externalUserId: string, operationId: string, stage: AccountDeletionStage): Promise<boolean> {
  const fingerprint = identityFingerprint(externalUserId);
  const result = await db.execute(sql`
    UPDATE calora_account_deletion_states
    SET stage = ${stage}, updated_at = now(),
        lease_expires_at = now() + (${LEASE_SECONDS} || ' seconds')::interval,
        last_error = NULL
    WHERE identity_fingerprint = ${fingerprint} AND state = 'deleting' AND operation_id = ${operationId}::uuid
    RETURNING identity_fingerprint
  `);
  return result.rows.length === 1;
}

export async function markAccountDeletionFailed(externalUserId: string, operationId: string): Promise<boolean> {
  const fingerprint = identityFingerprint(externalUserId);
  const result = await db.execute(sql`
    UPDATE calora_account_deletion_states
    SET updated_at = now(), last_error = 'retry_required', lease_expires_at = now()
    WHERE identity_fingerprint = ${fingerprint} AND state = 'deleting' AND operation_id = ${operationId}::uuid
    RETURNING identity_fingerprint
  `);
  return result.rows.length === 1;
}

export async function completeAccountDeletion(externalUserId: string, operationId: string): Promise<boolean> {
  const fingerprint = identityFingerprint(externalUserId);
  const result = await db.execute(sql`
    UPDATE calora_account_deletion_states
    SET state = 'deleted', completed_at = now(), updated_at = now(),
        operation_id = NULL, recovery_external_user_id = NULL,
        lease_expires_at = NULL, last_error = NULL
    WHERE identity_fingerprint = ${fingerprint} AND state = 'deleting' AND operation_id = ${operationId}::uuid
    RETURNING identity_fingerprint
  `);
  return result.rows.length === 1;
}

export async function listRecoverableAccountDeletions(): Promise<RecoverableAccountDeletion[]> {
  const rows = await db.execute<{
    recovery_external_user_id: string;
    identity_fingerprint: string;
    stage: AccountDeletionStage;
    requested_at: Date | string | null;
    updated_at: Date | string;
  }>(sql`
    SELECT recovery_external_user_id, identity_fingerprint, stage, requested_at, updated_at
    FROM calora_account_deletion_states
    WHERE state = 'deleting'
      AND recovery_external_user_id IS NOT NULL
      AND (lease_expires_at IS NULL OR lease_expires_at <= now())
    ORDER BY updated_at ASC
    LIMIT 25
  `);
  return rows.rows.map((row) => ({
    externalUserId: row.recovery_external_user_id,
    identityFingerprint: row.identity_fingerprint,
    stage: row.stage,
    requestedAt: row.requested_at ? new Date(row.requested_at) : null,
    updatedAt: new Date(row.updated_at),
  }));
}

export class AccountDeletionInProgressError extends Error {
  readonly errorClass = ACCOUNT_DELETION_FENCE_ERROR_CLASS;

  constructor() {
    super("Account deletion is in progress.");
  }
}

/**
 * Converts both the application-side fence error and the PostgreSQL trigger
 * error into one stable, internal classification. The trigger error is
 * intentionally matched by its fixed SQLSTATE and message, not by arbitrary
 * database error text that could contain account data.
 */
export function classifyAccountDeletionError(
  error: unknown,
): typeof ACCOUNT_DELETION_FENCE_ERROR_CLASS | null {
  if (error instanceof AccountDeletionInProgressError) {
    return ACCOUNT_DELETION_FENCE_ERROR_CLASS;
  }

  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; message?: unknown };
  if (
    candidate.code === ACCOUNT_DELETION_FENCE_SQLSTATE &&
    candidate.message === ACCOUNT_DELETION_FENCE_MESSAGE
  ) {
    return ACCOUNT_DELETION_FENCE_ERROR_CLASS;
  }
  return null;
}