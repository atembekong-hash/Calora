import type { AllowanceFeature } from "./successful-allowance.js";

/**
 * CAL-PRO-012 is deliberately dark-launched. The existing monthly policy remains
 * authoritative until this environment flag is explicitly enabled and telemetry
 * has been reviewed by the owner.
 */
export const ADAPTIVE_FAIR_USE_ENABLED = process.env.CALORA_ADAPTIVE_FAIR_USE === "1";

export type AdaptiveFeaturePolicy = {
  monthlySafetyCeiling: number;
  dailySafetyCeiling: number;
  burst10Minute: number;
  emergencyDailySpendUsd: number;
  emergencyMonthlySpendUsd: number;
  cooldownSeconds: number;
  costReservePerOperationUsd: number;
};

/**
 * These are emergency safety ceilings, not advertised allowances. They are
 * intentionally high enough for legitimate batch use and remain inactive while
 * ADAPTIVE_FAIR_USE_ENABLED is false.
 */
export const ADAPTIVE_PRO_FEATURE_POLICY: Record<AllowanceFeature, AdaptiveFeaturePolicy> = {
  photo_scan: { monthlySafetyCeiling: 600, dailySafetyCeiling: 80, burst10Minute: 12, emergencyDailySpendUsd: 0.8, emergencyMonthlySpendUsd: 6, cooldownSeconds: 300, costReservePerOperationUsd: 0.01 },
  barcode_scan: { monthlySafetyCeiling: 2000, dailySafetyCeiling: 400, burst10Minute: 60, emergencyDailySpendUsd: 0.8, emergencyMonthlySpendUsd: 4, cooldownSeconds: 120, costReservePerOperationUsd: 0.002 },
  nutrition_label_scan: { monthlySafetyCeiling: 600, dailySafetyCeiling: 80, burst10Minute: 12, emergencyDailySpendUsd: 0.96, emergencyMonthlySpendUsd: 7.2, cooldownSeconds: 300, costReservePerOperationUsd: 0.012 },
  voice_log: { monthlySafetyCeiling: 600, dailySafetyCeiling: 120, burst10Minute: 20, emergencyDailySpendUsd: 1.8, emergencyMonthlySpendUsd: 9, cooldownSeconds: 300, costReservePerOperationUsd: 0.015 },
  receipt_scan: { monthlySafetyCeiling: 120, dailySafetyCeiling: 24, burst10Minute: 6, emergencyDailySpendUsd: 0.72, emergencyMonthlySpendUsd: 3.6, cooldownSeconds: 600, costReservePerOperationUsd: 0.03 },
  coach_message: { monthlySafetyCeiling: 2400, dailySafetyCeiling: 240, burst10Minute: 30, emergencyDailySpendUsd: 1.2, emergencyMonthlySpendUsd: 12, cooldownSeconds: 180, costReservePerOperationUsd: 0.005 },
  recipe_creation: { monthlySafetyCeiling: 120, dailySafetyCeiling: 24, burst10Minute: 4, emergencyDailySpendUsd: 1.92, emergencyMonthlySpendUsd: 9.6, cooldownSeconds: 900, costReservePerOperationUsd: 0.08 },
};

export type AdaptiveWindowSnapshot = {
  count10Minute: number;
  count24Hour: number;
  countMonth?: number;
  estimatedSpendDailyUsd?: number;
  estimatedSpendMonthlyUsd?: number;
  estimatedSpendUsd: number;
  now?: Date;
};

export type AdaptiveDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSecs: number; reason: "burst" | "cost" };

export function getProAllowanceLimit(
  feature: AllowanceFeature,
  legacyLimit: number,
  adaptiveEnabled = ADAPTIVE_FAIR_USE_ENABLED,
): number {
  return adaptiveEnabled
    ? ADAPTIVE_PRO_FEATURE_POLICY[feature].monthlySafetyCeiling
    : legacyLimit;
}

export function evaluateAdaptiveWindow(
  feature: AllowanceFeature,
  snapshot: AdaptiveWindowSnapshot,
): AdaptiveDecision {
  const policy = ADAPTIVE_PRO_FEATURE_POLICY[feature];
  const dailySpend = snapshot.estimatedSpendDailyUsd ?? snapshot.estimatedSpendUsd;
  const monthlySpend = snapshot.estimatedSpendMonthlyUsd ?? snapshot.estimatedSpendUsd;
  if (dailySpend > policy.emergencyDailySpendUsd || monthlySpend > policy.emergencyMonthlySpendUsd) {
    return { allowed: false, retryAfterSecs: policy.cooldownSeconds, reason: "cost" };
  }
  if (snapshot.count10Minute >= policy.burst10Minute || snapshot.count24Hour >= policy.dailySafetyCeiling || (snapshot.countMonth ?? 0) >= policy.monthlySafetyCeiling) {
    return { allowed: false, retryAfterSecs: policy.cooldownSeconds, reason: "burst" };
  }
  return { allowed: true };
}
