import {
  ApiError,
  deleteProfile,
  getProfile,
  updateProfile,
  type Profile as RemoteProfile,
  type ProfileInput,
} from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';

export const ONBOARDING_CONSENT_VERSION = 'calora-onboarding-v1';

export type ProfileRequestOptions = {
  accountId?: string;
  signal?: AbortSignal;
};

class ProfileIdentityChangedError extends Error {
  readonly name = 'ProfileIdentityChangedError';
}

function scopedRequestOptions(options: ProfileRequestOptions = {}) {
  const { accountId, signal } = options;
  if (!accountId) return { signal };
  const assertIdentity = async () => {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id !== accountId) {
      throw new ProfileIdentityChangedError('Profile request identity changed.');
    }
  };
  const getToken = async () => {
    await assertIdentity();
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id !== accountId) throw new ProfileIdentityChangedError('Profile request identity changed.');
    return data.session.access_token;
  };
  const refreshToken = async () => {
    await assertIdentity();
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.user.id !== accountId) throw new ProfileIdentityChangedError('Profile request identity changed.');
    return data.session.access_token;
  };
  return {
    signal,
    authIdentityGuard: assertIdentity,
    authTokenGetter: getToken,
    authTokenRefresher: refreshToken,
  };
}

export type LocalProfile = {
  name: string;
  goal: 'lose' | 'maintain' | 'gain';
  activity: 'low' | 'moderate' | 'high';
  diet: 'Everything' | 'Vegetarian' | 'Vegan' | 'High protein';
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  age: number;
  calorieTarget: number;
  proteinTargetGrams?: number;
  carbsTargetGrams?: number;
  fatTargetGrams?: number;
  targetMode?: 'automatic' | 'custom';
  units?: 'metric' | 'imperial';
};

export function toProfileInput(profile: LocalProfile): ProfileInput {
  return {
    name: profile.name.trim(),
    goal: profile.goal,
    activity: profile.activity,
    diet: profile.diet,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
    calorieTarget: profile.calorieTarget,
    targetMode: profile.targetMode ?? 'custom',
    proteinTargetGrams: profile.proteinTargetGrams ?? null,
    carbsTargetGrams: profile.carbsTargetGrams ?? null,
    fatTargetGrams: profile.fatTargetGrams ?? null,
    units: profile.units ?? 'metric',
    consentVersion: ONBOARDING_CONSENT_VERSION,
  };
}

/**
 * Remote storage owns onboarding fields and explicitly saved preferences. A
 * legacy remote row has NULL preference fields, which means unknown rather than
 * a default selected for the member; retain any local values in that case.
 */
export function mergeRemoteProfile(
  local: LocalProfile | null,
  remote: RemoteProfile,
): LocalProfile {
  const remoteHasPreferenceSnapshot = remote.targetMode != null || remote.units != null;
  return {
    ...(local ?? {}),
    name: remote.name,
    goal: remote.goal,
    activity: remote.activity,
    diet: remote.diet,
    heightCm: remote.heightCm,
    weightKg: remote.weightKg,
    targetWeightKg: remote.targetWeightKg,
    age: remote.age,
    calorieTarget: remote.calorieTarget,
    targetMode: remote.targetMode ?? local?.targetMode,
    proteinTargetGrams: remoteHasPreferenceSnapshot
      ? remote.proteinTargetGrams ?? undefined
      : local?.proteinTargetGrams,
    carbsTargetGrams: remoteHasPreferenceSnapshot
      ? remote.carbsTargetGrams ?? undefined
      : local?.carbsTargetGrams,
    fatTargetGrams: remoteHasPreferenceSnapshot
      ? remote.fatTargetGrams ?? undefined
      : local?.fatTargetGrams,
    units: remote.units ?? local?.units,
  };
}

export async function saveRemoteProfile(profile: LocalProfile, options?: ProfileRequestOptions): Promise<RemoteProfile> {
  return updateProfile(toProfileInput(profile), scopedRequestOptions(options));
}

export async function removeRemoteProfile(options?: ProfileRequestOptions): Promise<void> {
  await deleteProfile(scopedRequestOptions(options));
}

export function isMissingRemoteProfile(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export async function loadRemoteProfile(options?: ProfileRequestOptions): Promise<RemoteProfile> {
  return getProfile(scopedRequestOptions(options));
}

export type ProfileReconciliation =
  | { kind: 'restored'; profile: LocalProfile }
  | { kind: 'ready'; profile: LocalProfile | null };

/**
 * Resolve the launch boundary:
 * - a server profile restores a reinstall;
 * - a missing server profile bootstraps from a completed local profile;
 * - a missing profile with no local completion is a real first run;
 * - transport/auth errors remain errors and must not be mistaken for first run.
 */
export async function reconcileRemoteProfile(
  localProfile: LocalProfile | null,
  localOnboardingComplete: boolean,
  options?: ProfileRequestOptions,
): Promise<ProfileReconciliation> {
  try {
    const remote = await loadRemoteProfile(options);
    return {
      kind: 'restored',
      profile: mergeRemoteProfile(localProfile, remote),
    };
  } catch (error) {
    if (!isMissingRemoteProfile(error)) throw error;
    if (localProfile && localOnboardingComplete) {
      await saveRemoteProfile(localProfile, options);
    }
    return { kind: 'ready', profile: localProfile };
  }
}
