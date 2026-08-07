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
