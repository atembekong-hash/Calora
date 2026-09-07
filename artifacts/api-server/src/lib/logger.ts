import { createHash } from "node:crypto";
import pino, { type DestinationStream } from "pino";
import { pool } from "@workspace/db";

export function createLogger(destination?: DestinationStream) {
  const isProduction = process.env.NODE_ENV === "production";

  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      ...(isProduction
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }),
    },
    destination,
  );
}

export const logger = createLogger();

export const RECOVERY_WARNING_SUMMARY_INTERVAL_MS = 15 * 60 * 1000;
const MAX_SUPPRESSED_RECOVERY_COHORTS = 128;
const MAX_CORRELATION_KEYS_PER_COHORT = 128;
const MAX_RECOVERY_WARNING_COOLDOWN_FAILURES_PER_INTERVAL = 128;
const RECOVERY_SUMMARY_RETENTION_MS = 60 * 60 * 1000;
const RECOVERY_SUMMARY_LOCK_KEY = "calora:recovery-warning-summary";
let recoveryWarningCooldownFailureCount = 0;
let recoveryWarningCooldownSignalNextAt = 0;

interface SuppressedRecoveryCohort {
  cohortKey: string;
  correlationKeys: string[];
  suppressedCycleCount: number;
}

const suppressedRecoveryCohorts = new Map<string, SuppressedRecoveryCohort>();
let suppressedRecoverySummaryStartedAt = Date.now();
let recoverySummaryPersistenceQueue = Promise.resolve();

function safeCorrelationKeys(keys: string[]): string[] {
  return [...new Set(keys.filter((key) => /^[a-f0-9]{16}$/.test(key)))].slice(
    0,
    MAX_CORRELATION_KEYS_PER_COHORT,
  );
}

function queueRecoverySummaryPersistence(operation: () => Promise<void>): void {
  recoverySummaryPersistenceQueue = recoverySummaryPersistenceQueue
    .then(operation)
    .catch(() => {
      // Summary persistence is observability-only. A database outage must not
      // affect recovery retries or turn a warning into an unhandled rejection.
    });
}

/**
 * Let graceful shutdown drain reporting-only writes without making recovery
 * depend on them. Every queued operation resolves even when persistence fails.
 */
export async function waitForRecoverySummaryPersistence(): Promise<void> {
  await recoverySummaryPersistenceQueue;
}

/**
 * Report that recovery-warning cooldown storage is unavailable without
 * allowing observability to affect account-deletion recovery.
 *
 * The event deliberately contains only a fixed classification and a bounded
 * count. It never accepts storage or provider errors, warning signatures, or
 * account-related data.
 */
export function noteRecoveryWarningCooldownStorageUnavailable(
  now = Date.now(),
  outputLogger = logger,
): void {
  recoveryWarningCooldownFailureCount = Math.min(
    recoveryWarningCooldownFailureCount + 1,
    MAX_RECOVERY_WARNING_COOLDOWN_FAILURES_PER_INTERVAL,
  );
  if (now < recoveryWarningCooldownSignalNextAt) {
    return;
  }

  const cooldownStorageFailureCount = recoveryWarningCooldownFailureCount;
  recoveryWarningCooldownFailureCount = 0;
  recoveryWarningCooldownSignalNextAt = now + RECOVERY_WARNING_SUMMARY_INTERVAL_MS;

  try {
    outputLogger.warn(
      {
        event: "account_deletion_recovery_warning_cooldown_unavailable",
        cooldownStorageFailureCount,
      },
      "Account deletion recovery warning cooldown storage is unavailable",
    );
  } catch {
    // Logging is operational-only and must never interrupt recovery retries.
  }
}

