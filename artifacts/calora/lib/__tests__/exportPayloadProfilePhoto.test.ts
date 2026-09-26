import { describe, expect, it } from 'vitest';
import {
  buildExportPayload,
  readPortableProfilePhoto,
  type CaloraExportState,
  type PortableProfilePhoto,
} from '../exportPayload';

function state(profilePhotoUri: string | null): CaloraExportState {
  return {
    onboardingComplete: true,
    onboardingStep: 0,
    profile: { name: 'Test' },
    logs: [],
    weights: [],
    waterLogs: {},
    moodLogs: {},
    activityLogs: {},
    activityMinutesLogs: {},
    savedMeals: [],
    localRecipes: [],
    savedRecipeIds: [],
    themePreference: 'system',
    plannerWeekStart: '2026-09-21',
    plannerMeals: [],
    shoppingItems: [],
    foodDrafts: [],
    foodMemories: [],
    repeatPatterns: [],
    memoryCorrections: [],
    livingMemory: {},
    hydrationReminders: {},
    mealReminders: {},
    goalReminder: {},
    notificationPreferences: {},
    healthConnected: false,
    healthConnection: null,
    dailyStepGoal: 10000,
    consentAccepted: true,
    outbox: [],
    coachConsentAccepted: false,
    coachMessages: [],
    goalCelebrationSeenTargetKg: null,
    plannerPreferences: null,
    fontSizeScale: 'default',
    profilePhotoUri,
  };
}

describe('portable profile photo export', () => {
  it('reads only an owned managed photo and returns portable JPEG bytes', async () => {
    const readBase64 = async () => 'dGVzdC1qcGVn';
    await expect(readPortableProfilePhoto('file:///managed/photo.jpg', {
      isManagedUri: (uri) => uri.startsWith('file:///managed/'),
      readBase64,
    })).resolves.toEqual({
      included: true,
      mimeType: 'image/jpeg',
      encoding: 'base64',
      data: 'dGVzdC1qcGVn',
    });
  });

  it('does not read an unmanaged path and reports it explicitly', async () => {
    let readCalled = false;
    await expect(readPortableProfilePhoto('file:///other/photo.jpg', {
      isManagedUri: () => false,
      readBase64: async () => { readCalled = true; return 'unexpected'; },
    })).resolves.toEqual({ included: false, reason: 'unmanaged-path' });
    expect(readCalled).toBe(false);
  });

  it('keeps the export usable when a managed photo can no longer be read', async () => {
    await expect(readPortableProfilePhoto('file:///managed/missing.jpg', {
      isManagedUri: () => true,
      readBase64: async () => { throw new Error('missing'); },
    })).resolves.toEqual({ included: false, reason: 'unavailable' });
  });

  it('embeds owned JPEG bytes and never emits the device-local file path', () => {
    const localUri = 'file:///private/calora-profile-photo-account-revision.jpg';
    const photo: PortableProfilePhoto = {
      included: true,
      mimeType: 'image/jpeg',
      encoding: 'base64',
      data: 'dGVzdC1qcGVn',
    };

    const payload = buildExportPayload(2, state(localUri), photo);
    const parsed = JSON.parse(payload);

    expect(parsed.profilePhoto).toEqual(photo);
    expect(parsed.profilePhotoUri).toBeUndefined();
    expect(payload).not.toContain(localUri);
  });

  it('records an explicit not-set marker when no profile photo exists', () => {
    const parsed = JSON.parse(buildExportPayload(2, state(null)));

    expect(parsed.profilePhoto).toEqual({ included: false, reason: 'not-set' });
    expect(parsed.profilePhotoUri).toBeUndefined();
  });

  it('records an explicit unavailable marker without leaking a stale local path', () => {
    const localUri = 'file:///private/calora-profile-photo-stale.jpg';
    const payload = buildExportPayload(2, state(localUri));
    const parsed = JSON.parse(payload);

    expect(parsed.profilePhoto).toEqual({ included: false, reason: 'unavailable' });
    expect(parsed.profilePhotoUri).toBeUndefined();
    expect(payload).not.toContain(localUri);
  });
});
