/**
 * Server-owned, named, deterministic cohort gate for the Coach Fact Context
 * dark path. Task 473: DB-backed runtime rollout.
 *
 * Design invariants:
 *  - Deny-all by default: absent DB rows ⟹ blocked.
 *  - Endpoint gate: the COACH_FACT_CONTEXT_ENABLED env var (checked by the
 *    route) is the primary on/off switch; it remains "false" in production
 *    by default and is separate from this rollout module.
 *  - DB-backed global gate: calora_server_config key
 *    "coach_fact_context_rollout_enabled" (jsonb boolean true) must exist.
 *    An absent row or any non-true value ⟹ deny.
 *  - DB-backed cohort: calora_cohort_memberships row for cohort_name =
 *    "coach_fact_context_v1" must exist AND pass expiry/review checks:
 *      • expiresAt must be NULL (no expiry) or strictly in the future.
 *      • reviewedAt must be non-NULL (row was explicitly reviewed/approved).
 *  - No client self-enrollment: cohort rows are written only by offline
 *    server-side approval; never by any client-facing path.
 *  - Privacy-safe: no user identifiers are logged or retained beyond the call.
 *  - Rapid reversibility: deleting the server_config row or setting its value
 *    to false immediately blocks all traffic. Setting expiresAt to the past or
 *    setting reviewedAt to NULL revokes that user immediately.
 *  - Named cohort: the cohort name is a typed constant (COACH_FACT_CONTEXT_COHORT)
 *    never derived from client input, so code review can track every change.
 *  - Fail-closed: any DB error ⟹ deny. The gate never fails open.
 */

import { eq, and, isNotNull } from "drizzle-orm";
import { db, serverConfigTable, cohortMembershipsTable } from "@workspace/db";

/**
 * Typed cohort name constant. Never derived from client input.
 * Must match the value stored in calora_cohort_memberships.cohort_name.
 */
export const COACH_FACT_CONTEXT_COHORT = "coach_fact_context_v1" as const;

/**
 * DB config key for the global on/off switch.
 * Row must have value = true (jsonb boolean) to enable the gate.
 */
export const COACH_FACT_CONTEXT_CONFIG_KEY = "coach_fact_context_rollout_enabled" as const;

export type CoachFactRolloutDecision = {
  cohortEligible: boolean;
  legacyFallbackEnabled: boolean;
  reason: "dark_default_deny" | "cohort_deny" | "cohort_expired" | "cohort_unreviewed" | "cohort_eligible";
};

/**
 * Returns the server-authoritative rollout decision for the given external
 * user id. Reads from the DB (calora_server_config + calora_cohort_memberships).
 *
 * Fail-closed invariants:
 *  - If DB read fails for any reason ⟹ deny (never fails open).
 *  - If server_config row is absent or value !== true ⟹ deny.
 *  - If cohort_memberships row is absent ⟹ deny.
 *  - If membership expiresAt is non-null and in the past ⟹ deny (expired).
 *  - If membership reviewedAt is null ⟹ deny (unreviewed row, not active).
 *
 * `legacyFallbackEnabled` is always false — there is no legacy Coach path.
 */
export async function getCoachFactRolloutDecision(externalUserId: string): Promise<CoachFactRolloutDecision> {
  try {
    // Read the global gate from server config. Absence == disabled.
    const [configRow] = await db
      .select({ value: serverConfigTable.value })
      .from(serverConfigTable)
      .where(eq(serverConfigTable.key, COACH_FACT_CONTEXT_CONFIG_KEY))
      .limit(1);
    if (!configRow || configRow.value !== true) {
      return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
    }

    // Check named cohort membership. Absence == not eligible.
    // Only select the columns needed for the expiry/review checks.
    const [memberRow] = await db
      .select({
        id: cohortMembershipsTable.id,
        expiresAt: cohortMembershipsTable.expiresAt,
        reviewedAt: cohortMembershipsTable.reviewedAt,
      })
      .from(cohortMembershipsTable)
      .where(and(
        eq(cohortMembershipsTable.cohortName, COACH_FACT_CONTEXT_COHORT),
        eq(cohortMembershipsTable.externalUserId, externalUserId),
      ))
      .limit(1);

    if (!memberRow) {
      return { cohortEligible: false, legacyFallbackEnabled: false, reason: "cohort_deny" };
    }

    // reviewedAt must be non-null: row was explicitly approved by server-side review.
    if (memberRow.reviewedAt === null) {
      return { cohortEligible: false, legacyFallbackEnabled: false, reason: "cohort_unreviewed" };
    }

    // expiresAt, if set, must be strictly in the future.
    if (memberRow.expiresAt !== null && memberRow.expiresAt.getTime() <= Date.now()) {
      return { cohortEligible: false, legacyFallbackEnabled: false, reason: "cohort_expired" };
    }

    return { cohortEligible: true, legacyFallbackEnabled: false, reason: "cohort_eligible" };
  } catch {
    // Any DB failure ⟹ deny. The gate never fails open.
    return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
  }
}

/**
 * @deprecated The compile-time static gate has been removed. The endpoint
 * gate (COACH_FACT_CONTEXT_ENABLED env var) and the DB-backed server_config
 * row are now the sole on/off switches. This stub is kept only so existing
 * call-sites compile without changes; it always returns false.
 */
export function isCohortEnabled(): boolean {
  return false;
}

/**
 * Returns the typed cohort name constant (never free-form user input).
 * Exposed so tests can verify the exact cohort name without hard-coding it.
 */
export function getActiveCohortName(): string {
  return COACH_FACT_CONTEXT_COHORT;
}

/**
 * @deprecated The in-memory cohort set has been removed. Membership is now
 * determined solely by calora_cohort_memberships rows with non-null reviewedAt
 * and a non-expired expiresAt. Returns an empty set for backward compatibility.
 */
export function getActiveCohort(): ReadonlySet<string> {
  return new Set<string>();
}