async function persistSuppressedRecoveryWarning(
  cohortKey: string,
  correlationKeys: string[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [RECOVERY_SUMMARY_LOCK_KEY],
    );
    await client.query(
      `DELETE FROM calora_recovery_warning_summaries
       WHERE updated_at < NOW() - INTERVAL '1 hour'`,
    );
    await client.query(
      `DELETE FROM calora_recovery_warning_summaries
       WHERE cohort_key IN (
         SELECT cohort_key
         FROM calora_recovery_warning_summaries
         WHERE cohort_key <> $2
         ORDER BY updated_at ASC
         LIMIT GREATEST(
           0,
           (SELECT COUNT(*) FROM calora_recovery_warning_summaries) - $1
         )
       )`,
      [MAX_SUPPRESSED_RECOVERY_COHORTS - 1, cohortKey],
    );
    await client.query(
      `INSERT INTO calora_recovery_warning_summaries
         (cohort_key, correlation_keys, suppressed_cycle_count, first_seen_at, updated_at)
       VALUES ($1, $2::jsonb, 1, NOW(), NOW())
       ON CONFLICT (cohort_key) DO UPDATE
       SET correlation_keys = EXCLUDED.correlation_keys,
           suppressed_cycle_count =
             calora_recovery_warning_summaries.suppressed_cycle_count + 1,
           updated_at = EXCLUDED.updated_at`,
      [cohortKey, JSON.stringify(correlationKeys)],
    );
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original fail-open persistence boundary.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function clearPersistedSuppressedRecoveryWarnings(
  updatedThrough: number,
): Promise<void> {
  await pool.query(
    `DELETE FROM calora_recovery_warning_summaries
     WHERE updated_at <= $1`,
    [new Date(updatedThrough)],
  );
}

/**
 * Restore the redacted suppressed-warning buffer after an API restart.
 *
 * This is best-effort and intentionally does not participate in account
 * deletion recovery. If the store is unavailable, the process starts with an
 * empty local summary and continues normally.
 */
export async function restoreSuppressedRecoveryWarningSummary(
  now = Date.now(),
): Promise<void> {
  try {
    const result = await pool.query<{
      cohort_key: string;
      correlation_keys: unknown;
      suppressed_cycle_count: number;
      first_seen_at: Date | string;
    }>(
      `SELECT cohort_key, correlation_keys, suppressed_cycle_count, first_seen_at
       FROM calora_recovery_warning_summaries
       WHERE updated_at >= $1
       ORDER BY first_seen_at ASC
       LIMIT $2`,
      [
        new Date(now - RECOVERY_SUMMARY_RETENTION_MS),
        MAX_SUPPRESSED_RECOVERY_COHORTS,
      ],
    );

    suppressedRecoveryCohorts.clear();
    for (const row of result.rows) {
      if (
        !/^[a-f0-9]{64}$/.test(row.cohort_key)
        || !Number.isSafeInteger(row.suppressed_cycle_count)
        || row.suppressed_cycle_count < 1
        || !Array.isArray(row.correlation_keys)
      ) {
        continue;
      }
      const correlationKeys = safeCorrelationKeys(
        row.correlation_keys.filter((key): key is string => typeof key === "string"),
      );
      suppressedRecoveryCohorts.set(row.cohort_key, {
        cohortKey: row.cohort_key,
        correlationKeys,
        suppressedCycleCount: row.suppressed_cycle_count,
      });
    }

    const firstSeenAt = result.rows[0]?.first_seen_at;
    suppressedRecoverySummaryStartedAt = firstSeenAt
      ? new Date(firstSeenAt).getTime()
      : now;

    if (
      suppressedRecoveryCohorts.size > 0
      && now - suppressedRecoverySummaryStartedAt >= RECOVERY_WARNING_SUMMARY_INTERVAL_MS
    ) {
      flushSuppressedRecoveryWarningSummary(now);
    }
  } catch {
    // Reporting state is fail-open by design. Recovery must still run.
  }
}

/**
 * Record a warning that the shared recovery cooldown intentionally hid.
 *
 * The database claim remains the cross-instance source of truth for
 * suppression. This bounded buffer is also mirrored to redacted operational
 * state so a restart does not erase a low-frequency summary in progress.
 * The supplied cohort key is hashed again before it enters either state.
 */
export function noteSuppressedRecoveryWarning(input: {
  cohortKey: string;
  correlationKeys: string[];
}): void {
  const cohortKey = createHash("sha256").update(input.cohortKey).digest("hex");
  const correlationKeys = safeCorrelationKeys(input.correlationKeys);
  const existing = suppressedRecoveryCohorts.get(cohortKey);
  if (existing) {
    existing.suppressedCycleCount += 1;
    for (const correlationKey of correlationKeys) {
      if (
        !existing.correlationKeys.includes(correlationKey)
        && existing.correlationKeys.length < MAX_CORRELATION_KEYS_PER_COHORT
      ) {
        existing.correlationKeys.push(correlationKey);
      }
    }
    queueRecoverySummaryPersistence(() =>
      persistSuppressedRecoveryWarning(cohortKey, existing.correlationKeys));
    return;
  }

  // A new cohort would have emitted an immediate warning, so this bound only
  // protects the summary buffer from an unexpected flood of already-suppressed
  // signatures.
  if (suppressedRecoveryCohorts.size >= MAX_SUPPRESSED_RECOVERY_COHORTS) return;

  suppressedRecoveryCohorts.set(cohortKey, {
    cohortKey,
    correlationKeys,
    suppressedCycleCount: 1,
  });
  queueRecoverySummaryPersistence(() =>
    persistSuppressedRecoveryWarning(cohortKey, correlationKeys));
}

/**
 * Emit one sanitized summary when the controlled reporting window expires.
 *
 * `now` is injectable so the cadence and reset behavior can be tested without
 * waiting in real time. No account identifiers, provider errors, or provider
 * response details are accepted by this boundary.
 */
export function flushSuppressedRecoveryWarningSummary(
  now = Date.now(),
  outputLogger = logger,
): void {
  if (
    suppressedRecoveryCohorts.size === 0
    || now - suppressedRecoverySummaryStartedAt < RECOVERY_WARNING_SUMMARY_INTERVAL_MS
  ) {
    return;
  }

  const cohorts = [...suppressedRecoveryCohorts.values()];
  const suppressedCycleCount = cohorts.reduce(
    (total, cohort) => total + cohort.suppressedCycleCount,
    0,
  );

  outputLogger.warn(
    {
      event: "account_deletion_recovery_suppressed_summary",
      suppressedCycleCount,
      suppressedCohortCount: cohorts.length,
      cohorts,
    },
    "Account deletion recovery warnings remain suppressed",
  );

  suppressedRecoveryCohorts.clear();
  suppressedRecoverySummaryStartedAt = now;
  queueRecoverySummaryPersistence(() =>
    clearPersistedSuppressedRecoveryWarnings(now));
}
