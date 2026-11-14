import type { AllowanceFeature } from "./successful-allowance.js";

/**
 * CAL-PRO-012 is deliberately dark-launched. The existing monthly policy remains
 * authoritative until this environment flag is explicitly enabled and telemetry
 * has been reviewed by the owner.
 */
export const ADAPTIVE_FAIR_USE_ENABLED = process.env.CALORA_ADAPTIVE_FAIR_USE === "1";

export type AdaptiveFeaturePolicy = {
  monthlySafetyCeiling: number;
  burst10Minute: number;
  burst24Hour: number;
  cooldownSeconds: number;
  estimatedCostReserveUsd: number;
};

/**
 * These are emergency safety ceilings, not advertised allowances. They are
 * intentionally high enough for legitimate batch use and remain inactive while
 * ADAPTIVE_FAIR_USE_ENABLED is false.
 */
export const ADAPTIVE_PRO_FEATURE_POLICY: Record<AllowanceFeature, AdaptiveFeaturePolicy> = {
  photo_scan: { monthlySafetyCeiling: 600, burst10Minute: 12, burst24Hour: 80, cooldownSeconds: 300, estimatedCostReserveUsd: 0.01 },
  barcode_scan: { monthlySafetyCeiling: 2000, burst10Minute: 60, burst24Hour: 400, cooldownSeconds: 120, estimatedCostReserveUsd: 0.002 },
  nutrition_label_scan: { monthlySafetyCeiling: 600, burst10Minute: 12, burst24Hour: 80, cooldownSeconds: 300, estimatedCostReserveUsd: 0.012 },
  voice_log: { monthlySafetyCeiling: 600, burst10Minute: 20, burst24Hour: 120, cooldownSeconds: 300, estimatedCostReserveUsd: 0.015 },
  receipt_scan: { monthlySafetyCeiling: 120, burst10Minute: 6, burst24Hour: 24, cooldownSeconds: 600, estimatedCostReserveUsd: 0.03 },
  coach_message: { monthlySafetyCeiling: 2400, burst10Minute: 30, burst24Hour: 240, cooldownSeconds: 180, estimatedCostReserveUsd: 0.005 },
  recipe_creation: { monthlySafetyCeiling: 120, burst10Minute: 4, burst24Hour: 24, cooldownSeconds: 900, estimatedCostReserveUsd: 0.08 },
};

export type AdaptiveWindowSnapshot = {
  count10Minute: number;
  count24Hour: number;
  estimatedSpendUsd: number;
  now?: Date;
};

export type AdaptiveDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSecs: number; reason: "burst" | "cost" };

export function getProAllowanceLimit(
  feature: AllowanceFeature,
  legacyLimit: number,
): number {
  return ADAPTIVE_FAIR_USE_ENABLED
    ? ADAPTIVE_PRO_FEATURE_POLICY[feature].monthlySafetyCeiling
    : legacyLimit;
}

export function evaluateAdaptiveWindow(
  feature: AllowanceFeature,
  snapshot: AdaptiveWindowSnapshot,
): AdaptiveDecision {
  const policy = ADAPTIVE_PRO_FEATURE_POLICY[feature];
  if (snapshot.estimatedSpendUsd > policy.estimatedCostReserveUsd * policy.burst24Hour) {
    return { allowed: false, retryAfterSecs: policy.cooldownSeconds, reason: "cost" };
  }
  if (snapshot.count10Minute >= policy.burst10Minute || snapshot.count24Hour >= policy.burst24Hour) {
    return { allowed: false, retryAfterSecs: policy.cooldownSeconds, reason: "burst" };
  }
  return { allowed: true };
}
