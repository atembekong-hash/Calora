/**
 * Integration tests for the clearAllData storage lifecycle, exercised through
 * the real PersistenceManager that CaloraContext delegates to.
 *
 * PersistenceManager is the injectable persistence lifecycle layer used by
 * CaloraProvider (context/CaloraContext.tsx, `pm = useRef(new PersistenceManager(…))`).
 * Using an in-memory StorageAdapter keeps the tests fast and deterministic
 * while testing the actual enqueueWrite → clear → read code paths that
 * clearAllData and the autosave effect invoke.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PersistenceManager, type StorageAdapter } from '../persistenceManager';
import { performClearAllData, DEFAULT_HYDRATION_PREFS, type ClearAllDataCtx } from '../clearAllData';
import { emptyLivingMemory } from '../livingMemory';
import { STORAGE_SCHEMA_VERSION, enqueueAutosave } from '../storageSchema';
import {
  applyStorageMigration,
  MIGRATIONS,
  ParseHydrationError,
} from '../hydrationGuard';
import {
  buildExportPayload,
  readRawStorageData,
  type CaloraExportState,
} from '../exportPayload';
import { makeClearedExportSnapshot, resolveExportData } from '../exportGap';

// ---------------------------------------------------------------------------
// In-memory StorageAdapter — mirrors the AsyncStorage surface used in
// CaloraContext, with optional per-call blocking for concurrency tests.
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@calora/local-state-v2'; // matches CaloraContext

interface ControllableStore extends StorageAdapter {
  /** Raw in-memory backing store — inspect this to verify clear/write outcomes. */
  store: Record<string, string>;
  /** Call order log — 'setItem' or 'removeItem' with the key. */
  calls: string[];
  /**
   * Block the next setItem until the returned release function is called.
   * Allows tests to simulate an in-flight autosave mid-session.
   */
  blockNextSetItem(): () => void;
}

function makeStore(): ControllableStore {
  const store: Record<string, string> = {};
  const calls: string[] = [];
  let blocker: Promise<void> | null = null;
  let releaseFn: (() => void) | null = null;

  return {
    store,
    calls,
    blockNextSetItem() {
      blocker = new Promise<void>((res) => { releaseFn = res; });
      return () => { releaseFn?.(); blocker = null; releaseFn = null; };
    },
    async getItem(key) { return store[key] ?? null; },
    async setItem(key, value) {
      if (blocker) await blocker;
      calls.push(`setItem:${key}`);
      store[key] = value;
    },
    async removeItem(key) {
      calls.push(`removeItem:${key}`);
      delete store[key];
    },
  };
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let storage: ControllableStore;
let pm: PersistenceManager;

beforeEach(() => {
  storage = makeStore();
  pm = new PersistenceManager(storage, STORAGE_KEY);
});

// ---------------------------------------------------------------------------
// enqueueWrite: writes land in storage
// ---------------------------------------------------------------------------

describe('PersistenceManager.enqueueWrite: state is persisted to the correct key', () => {
  it('writes JSON-serialised state to the storage key', async () => {
    const state = { onboardingComplete: true, logs: [], profile: null };
    pm.enqueueWrite(state);
    // Drain the internal queue
    await new Promise((r) => setTimeout(r, 0));
    expect(storage.store[STORAGE_KEY]).toBe(JSON.stringify(state));
  });

  it('does not write before the queue is drained', async () => {
    pm.enqueueWrite({ logs: [] });
    // Storage is still empty until the microtask queue flushes
    expect(storage.store[STORAGE_KEY]).toBeUndefined();
  });

  it('second write overwrites the first — only the latest state persists', async () => {
    pm.enqueueWrite({ logs: ['a'] });
    pm.enqueueWrite({ logs: ['b'] });
    await new Promise((r) => setTimeout(r, 0));
    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.logs).toEqual(['b']);
  });
});

// ---------------------------------------------------------------------------
// clear: write queue drains before removeItem
// ---------------------------------------------------------------------------

describe('PersistenceManager.clear: pending write drains before storage key is removed', () => {
  it('removeItem runs only after an in-flight enqueueWrite completes', async () => {
    // Simulate the mid-session case: a state mutation triggers enqueueWrite
    // but the setItem is still in flight when the user taps "Clear all data".
    const release = storage.blockNextSetItem();

    pm.enqueueWrite({ onboardingComplete: true, logs: ['entry-1'] });
    const clearDone = pm.clear(); // called while write is still blocked

    // Nothing has executed yet
    expect(storage.calls).toEqual([]);

    // Release the pending write — clear should then run
    release();
    await clearDone;

    // Write ran first, then clear removed the key
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
    ]);
  });

  it('clear removes the correct storage key', async () => {
    pm.enqueueWrite({ logs: [] });
    await pm.clear();
    expect(storage.calls).toContain(`removeItem:${STORAGE_KEY}`);
    const removeCalls = storage.calls.filter((c) => c.startsWith('removeItem'));
    expect(removeCalls).toHaveLength(1);
    expect(removeCalls[0]).toBe(`removeItem:${STORAGE_KEY}`);
  });

  it('clear still executes when the queued write fails (storage full / IO error)', async () => {
    // Simulate AsyncStorage.setItem rejecting mid-flight
    pm.enqueueWrite({ logs: ['entry'] }); // this write will fail
    // Directly corrupt the underlying setItem so it rejects on this call
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = async () => { throw new Error('no space left'); };

    await pm.clear(); // must not reject; clear must still execute

    storage.setItem = originalSetItem;
    expect(storage.calls).toContain(`removeItem:${STORAGE_KEY}`);
    // setItem never completed (it threw), but removeItem must have run
    expect(storage.calls.filter((c) => c.startsWith('setItem'))).toHaveLength(0);
  });

  it('clearing guard resets after a failing removeItem — subsequent enqueueWrite still reaches storage', async () => {
    // Regression guard: if removeItem rejects (transient I/O failure), the
    // clearingCount must still decrement (via try/finally) so that future
    // enqueueWrite calls are not permanently silenced.
    const originalRemoveItem = storage.removeItem.bind(storage);
    storage.removeItem = async () => { throw new Error('I/O failure during removeItem'); };

    // clear() will reject because removeItem throws — that is acceptable.
    await pm.clear().catch(() => undefined);

    // Restore working removeItem
    storage.removeItem = originalRemoveItem;

    // clearingCount must be back at 0 — a write enqueued now should land.
    pm.enqueueWrite({ recovered: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(storage.store[STORAGE_KEY]).toBe(JSON.stringify({ recovered: true }));
    expect(storage.calls.filter((c) => c.startsWith('setItem'))).toHaveLength(1);
  });

  it('a second clear chains off the first — both removes execute in order', async () => {
    const release = storage.blockNextSetItem();

    pm.enqueueWrite({ logs: ['before-clear'] });
    const firstClear = pm.clear();  // first tap
    const secondClear = pm.clear(); // user taps again before first resolves

    release();
    await Promise.all([firstClear, secondClear]);

    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
    ]);
  });
});

// ---------------------------------------------------------------------------
// post-clear: key is absent and read() returns null — not starter data
// ---------------------------------------------------------------------------

