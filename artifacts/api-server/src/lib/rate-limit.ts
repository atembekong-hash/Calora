/**
 * Shared persistent, atomic rate limiter for expensive endpoints.
 *
 * State lives in the `calora_capture_rate_limits` table (one row per key). A
 * single upsert handles reset detection, counter increment, and read in one
 * round-trip, so the limiter is consistent across server restarts and multiple
 * instances without in-process coordination.
 *
 * Keys are namespaced strings (e.g. `capture:user:<id>`, `planner:user:<id>`,
 * `coach:user:<id>`, `capture:ip:<addr>`) so several endpoints can safely share
 * the same table without colliding.
 *
 * Failure policy is per-caller:
 * - Authenticated endpoints default to FAIL-OPEN (a transient DB outage must
 *   not block legitimate signed-in users of a paid feature; the window is
 *   bounded to verified accounts).
 * - Anonymous/public endpoints must pass `failClosed: true` so a DB outage
 *   (or induced DB unavailability) can never remove the only control between
 *   anonymous traffic and paid provider calls.
 */

import { pool } from "@workspace/db";
import { logger } from "./logger.js";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSecs: number;
  /** True when the decision came from the failure policy, not the DB bucket. */
  degraded?: boolean;
};

/**
 * Atomically check and increment the persistent rate-limit bucket for `key`.
 * `limit` is the max requests allowed per `windowSecs` fixed window.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSecs: number,
  options?: { failClosed?: boolean },
): Promise<RateLimitResult> {
  try {
    const result = await pool.query<{ count: number; reset_at: Date }>(
      `INSERT INTO calora_capture_rate_limits (key, count, reset_at)
       VALUES ($1, 1, NOW() + ($2 || ' seconds')::INTERVAL)
       ON CONFLICT (key) DO UPDATE SET
         count    = CASE
                      WHEN calora_capture_rate_limits.reset_at <= NOW() THEN 1
                      ELSE calora_capture_rate_limits.count + 1
                    END,
         reset_at = CASE
                      WHEN calora_capture_rate_limits.reset_at <= NOW()
                        THEN NOW() + ($2 || ' seconds')::INTERVAL
                      ELSE calora_capture_rate_limits.reset_at
                    END
       RETURNING count, reset_at`,
      [key, String(windowSecs)],
    );

    const row = result.rows[0];
    if (!row) return { allowed: true, retryAfterSecs: 0 };

    if (row.count > limit) {
      const retryAfterSecs = Math.max(1, Math.ceil((row.reset_at.getTime() - Date.now()) / 1000));
      return { allowed: false, retryAfterSecs };
    }

    return { allowed: true, retryAfterSecs: 0 };
  } catch (err) {
    if (options?.failClosed) {
      // Fail closed — anonymous paid-AI paths must never run unmetered.
      logger.error(
        { err },
        "Rate-limit database check failed; request denied fail-closed",
      );
      return { allowed: false, retryAfterSecs: 30, degraded: true };
    }
    // Fail open — a DB outage should not block legitimate authenticated users.
    logger.error(
      { err },
      "Rate-limit database check failed; verified request allowed fail-open",
    );
    return { allowed: true, retryAfterSecs: 0, degraded: true };
  }
}

/** Clears all persisted rate-limit buckets. Exported for use in tests only. */
export async function resetRateLimiter(): Promise<void> {
  await pool.query("DELETE FROM calora_capture_rate_limits");
}
