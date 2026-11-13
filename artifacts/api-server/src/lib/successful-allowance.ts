import { pool } from "@workspace/db";
import type { AllowancePeriod } from "./subscriptionPolicy.js";

export type AllowanceFeature =
  | "photo_scan"
  | "barcode_scan"
  | "nutrition_label_scan"
  | "voice_log"
  | "receipt_scan"
  | "coach_message"
  | "recipe_creation";

export type AllowanceDecision = {
  allowed: boolean;
  alreadyCompleted: boolean;
  retryAfterSecs: number;
  remaining: number;
  resetAt: string;
};

function safeKey(value: string): string {
  return value.trim().slice(0, 160);
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function nextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function periodKey(now: Date, period: AllowancePeriod): string {
  if (period === "monthly") return startOfUtcMonth(now).toISOString().slice(0, 10);
  return utcDay(now);
}

function windowStart(now: Date, period: AllowancePeriod): Date {
  if (period === "rolling_7_days") return addUtcDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), -6);
  if (period === "monthly") return startOfUtcMonth(now);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function windowEnd(now: Date, period: AllowancePeriod): Date {
  if (period === "rolling_7_days") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "monthly") return addUtcDays(nextUtcMonth(now), -1);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function retryAfterSecs(resetAt: Date, now: Date): number {
  return Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
}

/**
 * Reserves one unit before a provider call. The database transaction locks the
 * user/feature bucket, duplicate operation keys are idempotent, and failed
 * operations release their pending reservation. Server UTC is authoritative.
 */
export async function reserveSuccessfulAllowance(input: {
  userId: string;
  feature: AllowanceFeature;
  limit: number;
  period: AllowancePeriod;
  idempotencyKey: string;
  now?: Date;
}): Promise<AllowanceDecision> {
  const now = input.now ?? new Date();
  const userId = safeKey(input.userId);
  const feature = safeKey(input.feature);
  const key = safeKey(input.idempotencyKey);
  const limit = Math.max(0, Math.floor(input.limit));
  const currentKey = periodKey(now, input.period);
  const start = windowStart(now, input.period).toISOString().slice(0, 10);
  const end = windowEnd(now, input.period).toISOString().slice(0, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`allowance:${userId}:${feature}:${input.period}`]);
    await client.query(
      `INSERT INTO calora_feature_usage
        (user_id, feature, day_key, successful_count, pending_keys, completed_keys, updated_at)
       VALUES ($1, $2, $3, 0, ARRAY[]::text[], ARRAY[]::text[], now())
       ON CONFLICT (user_id, feature, day_key) DO NOTHING`,
      [userId, feature, currentKey],
    );
    const rows = await client.query<{
      day_key: string;
      successful_count: number;
      pending_keys: string[];
      completed_keys: string[];
      updated_at: Date;
    }>(
      `SELECT day_key, successful_count, pending_keys, completed_keys, updated_at
         FROM calora_feature_usage
        WHERE user_id = $1 AND feature = $2 AND day_key BETWEEN $3::date AND $4::date
        ORDER BY day_key
        FOR UPDATE`,
      [userId, feature, start, end],
    );

    const staleBefore = now.getTime() - 15 * 60 * 1000;
    for (const row of rows.rows) {
      if (row.updated_at.getTime() < staleBefore && row.pending_keys.length > 0) {
        row.pending_keys = [];
        await client.query(
          `UPDATE calora_feature_usage SET pending_keys = ARRAY[]::text[], updated_at = now()
            WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
          [userId, feature, row.day_key],
        );
      }
    }
    const current = rows.rows.find((row) => row.day_key === currentKey);
    if (!current) throw new Error("Allowance reservation did not return a usage row.");
    const pending = current.pending_keys;
    if (current.updated_at.getTime() < staleBefore && pending.length > 0) {
      await client.query(
        `UPDATE calora_feature_usage SET pending_keys = ARRAY[]::text[], updated_at = now()
          WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
        [userId, feature, currentKey],
      );
    }

    const alreadyCompleted = rows.rows.some((row) => row.completed_keys.includes(key));
    const isPending = pending.includes(key);
    const successful = rows.rows.reduce((total, row) => total + Number(row.successful_count), 0);
    const pendingCount = rows.rows.reduce((total, row) => total + (row.day_key === currentKey ? pending.length : row.pending_keys.length), 0);
    const reserved = successful + pendingCount;
    const allowed = alreadyCompleted || isPending || reserved < limit;
    if (allowed && !alreadyCompleted && !isPending) {
      await client.query(
        `UPDATE calora_feature_usage SET pending_keys = array_append(pending_keys, $4), updated_at = now()
          WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
        [userId, feature, currentKey, key],
      );
    }

    const nextReset = input.period === "monthly"
      ? nextUtcMonth(now)
      : input.period === "daily"
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
        : addUtcDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 7);
    const remaining = Math.max(0, limit - (allowed && !alreadyCompleted && !isPending ? reserved + 1 : reserved));
    await client.query("COMMIT");
    return {
      allowed,
      alreadyCompleted,
      retryAfterSecs: allowed ? 0 : retryAfterSecs(nextReset, now),
      remaining,
      resetAt: nextReset.toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function updateAllowanceRow(input: {
  userId: string;
  feature: AllowanceFeature;
  idempotencyKey: string;
  period: AllowancePeriod;
  now?: Date;
  operation: "finalize" | "release";
}): Promise<void> {
  const day = periodKey(input.now ?? new Date(), input.period);
  const userId = safeKey(input.userId);
  const feature = safeKey(input.feature);
  const key = safeKey(input.idempotencyKey);
  if (input.operation === "release") {
    await pool.query(
      `UPDATE calora_feature_usage SET pending_keys = array_remove(pending_keys, $4), updated_at = now()
        WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
      [userId, feature, day, key],
    );
    return;
  }
  await pool.query(
    `UPDATE calora_feature_usage
        SET successful_count = CASE WHEN $4 = ANY(completed_keys) THEN successful_count ELSE successful_count + 1 END,
            pending_keys = array_remove(pending_keys, $4),
            completed_keys = CASE WHEN $4 = ANY(completed_keys) THEN completed_keys ELSE array_append(completed_keys, $4) END,
            updated_at = now()
      WHERE user_id = $1 AND feature = $2 AND day_key = $3`,
    [userId, feature, day, key],
  );
}

export function finalizeSuccessfulAllowance(input: Omit<Parameters<typeof updateAllowanceRow>[0], "operation">): Promise<void> {
  return updateAllowanceRow({ ...input, operation: "finalize" });
}

export function releaseSuccessfulAllowance(input: Omit<Parameters<typeof updateAllowanceRow>[0], "operation">): Promise<void> {
  return updateAllowanceRow({ ...input, operation: "release" });
}
