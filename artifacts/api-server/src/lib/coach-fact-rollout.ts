/**
 * Server-owned, named, deterministic cohort gate for the Coach Fact Context
 * dark path.
 *
 * Design invariants:
 *  - Deny-all by default: the active cohort set is intentionally empty.
 *  - No client self-enrollment: only server-side cohort membership is read.
 *  - Privacy-safe: no user identifiers are logged or retained beyond the call.
 *  - Rapid reversibility: removing an id from ACTIVE_COHORT or setting
 *    COHORT_ENABLED=false immediately blocks all traffic without a deploy.
 *  - Named cohort: the set is an explicit typed constant, not an anonymous
 *    boolean flag, so code review can verify membership changes.
 */

/** Internal flag — must remain false until a separate server-side approval. */
const COHORT_ENABLED = false;

/**
 * The server-owned allowlist. Starts empty. Only added to after an explicit
 * offline review and approval; never populated by client input or feature
 * flags. Must remain empty in production until Task #467 is closed.
 */
const ACTIVE_COHORT: ReadonlySet<string> = new Set<string>();

export type CoachFactRolloutDecision = {
  cohortEligible: boolean;
  legacyFallbackEnabled: boolean;
  reason: "dark_default_deny" | "cohort_deny" | "cohort_eligible";
};

/**
 * Returns the server-authoritative rollout decision for the given external
 * user id. Never reads from the request, client flags, or env vars that a
 * client could influence.
 *
 * Returns `cohortEligible: true` only when:
 *  1. `COHORT_ENABLED` is true (server-controlled constant), AND
 *  2. The user id is present in the `ACTIVE_COHORT` allowlist.
 *
 * `legacyFallbackEnabled` is always false — there is no legacy Coach path
 * for this feature.
 */
export function getCoachFactRolloutDecision(externalUserId: string): CoachFactRolloutDecision {
  if (!COHORT_ENABLED) {
    return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
  }
  if (!ACTIVE_COHORT.has(externalUserId)) {
    return { cohortEligible: false, legacyFallbackEnabled: false, reason: "cohort_deny" };
  }
  return { cohortEligible: true, legacyFallbackEnabled: false, reason: "cohort_eligible" };
}

/**
 * Returns true only when the cohort gate is actively open AND the user is
 * in the approved cohort. Suitable for use in tests that need to simulate
 * eligibility checks without importing implementation details.
 */
export function isCohortEnabled(): boolean {
  return COHORT_ENABLED;
}

/** Exposed for testing: the current active cohort set (always empty in prod). */
export function getActiveCohort(): ReadonlySet<string> {
  return ACTIVE_COHORT;
}
