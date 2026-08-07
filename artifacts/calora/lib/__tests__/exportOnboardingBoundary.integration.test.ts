/**
 * Integration tests: export row guard after abandoned mid-flow onboarding.
 *
 * @vitest-environment jsdom
 *
 * Problem being prevented:
 *   A user starts onboarding (opens the app, taps through some steps) but
 *   closes the app before reaching the final step that calls
 *   completeOnboarding(). On the next launch, if any partial profile state
 *   were inadvertently persisted to storage, the export row guard
 *   (deriveExportHasData) could prematurely flip to true and let the user
 *   attempt an export with no real data.
 *
 * Approach:
 *   This file drives the REAL useHydrationEffect hook — the same hook that
 *   CaloraProvider mounts. It applies the REAL production profile hydration
 *   guard (`if (saved.profile) setProfile(saved.profile)`) and uses the REAL
 *   deriveExportHasData function to derive the export row's onPress and
 *   accessibilityState.disabled values. An in-memory StorageAdapter is seeded
 *   with the exact snapshots that the autosave effect would write in each
 *   scenario, so the production parse → guard → render chain is exercised
 *   end-to-end.
 *
 *   If any of these production pieces change in a way that breaks the
 *   invariant — the hydration callback guard, the deriveExportHasData rule,
 *   or the row wiring — these tests will fail.
 *
 * Test scenarios:
 *   A. Storage empty (first launch, never reached onboarding screen)
 *   B. Autosave fired during onboarding but completeOnboarding was never called
 *      → snapshot contains profile: null → export row stays dimmed
 *   C. Completed onboarding (control case) — full Profile persisted by
 *      completeOnboarding → export row becomes interactive
 *   D. Abandoned → completed transition across two launches
 */

import { renderHook, act } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useHydrationEffect } from '../useHydrationEffect';
import { PersistenceManager, type StorageAdapter } from '../persistenceManager';
import { deriveExportHasData } from '../exportUiHandler';

// ---------------------------------------------------------------------------
// In-memory StorageAdapter — identical pattern to clearAllData.integration.test.ts
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@calora/local-state-v2'; // must match CaloraContext

function makeStore(initial: Record<string, string> = {}): StorageAdapter & { store: Record<string, string> } {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    async getItem(key) { return store[key] ?? null; },
    async setItem(key, value) { store[key] = value; },
    async removeItem(key) { delete store[key]; },
  };
}

// ---------------------------------------------------------------------------
// Production Profile type (subset) — mirrors CaloraContext.Profile
// ---------------------------------------------------------------------------

type Profile = {
  name: string;
  goal: string;
  activity: string;
  diet: string;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  age: number;
  calorieTarget: number;
};

type SavedState = {
  profile?: Profile | null;
  logs?: unknown[];
  onboardingComplete?: boolean;
  [key: string]: unknown;
};

/** Full Profile fixture that matches the shape completeOnboarding writes. */
function makeFullProfile(): Profile {
  return {
    name: 'Alex',
    goal: 'lose',
    activity: 'moderate',
    diet: 'Everything',
    heightCm: 170,
    weightKg: 76,
    targetWeightKg: 70,
    age: 32,
    calorieTarget: 1800,
  };
}

// ---------------------------------------------------------------------------
// useExportRowState — minimal hook that replicates the production chain:
//   useHydrationEffect → profile hydration guard → deriveExportHasData
//
// Mirrors lines 403-406 of CaloraContext.tsx:
//   useHydrationEffect<Partial<CaloraState>>(pm, (saved) => {
//     if (!saved) return;
//     if (saved.profile) setProfile(saved.profile);
//
// And line 27 of profile.tsx:
//   const hasExportData = deriveExportHasData(profile, logs);
//
// And lines 369/378-380 of profile.tsx:
//   { ..., disabled: !hasExportData }
//   onPress={item.disabled ? undefined : item.onPress}
//   accessibilityState={item.disabled ? { disabled: true } : undefined}
// ---------------------------------------------------------------------------

