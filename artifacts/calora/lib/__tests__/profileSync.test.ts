import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ApiErrorMock, deleteProfileMock, getProfileMock, updateProfileMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number;

    constructor(status: number) {
      super(`HTTP ${status}`);
      this.status = status;
    }
  }

  return {
    ApiErrorMock,
    deleteProfileMock: vi.fn(),
    getProfileMock: vi.fn(),
    updateProfileMock: vi.fn(),
  };
});

vi.mock('@workspace/api-client-react', () => ({
  ApiError: ApiErrorMock,
  deleteProfile: deleteProfileMock,
  getProfile: getProfileMock,
  updateProfile: updateProfileMock,
}));

import {
  isMissingRemoteProfile,
  mergeRemoteProfile,
  reconcileRemoteProfile,
  removeRemoteProfile,
  toProfileInput,
} from '../profileSync';

const localProfile = {
  name: 'Alex',
  goal: 'lose' as const,
  activity: 'moderate' as const,
  diet: 'Everything' as const,
  heightCm: 170,
  weightKg: 76,
  targetWeightKg: 70,
  age: 32,
  calorieTarget: 1800,
  targetMode: 'automatic' as const,
  proteinTargetGrams: 140,
};

const remoteProfile = {
  name: 'Alex',
  goal: 'maintain' as const,
  activity: 'high' as const,
  diet: 'High protein' as const,
  heightCm: 171,
  weightKg: 75,
  targetWeightKg: 75,
  age: 33,
  calorieTarget: 2200,
  consentVersion: 'calora-onboarding-v1',
  updatedAt: '2026-09-09T12:00:00.000Z',
};

describe('profile sync launch boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores a completed account profile when local storage is empty after reinstall', async () => {
    getProfileMock.mockResolvedValue(remoteProfile);

    const result = await reconcileRemoteProfile(null, false);

    expect(result).toMatchObject({
      kind: 'restored',
      profile: {
        name: 'Alex',
        goal: 'maintain',
        activity: 'high',
        diet: 'High protein',
        age: 33,
        heightCm: 171,
        weightKg: 75,
        targetWeightKg: 75,
        calorieTarget: 2200,
      },
    });
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('does not mistake a missing remote profile for a completed account', async () => {
    getProfileMock.mockRejectedValue(new ApiErrorMock(404));

    await expect(reconcileRemoteProfile(null, false)).resolves.toEqual({
      kind: 'ready',
      profile: null,
    });
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('bootstraps the server once when an older completed local snapshot exists', async () => {
    getProfileMock.mockRejectedValue(new ApiErrorMock(404));
    updateProfileMock.mockResolvedValue(remoteProfile);

    await expect(reconcileRemoteProfile(localProfile, true)).resolves.toEqual({
      kind: 'ready',
      profile: localProfile,
    });
    expect(updateProfileMock).toHaveBeenCalledWith(toProfileInput(localProfile));
  });

  it('does not turn a transport failure into first-run onboarding', async () => {
    getProfileMock.mockRejectedValue(new ApiErrorMock(503));

    await expect(reconcileRemoteProfile(null, false)).rejects.toMatchObject({ status: 503 });
  });

  it('preserves local-only profile preferences while applying remote onboarding fields', () => {
    expect(mergeRemoteProfile(localProfile, remoteProfile)).toMatchObject({
      name: remoteProfile.name,
      goal: remoteProfile.goal,
      activity: remoteProfile.activity,
      diet: remoteProfile.diet,
      heightCm: remoteProfile.heightCm,
      weightKg: remoteProfile.weightKg,
      targetWeightKg: remoteProfile.targetWeightKg,
      age: remoteProfile.age,
      calorieTarget: remoteProfile.calorieTarget,
      targetMode: 'automatic',
      proteinTargetGrams: 140,
    });
  });

  it('sends only the durable onboarding contract and can delete it for clear-all', async () => {
    expect(toProfileInput(localProfile)).toEqual({
      name: 'Alex',
      goal: 'lose',
      activity: 'moderate',
      diet: 'Everything',
      age: 32,
      heightCm: 170,
      weightKg: 76,
      targetWeightKg: 70,
      calorieTarget: 1800,
      consentVersion: 'calora-onboarding-v1',
    });
    deleteProfileMock.mockResolvedValue(undefined);
    await removeRemoteProfile();
    expect(deleteProfileMock).toHaveBeenCalledOnce();
  });

  it('recognizes only an API 404 as an absent profile', () => {
    expect(isMissingRemoteProfile(new ApiErrorMock(404))).toBe(true);
    expect(isMissingRemoteProfile(new ApiErrorMock(500))).toBe(false);
  });
});