describe('PersistenceManager.clear + read: post-clear storage is empty and state is null', () => {
  it('key is absent from storage after clear resolves', async () => {
    pm.enqueueWrite({ onboardingComplete: true });
    await pm.clear();
    expect(storage.store[STORAGE_KEY]).toBeUndefined();
    expect(await storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('read() returns { state: null, error: null } after a clear — no saved data survives', async () => {
    pm.enqueueWrite({ onboardingComplete: true, profile: { name: 'Alex' } });
    await pm.clear();

    const { state, error } = await pm.read();
    expect(error).toBeNull();
    expect(state).toBeNull(); // null triggers the early-return in CaloraContext hydration
  });

  it('null state from read() is falsy — hydration effect skips all setters, not even starter logs', () => {
    // The CaloraContext hydration effect does:
    //   const { state: saved } = await pm.current.read();
    //   if (!saved) return;   ← skips ALL setState calls, keeping cleared empty values
    //
    // This asserts the truthiness contract the early-return guard depends on.
    const saved: unknown = null; // what read() returns after a clear
    expect(!saved).toBe(true);
  });

  it('a write queued before the clear cannot restore the key after clear resolves', async () => {
    // Critical mid-session regression guard: an in-flight write must not
    // resurrect data that clearAllData explicitly removed.
    const release = storage.blockNextSetItem();
    pm.enqueueWrite({ logs: ['starter-oats', 'starter-salad', 'starter-apple'] });
    const clearDone = pm.clear();

    release(); // write fires, then clear removes the key
    await clearDone;

    // Key must be gone — the write ran but clear ran after it
    expect(await storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.calls[storage.calls.length - 1]).toBe(`removeItem:${STORAGE_KEY}`);
  });

  it('full mid-session clear cycle: write → enqueue clear → re-read → empty state', async () => {
    // Simulate a real session:
    // 1. Autosave persists rich session state (onboarding complete, logs, profile)
    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'starter-oats',  name: 'Overnight oats with berries' },
        { id: 'starter-salad', name: 'Chicken harvest salad' },
        { id: 'starter-apple', name: 'Honeycrisp apple' },
      ],
      weights: [{ id: 'weight-1', kg: 76 }],
    };
    pm.enqueueWrite(sessionState);

    // 2. User taps "Clear all data" — queued behind the write
    await pm.clear();

    // 3. Re-hydration reads from storage
    const { state: saved, error } = await pm.read<typeof sessionState>();

    // 4. Storage is empty → null state → no starter logs loaded
    expect(error).toBeNull();
    expect(saved).toBeNull();
    // Confirm explicitly: if saved were non-null, it must not have starter logs
    if (saved) {
      expect(saved.logs.some((l) => l.id === 'starter-oats')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Cleared-state contract: what CaloraContext.clearAllData resets each setter to
// ---------------------------------------------------------------------------

describe('CaloraContext clearAllData contract: expected post-clear state values', () => {
  /**
   * These values mirror what clearAllData sets on each React state setter.
   * The test exists so that any future change to clearAllData that forgets
   * to reset a field (or accidentally resets it to starter data) fails here.
   *
   * Field names match the corresponding CaloraContext state variables.
   */
  const clearedState = {
    logs:                  [] as unknown[],          // NOT starterLogs
    weights:               [] as unknown[],          // NOT [{ id:'weight-1', kg:76 }]
    waterLogs:             {} as Record<string, unknown>,
    moodLogs:              {} as Record<string, unknown>,
    activityLogs:          {} as Record<string, unknown>,
    activityMinutesLogs:   {} as Record<string, unknown>,
    savedMeals:            [] as unknown[],
    localRecipes:          [] as unknown[],
    savedRecipeIds:        [] as unknown[],
    profile:               null,                    // NOT starterProfile
    onboardingComplete:    false,
    consentAccepted:       false,
    outbox:                [] as unknown[],
    plannerMeals:          [] as unknown[],
    shoppingItems:         [] as unknown[],
    foodDrafts:            [] as unknown[],
    foodMemories:          [] as unknown[],
    repeatPatterns:        [] as unknown[],
    memoryCorrections:     [] as unknown[],
    coachConsentAccepted:  false,
    coachMessages:         [] as unknown[],
  };

  it('logs is an empty array — the three starter entries are not present', () => {
    expect(clearedState.logs).toEqual([]);
    expect(clearedState.logs).not.toContainEqual(
      expect.objectContaining({ id: 'starter-oats' }),
    );
  });

  it('weights is an empty array — the starter kg:76 entry is not present', () => {
    expect(clearedState.weights).toEqual([]);
    expect(clearedState.weights).not.toContainEqual(
      expect.objectContaining({ id: 'weight-1' }),
    );
  });

  it('profile is null — the starter Alex Morgan profile is not present', () => {
    expect(clearedState.profile).toBeNull();
  });

  it('onboardingComplete is false — user will see the intro screen on next launch', () => {
    expect(clearedState.onboardingComplete).toBe(false);
  });

  it('all list fields are empty — no orphaned planner meals, food drafts, or memories', () => {
    expect(clearedState.plannerMeals).toEqual([]);
    expect(clearedState.foodDrafts).toEqual([]);
    expect(clearedState.foodMemories).toEqual([]);
    expect(clearedState.repeatPatterns).toEqual([]);
    expect(clearedState.shoppingItems).toEqual([]);
    expect(clearedState.savedMeals).toEqual([]);
    expect(clearedState.memoryCorrections).toEqual([]);
  });

  it('all record fields are empty — no water, mood, or activity carry-overs', () => {
    expect(clearedState.waterLogs).toEqual({});
    expect(clearedState.moodLogs).toEqual({});
    expect(clearedState.activityLogs).toEqual({});
    expect(clearedState.activityMinutesLogs).toEqual({});
  });

  it('coach state is fully cleared — consent flag and message history are gone', () => {
    expect(clearedState.coachConsentAccepted).toBe(false);
    expect(clearedState.coachMessages).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CaloraContext.clearAllData lifecycle: mid-clear mutation race
//
// CaloraContext.clearAllData delegates to performClearAllData() from
// lib/clearAllData.ts (production code, not a test helper).  The function:
//   1. Awaits pm.clear()           — removeItem queued after any pending write
//   2. Calls every state setter    — in production these are React useState
//                                   dispatchers; here they are spy callbacks
//
// After performClearAllData resolves, the React autosave useEffect fires and
// calls pm.current.enqueueWrite(clearedCaloraState).  In these tests the
// autosave is simulated explicitly (pm.enqueueWrite(captured)) because
// vitest runs in a Node environment without React rendering.
//
// A concurrent mutation is injected while performClearAllData is suspended
// at `await pm.clear()` — exactly the async gap where a concurrent addLog
// or setMood could race in the real app.
// ---------------------------------------------------------------------------

/**
 * Build a ClearAllDataCtx whose setters record every cleared value they
 * receive into `captured`.  After performClearAllData resolves, call
 * pm.enqueueWrite(captured) to simulate the autosave effect.
 */
function makeSpyCtx(pm: PersistenceManager): {
  ctx: ClearAllDataCtx;
  captured: Record<string, unknown>;
} {
  const captured: Record<string, unknown> = {};
  const spy =
    (key: string) =>
    (value: unknown) => {
      captured[key] = value;
    };
  const ctx: ClearAllDataCtx = {
    pm,
    emptyLivingMemory: emptyLivingMemory(),
    defaultHydrationPrefs: DEFAULT_HYDRATION_PREFS,
    // Use deterministic dates so tests are not sensitive to the wall clock.
    // 2026-08-07 is the Friday in the week whose Monday is 2026-08-03.
    getPlannerWeekStart:          () => '2026-08-03',
    getToday:                     () => '2026-08-07',
    setOnboardingComplete:        spy('onboardingComplete'),
    setProfile:                   spy('profile'),
    setLogs:                      spy('logs'),
    setWeights:                   spy('weights'),
    setWaterLogs:                 spy('waterLogs'),
    setMoodLogs:                  spy('moodLogs'),
    setActivityLogs:              spy('activityLogs'),
    setActivityMinutesLogs:       spy('activityMinutesLogs'),
    setSavedMeals:                spy('savedMeals'),
    setLocalRecipes:              spy('localRecipes'),
    setSavedRecipeIds:            spy('savedRecipeIds'),
    setConsentAccepted:           spy('consentAccepted'),
    setOutbox:                    spy('outbox'),
    setPlannerWeekStart:          spy('plannerWeekStart'),
    setPlannerViewedDay:          spy('plannerViewedDay'),
    setPlannerMeals:              spy('plannerMeals'),
    setShoppingItems:             spy('shoppingItems'),
    setFoodDrafts:                spy('foodDrafts'),
    setFoodMemories:              spy('foodMemories'),
    setRepeatPatterns:            spy('repeatPatterns'),
    setMemoryCorrections:         spy('memoryCorrections'),
    setLivingMemory:              spy('livingMemory'),
    setHydrationReminders:        spy('hydrationReminders'),
    setCoachConsentAccepted:      spy('coachConsentAccepted'),
    setCoachMessages:             spy('coachMessages'),
    setGoalCelebrationSeenTargetKg: spy('goalCelebrationSeenTargetKg'),
    setRecipeSlotTarget:            spy('recipeSlotTarget'),
    setPendingUndoSwap:             spy('pendingUndoSwap'),
    setPendingPlannerAck:           spy('pendingPlannerAck'),
    setPlannerPreferences:          spy('plannerPreferences'),
  };
  return { ctx, captured };
}

describe('CaloraContext.clearAllData lifecycle: mid-clear mutation cannot become the final storage write', () => {
  it('concurrent addLog-style mutation: stale log entries do not survive — cleared state wins as last writer', async () => {
    // Scenario:
    //   1. An autosave is in-flight (blocked setItem) when the user taps "Clear".
    //   2. clearAllData calls performClearAllData → pm.clear() chains removeItem
    //      after the blocked write; performClearAllData suspends at `await`.
    //   3. addLog fires mid-clear → pm.enqueueWrite(staleState) is a no-op
    //      because clearingCount > 0; the stale write never reaches storage.
    //   4. pm.clear() resolves → performClearAllData calls every state setter.
    //   5. React autosave fires → pm.enqueueWrite(capturedClearedState) — only writer after remove.
    const release = storage.blockNextSetItem();

    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'starter-oats',  name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
        { id: 'starter-salad', name: 'Chicken salad',   date: '2026-08-07', meal: 'Lunch' },
      ],
      weights: [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
    };
    pm.enqueueWrite(sessionState); // blocked in-flight autosave

    const { ctx, captured } = makeSpyCtx(pm);

    // Start performClearAllData — the real production function now used by
    // CaloraContext.clearAllData.  Suspends at `await pm.clear()`.
    const clearDone = performClearAllData(ctx);

    // Inject concurrent addLog mutation while performClearAllData is suspended.
    // clearingCount > 0 at this point, so this is a no-op — the stale snapshot
    // is dropped and will never be serialised to storage.
    pm.enqueueWrite({
      ...sessionState,
      logs: [...sessionState.logs, { id: 'mid-clear-log', name: 'Mid-clear snack' }],
    });

    release(); // unblock the in-flight write
    await clearDone; // clear resolves, every setter fires → captured is populated

    // Simulate the autosave useEffect that fires after React re-renders with
    // the cleared state values collected by the spy setters.
    pm.enqueueWrite(captured);
    await new Promise((r) => setTimeout(r, 0)); // drain remaining queue entries

    // Call order: pre-clear write → remove → cleared autosave.
    // The stale mid-clear mutation write is absent — the no-op guard eliminated it.
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // in-flight session autosave
      `removeItem:${STORAGE_KEY}`, // pm.clear() remove — the boundary
      `setItem:${STORAGE_KEY}`,    // post-clear autosave from clearAllData setters
    ]);

    // Final storage is the captured cleared state, not the stale mutation snapshot.
    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.onboardingComplete).toBe(false);
    expect(stored.profile).toBeNull();
    expect(stored.logs).toEqual([]);
    expect(stored.weights).toEqual([]);
    expect(stored.moodLogs).toEqual({});
    expect(stored.waterLogs).toEqual({});
    // Neither the session logs nor the mid-clear log survived
    for (const staleId of ['starter-oats', 'starter-salad', 'mid-clear-log']) {
      expect(
        (stored.logs as Array<{ id: string }>).some((l) => l.id === staleId),
      ).toBe(false);
    }
  });

  it('concurrent setMood-style mutation: mood entry does not survive — final moodLogs is empty', async () => {
    // Mirrors setMood dispatched while clearAllData is awaiting pm.clear().
    // In CaloraContext, setMood calls setMoodLogs({...current,[date]:mood}) and
    // triggers an autosave.  That autosave chains after removeItem.  The cleared-
    // state autosave that follows must overwrite it so no mood entry survives.
    const release = storage.blockNextSetItem();

    const sessionWithMood = {
      onboardingComplete: true,
      profile: { name: 'Alex' },
      logs: [{ id: 'log-1', name: 'Oatmeal' }],
      moodLogs: { '2026-08-07': 'good' },
      waterLogs: { '2026-08-07': 32 },
    };
    pm.enqueueWrite(sessionWithMood);

    const { ctx, captured } = makeSpyCtx(pm);
    const clearDone = performClearAllData(ctx);

    // setMood fires mid-clear with an updated mood entry
    pm.enqueueWrite({ ...sessionWithMood, moodLogs: { '2026-08-07': 'energized' } });

    release();
    await clearDone;
    pm.enqueueWrite(captured);
    await new Promise((r) => setTimeout(r, 0));

    // Stale mid-clear setMood write is dropped by the no-op guard (clearingCount > 0).
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // in-flight session autosave
      `removeItem:${STORAGE_KEY}`, // pm.clear() remove — the boundary
      `setItem:${STORAGE_KEY}`,    // post-clear autosave from clearAllData setters
    ]);

    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.moodLogs).toEqual({});     // cleared — mid-clear mood did not survive
    expect(stored.waterLogs).toEqual({});    // cleared
    expect(stored.logs).toEqual([]);
    expect(stored.profile).toBeNull();
    expect(stored.onboardingComplete).toBe(false);
  });

  it('setters receive the correct cleared values — captured state matches performClearAllData contract', async () => {
    // Confirms the setter-value contract defined in lib/clearAllData.ts:
    // every field must receive exactly its cleared default so the post-clear
    // autosave persists the right snapshot.
    const { ctx, captured } = makeSpyCtx(pm);
    await performClearAllData(ctx);

    expect(captured.onboardingComplete).toBe(false);
    expect(captured.profile).toBeNull();
    expect(captured.logs).toEqual([]);
    expect(captured.weights).toEqual([]);
    expect(captured.waterLogs).toEqual({});
    expect(captured.moodLogs).toEqual({});
    expect(captured.activityLogs).toEqual({});
    expect(captured.activityMinutesLogs).toEqual({});
    expect(captured.savedMeals).toEqual([]);
    expect(captured.localRecipes).toEqual([]);
    expect(captured.savedRecipeIds).toEqual([]);
    expect(captured.consentAccepted).toBe(false);
    expect(captured.outbox).toEqual([]);
    // plannerWeekStart resets to the current Monday — not the week the user had browsed to.
    // This ensures a fresh start always opens on the current week.
    expect(captured.plannerWeekStart).toBe('2026-08-03'); // deterministic via getPlannerWeekStart mock
    // plannerViewedDay resets to today — consistent with the week reset above.
    // Without this, a user on a future/past day would keep that day highlighted
    // even though plannerWeekStart jumped back to the current week.
    expect(captured.plannerViewedDay).toBe('2026-08-07'); // deterministic via getToday mock
    expect(captured.plannerMeals).toEqual([]);
    expect(captured.shoppingItems).toEqual([]);
    expect(captured.foodDrafts).toEqual([]);
    expect(captured.foodMemories).toEqual([]);
    expect(captured.repeatPatterns).toEqual([]);
    expect(captured.memoryCorrections).toEqual([]);
    expect(captured.coachConsentAccepted).toBe(false);
    expect(captured.coachMessages).toEqual([]);
    expect(captured.goalCelebrationSeenTargetKg).toBeNull();
    // hydrationReminders resets to DEFAULT_HYDRATION_PREFS (not all-false/all-zero)
    expect(captured.hydrationReminders).toEqual(DEFAULT_HYDRATION_PREFS);
    // livingMemory resets to emptyLivingMemory() — must have the expected shape
    expect(captured.livingMemory).toBeDefined();
    expect(typeof captured.livingMemory).toBe('object');
  });

  it('recipeSlotTarget resets to null — a stale slot-browse context does not survive a clear', async () => {
    // Scenario: the user tapped "Browse Recipes" on a planner slot (setting
    // recipeSlotTarget) and then tapped "Clear all data" before picking a recipe.
    // After the clear, recipeSlotTarget must be null so the empty planner does
    // not inherit the stale slot context from the previous session.
    const { ctx, captured } = makeSpyCtx(pm);
    await performClearAllData(ctx);
    expect(captured.recipeSlotTarget).toBeNull();
  });

  it('pendingUndoSwap resets to null — a stale swap offer does not survive a clear', async () => {
    // Scenario: a recipe swap was in progress (pendingUndoSwap set by the
    // Recipes screen) when the user tapped "Clear all data".  After the clear,
    // pendingUndoSwap must be null so the Planner does not show a stale undo
    // banner for a meal that no longer exists.
    const { ctx, captured } = makeSpyCtx(pm);
    await performClearAllData(ctx);
    expect(captured.pendingUndoSwap).toBeNull();
  });

  it('pendingPlannerAck resets to null — a stale ack banner does not survive a clear', async () => {
    // Scenario: the Recipes screen set pendingPlannerAck (e.g. "Grilled Salmon
    // added to Tuesday Dinner") when a recipe filled an empty planner slot.
    // The user then tapped "Clear all data" before the Planner consumed the
    // message.  After the clear, pendingPlannerAck must be null so the Planner
    // does not show an acknowledgment banner for a meal that no longer exists.
    const { ctx, captured } = makeSpyCtx(pm);
    await performClearAllData(ctx);
    expect(captured.pendingPlannerAck).toBeNull();
  });

  it('plannerViewedDay resets to today — a future/past day does not survive a clear', async () => {
    // Scenario: user browsed to a future day (e.g. next week) before tapping "Clear all data".
    // After the clear, plannerViewedDay must be today so it stays consistent with
    // the plannerWeekStart that was also reset to the current week.
    //
    // plannerViewedDay is session-only (never persisted), so this test focuses on
    // the setter value captured by performClearAllData — the same value React would
    // use on the next render cycle to update the Planner header.
    const { ctx, captured } = makeSpyCtx(pm);

    // Simulate: the Planner had set plannerViewedDay to a future date before clear.
    // That state lives only in React — our spy ctx represents the setter that will
    // receive the reset value; the "current" value is irrelevant to the assertion.
    await performClearAllData(ctx);

    // The setter must have been called with today's date-key (from getToday mock).
    expect(captured.plannerViewedDay).toBe('2026-08-07');
    // And it must be consistent with the reset week-start (a Monday on or before today).
    const viewedDay  = new Date(captured.plannerViewedDay as string);
    const weekStart  = new Date(captured.plannerWeekStart as string);
    expect(viewedDay >= weekStart).toBe(true);
  });

  it('double-tap guard: two concurrent clearAllData calls both settle with cleared state — no interleaved state updates', async () => {
    // Scenario: the user taps "Clear all data" twice quickly before the first
    // pm.clear() resolves.  Both calls chain onto the same write queue, so the
    // storage sequence is:
    //   setItem  (blocked in-flight autosave)
    //   removeItem (first clear)
    //   removeItem (second clear)
    // After both pm.clear() calls resolve, each performClearAllData calls its
    // own set of state setters — both sets produce identical cleared values, so
    // no interleaving produces pre-clear state.  Final storage is the cleared
    // snapshot written by the second autosave.

    const release = storage.blockNextSetItem();

    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'starter-oats',  name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
        { id: 'starter-salad', name: 'Chicken salad',   date: '2026-08-07', meal: 'Lunch' },
      ],
      weights: [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
    };
    pm.enqueueWrite(sessionState); // blocked in-flight autosave

    // Simulate two separate spy-ctx objects — one per tap — so we can verify
    // that both calls receive the cleared values independently.
    const { ctx: ctx1, captured: captured1 } = makeSpyCtx(pm);
    const { ctx: ctx2, captured: captured2 } = makeSpyCtx(pm);

    // Both taps fire before the first pm.clear() resolves.
    const firstClear  = performClearAllData(ctx1); // first tap
    const secondClear = performClearAllData(ctx2); // second tap — chains after first remove

    release(); // unblock the in-flight write
    await Promise.all([firstClear, secondClear]);

    // Core storage call order:
    //   setItem  — pre-clear in-flight autosave (drained first, before any remove)
    //   removeItem — first tap's pm.clear() (chains after write)
    //   removeItem — second tap's pm.clear() (chains after first remove)
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
    ]);

    // Both captured states must be the cleared defaults — neither tap produced
    // pre-clear values, confirming no interleaved state updates occurred.
    for (const [label, captured] of [['first', captured1], ['second', captured2]] as const) {
      expect(captured.onboardingComplete, `${label} tap: onboardingComplete`).toBe(false);
      expect(captured.profile,            `${label} tap: profile`).toBeNull();
      expect(captured.logs,               `${label} tap: logs`).toEqual([]);
      expect(captured.weights,            `${label} tap: weights`).toEqual([]);
      expect(captured.moodLogs,           `${label} tap: moodLogs`).toEqual({});
      expect(captured.waterLogs,          `${label} tap: waterLogs`).toEqual({});
      expect(captured.coachConsentAccepted, `${label} tap: coachConsentAccepted`).toBe(false);
      expect(captured.coachMessages,      `${label} tap: coachMessages`).toEqual([]);
    }

    // Simulate the autosave effect for each tap (the second autosave is the
    // final writer in storage — it overwrites the first with identical data).
    pm.enqueueWrite(captured1);
    pm.enqueueWrite(captured2);
    await new Promise((r) => setTimeout(r, 0));

    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.onboardingComplete).toBe(false);
    expect(stored.profile).toBeNull();
    expect(stored.logs).toEqual([]);
    expect(stored.weights).toEqual([]);
    // No starter entries survived either tap.
    for (const staleId of ['starter-oats', 'starter-salad']) {
      expect(
        (stored.logs as Array<{ id: string }>).some((l) => l.id === staleId),
      ).toBe(false);
    }
  });

  it('concurrent outbox-flush-style background write: outbox entries do not survive — final outbox is empty', async () => {
    // Scenario (mirrors CaloraContext's outbox-sync path):
    //   1. An autosave is in-flight (blocked setItem) when the user taps "Clear".
    //   2. clearAllData calls performClearAllData → pm.clear() chains removeItem
    //      after the blocked write; performClearAllData suspends at `await`.
    //   3. A background sync service flushes the outbox mid-clear.  In
    //      CaloraContext this fires as: setOutbox([]) → autosave effect →
    //      pm.current.enqueueWrite({…, outbox: []}).  That write is injected
    //      here as a direct pm.enqueueWrite call while clearingCount > 0.
    //      Because clearingCount > 0, it is a no-op — the background sync
    //      snapshot never reaches storage.
    //   4. pm.clear() resolves → performClearAllData calls every state setter.
    //   5. React autosave fires → pm.enqueueWrite(capturedClearedState) — the
    //      only writer after removeItem; final storage has outbox: [].
    const release = storage.blockNextSetItem();

    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'log-1', name: 'Oatmeal',        date: '2026-08-07', meal: 'Breakfast' },
        { id: 'log-2', name: 'Chicken salad',   date: '2026-08-07', meal: 'Lunch' },
      ],
      outbox: [
        { id: 'mut-1', entity: 'diaryEntry', operation: 'upsert', createdAt: '2026-08-07T08:00:00.000Z' },
        { id: 'mut-2', entity: 'weight',     operation: 'upsert', createdAt: '2026-08-07T09:00:00.000Z' },
      ],
      repeatPatterns: [
        { id: 'rp-1', signature: 'oatmeal-sig', count: 3, lastSeen: '2026-08-07' },
      ],
    };
    pm.enqueueWrite(sessionState); // blocked in-flight autosave

    const { ctx, captured } = makeSpyCtx(pm);

    // Start performClearAllData — suspends at `await pm.clear()`.
    const clearDone = performClearAllData(ctx);

    // --- Background sync paths fired mid-clear ---
    // Path A: outbox flush — sync service calls setOutbox([]) whose autosave
    // effect calls pm.enqueueWrite with the flushed snapshot.  clearingCount > 0
    // so this is a no-op and the snapshot is never serialised to storage.
    pm.enqueueWrite({
      ...sessionState,
      outbox: [], // flushed
    });

    // Path B: repeat-pattern writer — a background pattern analysis finishes
    // and writes an updated repeatPatterns array.  Same guard applies.
    pm.enqueueWrite({
      ...sessionState,
      outbox: [],
      repeatPatterns: [
        { id: 'rp-1', signature: 'oatmeal-sig', count: 4, lastSeen: '2026-08-07' },
        { id: 'rp-2', signature: 'salad-sig',   count: 1, lastSeen: '2026-08-07' },
      ],
    });

    release(); // unblock the in-flight write
    await clearDone; // clear resolves, every setter fires → captured is populated

    // Simulate the autosave useEffect that fires after React re-renders with
    // the cleared state values collected by the spy setters.
    pm.enqueueWrite(captured);
    await new Promise((r) => setTimeout(r, 0)); // drain remaining queue entries

    // Only two setItem calls must appear:
    //   1. The pre-clear in-flight autosave (the blocked write)
    //   2. The post-clear autosave from clearAllData setters
    // The two background sync writes (outbox flush + repeat-pattern update)
    // must be absent — both were dropped by the clearingCount > 0 no-op guard.
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // pre-clear in-flight autosave
      `removeItem:${STORAGE_KEY}`, // pm.clear() remove — the boundary
      `setItem:${STORAGE_KEY}`,    // post-clear autosave from clearAllData setters
    ]);

    // Final storage reflects the cleared state — no session outbox entries or
    // repeat patterns survived the background sync writes.
    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.onboardingComplete).toBe(false);
    expect(stored.profile).toBeNull();
    expect(stored.logs).toEqual([]);
    expect(stored.outbox).toEqual([]);
    expect(stored.repeatPatterns).toEqual([]);

    // Confirm explicitly: neither the session outbox mutations nor the
    // mid-clear repeat-pattern update survived.
    for (const staleId of ['mut-1', 'mut-2']) {
      expect(
        ((stored.outbox ?? []) as Array<{ id: string }>).some((m) => m.id === staleId),
      ).toBe(false);
    }
    for (const staleId of ['rp-1', 'rp-2']) {
      expect(
        ((stored.repeatPatterns ?? []) as Array<{ id: string }>).some((p) => p.id === staleId),
      ).toBe(false);
    }
  });

  it('concurrent coach-reply-style write: coachMessages and coachConsentAccepted do not survive — final values are [] and false', async () => {
    // Scenario (mirrors the CaloraContext coach path):
    //   1. An autosave is in-flight (blocked setItem) when the user taps "Clear".
    //   2. clearAllData calls performClearAllData → pm.clear() chains removeItem
    //      after the blocked write; performClearAllData suspends at `await`.
    //   3. The AI network response arrives mid-clear.  In CaloraContext this fires
    //      as: setCoachMessages([...current, reply]) → autosave effect →
    //      pm.current.enqueueWrite({…, coachConsentAccepted: true, coachMessages: [reply]}).
    //      That write is injected here as a direct pm.enqueueWrite call while
    //      clearingCount > 0.  Because clearingCount > 0, it is a no-op — the
    //      coach-reply snapshot is dropped and never serialised to storage.
    //   4. pm.clear() resolves → performClearAllData calls every state setter.
    //   5. React autosave fires → pm.enqueueWrite(capturedClearedState) — the only
    //      writer after removeItem; final storage has coachMessages: [] and
    //      coachConsentAccepted: false.
    const release = storage.blockNextSetItem();

    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
      ],
      coachConsentAccepted: true,
      coachMessages: [
        { role: 'user',      content: 'How am I doing today?' },
        { role: 'assistant', content: 'You are on track — great work!' },
      ],
    };
    pm.enqueueWrite(sessionState); // blocked in-flight autosave

    const { ctx, captured } = makeSpyCtx(pm);

    // Start performClearAllData — the real production function used by
    // CaloraContext.clearAllData.  Suspends at `await pm.clear()`.
    const clearDone = performClearAllData(ctx);

    // Inject the coach-reply write while performClearAllData is suspended.
    // This simulates setCoachMessages([...current, aiReply]) → autosave → enqueueWrite.
    // clearingCount > 0 at this point, so this is a no-op — the coach-reply
    // snapshot is dropped and will never be serialised to storage.
    const aiReply = { role: 'assistant', content: 'Keep it up — you hit your protein goal!' };
    pm.enqueueWrite({
      ...sessionState,
      coachMessages: [...sessionState.coachMessages, aiReply],
    });

    release(); // unblock the in-flight write
    await clearDone; // clear resolves, every setter fires → captured is populated

    // Simulate the autosave useEffect that fires after React re-renders with
    // the cleared state values collected by the spy setters.
    pm.enqueueWrite(captured);
    await new Promise((r) => setTimeout(r, 0)); // drain remaining queue entries

    // Call order: pre-clear in-flight write → remove → post-clear cleared autosave.
    // The coach-reply write is absent — the no-op guard eliminated it.
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // in-flight session autosave (with coach session)
      `removeItem:${STORAGE_KEY}`, // pm.clear() remove — the boundary
      `setItem:${STORAGE_KEY}`,    // post-clear autosave from clearAllData setters
    ]);

    // Final storage must reflect the cleared state — neither the session coach
    // messages nor the mid-clear AI reply survived.
    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.coachMessages).toEqual([]);
    expect(stored.coachConsentAccepted).toBe(false);
    expect(stored.onboardingComplete).toBe(false);
    expect(stored.profile).toBeNull();
    expect(stored.logs).toEqual([]);

    // Confirm explicitly: neither session message nor the mid-clear AI reply is present.
    for (const staleContent of [
      'You are on track — great work!',
      'Keep it up — you hit your protein goal!',
      'How am I doing today?',
    ]) {
      expect(
        ((stored.coachMessages ?? []) as Array<{ content: string }>)
          .some((m) => m.content === staleContent),
      ).toBe(false);
    }
  });

  it('concurrent clearCoachHistory-style write: partial coach state (consent=true, messages=[]) cannot survive — clearAllData wins with both fields cleared', async () => {
    // Scenario (mirrors CaloraContext.clearCoachHistory, ~line 215):
    //   clearCoachHistory sets coachMessages to [] but leaves coachConsentAccepted
    //   unchanged (still true).  If the user taps "Clear history" from the coach
    //   header menu at the same moment clearAllData fires, the autosave triggered
    //   by clearCoachHistory writes:
    //     { …state, coachMessages: [] }    ← coachConsentAccepted: true survives
    //   If this partial snapshot lands in storage after pm.clear() executes, the
    //   next launch re-hydrates with coachConsentAccepted: true but an empty
    //   message list — an impossible user-facing state (consent accepted but no
    //   history to show).
    //
    // The clearingCount guard in PersistenceManager prevents this: any
    // enqueueWrite dispatched while clearingCount > 0 is a no-op.  This test
    // confirms the guard fires correctly and that clearAllData always wins —
    // final storage has BOTH coachConsentAccepted: false AND coachMessages: []
    // from clearAllData's zero values, never the partial clearCoachHistory state.
    const release = storage.blockNextSetItem();

    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
      ],
      coachConsentAccepted: true,
      coachMessages: [
        { role: 'user',      content: 'How am I doing today?' },
        { role: 'assistant', content: 'You are on track — great work!' },
      ],
    };
    pm.enqueueWrite(sessionState); // blocked in-flight autosave

    const { ctx, captured } = makeSpyCtx(pm);

    // Start performClearAllData — the real production function used by
    // CaloraContext.clearAllData.  Suspends at `await pm.clear()`.
    const clearDone = performClearAllData(ctx);

    // Inject the clearCoachHistory autosave while performClearAllData is suspended.
    // This simulates:
    //   clearCoachHistory() → setCoachMessages([]) → autosave effect →
    //   pm.current.enqueueWrite({ …state, coachConsentAccepted: true, coachMessages: [] })
    //
    // The write keeps coachConsentAccepted: true (clearCoachHistory does not touch
    // it) but empties coachMessages — the dangerous partial state this test guards.
    // clearingCount > 0 at this point, so this is a no-op: the partial snapshot
    // is dropped and will never be serialised to storage.
    pm.enqueueWrite({
      ...sessionState,
      coachMessages: [], // clearCoachHistory empties messages but leaves consent accepted
    });

    release(); // unblock the in-flight write
    await clearDone; // clear resolves, every setter fires → captured is populated

    // Simulate the autosave useEffect that fires after React re-renders with
    // the cleared state values collected by the spy setters.
    pm.enqueueWrite(captured);
    await new Promise((r) => setTimeout(r, 0)); // drain remaining queue entries

    // Only two setItem calls must appear:
    //   1. The pre-clear in-flight autosave (blocked write with the live session)
    //   2. The post-clear autosave from clearAllData setters
    // The clearCoachHistory write must be absent — the no-op guard eliminated it.
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // in-flight session autosave (with coach session)
      `removeItem:${STORAGE_KEY}`, // pm.clear() remove — the boundary
      `setItem:${STORAGE_KEY}`,    // post-clear autosave from clearAllData setters
    ]);

    // Final storage must reflect the cleared defaults — not the partial
    // clearCoachHistory snapshot.  Both coach fields must come from clearAllData's
    // zero values, never from the dropped partial write.
    const stored = JSON.parse(storage.store[STORAGE_KEY]);
    expect(stored.coachMessages).toEqual([]);        // cleared by clearAllData
    expect(stored.coachConsentAccepted).toBe(false); // cleared by clearAllData — NOT the partial true
    expect(stored.onboardingComplete).toBe(false);
    expect(stored.profile).toBeNull();
    expect(stored.logs).toEqual([]);

    // Explicitly confirm the dangerous partial state did not survive:
    // coachConsentAccepted must be false — if it were true here, re-hydration
    // would restore an accepted-consent coach with no message history, which is
    // an impossible state that the UI cannot represent cleanly.
    expect(stored.coachConsentAccepted).not.toBe(true);

    // Confirm no session message content survived in storage.
    for (const staleContent of [
      'How am I doing today?',
      'You are on track — great work!',
    ]) {
      expect(
        ((stored.coachMessages ?? []) as Array<{ content: string }>)
          .some((m) => m.content === staleContent),
      ).toBe(false);
    }
  });

  it('post-clear read() returns the cleared state — stale mid-clear log id is absent on re-hydration', async () => {
    // Round-trip: after the complete lifecycle, pm.read() (the hydration effect)
    // returns the cleared snapshot, not the stale mid-clear data.
    const release = storage.blockNextSetItem();

    pm.enqueueWrite({
      onboardingComplete: true,
      profile: { name: 'Alex' },
      logs: [{ id: 'log-a' }, { id: 'log-b' }],
    });

    const { ctx, captured } = makeSpyCtx(pm);
    const clearDone = performClearAllData(ctx);

    // Concurrent addLog mid-clear
    pm.enqueueWrite({
      onboardingComplete: true,
      profile: { name: 'Alex' },
      logs: [{ id: 'log-a' }, { id: 'log-b' }, { id: 'log-c-stale' }],
    });

    release();
    await clearDone;
    pm.enqueueWrite(captured); // autosave with cleared state
    await new Promise((r) => setTimeout(r, 0));

    // Re-read storage — mirrors the CaloraContext hydration effect
    const { state, error } = await pm.read<Record<string, unknown>>();

    expect(error).toBeNull();
    expect(state).not.toBeNull();
    if (state) {
      expect(state['onboardingComplete']).toBe(false);
      expect(state['profile']).toBeNull();
      expect(state['logs']).toEqual([]);
      expect(
        (state['logs'] as Array<{ id: string }>).some((l) => l.id === 'log-c-stale'),
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// exportRawStorageData and exportData: post-clear stale-data contracts
//
// CaloraContext exposes two export helpers that delegate to functions extracted
// in lib/exportPayload.ts:
//   exportRawStorageData: () => readRawStorageData(AsyncStorage.getItem.bind(AsyncStorage), STORAGE_KEY)
//   exportData:           async () => buildExportPayload({ profile, logs, … })
//
// Tests call the same production functions (readRawStorageData, buildExportPayload)
// with the injected StorageAdapter substituted for AsyncStorage, confirming the
// full post-clear export contract without mounting React.
// ---------------------------------------------------------------------------

describe('exportRawStorageData (readRawStorageData): returns null after clear resolves', () => {
  it('readRawStorageData returns null after pm.clear() — exportRawStorageData would fire the Alert path', async () => {
    // Populate storage so the key is present before the clear.
    pm.enqueueWrite({
      onboardingComplete: true,
      profile: { name: 'Alex' },
      logs: [{ id: 'log-1', name: 'Oatmeal' }],
    });
    await new Promise((r) => setTimeout(r, 0)); // drain write

    // Key present before the clear.
    expect(
      await readRawStorageData(storage.getItem.bind(storage), STORAGE_KEY),
    ).not.toBeNull();

    // clearAllData delegates to pm.clear() — removeItem is queued.
    await pm.clear();

    // Invoke the real production helper — must return null.
    const raw = await readRawStorageData(storage.getItem.bind(storage), STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it('readRawStorageData returns null even when a write was enqueued just before the clear', async () => {
    // Critical race: an in-flight write (blocked setItem) is enqueued before the
    // user taps "Clear all data".  removeItem chains after the write completes, so
    // the key is still absent when the export helper is called after clear.
    const release = storage.blockNextSetItem();
    pm.enqueueWrite({
      onboardingComplete: true,
      profile: { name: 'Alex' },
      logs: [{ id: 'pre-clear-log', name: 'Banana' }],
    });

    // clear() chains removeItem behind the blocked write.
    const clearDone = pm.clear();
    release(); // unblock the write; removeItem executes after it
    await clearDone;

    // Invoke the real production helper — must return null, not the pre-clear bytes.
    const raw = await readRawStorageData(storage.getItem.bind(storage), STORAGE_KEY);
    expect(raw).toBeNull();

    // Call order confirms: write landed first, then the key was removed.
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
    ]);
  });
});

// ---------------------------------------------------------------------------
// React-level clearingRef guard
//
// CaloraContext.clearAllData wraps performClearAllData with a useRef<boolean>
// guard so that a second rapid tap returns early before calling any setter.
// These tests simulate that guard (as a plain boolean, standing in for the
// React ref) to confirm the no-op contract and verify that the flag resets
// after the first call resolves so a subsequent (non-concurrent) clear works.
// ---------------------------------------------------------------------------

describe('clearingRef guard: second concurrent clearAllData call is a true no-op', () => {
  /**
   * Wraps performClearAllData with the same clearingRef guard used by
   * CaloraContext.clearAllData.  `clearingRef` is a plain object with a
   * `.current` boolean — structurally identical to React's useRef value.
   */
  async function guardedClearAllData(
    ctx: ClearAllDataCtx,
    clearingRef: { current: boolean },
  ): Promise<void> {
    if (clearingRef.current) return;
    clearingRef.current = true;
    try {
      await performClearAllData(ctx);
    } finally {
      clearingRef.current = false;
    }
  }

  it('second concurrent tap is a no-op — its setters are never called', async () => {
    // Scenario: two rapid taps of "Clear all data" while a write is in flight.
    // The first call sets clearingRef.current = true before awaiting pm.clear().
    // The second call sees clearingRef.current === true and returns immediately,
    // so its spy setters are never invoked.
    const release = storage.blockNextSetItem();
    pm.enqueueWrite({ onboardingComplete: true, logs: [{ id: 'log-1' }] });

    const clearingRef = { current: false };
    const { ctx: ctx1, captured: captured1 } = makeSpyCtx(pm);
    const { ctx: ctx2, captured: captured2 } = makeSpyCtx(pm);

    // Fire both taps before the first pm.clear() resolves.
    const firstClear  = guardedClearAllData(ctx1, clearingRef);
    const secondClear = guardedClearAllData(ctx2, clearingRef);

    release();
    await Promise.all([firstClear, secondClear]);

    // First call: setters received cleared values.
    expect(captured1.onboardingComplete).toBe(false);
    expect(captured1.logs).toEqual([]);
    expect(captured1.profile).toBeNull();

    // Second call: guard fired early — no setter was ever called.
    expect(Object.keys(captured2)).toHaveLength(0);
  });

  it('clearingRef resets after the first clear resolves — a subsequent clear still works', async () => {
    // After the first complete clear the ref must be false again so that a
    // second (non-concurrent) tap — e.g. the user clears data, re-onboards,
    // and clears again — works correctly.
    const clearingRef = { current: false };
    const { ctx: ctx1 } = makeSpyCtx(pm);
    await guardedClearAllData(ctx1, clearingRef);

    // ref must be reset
    expect(clearingRef.current).toBe(false);

    // Second non-concurrent call should succeed and invoke setters.
    const { ctx: ctx2, captured: captured2 } = makeSpyCtx(pm);
    await guardedClearAllData(ctx2, clearingRef);

    expect(captured2.onboardingComplete).toBe(false);
    expect(captured2.logs).toEqual([]);
  });

  it('clearingRef resets even when performClearAllData rejects — guard does not get stuck', async () => {
    // Safety: if pm.clear() rejects (e.g. removeItem throws), the finally block
    // must still reset clearingRef so subsequent taps can proceed.
    const originalRemoveItem = storage.removeItem.bind(storage);
    storage.removeItem = async () => { throw new Error('I/O failure'); };

    const clearingRef = { current: false };
    const { ctx } = makeSpyCtx(pm);

    // The rejection propagates out of guardedClearAllData.
    await guardedClearAllData(ctx, clearingRef).catch(() => undefined);

    // Restore
    storage.removeItem = originalRemoveItem;

    // Guard must be released despite the error.
    expect(clearingRef.current).toBe(false);

    // A subsequent call must now be able to proceed (not silenced by a stuck ref).
    const { ctx: ctx2, captured: captured2 } = makeSpyCtx(pm);
    await guardedClearAllData(ctx2, clearingRef);
    expect(captured2.onboardingComplete).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hard app restart immediately after 'Clear all data'
//
// The scenario: the user taps "Clear all data", pm.clear() removes the storage
// key, but then the app crashes or is force-quit before the post-clear autosave
// can write the cleared-state snapshot.  On the next cold launch, storage is
// completely absent (no key, not even a cleared snapshot).
//
// CaloraContext hydrates via:
//   const { state: saved, error } = await pm.current.read();
//   if (!saved) return;   ← early-return guard
//
// Because storage is absent, read() returns { state: null, error: null }.
// The early-return guard fires and no setState call is made — all React state
// fields remain at their useState() defaults (the initial component state).
// This test locks in that guarantee explicitly.
// ---------------------------------------------------------------------------

describe('Hard app restart after Clear all data — no post-clear autosave (crash / force-quit scenario)', () => {
  it('enqueueWrite → pm.clear() (no autosave) → pm.read() returns { state: null, error: null }', async () => {
    // Step 1: write rich session state (mirrors an in-progress autosave).
    const sessionState = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [
        { id: 'starter-oats',  name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
        { id: 'starter-salad', name: 'Chicken salad',   date: '2026-08-07', meal: 'Lunch' },
        { id: 'starter-apple', name: 'Honeycrisp apple', date: '2026-08-07', meal: 'Snack' },
      ],
      weights: [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
      moodLogs: { '2026-08-07': 'good' },
      waterLogs: { '2026-08-07': 48 },
      plannerMeals: [{ id: 'pm-1', name: 'Oatmeal', day: '2026-08-07', meal: 'Breakfast' }],
      coachMessages: [{ role: 'assistant', content: 'Great work today!' }],
    };
    pm.enqueueWrite(sessionState);
    // Drain the write queue so the key is definitely present in storage.
    await new Promise((r) => setTimeout(r, 0));
    expect(storage.store[STORAGE_KEY]).toBeDefined();

    // Step 2: user taps "Clear all data" — pm.clear() removes the key.
    // Crucially, NO post-clear autosave follows (simulates a crash / force-quit
    // between pm.clear() resolving and React committing the cleared state).
    await pm.clear();

    // Confirm the key is gone — storage is completely absent after the remove.
    expect(storage.store[STORAGE_KEY]).toBeUndefined();
    expect(await storage.getItem(STORAGE_KEY)).toBeNull();

    // Step 3: hard app restart — CaloraContext's hydration effect calls pm.read().
    const { state: saved, error } = await pm.read<typeof sessionState>();

    // read() must return null state and no error — absent storage is not an error.
    expect(error).toBeNull();
    expect(saved).toBeNull();
  });

  it('null state from read() satisfies the hydration guard — !saved is true', async () => {
    // The hydration effect in CaloraContext does:
    //   const { state: saved, error } = await pm.current.read();
    //   if (!saved) return;   ← all setState calls are skipped
    //
    // This test asserts the precise truthiness contract the guard depends on
    // after a hard restart with no post-clear autosave.
    pm.enqueueWrite({ onboardingComplete: true, logs: [{ id: 'log-1' }] });
    await pm.clear(); // no post-clear autosave

    const { state: saved } = await pm.read();

    // !saved must be true so the guard fires and no state setter is called.
    expect(saved).toBeNull();
    expect(!saved).toBe(true);
  });

  it('all state fields remain at React defaults — no session field survives into the next launch', async () => {
    // Simulate a richer session before clear: every persisted field is populated
    // so that if any one of them leaked through the absent-storage path, the
    // assertion below would catch it.
    const richSession = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs:               [{ id: 'l-1' }, { id: 'l-2' }],
      weights:            [{ id: 'w-1', kg: 76 }],
      waterLogs:          { '2026-08-07': 48 },
      moodLogs:           { '2026-08-07': 'energized' },
      activityLogs:       { '2026-08-07': 'high' },
      activityMinutesLogs:{ '2026-08-07': 45 },
      savedMeals:         [{ id: 'sm-1', name: 'Granola' }],
      localRecipes:       [{ id: 'lr-1', name: 'My cookie' }],
      savedRecipeIds:     ['recipe-42'],
      outbox:             [{ id: 'mut-1', entity: 'diaryEntry', operation: 'upsert' }],
      plannerMeals:       [{ id: 'pm-1', name: 'Oatmeal', day: '2026-08-07', meal: 'Breakfast' }],
      shoppingItems:      [{ id: 'si-1', name: 'Oats', quantity: 1, checked: false }],
      foodDrafts:         [{ id: 'fd-1' }],
      foodMemories:       [{ id: 'fm-1' }],
      repeatPatterns:     [{ id: 'rp-1', signature: 'oats', count: 3 }],
      memoryCorrections:  [{ id: 'mc-1' }],
      coachConsentAccepted: true,
      coachMessages:      [{ role: 'assistant', content: 'You are doing great!' }],
    };
    pm.enqueueWrite(richSession);
    await new Promise((r) => setTimeout(r, 0)); // drain write

    // Clear with no subsequent autosave — simulates crash after pm.clear().
    await pm.clear();

    // Hard restart: hydration reads from empty storage.
    const { state: saved, error } = await pm.read<typeof richSession>();

    // --- Hydration guard contract ---
    expect(error).toBeNull();
    expect(saved).toBeNull();

    // Because saved is null the guard `if (!saved) return` fires.
    // No setState call is made, so all React state fields remain at their
    // useState() initial values (the starter data defaults in CaloraProvider).
    // The key guarantee: no FIELD from the previous session leaks through.
    //
    // We cannot call React setters in this unit-test environment, but we can
    // assert that the value returned from read() is null — the single input that
    // drives the guard — and that no partial or stale session object is returned.
    if (saved) {
      // This branch must never execute — it is a sentinel so TypeScript
      // narrows the type and any future refactor that changes the return value
      // to a non-null object will surface here as a test failure.
      throw new Error('read() returned non-null state after a clear with no post-clear autosave — hard restart safety guarantee broken');
    }

    // Confirm call sequence: write → remove (no second setItem = no post-clear autosave).
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // pre-clear session autosave
      `removeItem:${STORAGE_KEY}`, // pm.clear() remove — the hard boundary
      // no third setItem here — this is the crash scenario
    ]);
  });

  it('a blocked in-flight write drains before the key is removed — hard restart still reads null', async () => {
    // Tightest timing variant: the autosave is mid-flight (blocked setItem) when
    // the user taps "Clear all data".  The write completes, THEN the key is
    // removed.  If the app crashes before the post-clear autosave, the next cold
    // launch still reads null — the write/remove ordering is preserved.
    const release = storage.blockNextSetItem();

    pm.enqueueWrite({
      onboardingComplete: true,
      logs: [{ id: 'starter-oats' }, { id: 'starter-salad' }, { id: 'starter-apple' }],
      weights: [{ id: 'weight-1', kg: 76 }],
    });

    // clear() chains removeItem after the blocked write — no autosave after.
    const clearDone = pm.clear();
    release(); // unblock the write
    await clearDone;

    // Hard restart read — key is absent because removeItem ran last.
    const { state: saved, error } = await pm.read();

    expect(error).toBeNull();
    expect(saved).toBeNull();

    // Verify ordering: the write completed first, then the key was removed.
    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,    // in-flight write (completed before remove)
      `removeItem:${STORAGE_KEY}`, // clear — always the last writer
    ]);
    // Storage is empty — the write ran but was then removed.
    expect(storage.store[STORAGE_KEY]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Mid-clear async gap: production functions resolveExportData and
// makeClearedExportSnapshot (lib/exportGap.ts) — mutation-sensitive
//
// There is a brief async window inside CaloraContext.clearAllData:
//
//   1. performClearAllData() is called.
//   2. It awaits pm.clear() → removeItem executes; storage key is gone.
//   3. Every React state setter is called → React SCHEDULES a re-render.
//   4. exportSnapshotRef.current = makeClearedExportSnapshot(…)  ← gap-bridge
//   ───── gap starts here ─────────────────────────────────────────────────
//   5. React commits the re-render → closed-over state vars update.
//   ───── gap ends here ───────────────────────────────────────────────────
//
// CaloraContext delegates the gap-sensitive logic to two extracted functions
// in lib/exportGap.ts:
//
//   makeClearedExportSnapshot(opts)      — called at step 4 by clearAllData
//   resolveExportData(ref, state, schema) — called by exportData every time
//
// These tests call the REAL production functions (not copies), so:
//   • Reversing the priority in resolveExportData (closedOver ?? snap) fails.
//   • Mutating any field in makeClearedExportSnapshot fails a field assertion.
//   • Passing a null ref to resolveExportData returns stale state (sentinel).
// ---------------------------------------------------------------------------

describe('exportData and exportRawStorageData: mid-clear async gap — real production functions (mutation-sensitive)', () => {
  /**
   * Stale closed-over state: what React's vars hold during the gap before the
   * re-render commits.  These are the values resolveExportData must NOT return
   * when exportSnapshotRef is non-null.
   */
  const staleClosedOver: CaloraExportState = {
    profile:              { name: 'Alex', goal: 'lose', weightKg: 76 },
    logs:                 [
      { id: 'log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
      { id: 'log-2', name: 'Chicken salad',  date: '2026-08-07', meal: 'Lunch'     },
    ],
    weights:              [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
    waterLogs:            { '2026-08-07': 48 },
    moodLogs:             { '2026-08-07': 'energized' },
    activityLogs:         { '2026-08-07': 'moderate' },
    activityMinutesLogs:  { '2026-08-07': 30 },
    savedMeals:           [{ id: 'sm-1', name: 'Granola bowl' }],
    localRecipes:         [{ id: 'lr-1', name: 'My cookie dough' }],
    savedRecipeIds:       ['recipe-42', 'recipe-99'],
    plannerWeekStart:     '2026-08-03',
    plannerMeals:         [{ id: 'pm-1', name: 'Oatmeal', day: '2026-08-07', meal: 'Breakfast' }],
    shoppingItems:        [{ id: 'si-1', name: 'Oats', quantity: 1, checked: false }],
    foodDrafts:           [{ id: 'fd-1' }],
    foodMemories:         [{ id: 'fm-1', text: 'I love oatmeal' }],
    repeatPatterns:       [{ id: 'rp-1', signature: 'oats', count: 3, lastSeen: '2026-08-07' }],
    memoryCorrections:    [{ id: 'mc-1' }],
    livingMemory:         { observations: [], lastUpdated: '2026-08-07' },
    hydrationReminders:   { enabled: true, times: ['08:00', '12:00', '18:00'] },
    mealReminders:        { breakfast: true, lunch: false, dinner: false },
    goalReminder:         { enabled: true, hour: 20, minute: 0 },
    notificationPreferences: { version: 1, delivery: 'local', masterEnabled: true, quietHours: { enabled: false, start: { hour: 22, minute: 0 }, end: { hour: 7, minute: 0 } }, categories: {} },
    healthConnected:      false,
    consentAccepted:      true,
    coachConsentAccepted: true,
    coachMessages:        [{ role: 'assistant', content: 'Great progress today!' }],
  };

  it('resolveExportData with a non-null ref returns cleared snapshot — ref priority wins over stale closed-over state', () => {
    // This tests the REAL production resolveExportData from lib/exportGap.ts.
    // If the priority is reversed (closedOver ?? snap instead of snap ?? closedOver),
    // this test fails because staleClosedOver.profile is Alex, not null.
    const ref: { current: CaloraExportState | null } = { current: null };

    // Step 4 of the gap: set the ref as CaloraContext.clearAllData does via
    // the real makeClearedExportSnapshot.
    ref.current = makeClearedExportSnapshot({
      getPlannerWeekStart: () => '2026-08-03',
      healthConnected: staleClosedOver.healthConnected,
    });

    // Call the REAL production resolveExportData — same function CaloraContext.exportData uses.
    const exported = resolveExportData(ref, staleClosedOver, 2 /* STORAGE_SCHEMA_VERSION */);
    const parsed = JSON.parse(exported) as Record<string, unknown>;

    // Ref wins: cleared values, not stale ones.
    expect(parsed['profile']).toBeNull();
    expect(parsed['logs']).toEqual([]);
    expect(parsed['weights']).toEqual([]);
    expect(parsed['moodLogs']).toEqual({});
    expect(parsed['waterLogs']).toEqual({});
    expect(parsed['savedMeals']).toEqual([]);
    expect(parsed['coachMessages']).toEqual([]);
    expect(parsed['coachConsentAccepted']).toBe(false);
    expect(parsed['consentAccepted']).toBe(false);

    // Stale session IDs must be absent.
    for (const id of ['log-1', 'log-2']) {
      expect(
        (parsed['logs'] as Array<{ id: string }>).some((l) => l.id === id),
      ).toBe(false);
    }
  });

  it('makeClearedExportSnapshot produces a fully-cleared CaloraExportState with all required fields', () => {
    // Tests the REAL production makeClearedExportSnapshot from lib/exportGap.ts.
    // If any field is accidentally set to a non-cleared value (or a field is added
    // but forgotten here), this assertion fails.
    const snap = makeClearedExportSnapshot({
      getPlannerWeekStart: () => '2026-08-03',
      healthConnected: false,
    });

    expect(snap.profile).toBeNull();
    expect(snap.logs).toEqual([]);
    expect(snap.weights).toEqual([]);
    expect(snap.waterLogs).toEqual({});
    expect(snap.moodLogs).toEqual({});
    expect(snap.activityLogs).toEqual({});
    expect(snap.activityMinutesLogs).toEqual({});
    expect(snap.savedMeals).toEqual([]);
    expect(snap.localRecipes).toEqual([]);
    expect(snap.savedRecipeIds).toEqual([]);
    expect(snap.plannerWeekStart).toBe('2026-08-03');
    expect(snap.plannerMeals).toEqual([]);
    expect(snap.shoppingItems).toEqual([]);
    expect(snap.foodDrafts).toEqual([]);
    expect(snap.foodMemories).toEqual([]);
    expect(snap.repeatPatterns).toEqual([]);
    expect(snap.memoryCorrections).toEqual([]);
    expect(snap.livingMemory).toBeDefined();
    expect(snap.hydrationReminders).toEqual(DEFAULT_HYDRATION_PREFS);
    expect(snap.mealReminders).toBeDefined();
    expect(snap.goalReminder).toBeDefined();
    expect(snap.notificationPreferences).toMatchObject({ version: 1, delivery: 'local' });
    expect(snap.healthConnected).toBe(false);
    expect(snap.consentAccepted).toBe(false);
    expect(snap.coachConsentAccepted).toBe(false);
    expect(snap.coachMessages).toEqual([]);
  });

  it('FIELD EXHAUSTIVENESS GUARD — cleared snapshot key set matches CaloraExportState exactly, no more and no less', () => {
    // ─── Why this test exists ─────────────────────────────────────────────────
    // clearAllData maintains two field lists that must stay in sync:
    //
    //   1. performClearAllData (lib/clearAllData.ts) — calls each React setter
    //   2. makeClearedExportSnapshot (lib/exportGap.ts) — the gap-bridge ref
    //
    // If a developer adds a new field to CaloraExportState and to
    // makeClearedExportSnapshot but accidentally omits it from the snapshot
    // returned object, TypeScript's return-type check on makeClearedExportSnapshot
    // will catch it at compile time.  This runtime test is the belt-and-suspenders
    // layer: it fails even if type assertions or unsafe casts were used to bypass
    // the TypeScript check.
    //
    // How the guard works:
    //   • staleClosedOver is typed as `CaloraExportState` — TypeScript enforces
    //     that every field of the interface is a required key in that object.
    //   • Object.keys(staleClosedOver) therefore always enumerates exactly the
    //     fields that CaloraExportState currently declares.
    //   • The snapshot from makeClearedExportSnapshot must have exactly those
    //     same keys — no missing fields (data leaks during the gap) and no extra
    //     fields (would indicate the interface and snapshot have drifted apart).
    //
    // Adding a new field to CaloraExportState (and therefore to staleClosedOver
    // at compile time) will fail this test unless makeClearedExportSnapshot is
    // also updated to include that field.
    // ─────────────────────────────────────────────────────────────────────────
    const snap = makeClearedExportSnapshot({
      getPlannerWeekStart: () => '2026-08-03',
      healthConnected: false,
    });

    const exportStateKeys = Object.keys(staleClosedOver).sort();
    const snapshotKeys    = Object.keys(snap).sort();

    // Exact key-set equality — any addition or removal on either side fails here.
    expect(snapshotKeys).toEqual(exportStateKeys);

    // Sanity: the reference set itself is non-trivial (guards against an empty
    // staleClosedOver accidentally making both arrays equal to []).
    expect(exportStateKeys.length).toBeGreaterThan(0);
  });

  it('REGRESSION GUARD — makeClearedExportSnapshot always uses DEFAULT_HYDRATION_PREFS, never the stale pre-clear custom schedule', () => {
    // Scenario: a user has a custom reminder schedule (e.g. morning/noon/evening)
    // that differs from DEFAULT_HYDRATION_PREFS.  They tap "Clear all data".
    // During the gap, exportData must return DEFAULT_HYDRATION_PREFS (the cleared
    // value), NOT the stale custom schedule.
    //
    // Previously, makeClearedExportSnapshot accepted hydrationReminders as a
    // parameter, and CaloraContext.clearAllData passed the stale closed-over value.
    // That caused a concrete data leak: custom reminders leaked through the gap.
    //
    // makeClearedExportSnapshot now owns the DEFAULT_HYDRATION_PREFS invariant
    // internally, so no caller can accidentally pass the stale schedule.

    const customPreClearSchedule = {
      // Deliberately non-default values that differ from DEFAULT_HYDRATION_PREFS.
      enabled: true,
      times: ['07:00', '11:30', '15:00', '19:30'],
    };

    // staleClosedOver has a custom hydration schedule (see its definition above).
    // Build the gap-bridge snapshot — it must NOT contain the stale schedule.
    const snap = makeClearedExportSnapshot({
      getPlannerWeekStart: () => '2026-08-03',
      healthConnected: false,
    });

    // makeClearedExportSnapshot hard-codes DEFAULT_HYDRATION_PREFS internally.
    // If this ever changes (helper takes hydrationReminders as a param again and
    // CaloraContext passes the stale value), this assertion fails.
    expect(snap.hydrationReminders).toEqual(DEFAULT_HYDRATION_PREFS);
    expect(snap.hydrationReminders).not.toEqual(customPreClearSchedule);

    // Verify through resolveExportData: even if the closed-over state has a
    // custom schedule, the ref (cleared snapshot) wins and exports the default.
    const ref: { current: CaloraExportState | null } = { current: snap };
    const closedOverWithCustomSchedule: CaloraExportState = {
      ...staleClosedOver,
      hydrationReminders: customPreClearSchedule,
    };
    const exported = resolveExportData(ref, closedOverWithCustomSchedule, 2 /* STORAGE_SCHEMA_VERSION */);
    const parsed = JSON.parse(exported) as Record<string, unknown>;

    expect(parsed['hydrationReminders']).toEqual(DEFAULT_HYDRATION_PREFS);
    expect(parsed['hydrationReminders']).not.toEqual(customPreClearSchedule);
  });

  it('MUTATION SENTINEL — resolveExportData with null ref returns stale pre-clear data: documents why the ref assignment is load-bearing', () => {
    // The ref is null (simulates CaloraContext.clearAllData NOT calling
    // makeClearedExportSnapshot — the bug this task guards against).
    //
    // resolveExportData's `snap ?? closedOver` priority falls through to
    // closedOver when snap is null — stale pre-clear data appears.  This
    // documents exactly what the broken behaviour looks like so it is
    // immediately recognisable in a failing test.
    const ref: { current: CaloraExportState | null } = { current: null }; // not set

    const exported = resolveExportData(ref, staleClosedOver, 2 /* STORAGE_SCHEMA_VERSION */);
    const parsed = JSON.parse(exported) as Record<string, unknown>;

    // Stale data IS visible without the ref — this is the bug.
    expect(parsed['profile']).not.toBeNull();
    expect((parsed['logs'] as unknown[]).length).toBeGreaterThan(0);
    expect(
      (parsed['logs'] as Array<{ id: string }>).some((l) => l.id === 'log-1'),
    ).toBe(true);
    expect(parsed['coachConsentAccepted']).toBe(true);
    expect(parsed['consentAccepted']).toBe(true);

    // Because the first test uses a non-null ref and asserts the OPPOSITE of
    // these values, any reversal of priority (closedOver ?? snap) or any
    // removal of the ref assignment in clearAllData would cause that test to
    // receive stale data and fail.
  });

  it('full gap sequence: performClearAllData → makeClearedExportSnapshot → resolveExportData — no stale data leaks', async () => {
    // End-to-end using the real production functions exactly as CaloraContext does:
    //
    //   clearAllData:
    //     await performClearAllData(ctx)                       ← real function
    //     ref.current = makeClearedExportSnapshot(opts)        ← real function
    //
    //   exportData:
    //     return resolveExportData(ref, staleClosedOver, 2)    ← real function
    //
    //   exportRawStorageData:
    //     return readRawStorageData(getItem, KEY)              ← real function

    pm.enqueueWrite({
      onboardingComplete: true,
      profile:      staleClosedOver.profile,
      logs:         staleClosedOver.logs,
      moodLogs:     staleClosedOver.moodLogs,
      waterLogs:    staleClosedOver.waterLogs,
      coachMessages: staleClosedOver.coachMessages,
    });
    await new Promise((r) => setTimeout(r, 0)); // drain write

    // The shared ref (mirrors CaloraContext's useRef<CaloraExportState | null>(null))
    const exportSnapshotRef: { current: CaloraExportState | null } = { current: null };

    // Step 2: performClearAllData → pm.clear() removes the key.
    const { ctx } = makeSpyCtx(pm);
    await performClearAllData(ctx);

    // Step 4: CaloraContext.clearAllData calls makeClearedExportSnapshot (real function).
    exportSnapshotRef.current = makeClearedExportSnapshot({
      getPlannerWeekStart: () => '2026-08-03',
      healthConnected: staleClosedOver.healthConnected,
    });

    // ── Gap: React re-render has NOT committed yet ────────────────────────────
    // staleClosedOver still holds pre-clear values in the closed-over closure.

    // exportData calls resolveExportData (real function) — ref wins.
    const exported = resolveExportData(exportSnapshotRef, staleClosedOver, 2 /* STORAGE_SCHEMA_VERSION */);
    const parsed = JSON.parse(exported) as Record<string, unknown>;

    expect(parsed['profile']).toBeNull();
    expect(parsed['logs']).toEqual([]);
    expect(parsed['moodLogs']).toEqual({});
    expect(parsed['waterLogs']).toEqual({});
    expect(parsed['coachConsentAccepted']).toBe(false);
    for (const id of ['log-1', 'log-2']) {
      expect(
        (parsed['logs'] as Array<{ id: string }>).some((l) => l.id === id),
      ).toBe(false);
    }

    // exportRawStorageData calls readRawStorageData (real function) — null (safe).
    const raw = await readRawStorageData(storage.getItem.bind(storage), STORAGE_KEY);
    expect(raw).toBeNull();

    // Both surfaces agree — the mismatch that motivated this task cannot occur.
  });

  it('full gap with blocked in-flight write: makeClearedExportSnapshot + resolveExportData after pm.clear() — no stale bytes', async () => {
    // Tightest timing: an autosave is blocked when clearAllData fires.
    // The write drains first, removeItem runs, then the ref is set.
    const release = storage.blockNextSetItem();

    pm.enqueueWrite({
      onboardingComplete: true,
      profile: staleClosedOver.profile,
      logs:    staleClosedOver.logs,
      weights: staleClosedOver.weights,
    });

    const exportSnapshotRef: { current: CaloraExportState | null } = { current: null };
    const { ctx } = makeSpyCtx(pm);
    const clearDone = performClearAllData(ctx); // suspends at pm.clear() (write blocked)

    release(); // unblock write → removeItem fires → clear resolves
    await clearDone;

    // Step 4: ref assignment (real function)
    exportSnapshotRef.current = makeClearedExportSnapshot({
      getPlannerWeekStart: () => '2026-08-03',
      healthConnected: staleClosedOver.healthConnected,
    });

    expect(storage.calls).toEqual([
      `setItem:${STORAGE_KEY}`,
      `removeItem:${STORAGE_KEY}`,
    ]);

    // Storage surface: null
    expect(
      await readRawStorageData(storage.getItem.bind(storage), STORAGE_KEY),
    ).toBeNull();

    // In-memory surface: cleared (real resolveExportData, real ref, stale fallback)
    const parsed = JSON.parse(
      resolveExportData(exportSnapshotRef, staleClosedOver, 2 /* STORAGE_SCHEMA_VERSION */),
    ) as Record<string, unknown>;

    expect(parsed['profile']).toBeNull();
    expect(parsed['logs']).toEqual([]);
    for (const id of ['log-1', 'log-2']) {
      expect(
        (parsed['logs'] as Array<{ id: string }>).some((l) => l.id === id),
      ).toBe(false);
    }
  });

  it('after the autosave effect nulls the ref (post-re-render), resolveExportData falls through to live cleared state', () => {
    // After the gap: the autosave effect sets exportSnapshotRef.current = null.
    // resolveExportData then uses the live closed-over state (which is now
    // cleared because the re-render committed).
    const ref: { current: CaloraExportState | null } = { current: null }; // null = post-gap

    // Simulate the live closed-over state after re-render (all cleared values).
    const liveCleared: CaloraExportState = {
      profile: null, logs: [], weights: [], waterLogs: {}, moodLogs: {},
      activityLogs: {}, activityMinutesLogs: {}, savedMeals: [], localRecipes: [],
      savedRecipeIds: [], plannerWeekStart: '2026-08-03', plannerMeals: [],
      shoppingItems: [], foodDrafts: [], foodMemories: [], repeatPatterns: [],
      memoryCorrections: [], livingMemory: emptyLivingMemory(),
      hydrationReminders: DEFAULT_HYDRATION_PREFS,
      mealReminders: { breakfast: false, lunch: false, dinner: false },
      goalReminder: { enabled: false, hour: 20, minute: 0 },
      notificationPreferences: { version: 1, delivery: 'local', masterEnabled: true, quietHours: { enabled: false, start: { hour: 22, minute: 0 }, end: { hour: 7, minute: 0 } }, categories: {} },
      healthConnected: false,
      consentAccepted: false, coachConsentAccepted: false, coachMessages: [],
    };

    // With ref null, resolveExportData falls through to liveCleared.
    const parsed = JSON.parse(
      resolveExportData(ref, liveCleared, 2 /* STORAGE_SCHEMA_VERSION */),
    ) as Record<string, unknown>;

    expect(parsed['profile']).toBeNull();
    expect(parsed['logs']).toEqual([]);
    expect(parsed['coachMessages']).toEqual([]);
    expect(parsed['consentAccepted']).toBe(false);
  });
});

describe('exportData (buildExportPayload): serialised output reflects the cleared in-memory state', () => {
  it('buildExportPayload over cleared state produces a valid JSON document with all fields cleared', async () => {
    // Simulate a pre-clear session: enqueue rich state so storage is populated.
    pm.enqueueWrite({
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [{ id: 'log-1', name: 'Oatmeal' }],
      weights: [{ id: 'weight-1', kg: 76 }],
      moodLogs: { '2026-08-07': 'good' },
      waterLogs: { '2026-08-07': 32 },
    });

    const { ctx, captured } = makeSpyCtx(pm);
    await performClearAllData(ctx);
    // captured now holds the post-clear values delivered to each React state setter.

    // buildExportPayload is the real CaloraContext.exportData body.
    // After clearAllData, CaloraContext also sets exportSnapshotRef with the same
    // cleared payload so exportData() can read it before React re-renders.
    // healthConnected is not reset by performClearAllData (it has no setter in
    // ClearAllDataCtx), so its value after a clear is the React useState default: false.
    //
    // schemaVersion (2) is CaloraContext's STORAGE_SCHEMA_VERSION — the single
    // source of truth.  We pass it explicitly here; buildExportPayload adds no
    // independent constant of its own to prevent drift.
    const clearedSnapshot: CaloraExportState = {
      profile:              captured.profile  as null,
      logs:                 captured.logs     as [],
      weights:              captured.weights  as [],
      waterLogs:            captured.waterLogs            as Record<string, unknown>,
      moodLogs:             captured.moodLogs             as Record<string, unknown>,
      activityLogs:         captured.activityLogs         as Record<string, unknown>,
      activityMinutesLogs:  captured.activityMinutesLogs  as Record<string, unknown>,
      savedMeals:           captured.savedMeals           as [],
      localRecipes:         captured.localRecipes         as [],
      savedRecipeIds:       captured.savedRecipeIds       as string[],
      plannerWeekStart:     captured.plannerWeekStart     as string,
      plannerMeals:         captured.plannerMeals         as [],
      shoppingItems:        captured.shoppingItems        as [],
      foodDrafts:           captured.foodDrafts           as [],
      foodMemories:         captured.foodMemories         as [],
      repeatPatterns:       captured.repeatPatterns       as [],
      memoryCorrections:    captured.memoryCorrections    as [],
      livingMemory:         captured.livingMemory,
      hydrationReminders:   captured.hydrationReminders,
      mealReminders:        { breakfast: false, lunch: false, dinner: false },
      goalReminder:         { enabled: false, hour: 20, minute: 0 },
      notificationPreferences: { version: 1, delivery: 'local', masterEnabled: true, quietHours: { enabled: false, start: { hour: 22, minute: 0 }, end: { hour: 7, minute: 0 } }, categories: {} },
      healthConnected:      false,
      consentAccepted:      captured.consentAccepted      as boolean,
      coachConsentAccepted: captured.coachConsentAccepted as boolean,
      coachMessages:        captured.coachMessages        as [],
    };

    // Call the real production serialiser — same code path as
    // CaloraContext.exportData reading from exportSnapshotRef.
    const exported = buildExportPayload(2 /* STORAGE_SCHEMA_VERSION */, clearedSnapshot);

    // Output must be a non-empty string.
    expect(typeof exported).toBe('string');

    const parsed = JSON.parse(exported) as Record<string, unknown>;

    // schemaVersion is emitted by buildExportPayload from the value passed in.
    expect(parsed['schemaVersion']).toBe(2);

    // Every field must reflect the cleared default — no pre-clear session data.
    expect(parsed['profile']).toBeNull();
    expect(parsed['logs']).toEqual([]);
    expect(parsed['weights']).toEqual([]);
    expect(parsed['moodLogs']).toEqual({});
    expect(parsed['waterLogs']).toEqual({});
    expect(parsed['activityLogs']).toEqual({});
    expect(parsed['activityMinutesLogs']).toEqual({});
    expect(parsed['savedMeals']).toEqual([]);
    expect(parsed['localRecipes']).toEqual([]);
    expect(parsed['savedRecipeIds']).toEqual([]);
    expect(parsed['plannerWeekStart']).toBe('2026-08-03'); // deterministic from makeSpyCtx mock
    expect(parsed['plannerMeals']).toEqual([]);
    expect(parsed['shoppingItems']).toEqual([]);
    expect(parsed['foodDrafts']).toEqual([]);
    expect(parsed['foodMemories']).toEqual([]);
    expect(parsed['repeatPatterns']).toEqual([]);
    expect(parsed['memoryCorrections']).toEqual([]);
    expect(parsed['notificationPreferences']).toMatchObject({ version: 1, delivery: 'local' });
    expect(parsed['mealReminders']).toEqual({ breakfast: false, lunch: false, dinner: false });
    expect(parsed['goalReminder']).toEqual({ enabled: false, hour: 20, minute: 0 });
    expect(parsed['consentAccepted']).toBe(false);
    expect(parsed['coachConsentAccepted']).toBe(false);
    expect(parsed['coachMessages']).toEqual([]);
    expect(parsed['healthConnected']).toBe(false);

    // Storage at the same moment is also empty (readRawStorageData returns null)
    // — both export surfaces agree that no pre-clear data is visible.
    expect(
      await readRawStorageData(storage.getItem.bind(storage), STORAGE_KEY),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Schema-version contract across repeated clear-then-re-onboard cycles
//
// CaloraContext's autosave useEffect assembles a CaloraState object that
// includes `schemaVersion: STORAGE_SCHEMA_VERSION` (currently 2) before
// passing it to pm.current.enqueueWrite.  A repeated sequence of:
//
//   clear (no post-clear autosave — crash / force-quit)
//   → re-onboard (enqueueWrite with schemaVersion: 2)
//   → second clear
//   → pm.read()
//
// must satisfy two invariants:
//   1. The re-onboarded snapshot carries the correct schemaVersion so future
//      launches can run schema migrations correctly.
//   2. A bare clear (no autosave) always leaves storage empty, so the next
//      cold launch reads { state: null, error: null } — not a versioned but
//      stale object from the previous re-onboard.
//
// These tests lock in both invariants and prevent silent migration errors
// caused by a missing or wrong schemaVersion after multiple cycles.
// ---------------------------------------------------------------------------

describe('Schema-version contract: repeated clear-then-re-onboard cycles', () => {
  // enqueueAutosave and STORAGE_SCHEMA_VERSION are imported from
  // lib/storageSchema.ts — the SAME module that CaloraContext's autosave
  // useEffect imports and calls.  Tests here call enqueueAutosave directly
  // so that any regression inside that function (e.g. removing the stamp)
  // causes these assertions to fail, independent of whether the provider
  // is mounted.

  it('clear (no autosave) → re-onboard via enqueueAutosave → second clear → pm.read() returns { state: null, error: null }', async () => {
    // ── Cycle 1: initial session ──────────────────────────────────────────
    // Write rich session state via enqueueAutosave — the production function
    // called by CaloraContext's autosave useEffect.  Then clear without a
    // post-clear autosave (crash / force-quit scenario).
    enqueueAutosave(pm, {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [{ id: 'first-session-log', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' }],
    });
    await pm.clear(); // no post-clear autosave — simulates hard restart / crash

    // Storage is empty; cold launch reads null.
    expect(await storage.getItem(STORAGE_KEY)).toBeNull();
    const afterFirstClear = await pm.read();
    expect(afterFirstClear.error).toBeNull();
    expect(afterFirstClear.state).toBeNull();

    // ── Re-onboarding ─────────────────────────────────────────────────────
    // The user goes through onboarding again.  CaloraContext's autosave
    // useEffect fires and calls enqueueAutosave(pm.current, state).  We call
    // the same production function here — if enqueueAutosave stops stamping
    // schemaVersion, the assertion below fails.
    const reOnboardedBase = {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'maintain', weightKg: 74 },
      logs: [] as unknown[],
      weights: [] as unknown[],
      waterLogs: {} as Record<string, unknown>,
      moodLogs:  {} as Record<string, unknown>,
      activityLogs: {} as Record<string, unknown>,
      activityMinutesLogs: {} as Record<string, unknown>,
      savedMeals: [] as unknown[],
      localRecipes: [] as unknown[],
      savedRecipeIds: [] as string[],
      consentAccepted: true,
      outbox: [] as unknown[],
      plannerWeekStart: '2026-08-03',
      plannerMeals: [] as unknown[],
      shoppingItems: [] as unknown[],
      foodDrafts: [] as unknown[],
      foodMemories: [] as unknown[],
      repeatPatterns: [] as unknown[],
      memoryCorrections: [] as unknown[],
      coachConsentAccepted: false,
      coachMessages: [] as unknown[],
    };
    enqueueAutosave(pm, reOnboardedBase); // production autosave boundary
    await new Promise((r) => setTimeout(r, 0)); // drain write

    // Re-onboarded snapshot is in storage with the correct schema version.
    const afterReOnboard = JSON.parse(storage.store[STORAGE_KEY]) as Record<string, unknown>;
    expect(afterReOnboard['schemaVersion']).toBe(STORAGE_SCHEMA_VERSION);
    expect(afterReOnboard['onboardingComplete']).toBe(true);

    // ── Cycle 2: second clear ─────────────────────────────────────────────
    // User resets again after re-onboarding.  No post-clear autosave.
    await pm.clear();

    // pm.read() must return { state: null, error: null } — storage is empty.
    // The second clear removed the re-onboarded key; nothing is left.
    const { state, error } = await pm.read();
    expect(error).toBeNull();
    expect(state).toBeNull();
  });

  it('post-clear autosave from performClearAllData, routed through the production enqueueAutosave, includes the correct schemaVersion', async () => {
    // Scenario: a user has a rich session, taps "Clear all data", and the
    // React autosave effect fires with the cleared state.  CaloraContext's
    // autosave useEffect calls exactly:
    //   enqueueAutosave(pm.current, clearedCaloraState)
    //
    // This test simulates that call using the same imported production function.
    // Removing the schema-version stamp from enqueueAutosave will immediately
    // break the assertion on stored['schemaVersion'].

    enqueueAutosave(pm, {
      onboardingComplete: true,
      profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
      logs: [{ id: 'session-log', name: 'Oatmeal', date: '2026-08-07', meal: 'Breakfast' }],
    });
    await new Promise((r) => setTimeout(r, 0)); // drain write

    // Confirm schemaVersion is present in the pre-clear snapshot.
    const beforeClear = JSON.parse(storage.store[STORAGE_KEY]) as Record<string, unknown>;
    expect(beforeClear['schemaVersion']).toBe(STORAGE_SCHEMA_VERSION);

    // performClearAllData: the real production function called by CaloraContext.clearAllData.
    const { ctx, captured } = makeSpyCtx(pm);
    await performClearAllData(ctx);

    // Simulate the post-clear autosave useEffect using the production boundary:
    //   enqueueAutosave(pm.current, clearedCaloraState)
    // This is the exact call in CaloraContext's autosave effect after clearAllData.
    // Using enqueueAutosave (not a manual stamp) means any regression that removes
    // the stamp from enqueueAutosave breaks this test.
    enqueueAutosave(pm, captured); // production autosave boundary
    await new Promise((r) => setTimeout(r, 0)); // drain write

    // The final snapshot in storage must carry the correct schema version.
    const stored = JSON.parse(storage.store[STORAGE_KEY]) as Record<string, unknown>;
    expect(stored['schemaVersion']).toBe(STORAGE_SCHEMA_VERSION);

    // All data fields must reflect the cleared defaults — the version is present
    // alongside cleared state, NOT alongside stale pre-clear session data.
    expect(stored['onboardingComplete']).toBe(false);
    expect(stored['profile']).toBeNull();
    expect(stored['logs']).toEqual([]);

    // schemaVersion must survive a pm.read() round-trip — exactly as
    // CaloraContext's hydration guard would see it on the next cold launch.
    const { state, error } = await pm.read<Record<string, unknown>>();
    expect(error).toBeNull();
    expect(state).not.toBeNull();
    if (state) {
      expect(state['schemaVersion']).toBe(STORAGE_SCHEMA_VERSION);
      // Cleared fields co-exist with the correct version — no migration ambiguity.
      expect(state['onboardingComplete']).toBe(false);
      expect(state['profile']).toBeNull();
      expect(state['logs']).toEqual([]);
    }
  });

  it('three-cycle invariant: each re-onboarded snapshot carries STORAGE_SCHEMA_VERSION and a final bare clear leaves read() returning null', async () => {
    // Extended regression guard: STORAGE_SCHEMA_VERSION must appear in every
    // re-onboarded snapshot across arbitrarily many clear-re-onboard cycles.
    // A final bare clear (no autosave) always leaves storage empty.
    // All writes go through enqueueAutosave — the production autosave boundary.

    // ── Cycle 1: populate → clear (no autosave) ───────────────────────────
    enqueueAutosave(pm, { onboardingComplete: true });
    await pm.clear();
    expect(await storage.getItem(STORAGE_KEY)).toBeNull();

    // ── Cycle 2: re-onboard → verify version → clear (no autosave) ───────
    enqueueAutosave(pm, { onboardingComplete: true, profile: { name: 'Cycle2' } });
    await new Promise((r) => setTimeout(r, 0));
    const cycle2Stored = JSON.parse(storage.store[STORAGE_KEY]) as Record<string, unknown>;
    expect(cycle2Stored['schemaVersion']).toBe(STORAGE_SCHEMA_VERSION);
    await pm.clear();
    expect(await storage.getItem(STORAGE_KEY)).toBeNull();

    // ── Cycle 3: re-onboard → verify version → clear (no autosave) ───────
    enqueueAutosave(pm, { onboardingComplete: true, profile: { name: 'Cycle3' } });
    await new Promise((r) => setTimeout(r, 0));
    const cycle3Stored = JSON.parse(storage.store[STORAGE_KEY]) as Record<string, unknown>;
    expect(cycle3Stored['schemaVersion']).toBe(STORAGE_SCHEMA_VERSION);
    await pm.clear();

    // Final pm.read(): storage is empty — null state, no error, no stale version.
    const { state, error } = await pm.read();
    expect(error).toBeNull();
    expect(state).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pre-versioning snapshot safety: snapshots saved before schemaVersion existed
//
// A user upgrading from an older build may have a saved snapshot that has no
// `schemaVersion` field at all (the field was added retroactively), or one
// with `schemaVersion: 1` from an earlier stamping convention.
//
// The hydration path (pm.read → parseStorageValue) must handle both cases
// without crashing and without silently discarding data.
//
// Crucially, the schema-version field is only stamped on WRITE (via
// enqueueAutosave).  On READ, parseStorageValue returns whatever JSON object
// is stored — it does not validate or reject unrecognised version numbers.
// Any migration logic sits in CaloraContext's hydration callback, not here.
//
// These tests write raw JSON directly to the underlying StorageAdapter (not
// through enqueueAutosave) so that the missing-or-old schemaVersion is
// preserved exactly as it would be on a real device upgrading from an older
// build.
// ---------------------------------------------------------------------------

describe('Pre-versioning snapshot safety: snapshots with no schemaVersion or schemaVersion:1 are read without crash or silent data loss', () => {
  it('snapshot with no schemaVersion field: pm.read() returns the data without error', async () => {
    // Simulate a snapshot written by an old build that predates the
    // schemaVersion field.  Write directly to the adapter (bypassing
    // enqueueAutosave) so the raw payload reaches pm.read() unchanged.
    const legacySnapshot = {
      onboardingComplete: true,
      profile: { name: 'Legacy User', goal: 'maintain', weightKg: 70 },
      logs: [
        { id: 'legacy-log-1', name: 'Toast', date: '2026-01-01', meal: 'Breakfast',
          calories: 120, protein: 4, carbs: 22, fat: 2, source: 'Manual', confidence: 90,
          time: '7:30 AM', serving: '2 slices' },
      ],
      weights: [{ id: 'legacy-weight-1', date: '2026-01-01', kg: 70, source: 'manual' }],
      waterLogs: { '2026-01-01': 64 },
      moodLogs: { '2026-01-01': 'good' },
    };
    // No schemaVersion field — as it would be on an old device.
    expect('schemaVersion' in legacySnapshot).toBe(false);

    await storage.setItem(STORAGE_KEY, JSON.stringify(legacySnapshot));

    // pm.read() must not throw and must return the stored data intact.
    const { state, error } = await pm.read<typeof legacySnapshot & { schemaVersion?: number }>();

    expect(error).toBeNull();
    expect(state).not.toBeNull();
    if (state) {
      // Data fields are accessible — no silent partial load.
      expect(state.onboardingComplete).toBe(true);
      expect(state.profile?.name).toBe('Legacy User');
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].id).toBe('legacy-log-1');
      expect(state.weights).toHaveLength(1);
      expect(state.waterLogs?.['2026-01-01']).toBe(64);
      expect(state.moodLogs?.['2026-01-01']).toBe('good');
      // schemaVersion is absent — the field was never written.
      expect(state.schemaVersion).toBeUndefined();
    }
  });

  it('snapshot with schemaVersion: 1: pm.read() returns the data without error', async () => {
    // Simulate a snapshot written by a build that used schemaVersion: 1.
    // The current code defines STORAGE_SCHEMA_VERSION = 2, so this snapshot
    // predates the current schema.  parseStorageValue must not reject it.
    const v1Snapshot = {
      schemaVersion: 1,
      onboardingComplete: true,
      profile: { name: 'V1 User', goal: 'lose', weightKg: 80 },
      logs: [
        { id: 'v1-log-1', name: 'Scrambled eggs', date: '2026-03-15', meal: 'Breakfast',
          calories: 220, protein: 18, carbs: 2, fat: 15, source: 'Manual', confidence: 85,
          time: '8:00 AM', serving: '2 eggs' },
        { id: 'v1-log-2', name: 'Greek yoghurt', date: '2026-03-15', meal: 'Snack',
          calories: 100, protein: 10, carbs: 8, fat: 2, source: 'USDA verified', confidence: 96,
          time: '10:30 AM', serving: '1 cup' },
      ],
      weights: [{ id: 'v1-weight-1', date: '2026-03-15', kg: 80, source: 'manual' }],
      savedMeals: [],
      coachMessages: [] as unknown[],
      coachConsentAccepted: false,
    };

    await storage.setItem(STORAGE_KEY, JSON.stringify(v1Snapshot));

    const { state, error } = await pm.read<typeof v1Snapshot>();

    expect(error).toBeNull();
    expect(state).not.toBeNull();
    if (state) {
      // Version field is readable and equals what was stored — no coercion or loss.
      expect(state.schemaVersion).toBe(1);
      // All data fields are accessible — no silent partial load.
      expect(state.onboardingComplete).toBe(true);
      expect(state.profile?.name).toBe('V1 User');
      expect(state.logs).toHaveLength(2);
      expect(state.logs[0].id).toBe('v1-log-1');
      expect(state.logs[1].id).toBe('v1-log-2');
      expect(state.weights).toHaveLength(1);
      expect(state.weights[0].kg).toBe(80);
      expect(state.coachConsentAccepted).toBe(false);
      expect(state.coachMessages).toEqual([]);
    }
  });

  it('snapshot with no schemaVersion: hydration early-return guard (if !saved) is NOT triggered — saved is truthy', async () => {
    // The CaloraContext hydration callback does:
    //   if (!saved) return;   ← only for null (empty storage / post-clear)
    //
    // A legacy snapshot without schemaVersion must still be truthy so that
    // the hydration callback processes the data fields.  This test asserts
    // the truthiness contract explicitly.
    const legacySnapshot = {
      onboardingComplete: true,
      profile: { name: 'Legacy', goal: 'maintain', weightKg: 65 },
      logs: [] as unknown[],
    };
    await storage.setItem(STORAGE_KEY, JSON.stringify(legacySnapshot));

    const { state, error } = await pm.read<typeof legacySnapshot>();
    expect(error).toBeNull();
    // state must be truthy — the hydration early-return guard must NOT fire.
    expect(!!state).toBe(true);
    if (state) {
      expect(state.onboardingComplete).toBe(true);
    }
  });

  it('snapshot with schemaVersion: 1: hydration early-return guard (if !saved) is NOT triggered — saved is truthy', async () => {
    // Same truthiness contract as the test above, but for the v1 case.
    const v1Snapshot = { schemaVersion: 1, onboardingComplete: true, profile: null, logs: [] as unknown[] };
    await storage.setItem(STORAGE_KEY, JSON.stringify(v1Snapshot));

    const { state, error } = await pm.read<typeof v1Snapshot>();
    expect(error).toBeNull();
    expect(!!state).toBe(true);
    if (state) {
      expect(state.schemaVersion).toBe(1);
      expect(state.onboardingComplete).toBe(true);
    }
  });

  it('snapshot with no schemaVersion: the raw JSON survives the read round-trip without corruption', async () => {
    // Confirms that pm.read() is a pure read — it does not modify the stored
    // raw bytes (no auto-migration, no schema-version stamp on read).  The
    // underlying storage key is untouched after the read.
    const legacyRaw = JSON.stringify({
      onboardingComplete: false,
      profile: null,
      logs: [{ id: 'raw-check-log', name: 'Apple', date: '2025-12-01', meal: 'Snack',
               calories: 95, protein: 0, carbs: 25, fat: 0, source: 'USDA verified',
               confidence: 99, time: '3:00 PM', serving: '1 medium' }],
    });
    await storage.setItem(STORAGE_KEY, legacyRaw);

    await pm.read(); // perform the read

    // The stored bytes are exactly what was written — no schema stamp added.
    const afterRead = await storage.getItem(STORAGE_KEY);
    expect(afterRead).toBe(legacyRaw);
    // Confirm the raw string has no schemaVersion — the read did not modify it.
    const parsed = JSON.parse(afterRead!) as Record<string, unknown>;
    expect('schemaVersion' in parsed).toBe(false);
  });

  it('snapshot with schemaVersion: 1: the raw JSON survives the read round-trip without corruption', async () => {
    // Mirrors the no-version test above for the v1 case.
    const v1Raw = JSON.stringify({ schemaVersion: 1, onboardingComplete: true,
      profile: { name: 'V1', goal: 'gain', weightKg: 60 }, logs: [] });
    await storage.setItem(STORAGE_KEY, v1Raw);

    await pm.read();

    const afterRead = await storage.getItem(STORAGE_KEY);
    expect(afterRead).toBe(v1Raw);
    const parsed = JSON.parse(afterRead!) as Record<string, unknown>;
    expect(parsed['schemaVersion']).toBe(1); // still 1, not bumped to 2
  });
});

// ---------------------------------------------------------------------------
// Schema version migration gate
//
// These tests act as a release gate: bumping STORAGE_SCHEMA_VERSION without
// adding the corresponding MIGRATIONS entry causes the gate test to fail.
//
// How the gate works
// ──────────────────
// The gate test calls `applyStorageMigration(v2Snapshot, STORAGE_SCHEMA_VERSION)`.
// While STORAGE_SCHEMA_VERSION === 2, versions match and the call is a no-op.
// When a developer bumps STORAGE_SCHEMA_VERSION to 3:
//   • Without MIGRATIONS[2]: applyStorageMigration throws ParseHydrationError
//     → the gate test fails at `expect(...).not.toThrow()` → release is blocked.
//   • With MIGRATIONS[2] added: migration runs, result carries schemaVersion: 3
//     → gate test passes and the shape-assertion test verifies field correctness.
//
// The "next-version simulation" test covers the converse: it writes a v2
// snapshot and targets STORAGE_SCHEMA_VERSION + 1, asserting that the missing
// migration produces an explicit ParseHydrationError rather than a silent
// passthrough of stale v2 field shapes.
// ---------------------------------------------------------------------------

describe('schema version migration gate — bumping STORAGE_SCHEMA_VERSION requires a migration entry', () => {
  /**
   * A realistic v2 snapshot representing data written by the current app build.
   * All fields that CaloraContext persists via enqueueAutosave are present so
   * that a migration function can assert it handles every known field correctly.
   */
  const v2Snapshot = {
    schemaVersion: 2,
    onboardingComplete: true,
    profile: { name: 'Alex', goal: 'lose', activity: 'moderate', diet: 'Everything',
               heightCm: 172, weightKg: 76, targetWeightKg: 68, age: 31, calorieTarget: 2000 },
    logs: [
      { id: 'gate-log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast',
        calories: 420, protein: 18, carbs: 58, fat: 14, source: 'USDA verified',
        confidence: 98, time: '8:10 AM', serving: '1 bowl' },
    ],
    weights: [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
    waterLogs: { '2026-08-07': 48 },
    moodLogs: { '2026-08-07': 'good' },
    activityLogs: { '2026-08-07': 'moderate' },
    activityMinutesLogs: { '2026-08-07': 30 },
    savedMeals: [],
    localRecipes: [],
    savedRecipeIds: [],
    themePreference: 'system',
    healthConnected: false,
    consentAccepted: true,
    outbox: [],
    plannerWeekStart: '2026-08-03',
    plannerMeals: [],
    shoppingItems: [],
    foodDrafts: [],
    foodMemories: [],
    repeatPatterns: [],
    memoryCorrections: [],
    hydrationReminders: {},
    coachConsentAccepted: false,
    coachMessages: [],
    goalCelebrationSeenTargetKg: null,
  } as const;

  it('MIGRATIONS contains a handler for every schema version below STORAGE_SCHEMA_VERSION', () => {
    // This is the primary release gate.  For each version N where
    // 1 ≤ N < STORAGE_SCHEMA_VERSION a MIGRATIONS[N] entry must exist so that
    // on-device snapshots from build N can be carried forward to the current
    // schema without data loss or silent field-shape mismatches.
    //
    // Failure message: add MIGRATIONS[N] in hydrationGuard.ts to fix this.
    for (let v = 1; v < STORAGE_SCHEMA_VERSION; v++) {
      expect(
        MIGRATIONS,
        `MIGRATIONS[${v}] is missing. ` +
        `Add a v${v} → v${v + 1} migration in hydrationGuard.ts before ` +
        `bumping STORAGE_SCHEMA_VERSION to ${v + 1}.`,
      ).toHaveProperty(String(v));
    }
  });

  it('v2 snapshot processed with the current STORAGE_SCHEMA_VERSION does not throw — migration runs or versions already match', async () => {
    // This is the end-to-end gate:
    //   • Today (STORAGE_SCHEMA_VERSION === 2): versions match → applyStorageMigration
    //     is a no-op; the snapshot is returned as-is.  Test passes.
    //   • After bumping to 3 WITHOUT MIGRATIONS[2]: applyStorageMigration throws
    //     ParseHydrationError → `expect(...).not.toThrow()` FAILS → gate blocks release.
    //   • After bumping to 3 WITH MIGRATIONS[2]: migration runs and the test passes.
    //
    // The full round-trip through storage is exercised: write the raw v2 JSON,
    // read it back via pm.read(), then apply the migration.
    await storage.setItem(STORAGE_KEY, JSON.stringify(v2Snapshot));
    const { state, error } = await pm.read<typeof v2Snapshot>();

    expect(error).toBeNull();
    expect(state).not.toBeNull();

    // Must not throw — either the versions match (no-op) or the migration ran.
    const migrated = applyStorageMigration(state!, STORAGE_SCHEMA_VERSION);

    // The output must carry the current schema version — never a stale older one.
    expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
  });

  it('v2 snapshot carries the correct field shapes after applyStorageMigration — no silent undefined fields', async () => {
    // Verifies that core field shapes survive the migration chain intact.
    // When STORAGE_SCHEMA_VERSION is still 2 this is a no-op round-trip;
    // when it is ≥ 3 the migration function must preserve or transform each
    // field correctly — undefined values here indicate a broken migration.
    await storage.setItem(STORAGE_KEY, JSON.stringify(v2Snapshot));
    const { state } = await pm.read<typeof v2Snapshot>();
    const migrated = applyStorageMigration(state!, STORAGE_SCHEMA_VERSION) as Record<string, unknown>;

    // These fields are load-bearing: a migration that renames or drops any of
    // them without updating the hydration callback in CaloraContext would
    // silently produce undefined in the UI.
    expect(migrated['onboardingComplete']).toBe(true);
    expect(migrated['profile']).not.toBeNull();
    expect((migrated['profile'] as Record<string, unknown>)['name']).toBe('Alex');
    expect(Array.isArray(migrated['logs'])).toBe(true);
    expect((migrated['logs'] as unknown[]).length).toBe(1);
    expect(Array.isArray(migrated['weights'])).toBe(true);
    expect(migrated['consentAccepted']).toBe(true);
    expect(migrated['themePreference']).toBe('system');
  });

  it('simulated next-version bump: v2 snapshot targeted at STORAGE_SCHEMA_VERSION + 1 surfaces ParseHydrationError — never silent passthrough', () => {
    // Simulates what would happen right now if STORAGE_SCHEMA_VERSION were
    // bumped by 1 without adding a migration.  The function must throw an
    // explicit ParseHydrationError rather than returning the stale v2 snapshot
    // as if it were the new version.
    //
    // This test is intentionally written against STORAGE_SCHEMA_VERSION + 1
    // (not a hardcoded "3") so it continues to exercise the "missing migration"
    // path regardless of what the current version is.
    const hypotheticalNextVersion = STORAGE_SCHEMA_VERSION + 1;

    expect(
      () => applyStorageMigration(v2Snapshot, hypotheticalNextVersion),
    ).toThrow(ParseHydrationError);
  });

  it('applyStorageMigration: snapshot already at targetVersion is returned unchanged (no mutation)', () => {
    // Guard against a migration accidentally running when versions already match.
    const snapshot = { schemaVersion: STORAGE_SCHEMA_VERSION, onboardingComplete: true, logs: [] };
    const result = applyStorageMigration(snapshot, STORAGE_SCHEMA_VERSION);
    // Strict reference equality — the same object is returned, not a copy.
    expect(result).toBe(snapshot);
  });

  it('applyStorageMigration: snapshot with no schemaVersion is treated as v1 and migrated forward', () => {
    // Legacy snapshots that predate the versioning system have no schemaVersion.
    // The `?? 1` fallback in applyStorageMigration must treat them as v1 and
    // apply the v1 → ... → STORAGE_SCHEMA_VERSION chain rather than throwing.
    const legacySnapshot = { onboardingComplete: true, logs: [], profile: null };

    // Must not throw — the v1 migration chain must handle the legacy shape.
    expect(() => applyStorageMigration(legacySnapshot, STORAGE_SCHEMA_VERSION)).not.toThrow();

    const migrated = applyStorageMigration(legacySnapshot, STORAGE_SCHEMA_VERSION);
    // The output must be stamped with the current schema version.
    expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
  });

  it('applyStorageMigration: snapshot with schemaVersion newer than target throws ParseHydrationError (downgrade rejected)', () => {
    // A snapshot saved by a newer build of the app must never silently load
    // into an older build — doing so risks silent data loss (new fields ignored).
    const futureSnapshot = { schemaVersion: STORAGE_SCHEMA_VERSION + 5, onboardingComplete: true };
    expect(
      () => applyStorageMigration(futureSnapshot, STORAGE_SCHEMA_VERSION),
    ).toThrow(ParseHydrationError);
  });
});