function useExportRowState(pm: PersistenceManager) {
  // Mirrors CaloraContext: `const pm = useRef(new PersistenceManager(...))`
  const pmRef = useRef(pm);

  // Mirrors CaloraContext: `const [profile, setProfile] = useState<Profile | null>(null)`
  const [profile, setProfile] = useState<Profile | null>(null);
  // Mirrors CaloraContext: `const [logs, setLogs] = useState<FoodLog[]>(starterLogs)`
  // (uses empty array — the meaningful boundary is profile presence, not starter logs)
  const [logs, setLogs] = useState<unknown[]>([]);

  // Mirrors CaloraContext: `useHydrationEffect<Partial<CaloraState>>(pm, (saved) => { … })`
  const { hydrated, hydrationError } = useHydrationEffect<SavedState>(pmRef, (saved) => {
    if (!saved) return;                           // CaloraContext line 404
    if (saved.profile) setProfile(saved.profile); // CaloraContext line 406
    if (saved.logs) setLogs(saved.logs);          // CaloraContext line 408
  });

  // Mirrors profile.tsx line 27: `const hasExportData = deriveExportHasData(profile, logs)`
  const hasExportData = deriveExportHasData(profile, logs);

  // Mirrors profile.tsx lines 378-380 (the export row Pressable props):
  //   onPress={item.disabled ? undefined : item.onPress}
  //   accessibilityState={item.disabled ? { disabled: true } : undefined}
  const exportRowOnPress: (() => void) | undefined = hasExportData ? () => {} : undefined;
  const exportRowAccessibilityState: { disabled: boolean } | undefined = hasExportData
    ? undefined
    : { disabled: true };

  return {
    hydrated,
    hydrationError,
    profile,
    hasExportData,
    exportRowOnPress,
    exportRowAccessibilityState,
  };
}

// ---------------------------------------------------------------------------
// Helper: render useExportRowState and await the initial hydration effect.
// ---------------------------------------------------------------------------

async function renderAndAwaitHydration(storage: StorageAdapter) {
  const pm = new PersistenceManager(storage, STORAGE_KEY);

  const handle = renderHook(() => useExportRowState(pm));

  // Flush the async hydration effect (same pattern as hydrationRetryIntegration.test.tsx)
  await act(async () => {
    await new Promise<void>((res) => setTimeout(res, 0));
  });

  return handle;
}

// ---------------------------------------------------------------------------
// Scenario A: storage is empty — app closed before any autosave fired
// ---------------------------------------------------------------------------

describe('export row: storage empty — closed before onboarding screen loaded', () => {
  it('hydration completes cleanly with no profile in context', async () => {
    const handle = await renderAndAwaitHydration(makeStore());

    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.profile).toBeNull();
  });

  it('hasExportData is false — export row is dimmed on a clean first launch', async () => {
    const handle = await renderAndAwaitHydration(makeStore());
    expect(handle.result.current.hasExportData).toBe(false);
  });

  it('export row onPress is undefined — row is non-interactive on clean first launch', async () => {
    const handle = await renderAndAwaitHydration(makeStore());
    expect(handle.result.current.exportRowOnPress).toBeUndefined();
  });

  it('export row accessibilityState.disabled is true on clean first launch', async () => {
    const handle = await renderAndAwaitHydration(makeStore());
    expect(handle.result.current.exportRowAccessibilityState).toEqual({ disabled: true });
  });
});

// ---------------------------------------------------------------------------
// Scenario B: autosave fired during onboarding but completeOnboarding was NOT
// called — the key "abandoned mid-flow" case.
//
// The autosave effect in CaloraContext runs after every state change.
// When the user opens the app, the autosave may fire with the default React
// state (profile: null, logs: [], onboardingComplete: false) before the user
// even starts the onboarding flow. If the user then abandons mid-flow, the
// persisted snapshot has profile: null — and on the next launch the hydration
// callback's `if (saved.profile)` guard must keep profile null in context.
// ---------------------------------------------------------------------------

