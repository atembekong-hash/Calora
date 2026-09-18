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
    consentVersion: ONBOARDING_CONSENT_VERSION,
  };
}

/**
 * Remote storage owns onboarding fields. Local-only macro/unit preferences are
 * retained when a device already has them, so reinstall restoration does not
 * accidentally erase a richer local profile shape.
 */
export function mergeRemoteProfile(
  local: LocalProfile | null,
  remote: RemoteProfile,
): LocalProfile {
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
    targetMode: local?.targetMode ?? 'custom',
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