/**
 * Server-owned, one-account-at-a-time rollout gate for the consent-gated
 * Coach Fact Context path.
 *
 * The endpoint is deny-all unless every check succeeds: a production runtime,
 * a build explicitly bound to its reviewed Railway commit, the process gate,
 * the global database gate, and an active reviewed cohort membership for the
 * authenticated account. Client requests cannot create any of these records.
 */

import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { cohortMembershipsTable, db, serverConfigTable } from "@workspace/db";

export const COACH_FACT_CONTEXT_COHORT = "coach_fact_context_v1" as const;
export const COACH_FACT_CONTEXT_CONFIG_KEY = "coach_fact_context_rollout_enabled" as const;

export type CoachFactRolloutDecision = {
  cohortEligible: boolean;
  legacyFallbackEnabled: false;
  reason: "dark_default_deny" | "cohort_eligible";
};

/**
 * Reads the global operator gate and the requesting account's reviewed,
 * unexpired membership. Any missing row, malformed record, or database error
 * denies access; an enabled global gate never enrolls ordinary accounts.
 */
export async function getCoachFactRolloutDecision(
  externalUserId: string,
): Promise<CoachFactRolloutDecision> {
  try {
    const [configRow] = await db
      .select({ value: serverConfigTable.value })
      .from(serverConfigTable)
      .where(eq(serverConfigTable.key, COACH_FACT_CONTEXT_CONFIG_KEY))
      .limit(1);

    if (!configRow || configRow.value !== true) {
      return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
    }

    const now = new Date();
    const [membership] = await db
      .select({ id: cohortMembershipsTable.id })
      .from(cohortMembershipsTable)
      .where(and(
        eq(cohortMembershipsTable.cohortName, COACH_FACT_CONTEXT_COHORT),
        eq(cohortMembershipsTable.externalUserId, externalUserId),
        isNotNull(cohortMembershipsTable.reviewedAt),
        or(
          isNull(cohortMembershipsTable.expiresAt),
          gt(cohortMembershipsTable.expiresAt, now),
        ),
      ))
      .limit(1);

    if (!membership) {
      return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
    }

    return { cohortEligible: true, legacyFallbackEnabled: false, reason: "cohort_eligible" };
  } catch {
    return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
  }
}

/** @deprecated Cohorts are database-owned and never represented in memory. */
export function isCohortEnabled(): boolean {
  return false;
}

/** @deprecated Returns the typed database cohort name for source compatibility. */
export function getActiveCohortName(): string {
  return COACH_FACT_CONTEXT_COHORT;
}

/** @deprecated The database, not process memory, is the authority. */
export function getActiveCohort(): ReadonlySet<string> {
  return new Set<string>();
}