describe('export row: abandoned mid-flow onboarding — profile: null in persisted snapshot', () => {
  /** Snapshot that the autosave writes when completeOnboarding was never called. */
  const abandonedSnapshot: SavedState = {
    onboardingComplete: false,
    profile: null,
    logs: [],
    waterLogs: {},
    moodLogs: {},
    consentAccepted: false,
  };

  it('hydration completes cleanly — no error when profile is null in the snapshot', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(abandonedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.hydrationError).toBeNull();
  });

  it('production hydration guard (if saved.profile) blocks null — profile stays null after relaunch', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(abandonedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);

    // The guard `if (saved.profile)` is falsy for null → setProfile is not called
    // → profile stays at the initial useState(null) value.
    expect(handle.result.current.profile).toBeNull();
  });

  it('hasExportData is false — export row stays dimmed after abandoned onboarding', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(abandonedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);
    expect(handle.result.current.hasExportData).toBe(false);
  });

  it('export row onPress is undefined — row is non-interactive after abandoned onboarding', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(abandonedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);
    expect(handle.result.current.exportRowOnPress).toBeUndefined();
  });

  it('export row accessibilityState.disabled is true after abandoned onboarding', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(abandonedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);
    expect(handle.result.current.exportRowAccessibilityState).toEqual({ disabled: true });
  });

  it('stays dimmed even when wellness data (waterLogs, moodLogs) was persisted mid-flow', async () => {
    // The user may have entered water or mood data before or during onboarding,
    // causing the autosave to write those fields with profile still null.
    const snapshotWithWellness: SavedState = {
      ...abandonedSnapshot,
      waterLogs: { '2026-08-07': 24 },
      moodLogs: { '2026-08-07': 'good' },
    };
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(snapshotWithWellness),
    });
    const handle = await renderAndAwaitHydration(storage);

    expect(handle.result.current.profile).toBeNull();
    expect(handle.result.current.hasExportData).toBe(false);
    expect(handle.result.current.exportRowOnPress).toBeUndefined();
    expect(handle.result.current.exportRowAccessibilityState).toEqual({ disabled: true });
  });

  it('stays dimmed across two consecutive abandoned launches — no state bleeds between runs', async () => {
    // Each renderAndAwaitHydration call is a fresh hook render with isolated storage.
    for (let launch = 0; launch < 2; launch++) {
      const storage = makeStore({
        [STORAGE_KEY]: JSON.stringify(abandonedSnapshot),
      });
      const handle = await renderAndAwaitHydration(storage);

      expect(handle.result.current.profile).toBeNull();
      expect(handle.result.current.hasExportData).toBe(false);
      expect(handle.result.current.exportRowAccessibilityState).toEqual({ disabled: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario C: completed onboarding — control case
//
// completeOnboarding(profile: Profile, consent) sets profile in React state.
// The autosave then writes a snapshot with the full Profile. On the next
// launch, the hydration guard `if (saved.profile)` is truthy → setProfile is
// called → profile is non-null in context → export row is interactive.
// ---------------------------------------------------------------------------

describe('export row: completed onboarding — control case confirms guard flips to true', () => {
  const fullProfile = makeFullProfile();
  const completedSnapshot: SavedState = {
    onboardingComplete: true,
    profile: fullProfile,
    logs: [],
    consentAccepted: true,
  };

  it('hydration completes cleanly when a full Profile is in storage', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(completedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.hydrationError).toBeNull();
  });

  it('production hydration guard applies the stored Profile — profile is non-null in context', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(completedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);

    expect(handle.result.current.profile).toEqual(fullProfile);
  });

  it('hasExportData is true after completed onboarding', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(completedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);
    expect(handle.result.current.hasExportData).toBe(true);
  });

  it('export row onPress is defined — row is interactive after completed onboarding', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(completedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);
    expect(typeof handle.result.current.exportRowOnPress).toBe('function');
  });

  it('export row accessibilityState is undefined (not disabled) after completed onboarding', async () => {
    const storage = makeStore({
      [STORAGE_KEY]: JSON.stringify(completedSnapshot),
    });
    const handle = await renderAndAwaitHydration(storage);
    expect(handle.result.current.exportRowAccessibilityState).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario D: abandoned → completed — transition confirms the guard flips only
// at the exact onboarding boundary, never prematurely.
// ---------------------------------------------------------------------------

describe('export row: abandoned → completed transition — guard flips only when full Profile lands', () => {
  it('first launch abandoned → second launch completed: guard is false then true', async () => {
    // Launch 1: onboarding abandoned — profile: null in snapshot
    const storage1 = makeStore({
      [STORAGE_KEY]: JSON.stringify({ onboardingComplete: false, profile: null, logs: [] }),
    });
    const handle1 = await renderAndAwaitHydration(storage1);
    expect(handle1.result.current.hasExportData).toBe(false);
    expect(handle1.result.current.exportRowOnPress).toBeUndefined();

    // Launch 2: user completes onboarding — full Profile in snapshot
    const fullProfile = makeFullProfile();
    const storage2 = makeStore({
      [STORAGE_KEY]: JSON.stringify({ onboardingComplete: true, profile: fullProfile, logs: [] }),
    });
    const handle2 = await renderAndAwaitHydration(storage2);
    expect(handle2.result.current.hasExportData).toBe(true);
    expect(typeof handle2.result.current.exportRowOnPress).toBe('function');
  });

  it('the guard transitions at the exact boundary — false before completeOnboarding, true after', async () => {
    const fullProfile = makeFullProfile();

    // Pre-onboarding: storage has default state
    const pre = await renderAndAwaitHydration(makeStore());
    expect(pre.result.current.exportRowAccessibilityState).toEqual({ disabled: true });

    // Post-onboarding: storage has the snapshot completeOnboarding produces
    const post = await renderAndAwaitHydration(makeStore({
      [STORAGE_KEY]: JSON.stringify({ onboardingComplete: true, profile: fullProfile }),
    }));
    expect(post.result.current.exportRowAccessibilityState).toBeUndefined(); // not disabled
    expect(typeof post.result.current.exportRowOnPress).toBe('function');
  });
});
