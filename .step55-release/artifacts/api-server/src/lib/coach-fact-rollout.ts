/**
 * Server-owned global runtime gate for the consent-gated Coach Fact Context
 * path.
 *
 * Design invariants:
 *  - Deny-all by default: absent DB rows ⟹ blocked.
 *  - Endpoint gate: the COACH_FACT_CONTEXT_ENABLED env var (checked by the
 *    route) is the primary on/off switch; it remains "false" in production
 *    by default and is separate from this rollout module.
 *  - DB-backed global gate: calora_server_config key
 *    "coach_fact_context_rollout_enabled" (jsonb boolean true) must exist.
 *    An absent row or any non-true value ⟹ deny.
 *  - No client self-enrollment: clients cannot change the global switch.
 *  - Privacy-safe: no user identifiers are logged or retained beyond the call.
 *  - Rapid reversibility: deleting the server_config row or setting its value
 *    to false immediately blocks all traffic.
 *  - Fail-closed: any DB error ⟹ deny. The gate never fails open.
 */

import { eq } from "drizzle-orm";
import { db, serverConfigTable } from "@workspace/db";

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
  reason: "dark_default_deny" | "cohort_eligible";
};

/**
 * Returns the server-authoritative global rollout decision.
 *
 * Fail-closed invariants:
 *  - If DB read fails for any reason ⟹ deny (never fails open).
 *  - If server_config row is absent or value !== true ⟹ deny.
 * `legacyFallbackEnabled` is always false — there is no legacy Coach path.
 */
export async function getCoachFactRolloutDecision(_externalUserId: string): Promise<CoachFactRolloutDecision> {
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
 * @deprecated Retained for source compatibility with the prior per-user
 * rollout. Broad consent-gated activation no longer reads cohort membership.
 */
export function getActiveCohortName(): string {
  return COACH_FACT_CONTEXT_COHORT;
}

/**
 * @deprecated Broad consent-gated activation no longer reads cohort
 * membership. Returns an empty set for backward compatibility.
 */
export function getActiveCohort(): ReadonlySet<string> {
  return new Set<string>();
}
