/**
 * Rollout controls intentionally deny every account until a separate approval
 * authorizes a reviewed server-side cohort source. These structures are kept
 * separate from the endpoint gate and consent so a future rollout cannot
 * accidentally treat a client flag or transport failure as authorization.
 */
export type CoachFactRolloutDecision = {
  cohortEligible: boolean;
  legacyFallbackEnabled: boolean;
  reason: "dark_default_deny";
};

export function getCoachFactRolloutDecision(_externalUserId: string): CoachFactRolloutDecision {
  return { cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" };
}