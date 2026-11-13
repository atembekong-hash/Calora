import { pool } from "@workspace/db";

export type AllowanceFeature =
  | "photo_scan"
  | "barcode_scan"
  | "nutrition_label_scan"
  | "voice_log"
  | "coach_message"
  | "recipe_creation";

export type AllowanceDecision = {
  allowed: boolean;
  alreadyCompleted: boolean;
  retryAfterSecs: number;
};

function safeKey(value: string): string {
  return value.trim().slice(0, 160);
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Reserve one successful-operation unit before calling a paid provider.
 * Failed/cancelled operations release the reservation, so only completed
 * provider operations consume the allowance. The SQL update is atomic across
 * instances and the idempotency key prevents duplicate taps from reserving a
 * second unit.
 */
export async function reserveSuccessfulAllowance(input: {
  userId: string;
  feature: AllowanceFeature;
  dailyLimit: number;
  idempotencyKey: string;
  now?: Date;
}): Promise<AllowanceDecision> {
  const userId = safeKey(input.userId);
  const feature = safeKey(input.feature);
  const key = safeKey(input.idempotencyKey);
  const day = utcDay(input.now);
  const limit = Math.max(0, Math.floor(input.dailyLimit));
  const result = await pool.query<{
    successful_count: number;
    pending_keys: string[];
    completed_keys: string[];
  }>(
    `INSERT INTO calora_feature_usage
      (user_id, feature, day_key, successful_count, pending_keys, completed_keys)
     VALUES ($1, $2, $3, 0,
       CASE WHEN $5 > 0 THEN ARRAY[$4]::text[] ELSE ARRAY[]::text[] END,
       ARRAY[]::text[])
     ON CONFLICT (user_id, feature, day_key) DO UPDATE SET
       pending_keys = CASE
         WHEN $4 = ANY(calora_feature_usage.completed_keys)
           OR $4 = ANY(calora_feature_usage.pending_keys)
           OR calora_feature_usage.successful_count + cardinality(calora_feature_usage.pending_keys) >= $5
         THEN calora_feature_usage.pending_keys
         ELSE array_append(calora_feature_usage.pending_keys, $4)
       END
     RETURNING successful_count, pending_keys, completed_keys`,
    [userId, feature, day, key, limit],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Allowance reservation did not return a usage row.");
  const alreadyCompleted = row.completed_keys.includes(key);
  const isPending = row.pending_keys.includes(key);
  return {
    allowed: alreadyCompleted || isPending,
    alreadyCompleted,
    retryAfterSecs: alreadyCompleted || isPending ? 0 : 24 * 60 * 60,
  };
}

export async function finalizeSuccessfulAllowance(input: {
  userId: string;
  feature: AllowanceFeature;
  idempotencyKey: string;
  now?: Date;
}): Promise<void> {
  await pool.query(
    `UPDATE calora_feature_usage
        SET successful_count = CASE
              WHEN $4 = ANY(completed_keys) THEN successful_count
              ELSE successful_count + 1
            END,
            pending_keys = array_remove(pending_keys, $4),
            completed_keys = CASE
              WHEN $4 = ANY(completed_keys) THEN completed_keys
              ELSE array_append(completed_keys, $4)
            END
      WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
    [safeKey(input.userId), safeKey(input.feature), utcDay(input.now), safeKey(input.idempotencyKey)],
  );
}

export async function releaseSuccessfulAllowance(input: {
  userId: string;
  feature: AllowanceFeature;
  idempotencyKey: string;
  now?: Date;
}): Promise<void> {
  await pool.query(
    `UPDATE calora_feature_usage
        SET pending_keys = array_remove(pending_keys, $4)
      WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
    [safeKey(input.userId), safeKey(input.feature), utcDay(input.now), safeKey(input.idempotencyKey)],
  );
}
