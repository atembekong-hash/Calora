import { createHash } from "node:crypto";
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
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
});

export const RECOVERY_WARNING_SUMMARY_INTERVAL_MS = 15 * 60 * 1000;
const MAX_SUPPRESSED_RECOVERY_COHORTS = 128;
const MAX_CORRELATION_KEYS_PER_COHORT = 128;

interface SuppressedRecoveryCohort {
  cohortKey: string;
  correlationKeys: string[];
  suppressedCycleCount: number;
}

const suppressedRecoveryCohorts = new Map<string, SuppressedRecoveryCohort>();
let suppressedRecoverySummaryStartedAt = Date.now();

/**
 * Record a warning that the shared recovery cooldown intentionally hid.
 *
 * This is deliberately process-local: the database claim remains the
 * cross-instance source of truth for suppression, while this bounded buffer
 * provides low-frequency visibility without adding another durable counter.
 * The supplied cohort key is hashed again before it enters operational state.
 */
export function noteSuppressedRecoveryWarning(input: {
  cohortKey: string;
  correlationKeys: string[];
}): void {
  const cohortKey = createHash("sha256").update(input.cohortKey).digest("hex");
  const safeCorrelationKeys = input.correlationKeys.filter((key) => /^[a-f0-9]{16}$/.test(key));
  const existing = suppressedRecoveryCohorts.get(cohortKey);
  if (existing) {
    existing.suppressedCycleCount += 1;
    for (const correlationKey of safeCorrelationKeys) {
      if (
        !existing.correlationKeys.includes(correlationKey)
        && existing.correlationKeys.length < MAX_CORRELATION_KEYS_PER_COHORT
      ) {
        existing.correlationKeys.push(correlationKey);
      }
    }
    return;
  }

  // A new cohort would have emitted an immediate warning, so this bound only
  // protects the summary buffer from an unexpected flood of already-suppressed
  // signatures.
  if (suppressedRecoveryCohorts.size >= MAX_SUPPRESSED_RECOVERY_COHORTS) return;

  suppressedRecoveryCohorts.set(cohortKey, {
    cohortKey,
    correlationKeys: [...new Set(safeCorrelationKeys)].slice(
      0,
      MAX_CORRELATION_KEYS_PER_COHORT,
    ),
    suppressedCycleCount: 1,
  });
}

/**
 * Emit one sanitized summary when the controlled reporting window expires.
 *
 * `now` is injectable so the cadence and reset behavior can be tested without
 * waiting in real time. No account identifiers, provider errors, or provider
 * response details are accepted by this boundary.
 */
export function flushSuppressedRecoveryWarningSummary(now = Date.now()): void {
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

  logger.warn(
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
}
