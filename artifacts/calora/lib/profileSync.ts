import {
  ApiError,
  customFetch,
} from '@workspace/api-client-react';

export const ONBOARDING_CONSENT_VERSION = 'calora-onboarding-v1';

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

export type ProfileInput = Pick<
  LocalProfile,
  'name' | 'goal' | 'activity' | 'diet' | 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'calorieTarget'
> & {
  consentVersion: string;
};

export type RemoteProfile = ProfileInput & {
  updatedAt: string | Date;
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

export async function saveRemoteProfile(profile: LocalProfile): Promise<RemoteProfile> {
  return customFetch<RemoteProfile>('/v1/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toProfileInput(profile)),
  });
}

export async function removeRemoteProfile(): Promise<void> {
  await customFetch<void>('/v1/profile', { method: 'DELETE' });
}

export function isMissingRemoteProfile(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export async function loadRemoteProfile(): Promise<RemoteProfile> {
  return customFetch<RemoteProfile>('/v1/profile', { method: 'GET' });
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
): Promise<ProfileReconciliation> {
  try {
    const remote = await loadRemoteProfile();
    return {
      kind: 'restored',
      profile: mergeRemoteProfile(localProfile, remote),
    };
  } catch (error) {
    if (!isMissingRemoteProfile(error)) throw error;
    if (localProfile && localOnboardingComplete) {
      await saveRemoteProfile(localProfile);
    }
    return { kind: 'ready', profile: localProfile };
  }
}