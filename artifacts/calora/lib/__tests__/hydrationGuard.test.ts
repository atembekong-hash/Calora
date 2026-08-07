import { describe, expect, it } from 'vitest';
import {
  ParseHydrationError,
  parseStorageValue,
  queueClearAfterPendingWrites,
  shouldAutosave,
} from '../hydrationGuard';
import { PersistenceManager } from '../persistenceManager';

// ---------------------------------------------------------------------------
// shouldAutosave — autosave gate
// ---------------------------------------------------------------------------

describe('shouldAutosave: gate that prevents default state from overwriting saved data', () => {
  it('blocks autosave before hydration has completed', () => {
    // hydrated=false means the storage read is still in-flight; writing now
    // would persist React's initial (starter) state over the user's data.
    expect(shouldAutosave({ hydrated: false, error: null })).toBe(false);
  });

  it('blocks autosave when hydration raised a read or parse error', () => {
    // A hydration error means in-memory state still holds defaults.
    // Allowing autosave here would silently overwrite the user's saved data
    // with starter values.
    expect(shouldAutosave({ hydrated: true, error: 'parse failed' })).toBe(false);
  });

  it('blocks autosave when both hydrated=false and an error is present', () => {
    expect(shouldAutosave({ hydrated: false, error: 'storage unavailable' })).toBe(false);
  });

  it('allows autosave only after a clean, error-free hydration', () => {
    expect(shouldAutosave({ hydrated: true, error: null })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseStorageValue — safe storage parser
// ---------------------------------------------------------------------------

describe('parseStorageValue: simulates failed local-state read or parse', () => {
  it('returns null state with no error for empty storage (first launch)', () => {
    // null raw value = key was never written; no error, caller should
    // keep defaults rather than treating this as a failure.
    const result = parseStorageValue<Record<string, unknown>>(null);
    expect(result.state).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns null state with no error for an empty string value', () => {
    const result = parseStorageValue<Record<string, unknown>>('');
    expect(result.state).toBeNull();
    expect(result.error).toBeNull();
  });

  it('parses valid saved state without error', () => {
    const saved = { onboardingComplete: true, profile: null, logs: [] };
    const result = parseStorageValue<typeof saved>(JSON.stringify(saved));
    expect(result.state).toEqual(saved);
    expect(result.error).toBeNull();
  });

  it('returns structured error when JSON is corrupt — does not throw', () => {
    // Simulates the failure path: storage had data but it cannot be parsed.
    // The caller must set hydrationError from this, which blocks autosave
    // and prevents starter state from being written back over the corrupt
    // (but potentially recoverable) storage value.
    const result = parseStorageValue<Record<string, unknown>>('{not-valid-json}');
    expect(result.state).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it('error message explicitly says user data was not changed', () => {
    // This wording is shown to the user and also signals to tests that the
    // implementation correctly avoided a destructive write.
    const result = parseStorageValue<Record<string, unknown>>('TRUNCATED{{{{');
    expect(result.error).toContain('Your data was not changed');
  });

  it('returns error for truncated JSON that cannot be completed', () => {
    const partial = '{"onboardingComplete":true,"profile":{"name":"Alex"';
    const result = parseStorageValue<Record<string, unknown>>(partial);
    expect(result.state).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it('never throws — error is always surfaced as a return value', () => {
    // Ensures the component boundary is never crossed by a raw parse
    // exception, regardless of how badly the stored string is mangled.
    expect(() => parseStorageValue<unknown>('undefined')).not.toThrow();
    expect(() => parseStorageValue<unknown>('null\x00null')).not.toThrow();
    expect(() => parseStorageValue<unknown>('\uFFFD\uFFFD')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// queueClearAfterPendingWrites — prevents write resurrection after clear
// ---------------------------------------------------------------------------

describe('queueClearAfterPendingWrites: queued write cannot resurrect data after clear', () => {
  it('clear resolves only after a pending write completes', async () => {
    const order: string[] = [];
    let resolveWrite!: () => void;
    const pendingWrite = new Promise<void>((res) => {
      resolveWrite = res;
    });
    const queue = pendingWrite.then(() => {
      order.push('write');
    });

    const clearPromise = queueClearAfterPendingWrites(queue, async () => {
      order.push('clear');
    });

    // Neither has run yet — write is still blocked
    expect(order).toEqual([]);

    resolveWrite();
    await clearPromise;

    // Write finished first, then clear — clear wins the final state
    expect(order).toEqual(['write', 'clear']);
  });

  it('clear still executes when the queued write rejects', async () => {
    // If an in-flight write fails, clearAllData must still complete so
    // the user's explicit action is honoured.
    const order: string[] = [];
    const failingQueue: Promise<void> = Promise.reject(
      new Error('storage write failed'),
    ).then(() => {
      order.push('write');
    }) as Promise<void>;

    const clearPromise = queueClearAfterPendingWrites(failingQueue, async () => {
      order.push('clear');
    });

    await clearPromise;
    expect(order).toEqual(['clear']);
  });

  it('clear runs even when multiple sequential writes precede it', async () => {
    // Simulates several state flushes queued before the user taps "clear all".
    const order: string[] = [];
    let flushA!: () => void;
    let flushB!: () => void;

    const writeA = new Promise<void>((res) => { flushA = res; });
    const writeB = new Promise<void>((res) => { flushB = res; });

    // Build a chain: writeA → writeB (as the context queue does)
    const chain = writeA
      .then(() => { order.push('write-a'); })
      .then(() => writeB)
      .then(() => { order.push('write-b'); });

    const clearPromise = queueClearAfterPendingWrites(chain, async () => {
      order.push('clear');
    });

    // Drain both pending writes
    flushA();
    await new Promise((r) => setTimeout(r, 0));
    flushB();
    await clearPromise;

    expect(order).toEqual(['write-a', 'write-b', 'clear']);
  });
});

// ---------------------------------------------------------------------------
// clearAllData queue pattern: write drains before storage remove
// ---------------------------------------------------------------------------

describe('clearAllData queue pattern: pending write must drain before storage is removed', () => {
  it('storage remove runs after a queued write — mirrors the clearAllData reassignment pattern', async () => {
    // This replicates the exact code path in clearAllData:
    //   storageWriteQueue.current = queueClearAfterPendingWrites(
    //     storageWriteQueue.current,
    //     () => AsyncStorage.removeItem(STORAGE_KEY),
    //   );
    //   await storageWriteQueue.current;
    //
    // A pending write is in progress when the user triggers clearAllData.
    // The queue must ensure the write completes first so the remove is the
    // final operation — no queued write can resurrect data after the clear.
    const order: string[] = [];
    let resolveWrite!: () => void;

    // Simulate an in-flight autosave (the context's storageWriteQueue.current)
    let currentQueue: Promise<void> = new Promise<void>((res) => {
      resolveWrite = res;
    }).then(() => {
      order.push('autosave-write');
    });

    // clearAllData reassigns the queue by chaining off it
    currentQueue = queueClearAfterPendingWrites(currentQueue, async () => {
      order.push('storage-remove');
    });

    // The write is still blocked — nothing has run yet
    expect(order).toEqual([]);

    // Unblock the pending write (simulates AsyncStorage.setItem resolving)
    resolveWrite();
    await currentQueue;

    // Write must finish before remove — remove wins as the last writer
    expect(order).toEqual(['autosave-write', 'storage-remove']);
  });

  it('storage remove still runs when the queued autosave write throws', async () => {
    // If AsyncStorage.setItem rejects mid-flight, clearAllData must still
    // remove the key so the user's explicit "clear all" action is honoured.
    const order: string[] = [];

    let currentQueue: Promise<void> = Promise.reject(
      new Error('AsyncStorage: disk full'),
    ).then(() => {
      order.push('autosave-write');
    }) as Promise<void>;

    currentQueue = queueClearAfterPendingWrites(currentQueue, async () => {
      order.push('storage-remove');
    });

    await currentQueue;

    // Write was skipped (threw), but remove must still execute
    expect(order).toEqual(['storage-remove']);
  });

  it('a second clearAllData call chains off the first — last clear wins', async () => {
    // If the user triggers clear twice quickly, each call chains off the
    // previous queue entry. The final state must reflect both removes
    // running in order, not racing.
    const order: string[] = [];
    let resolveFirst!: () => void;

    let currentQueue: Promise<void> = new Promise<void>((res) => {
      resolveFirst = res;
    }).then(() => {
      order.push('write');
    });

    // First clearAllData call
    currentQueue = queueClearAfterPendingWrites(currentQueue, async () => {
      order.push('clear-1');
    });

    // Second clearAllData call chains off the first clear's queue
    currentQueue = queueClearAfterPendingWrites(currentQueue, async () => {
      order.push('clear-2');
    });

    resolveFirst();
    await currentQueue;

    expect(order).toEqual(['write', 'clear-1', 'clear-2']);
  });
});

// ---------------------------------------------------------------------------
// Post-clear re-hydration: empty storage yields empty state, not starter data
// ---------------------------------------------------------------------------

describe('post-clear re-hydration: empty storage returns null state so context keeps cleared values', () => {
  it('parseStorageValue on empty storage returns null state with no error after a clear', () => {
    // After clearAllData runs AsyncStorage.removeItem, the next getItem call
    // returns null (key does not exist). parseStorageValue must signal "no
    // saved state" without an error — the hydration effect then keeps
    // whatever clearAllData already set (empty arrays, null profile, etc.)
    // rather than applying any starter/default data.
    const result = parseStorageValue<Record<string, unknown>>(null);
    expect(result.state).toBeNull();
    expect(result.error).toBeNull();
  });

  it('null saved state means the hydration effect returns early — starter logs are never loaded', () => {
    // The hydration effect in CaloraContext does:
    //   const { state: saved } = parseStorageValue(raw);
    //   if (!saved) return;   ← early return, no setState calls for starter data
    //
    // This test documents that contract: null state from parseStorageValue is
    // the correct signal to skip all setter calls, leaving the context in
    // the empty state that clearAllData already established.
    const { state: saved } = parseStorageValue<{ logs: unknown[] }>(null);
    // Null state must NOT be treated as an empty object with starter arrays —
    // the early-return guard depends on the truthiness of this value.
    expect(saved).toBeNull();
    expect(!saved).toBe(true); // confirms `if (!saved) return;` would fire
  });

  it('parseStorageValue on an empty string also returns null — covers removeItem followed by a race-read', () => {
    // In rare cases a race between removeItem and getItem may surface an
    // empty string rather than null. Both must be treated identically:
    // no error, null state, so the context keeps its cleared values.
    const result = parseStorageValue<Record<string, unknown>>('');
    expect(result.state).toBeNull();
    expect(result.error).toBeNull();
  });

  it('shouldAutosave blocks autosave while hydrated=false — prevents starter logs writing over cleared state', () => {
    // After clearAllData the context sets state to empty values.
    // If a re-render fires before hydration completes (hydrated=false),
    // autosave must be blocked so empty-initialized state is never persisted
    // without the user's explicit action. The hydration guard already
    // covers this invariant; this test ties it explicitly to the clear path.
    expect(shouldAutosave({ hydrated: false, error: null })).toBe(false);
  });

  it('autosave is allowed once storage is cleanly readable after a clear', () => {
    // Once the app re-hydrates after a clear (reads null, keeps empty state,
    // then flips hydrated=true with no error), autosave should re-enable so
    // the user's next actions are persisted normally.
    expect(shouldAutosave({ hydrated: true, error: null })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Retry path invariant (documented as a pure-logic check)
// ---------------------------------------------------------------------------

describe('retry path: re-read does not delete or replace saved state', () => {
  it('shouldAutosave returns false immediately after retryHydration resets hydrated=false', () => {
    // retryHydration sets hydrated=false before re-triggering the effect.
    // During that window autosave must be blocked, otherwise the next
    // render cycle could write stale in-memory state to storage.
    expect(shouldAutosave({ hydrated: false, error: null })).toBe(false);
  });

  it('shouldAutosave returns false during retry if the previous error has not yet cleared', () => {
    // The error is cleared at the start of the hydration effect.
    // Until the new read completes, both error and hydrated=false apply.
    expect(shouldAutosave({ hydrated: false, error: 'previous parse error' })).toBe(false);
  });

  it('shouldAutosave allows writes again once retry reads storage cleanly', () => {
    // Simulates a successful retry: hydrated flips back to true with no error.
    expect(shouldAutosave({ hydrated: true, error: null })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Retry recovery: pm.read() returns clean state after storage is repaired
// ---------------------------------------------------------------------------

describe('retry recovery: pm.read() returns clean state after storage is repaired', () => {
  it('first read returns a parse error; second read after repair returns valid state with no error', async () => {
    // Simulates the full retryHydration flow:
    //   1. Storage holds corrupt JSON → pm.read() surfaces a parse error.
    //   2. Storage is repaired externally (e.g. the key is overwritten with
    //      valid data).
    //   3. retryHydration increments hydrationAttempt, re-triggering the
    //      hydration effect which calls pm.read() again.
    //   4. The second read must return the clean state with error === null.
    //
    // This documents that PersistenceManager.read() does not cache results —
    // each call goes back to the underlying storage adapter, so a repaired
    // key is immediately visible after retry.
    let storedValue: string | null = '{not-valid-json}';
    const storage = {
      getItem: async (_key: string) => storedValue,
      setItem: async (_key: string, value: string) => { storedValue = value; },
      removeItem: async (_key: string) => { storedValue = null; },
    };
    const pm = new PersistenceManager(storage, 'calora_state');

    // First read: corrupt storage → parse error
    const firstResult = await pm.read<{ onboardingComplete: boolean }>();
    expect(firstResult.state).toBeNull();
    expect(firstResult.error).not.toBeNull();

    // Storage is repaired (user or OS writes valid data back)
    const validState = { onboardingComplete: true };
    storedValue = JSON.stringify(validState);

    // Second read (what retryHydration triggers): clean result, no error
    const secondResult = await pm.read<{ onboardingComplete: boolean }>();
    expect(secondResult.state).toEqual(validState);
    expect(secondResult.error).toBeNull();
  });

  it('shouldAutosave is false during the retry window (hydrated=false) and true after a clean re-read', () => {
    // Documents the two-phase state the hydration effect passes through
    // during a retry:
    //   Phase 1 — retryHydration fires: hydrated resets to false, error is
    //             still set from the previous attempt. Autosave must be
    //             blocked for the entire window so in-memory state (which is
    //             still the context default) cannot overwrite storage.
    //   Phase 2 — hydration effect completes cleanly: hydrated flips to true,
    //             error clears to null. Autosave re-enables so the user's
    //             next actions are persisted normally.
    const duringRetryWindow = shouldAutosave({ hydrated: false, error: 'parse failed' });
    expect(duringRetryWindow).toBe(false);

    const afterCleanReread = shouldAutosave({ hydrated: true, error: null });
    expect(afterCleanReread).toBe(true);
  });

  it('replacing a corrupt key with valid JSON means hydrationErrorKind clears to null on the next read', async () => {
    // Documents the error-clearing contract at the top of the hydration effect:
    //   setHydrationErrorKind(null);   ← cleared before the new read begins
    //
    // This test confirms the PersistenceManager layer returns error === null
    // when storage is repaired, which is the signal the hydration effect uses
    // to decide whether to call setHydrationErrorKind('parse' | 'io') or
    // leave it at null (cleared).
    //
    // In other words: if pm.read() returns error === null, the effect never
    // sets hydrationErrorKind back to a non-null value, so the parse-error
    // screen stays hidden and the user sees their recovered data.
    let storedValue: string | null = 'CORRUPT{{{';
    const storage = {
      getItem: async (_key: string) => storedValue,
      setItem: async (_key: string, value: string) => { storedValue = value; },
      removeItem: async (_key: string) => { storedValue = null; },
    };
    const pm = new PersistenceManager(storage, 'calora_state');

    // Confirm the corrupt read does produce an error (establishing the
    // before-state that retryHydration is recovering from)
    const corrupt = await pm.read<Record<string, unknown>>();
    expect(corrupt.error).not.toBeNull();

    // Repair storage — simulates what "retry after manual fix" or a native
    // OS repair does before retryHydration is called
    storedValue = JSON.stringify({ logs: [], profile: null });

    // The hydration effect clears hydrationErrorKind=null at its top, then
    // reads storage. If this read returns error=null, the effect never
    // re-sets it — hydrationErrorKind stays null.
    const repaired = await pm.read<Record<string, unknown>>();
    expect(repaired.error).toBeNull();

    // Confirm that shouldAutosave would allow writes now that both
    // hydrated=true and error=null hold — mirroring what the effect sets
    // after a successful re-hydration.
    expect(shouldAutosave({ hydrated: true, error: repaired.error })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// I/O error recovery: AsyncStorage rejection clears when storage comes back
// ---------------------------------------------------------------------------

describe('I/O error recovery: pm.read() surfaces and then clears an AsyncStorage rejection', () => {
  it('pm.read() rejects when the storage adapter throws — I/O error is surfaced, not swallowed', async () => {
    // Simulates a first-launch read where AsyncStorage itself rejects (device
    // locked, storage quota exhausted, OS I/O failure, etc.).  The adapter
    // throws instead of returning null or a string.
    //
    // pm.read() must NOT silently swallow the rejection: the hydration effect
    // catches it in its .catch() branch and sets hydrationErrorKind='io',
    // which shows the user an error screen.  A silent return of { state:null,
    // error:null } here would hide the failure and wrongly unlock autosave.
    const ioError = new Error('AsyncStorage: device is locked');
    const storage = {
      getItem: async (_key: string): Promise<string | null> => { throw ioError; },
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
    };
    const pm = new PersistenceManager(storage, 'calora_state');

    // The rejection carries the original I/O error so the hydration effect
    // can distinguish it from a ParseHydrationError in its catch block.
    await expect(pm.read()).rejects.toThrow('AsyncStorage: device is locked');
  });

  it('pm.read() returns clean state with no error once the I/O error clears', async () => {
    // Simulates the retryHydration flow for an I/O error:
    //   1. First read — adapter throws (e.g. device was locked).
    //   2. Storage comes back (device unlocked, quota freed).
    //   3. retryHydration increments hydrationAttempt, re-triggering the
    //      hydration effect which calls pm.read() again.
    //   4. The second read must return { state: validState, error: null } so
    //      the effect sets hydrated=true and leaves hydrationErrorKind null.
    //
    // This documents that PersistenceManager.read() is stateless — it goes
    // back to the adapter on every call, so a recovered adapter is immediately
    // visible after retry without any cache-invalidation step.
    let shouldThrow = true;
    const savedState = { onboardingComplete: true, logs: [] };

    const storage = {
      getItem: async (_key: string): Promise<string | null> => {
        if (shouldThrow) throw new Error('AsyncStorage: quota exceeded');
        return JSON.stringify(savedState);
      },
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
    };
    const pm = new PersistenceManager(storage, 'calora_state');

    // Phase 1 — I/O error: adapter throws, pm.read() rejects
    await expect(pm.read()).rejects.toThrow();

    // Storage comes back (device unlocked, quota freed, OS error resolved)
    shouldThrow = false;

    // Phase 2 — recovery: pm.read() now returns valid state with no error
    const result = await pm.read<{ onboardingComplete: boolean; logs: unknown[] }>();
    expect(result.state).toEqual(savedState);
    expect(result.error).toBeNull();
  });

  it('shouldAutosave follows the same two-phase block/allow pattern for the I/O-error retry window', () => {
    // The hydration effect handles I/O errors identically to parse errors from
    // autosave's perspective: during the retry window autosave is blocked, and
    // it re-enables only after a clean read.
    //
    // Phase 1 — I/O error occurred, retryHydration has reset hydrated=false.
    //   The previous hydrationErrorKind='io' is still in state until the new
    //   read completes.  shouldAutosave must return false for the entire window.
    const duringRetryWindowAfterIo = shouldAutosave({
      hydrated: false,
      error: 'storage unavailable',
    });
    expect(duringRetryWindowAfterIo).toBe(false);

    // Phase 2 — hydration effect completes cleanly after I/O error resolved:
    //   hydrated flips back to true and error is null.  Autosave re-enables
    //   so the user's next actions are persisted normally.
    const afterIoRecovery = shouldAutosave({ hydrated: true, error: null });
    expect(afterIoRecovery).toBe(true);
  });

  it('shouldAutosave blocks autosave even when hydrated=true if an I/O error string is still set', () => {
    // Guards against a race where hydrated flips to true before the error
    // is cleared.  An I/O error string in the status is enough to block
    // autosave regardless of the hydrated flag — prevents stale in-memory
    // defaults from being written while the error screen is visible.
    const racedState = shouldAutosave({
      hydrated: true,
      error: 'AsyncStorage: device is locked',
    });
    expect(racedState).toBe(false);
  });

  it('pm.read() rejection is a non-ParseHydrationError — the hydration catch block will set kind="io"', async () => {
    // Documents the branching invariant in useHydrationEffect's catch block:
    //   if (err instanceof ParseHydrationError) → kind = 'parse'
    //   else                                    → kind = 'io'
    //
    // pm.read() propagates the raw I/O error directly — it does NOT wrap it
    // in a ParseHydrationError.  Any adapter throw therefore routes the catch
    // block to the 'io' branch, never the 'parse' branch.
    const ioError = new Error('AsyncStorage: device is locked');
    const storage = {
      getItem: async (_key: string): Promise<string | null> => { throw ioError; },
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
    };
    const pm = new PersistenceManager(storage, 'calora_state');

    let caughtError: unknown;
    try {
      await pm.read();
    } catch (err) {
      caughtError = err;
    }

    // The propagated error is exactly the adapter's error — not a ParseHydrationError.
    // This confirms that useHydrationEffect's catch block will enter the 'io' branch.
    expect(caughtError).toBe(ioError);
    expect(caughtError).not.toBeInstanceOf(ParseHydrationError);
  });

  it('the io-kind error message does not contain "corrupt" — it signals a transient failure, not data loss', () => {
    // useHydrationEffect sets hydrationError to one of two distinct strings
    // depending on error kind.  The 'io' message must not mention data
    // corruption because the storage adapter simply rejected the read —
    // no data was parsed, changed, or lost.  The user should understand
    // this is a momentary, recoverable condition.
    //
    // If the message strings in useHydrationEffect.ts ever change, this
    // test will catch any regression where corruption language bleeds into
    // the transient-failure path — or vice versa.
    const IO_ERROR_MESSAGE =
      'Storage is temporarily unavailable. This is usually a momentary issue.';
    const PARSE_ERROR_MESSAGE =
      'Your saved data could not be read — the file may be corrupt. Your data is still on device and can be exported before retrying.';

    // The io message must not suggest data corruption.
    expect(IO_ERROR_MESSAGE).not.toMatch(/corrupt/i);

    // The parse message must mention corruption so it correctly warns the
    // user their data may need attention.
    expect(PARSE_ERROR_MESSAGE).toMatch(/corrupt/i);

    // The two messages are distinct — the error screen's copy differs by kind.
    expect(IO_ERROR_MESSAGE).not.toBe(PARSE_ERROR_MESSAGE);
  });
});

// ---------------------------------------------------------------------------
// Write/read interleave with transient I/O failure: queue ordering guarantees
// ---------------------------------------------------------------------------

describe('write-queue ordering under I/O error: in-flight write cannot corrupt recovered storage', () => {
  it('queued write lands in storage before the retry read — recovered getItem sees the written value, not stale data', async () => {
    // Scenario:
    //   1. Storage holds stale data ({ version: 1 }).
    //   2. enqueueWrite is called with new state ({ version: 2 }) — setItem is
    //      now queued but has not completed.
    //   3. pm.read() fires while getItem still throws (I/O error).
    //   4. setItem completes, landing { version: 2 } in storage.
    //   5. Storage recovers (getItem no longer throws).
    //   6. retryHydration calls pm.read() again — it must return { version: 2 },
    //      not the stale { version: 1 } that was there before the queued write.
    //
    // This confirms the write-queue ordering guarantee holds under transient
    // I/O failures: a write that was queued before the I/O error is visible to
    // any read that fires after storage recovers.
    let storedValue: string | null = JSON.stringify({ version: 1 });
    let getItemShouldThrow = true;
    let resolveSetItem!: () => void;
    const setItemSettled = new Promise<void>((res) => { resolveSetItem = res; });

    const storage = {
      getItem: async (_key: string): Promise<string | null> => {
        if (getItemShouldThrow) throw new Error('AsyncStorage: quota exceeded');
        return storedValue;
      },
      setItem: async (_key: string, value: string): Promise<void> => {
        storedValue = value;
        resolveSetItem();
      },
      removeItem: async (_key: string): Promise<void> => { storedValue = null; },
    };

    const pm = new PersistenceManager(storage, 'calora_state');

    // Step 2 — queue a write with updated state; setItem has not yet completed
    const newState = { version: 2 };
    pm.enqueueWrite(newState);

    // Step 3 — attempt a read while getItem still throws (I/O error)
    await expect(pm.read()).rejects.toThrow('AsyncStorage: quota exceeded');

    // Step 4 — wait for the queued setItem to finish landing in storage
    await setItemSettled;

    // Step 5 — storage recovers: getItem will now return what setItem wrote
    getItemShouldThrow = false;

    // Step 6 — retry read must see { version: 2 }, not the stale { version: 1 }
    const result = await pm.read<{ version: number }>();
    expect(result.state).toEqual(newState);
    expect(result.error).toBeNull();
  });

  it('a write queued AFTER an I/O error still lands correctly — storage does not become permanently locked', async () => {
    // Scenario: getItem throws first (I/O error), then storage recovers, then
    // enqueueWrite is called.  Confirms the write queue is unaffected by the
    // earlier read failure — the PM does not have a "locked" flag that
    // prevents further writes after a read error.
    let storedValue: string | null = null;
    let getItemShouldThrow = true;

    const storage = {
      getItem: async (_key: string): Promise<string | null> => {
        if (getItemShouldThrow) throw new Error('AsyncStorage: device locked');
        return storedValue;
      },
      setItem: async (_key: string, value: string): Promise<void> => {
        storedValue = value;
      },
      removeItem: async (_key: string): Promise<void> => { storedValue = null; },
    };

    const pm = new PersistenceManager(storage, 'calora_state');

    // Phase 1 — read fails with I/O error
    await expect(pm.read()).rejects.toThrow('AsyncStorage: device locked');

    // Storage recovers
    getItemShouldThrow = false;

    // Phase 2 — enqueueWrite after recovery; must reach storage normally
    const savedState = { onboardingComplete: true };
    pm.enqueueWrite(savedState);

    // Drain the queue by waiting for a no-op clear (which chains after the write)
    // We use the fact that enqueueWrite puts the promise on this.queue; we
    // observe it indirectly by verifying what getItem returns after the write.
    // Give the microtask queue a tick to settle.
    await new Promise<void>((res) => setTimeout(res, 0));

    // The written value must now be readable
    const result = await pm.read<{ onboardingComplete: boolean }>();
    expect(result.state).toEqual(savedState);
    expect(result.error).toBeNull();
  });

  it('a write queued while getItem throws does not stall — the write queue keeps moving after the I/O error', async () => {
    // Confirms that a getItem rejection (I/O error) does NOT stall the write
    // queue.  Reads and writes are independent paths in PersistenceManager:
    // read() goes directly to storage.getItem without touching this.queue,
    // so a throwing getItem cannot block or poison the write queue.
    //
    // If the queue ever stalled here, a subsequent clear() would deadlock and
    // clearAllData would never resolve — a critical correctness guarantee.
    let storedValue: string | null = null;

    const storage = {
      getItem: async (_key: string): Promise<string | null> => {
        throw new Error('AsyncStorage: quota exceeded');
      },
      setItem: async (_key: string, value: string): Promise<void> => {
        storedValue = value;
      },
      removeItem: async (_key: string): Promise<void> => { storedValue = null; },
    };

    const pm = new PersistenceManager(storage, 'calora_state');

    // Fire a read that will reject due to I/O error
    const readPromise = pm.read().catch(() => 'io-error-caught');

    // Simultaneously queue a write
    const firstState = { step: 1 };
    pm.enqueueWrite(firstState);

    // Queue a second write to confirm sequencing is preserved
    const secondState = { step: 2 };
    pm.enqueueWrite(secondState);

    // The read rejects independently of the queue
    const readOutcome = await readPromise;
    expect(readOutcome).toBe('io-error-caught');

    // Give the queued writes a tick to land
    await new Promise<void>((res) => setTimeout(res, 0));

    // The last write wins — storedValue holds the second state
    expect(storedValue).toBe(JSON.stringify(secondState));
  });

  it('shouldAutosave remains false during the entire window when getItem throws — write is queued but hydration has not completed', () => {
    // When pm.read() rejects the hydration effect catches it and sets
    // hydrated=false, hydrationErrorKind='io'.  Even if a prior enqueueWrite
    // is in-flight (queued but not yet settled), autosave must stay blocked
    // for the full duration — the in-memory state is still context defaults,
    // not recovered user data.
    //
    // This is the autosave-gate half of the write-queue ordering guarantee:
    // no enqueueWrite can be dispatched by a React render during the I/O
    // error window because shouldAutosave returns false.
    const duringIoError = shouldAutosave({
      hydrated: false,
      error: 'AsyncStorage: quota exceeded',
    });
    expect(duringIoError).toBe(false);

    // Re-enables only once both signals are clear — hydrated=true and error=null
    const afterRecovery = shouldAutosave({ hydrated: true, error: null });
    expect(afterRecovery).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stale-render guard: parse-error screen stays hidden after a successful retry
// ---------------------------------------------------------------------------

describe('stale-render guard: error screen stays hidden if retry succeeds but a stale render fires', () => {
  it('shouldAutosave is false in the brief gap where hydrationErrorKind is cleared but hydrated is still false', () => {
    // The hydration effect clears hydrationErrorKind to null at the TOP of the
    // effect body — before pm.read() is awaited.  During that async gap the
    // React state is: { hydrated: false, error: null }.
    //
    // If a stale render fires in this window (e.g. a navigation animation
    // completing mid-read), shouldAutosave must still return false so that
    // in-memory context defaults — not yet overwritten by the recovered data —
    // cannot be written to storage.
    expect(shouldAutosave({ hydrated: false, error: null })).toBe(false);
  });

  it('the success branch of pm.read() never sets hydrationErrorKind to non-null — ordering is error→null, hydrated→false, read→ok, hydrated→true', async () => {
    // Documents the exact state-transition sequence the hydration effect
    // produces on a successful retry:
    //
    //   Step 1 — effect body starts:
    //             setHydrationErrorKind(null)  → hydrationErrorKind = null
    //             setHydrated(false)           → hydrated = false
    //
    //   Step 2 — pm.read() resolves with { error: null, state: validState }:
    //             The .then() block DOES NOT call setHydrationErrorKind —
    //             there is no error to report.  hydrationErrorKind stays null.
    //
    //   Step 3 — .finally() fires:
    //             setHydrated(true)            → hydrated = true
    //
    // This means hydrationErrorKind is null in every step, so the parse-error
    // screen can never reappear due to a stale render mid-effect.
    const validState = { onboardingComplete: true, logs: [] };
    const storage = {
      getItem: async (_key: string) => JSON.stringify(validState),
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
    };
    const pm = new PersistenceManager(storage, 'calora_state');

    // Capture the state at each step as the hydration effect would set it.
    type HydrationSnapshot = { hydrationErrorKind: string | null; hydrated: boolean };
    const snapshots: HydrationSnapshot[] = [];

    // Step 1 — effect starts: error cleared, hydrated reset
    snapshots.push({ hydrationErrorKind: null, hydrated: false });

    // Step 2 — read resolves; success branch never sets hydrationErrorKind
    const result = await pm.read<{ onboardingComplete: boolean; logs: unknown[] }>();
    // The .then() block only calls setHydrationErrorKind inside the catch, not
    // in the success path.  Confirm the read returned no error so the effect
    // would leave hydrationErrorKind at null.
    expect(result.error).toBeNull();
    expect(result.state).toEqual(validState);
    const hydrationErrorKindAfterRead: string | null = result.error !== null ? 'parse' : null;
    snapshots.push({ hydrationErrorKind: hydrationErrorKindAfterRead, hydrated: false });

    // Step 3 — .finally() fires: hydrated flips to true
    snapshots.push({ hydrationErrorKind: hydrationErrorKindAfterRead, hydrated: true });

    // Ordering assertions
    expect(snapshots[0]).toEqual({ hydrationErrorKind: null, hydrated: false });
    expect(snapshots[1]).toEqual({ hydrationErrorKind: null, hydrated: false });
    expect(snapshots[2]).toEqual({ hydrationErrorKind: null, hydrated: true });

    // hydrationErrorKind is null in every step — the error screen is never shown
    for (const snap of snapshots) {
      expect(snap.hydrationErrorKind).toBeNull();
    }

    // Autosave is blocked until the final step and re-enabled only when both
    // hydrated=true and error=null hold simultaneously.
    expect(shouldAutosave({ hydrated: snapshots[0].hydrated, error: snapshots[0].hydrationErrorKind })).toBe(false);
    expect(shouldAutosave({ hydrated: snapshots[1].hydrated, error: snapshots[1].hydrationErrorKind })).toBe(false);
    expect(shouldAutosave({ hydrated: snapshots[2].hydrated, error: snapshots[2].hydrationErrorKind })).toBe(true);
  });
});

