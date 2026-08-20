import type { Profile, WeightEntry } from '@/context/CaloraContext';

export function getLatestLoggedWeight(weights: readonly WeightEntry[]): number | null {
  return weights.length ? weights[weights.length - 1]?.kg ?? null : null;
}

export function getFirstLoggedWeight(weights: readonly WeightEntry[]): number | null {
  return weights.length ? weights[0]?.kg ?? null : null;
}

/** Preserves the current Coach profile/onboarding-first behavior. */
export function getProfileBaselineWeight(profile: Profile | null, weights: readonly WeightEntry[]): number | null {
  return profile?.weightKg ?? getFirstLoggedWeight(weights);
}

/** Preserves the current Coach serialization precision and null behavior. */
export function getCoachWeightChangeKg(profile: Profile | null, weights: readonly WeightEntry[]): number | null {
  const latest = getLatestLoggedWeight(weights);
  const baseline = getProfileBaselineWeight(profile, weights);
  return latest !== null && baseline !== null ? Number((latest - baseline).toFixed(1)) : null;
}

/** Preserves the current Insights trend-delta baseline: first logged to latest. */
export function getInsightsWeightDeltaKg(weights: readonly WeightEntry[]): number | null {
  const latest = getLatestLoggedWeight(weights);
  const first = getFirstLoggedWeight(weights);
  return latest !== null && first !== null ? latest - first : null;
}