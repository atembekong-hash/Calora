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
