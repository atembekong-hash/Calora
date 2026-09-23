import { describe, expect, it } from 'vitest';
import { getInviteDestination, getRootAccessGateState } from '../rootAccessGate';

describe('root access gate', () => {
  it('keeps every protected route unavailable before hydration, reconciliation, onboarding, and consent complete', () => {
    const incompleteStates = [
      { hydrated: false, hydrationError: null, profileSyncReady: false, onboardingComplete: false },
      { hydrated: true, hydrationError: new Error('storage unavailable'), profileSyncReady: true, onboardingComplete: false },
      { hydrated: true, hydrationError: null, profileSyncReady: false, onboardingComplete: false },
      { hydrated: true, hydrationError: null, profileSyncReady: true, onboardingComplete: false },
    ];

    for (const state of incompleteStates) {
      expect(getRootAccessGateState({ ...state, reviewRequested: false })).toEqual({
        applicationReady: false,
        allowOnboarding: true,
        allowApplication: false,
      });
    }
  });

  it('admits protected routes only after the completed state and permits explicit onboarding review', () => {
    expect(getRootAccessGateState({
      hydrated: true,
      hydrationError: null,
      profileSyncReady: true,
      onboardingComplete: true,
      reviewRequested: false,
    })).toEqual({
      applicationReady: true,
      allowOnboarding: false,
      allowApplication: true,
    });

    expect(getRootAccessGateState({
      hydrated: true,
      hydrationError: null,
      profileSyncReady: true,
      onboardingComplete: true,
      reviewRequested: true,
    })).toEqual({
      applicationReady: true,
      allowOnboarding: true,
      allowApplication: true,
    });
  });

  it('does not let a signed-in invitation link bypass incomplete onboarding', () => {
    expect(getInviteDestination(false, false)).toBe('/auth/sign-up');
    expect(getInviteDestination(true, false)).toBe('/');
    expect(getInviteDestination(true, true)).toBe('/(tabs)/profile');
  });
});

describe('legacy starter fixture migration', () => {
  it('removes only exact historical starter rows and retains changed or user-created rows', async () => {
    const { removeExactLegacyStarterFixtures } = await import('../legacyStarterFixtures');
    const starter = {
      id: 'starter-oats',
      name: 'Overnight oats with berries',
      meal: 'Breakfast' as const,
      calories: 420,
      protein: 18,
      carbs: 58,
      fat: 14,
      fiber: 8,
      sugar: 19,
      sodium: 180,
      source: 'USDA verified' as const,
      confidence: 98,
      time: '8:10 AM',
      serving: '1 bowl',
      preparation: 'Ready to eat',
      date: '2026-09-23',
    };
    const changedStarterId = { ...starter, calories: 421 };
    const realUserLog = { ...starter, id: 'user-oats', name: 'My overnight oats' };

    const migrated = removeExactLegacyStarterFixtures({
      logs: [starter, changedStarterId, realUserLog],
    });

    expect(migrated.logs).toEqual([changedStarterId, realUserLog]);
  });
});

describe('barcode duplicate-capture contract', () => {
  it('claims a synchronous lock before dispatching asynchronous barcode analysis', async () => {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const source = await readFile(resolve(__dirname, '../../app/(tabs)/scan.tsx'), 'utf8');

    expect(source).toContain('if (barcodeLockRef.current || hasScanned || captureBusy');
    expect(source).toContain('barcodeLockRef.current = { barcode, sequence };');
    expect(source).toContain('setHasScanned(true);\n    void submitAnalysis({ mode, barcode }, undefined, sequence);');
    expect(source).toContain("barcodeLockRef.current?.sequence !== barcodeSequence");
    expect(source).toContain("onBarcodeScanned={cameraMode === 'video' || mode === 'food' || mode === 'label' || hasScanned || barcodeLockRef.current || !cameraReady ? undefined : onBarcodeScanned}");
  });
});
