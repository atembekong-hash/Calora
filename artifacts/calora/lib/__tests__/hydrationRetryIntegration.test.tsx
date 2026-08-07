/**
 * Integration tests for the hydration retry lifecycle.
 *
 * These tests drive the real `useHydrationEffect` hook — the same hook that
 * CaloraContext uses.  They exercise the full React effect lifecycle using
 * renderHook and a controllable PersistenceManager (in-memory adapter).
 *
 * The critical invariant under test:
 *   After retryHydration() fires, `hydrationError` is null immediately
 *   (synchronously, before any effect runs) and stays null throughout the
 *   success branch of the effect.  The parse-error screen in app/index.tsx
 *   guards on `if (hydrationError)` — so as long as this value is null at
 *   every render, the screen cannot reappear, even if a stale render fires
 *   mid-effect.
 *
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { shouldAutosave } from '../hydrationGuard';
import { useHydrationEffect } from '../useHydrationEffect';
import { PersistenceManager, type StorageAdapter } from '../persistenceManager';

// ---------------------------------------------------------------------------
// Controllable storage adapter
// ---------------------------------------------------------------------------

interface ControllableStorage extends StorageAdapter {
  store: Record<string, string>;
  /** Block the next getItem call until the returned release function is invoked. */
  blockNextGetItem(): () => void;
}

function makeControllableStorage(initial: Record<string, string> = {}): ControllableStorage {
  const store: Record<string, string> = { ...initial };
  let readBlocker: Promise<void> | null = null;
  let readRelease: (() => void) | null = null;

  return {
    store,
    blockNextGetItem() {
      readBlocker = new Promise<void>((res) => { readRelease = res; });
      return () => {
        readRelease?.();
        readBlocker = null;
        readRelease = null;
      };
    },
    async getItem(key) {
      if (readBlocker) await readBlocker;
      return store[key] ?? null;
    },
    async setItem(key, value) { store[key] = value; },
    async removeItem(key) { delete store[key]; },
  };
}

const STORAGE_KEY = '@calora/local-state-v2';

// ---------------------------------------------------------------------------
// Helper: render useHydrationEffect with a given storage and await the
// initial hydration to complete.
// ---------------------------------------------------------------------------
async function renderAndAwaitHydration(storage: ControllableStorage) {
  const pm = new PersistenceManager(storage, STORAGE_KEY);
  let successPayload: unknown = undefined;
  const renderedErrors: Array<string | null> = [];

  const handle = renderHook(() => {
    // useRef inside renderHook so the ref is stable across re-renders,
    // mirroring how CaloraContext holds `const pm = useRef(new PersistenceManager(...))`.
    const pmRef = useRef(pm);
    const result = useHydrationEffect<Record<string, unknown>>(pmRef, (saved) => {
      successPayload = saved;
    });
    // Record every render's hydrationError so tests can verify no render saw a
    // truthy error value when the error screen should be hidden.
    renderedErrors.push(result.hydrationError);
    return result;
  });

  // Wait for the initial hydration effect to complete.
  await act(async () => {
    await new Promise<void>((res) => setTimeout(res, 0));
  });

  return { handle, storage, getSuccessPayload: () => successPayload, renderedErrors };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useHydrationEffect (production hook) — parse-error screen stays hidden after a successful retry', () => {
  it('initial corrupt storage sets hydrationError to a non-null string — matching the app/index.tsx visibility guard', async () => {
    // app/index.tsx: `if (hydrationError) { /* render error screen */ }`
    // Confirms the baseline: corrupt storage → hydrationError is non-null → error screen is shown.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '{corrupt-json}' });
    const { handle } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationError).not.toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBe('parse');
    expect(handle.result.current.hydrated).toBe(true);
  });

  it('retryHydration clears hydrationError to null SYNCHRONOUSLY — the error screen disappears before any effect runs', async () => {
    // This is the core fix for the stale-render race:
    //   retryHydration() now calls setHydrationError(null) alongside
    //   setHydrationErrorKind(null), so the very next React render (which fires
    //   before the useEffect for the incremented hydrationAttempt runs) already
    //   sees hydrationError as null.
    //
    // The assertion here is made INSIDE the act() call, with only the synchronous
    // state updates committed — no timer flush, no effect run.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '{corrupt-json}' });
    const { handle } = await renderAndAwaitHydration(storage);

    // Baseline: error screen is currently shown.
    expect(handle.result.current.hydrationError).not.toBeNull();

    // Repair storage so the subsequent read (when the effect runs) will succeed.
    storage.store[STORAGE_KEY] = JSON.stringify({ onboardingComplete: true });

    // Block the retry read to prevent the effect from completing during this assertion.
    const release = storage.blockNextGetItem();

    // retryHydration fires. Inside act(), React commits all synchronous state
    // updates immediately. The assertion that follows is made with only those
    // synchronous updates applied — before the retry read, before the effect
    // for the new hydrationAttempt runs.
    act(() => { handle.result.current.retryHydration(); });

    // SYNCHRONOUS assertion — hydrationError must be null RIGHT NOW, before
    // any effect or timer runs. This is the invariant that closes the stale-
    // render race: the next render after retryHydration() must not show the
    // error screen, regardless of when the effect fires.
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(false);

    // Verify shouldAutosave also blocks writes in this synchronous window.
    expect(shouldAutosave({
      hydrated: handle.result.current.hydrated,
      error: handle.result.current.hydrationError,
    })).toBe(false);

    // Release the read and complete the retry.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
  });

  it('successful retry ends with hydrationError=null and hydrated=true — error screen stays hidden throughout', async () => {
    // Full lifecycle: corrupt → parse error shown → retry with valid storage → clean.
    // Asserts the error screen guard (hydrationError) is null both during the
    // retry window and after successful completion.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '{{not-valid-json' });
    const { handle, getSuccessPayload } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationError).not.toBeNull();

    // Repair storage.
    const validState = { onboardingComplete: true, logs: [] };
    storage.store[STORAGE_KEY] = JSON.stringify(validState);

    // Block the read to assert the in-flight state separately.
    const release = storage.blockNextGetItem();

    // Synchronous assertion immediately after retry fires.
    act(() => { handle.result.current.retryHydration(); });
    expect(handle.result.current.hydrationError).toBeNull(); // error screen hidden immediately

    // Release and let retry complete.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Final state: error screen guard is still null — never re-set by success branch.
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);

    // The onSuccess callback received the recovered data.
    expect(getSuccessPayload()).toEqual(validState);

    // Autosave re-enables.
    expect(shouldAutosave({
      hydrated: handle.result.current.hydrated,
      error: handle.result.current.hydrationError,
    })).toBe(true);
  });

  it('no render ever observes a truthy hydrationError after retryHydration — captured across all renders', async () => {
    // Captures every render's hydrationError value. After retryHydration() fires,
    // all subsequent renders must see null — the error screen must be absent from
    // the first post-retry render onwards, even during the async read window.
    const storage = makeControllableStorage({ [STORAGE_KEY]: 'CORRUPTED' });
    const { handle, renderedErrors } = await renderAndAwaitHydration(storage);

    // At this point: initial renders saw null (loading), then the error, then truthy.
    // Find the index of the last render where error was non-null (the parse-error baseline).
    const baselineErrorIndex = renderedErrors.length - 1;
    expect(renderedErrors[baselineErrorIndex]).not.toBeNull();

    // Repair storage and block the retry read.
    storage.store[STORAGE_KEY] = JSON.stringify({ onboardingComplete: false });
    const release = storage.blockNextGetItem();

    // Trigger retry.
    act(() => { handle.result.current.retryHydration(); });

    // All renders after the baseline must have hydrationError = null.
    const postRetryErrors = renderedErrors.slice(baselineErrorIndex + 1);
    expect(postRetryErrors.length).toBeGreaterThan(0); // at least one post-retry render
    for (const err of postRetryErrors) {
      expect(err).toBeNull(); // no post-retry render shows the error screen
    }

    // Complete the retry and assert final state.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Final render also has null error.
    const lastError = renderedErrors[renderedErrors.length - 1];
    expect(lastError).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);
  });

  it('shouldAutosave is false at every intermediate step — no autosave fires into the recovery window', async () => {
    // Documents the autosave gate through the full retry lifecycle.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '[[[[' });
    const { handle } = await renderAndAwaitHydration(storage);

    // Phase 1 — parse error: autosave blocked.
    expect(shouldAutosave({ hydrated: handle.result.current.hydrated, error: handle.result.current.hydrationError })).toBe(false);

    storage.store[STORAGE_KEY] = JSON.stringify({ logs: [] });
    const release = storage.blockNextGetItem();

    // Phase 2 — immediately after retry (synchronous): still blocked.
    act(() => { handle.result.current.retryHydration(); });
    expect(shouldAutosave({ hydrated: handle.result.current.hydrated, error: handle.result.current.hydrationError })).toBe(false);

    // Phase 3 — retry read in-flight: still blocked.
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
    expect(shouldAutosave({ hydrated: handle.result.current.hydrated, error: handle.result.current.hydrationError })).toBe(false);

    // Phase 4 — clean retry completed: autosave re-enables.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
    expect(shouldAutosave({ hydrated: handle.result.current.hydrated, error: handle.result.current.hydrationError })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error kind / message invariant: hydrationError and hydrationErrorKind always
// match so the error screen never shows the wrong action buttons.
//
// These tests drive the real useHydrationEffect hook — not a re-implementation
// of its catch logic — so a future regression (swapped messages, omitted
// setState call, altered kind assignment) will be caught here.
// ---------------------------------------------------------------------------

/** Minimal storage adapter that rejects every getItem call with the given error. */
function makeRejectingStorage(message: string): ControllableStorage {
  return {
    store: {},
    blockNextGetItem() { return () => {}; },
    async getItem(_key: string): Promise<string | null> {
      throw new Error(message);
    },
    async setItem(_key: string, _value: string) {},
    async removeItem(_key: string) {},
  };
}

describe('useHydrationEffect (production hook) — hydrationError and hydrationErrorKind always match', () => {
  it('after a parse error: hydrationErrorKind is "parse" and hydrationError is a non-null string — both set together', async () => {
    // Corrupt JSON in storage triggers the ParseHydrationError path inside the
    // hook's .then() block.  The .catch() branch must set both fields in the
    // same microtask so no render can observe one null and the other non-null.
    // The error screen shows the Export action only when kind is 'parse' — a
    // mismatch would show the wrong buttons.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '{corrupted-json}' });
    const { handle } = await renderAndAwaitHydration(storage);

    // Both must be non-null and consistent
    expect(handle.result.current.hydrationError).not.toBeNull();
    expect(handle.result.current.hydrationErrorKind).not.toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBe('parse');
    expect(typeof handle.result.current.hydrationError).toBe('string');
    expect(handle.result.current.hydrationError!.length).toBeGreaterThan(0);
  });

  it('after an I/O error: hydrationErrorKind is "io" and hydrationError is a non-null string — both set together', async () => {
    // AsyncStorage itself throws (device locked, quota exhausted, OS I/O failure).
    // pm.read() rejects before parseStorageValue is called, so the hook's
    // .catch() branch receives a plain Error — not a ParseHydrationError — and
    // must set kind='io' alongside a non-null message string.
    // The error screen shows "Try Again" only for io kind; a mismatch would
    // show Export instead (the wrong primary action for a transient failure).
    const storage = makeRejectingStorage('AsyncStorage: device is locked');
    const { handle } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationError).not.toBeNull();
    expect(handle.result.current.hydrationErrorKind).not.toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBe('io');
    expect(typeof handle.result.current.hydrationError).toBe('string');
    expect(handle.result.current.hydrationError!.length).toBeGreaterThan(0);
  });

  it('after a clean read: both hydrationError and hydrationErrorKind are null — both cleared together', async () => {
    // The hook's .then() success branch never calls setHydrationError or
    // setHydrationErrorKind, so both remain at the null value set by the
    // effect's preamble.  A render observing this state must not show the
    // error screen.
    const storage = makeControllableStorage({
      [STORAGE_KEY]: JSON.stringify({ onboardingComplete: true, logs: [] }),
    });
    const { handle } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);
  });

  it('parse-error message references corruption and export — not io wording', async () => {
    // Guards against the message being wired to the wrong catch branch:
    // if the parse branch produced the io message ("temporarily unavailable"),
    // the error screen would omit the Export button — the only useful recovery
    // action when data is on-device but unreadable.
    const storage = makeControllableStorage({ [STORAGE_KEY]: 'TRUNCATED{{{' });
    const { handle } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationErrorKind).toBe('parse');
    expect(handle.result.current.hydrationError).toContain('corrupt');
    expect(handle.result.current.hydrationError).not.toContain('temporarily unavailable');
  });

  it('io-error message references temporary unavailability — not parse/corrupt wording', async () => {
    // Guards against the reverse mismatch: if the io catch branch produced the
    // parse message ("corrupt … can be exported"), users would be told their
    // data is damaged when it is just a transient storage failure — sending
    // them to the wrong recovery path.
    const storage = makeRejectingStorage('AsyncStorage: quota exceeded');
    const { handle } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationErrorKind).toBe('io');
    expect(handle.result.current.hydrationError).toContain('temporarily unavailable');
    expect(handle.result.current.hydrationError).not.toContain('corrupt');
  });
});

// ---------------------------------------------------------------------------
// Duplicate-retry guard: a second 'Try Again' tap while a read is in flight
// must not start a second concurrent read.
// ---------------------------------------------------------------------------

describe('useHydrationEffect — duplicate-retry guard blocks a second tap while a read is in flight', () => {
  it('a second retryHydration call while the first retry is in flight is silently dropped — only one read runs', async () => {
    // Scenario:
    //   1. Initial hydration raises a parse error (error screen shown).
    //   2. User taps 'Try Again'. The retry read starts but is slow (blocked).
    //   3. User taps 'Try Again' again before the first retry resolves.
    //   4. The guard must drop the second tap: only one pm.read() should be
    //      outstanding, and the final state must reflect the single read's result.
    //
    // The guard is a `readInFlight` ref in useHydrationEffect that retryHydration
    // checks before incrementing hydrationAttempt. If it is true the second call
    // returns immediately without queuing another read.
    let readCount = 0;
    const validState = { onboardingComplete: true, logs: [] };
    let firstRetryRelease: (() => void) | null = null;

    // Custom storage: first read returns corrupt JSON (triggers parse error);
    // subsequent reads block until released, then return valid JSON.
    // We count every getItem call so we can assert exactly one retry read ran.
    const blockingStore: Record<string, string> = {
      [STORAGE_KEY]: '{corrupt-json}',
    };
    let getItemBlocker: Promise<void> | null = null;

    const storage: ControllableStorage = {
      store: blockingStore,
      blockNextGetItem() {
        getItemBlocker = new Promise<void>((res) => {
          firstRetryRelease = res;
        });
        return () => {
          firstRetryRelease?.();
          getItemBlocker = null;
          firstRetryRelease = null;
        };
      },
      async getItem(key) {
        readCount++;
        if (getItemBlocker) await getItemBlocker;
        return blockingStore[key] ?? null;
      },
      async setItem(key, value) { blockingStore[key] = value; },
      async removeItem(key) { delete blockingStore[key]; },
    };

    const { handle } = await renderAndAwaitHydration(storage);

    // Baseline: parse error shown after initial hydration.
    expect(handle.result.current.hydrationError).not.toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBe('parse');
    const readsAfterInitial = readCount;

    // Repair storage so the retry read will return valid data.
    blockingStore[STORAGE_KEY] = JSON.stringify(validState);

    // Block the retry read so it stays in-flight when the second tap fires.
    storage.blockNextGetItem();

    // First 'Try Again' tap — starts the retry read (blocked).
    act(() => { handle.result.current.retryHydration(); });

    // The first tap reset hydrationError synchronously (guard: error cleared
    // before effect runs) and the read is now in-flight.
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrated).toBe(false);

    // Second 'Try Again' tap — must be a no-op: readInFlight is true.
    act(() => { handle.result.current.retryHydration(); });

    // Allow the blocked first-retry read to complete.
    // Cast overrides TS narrowing: the closure assignment `= res` is not
    // visible to control-flow analysis here, so TS narrows to `null` without it.
    (firstRetryRelease as (() => void) | null)?.();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Final state: clean hydration from the single completed read.
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);

    // Exactly one read ran during the retry window (the second tap was dropped).
    expect(readCount - readsAfterInitial).toBe(1);
  });

  it('retryHydration is available again once the in-flight read resolves', async () => {
    // Documents that the guard is released (readInFlight → false) in the
    // .finally() block after each read completes.  A retry tapped after the
    // first retry finishes must start a new read normally — the guard must not
    // permanently disable retryHydration.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '{corrupt-json}' });
    const { handle } = await renderAndAwaitHydration(storage);

    // Parse error shown.
    expect(handle.result.current.hydrationError).not.toBeNull();

    // Repair storage for the first retry.
    storage.store[STORAGE_KEY] = JSON.stringify({ onboardingComplete: false });

    // Block the first retry read.
    const releaseFirst = storage.blockNextGetItem();

    // Tap 'Try Again' once — first retry is now in flight.
    act(() => { handle.result.current.retryHydration(); });
    expect(handle.result.current.hydrated).toBe(false);

    // Release the first retry — read completes, guard clears.
    releaseFirst();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // First retry finished cleanly.
    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.hydrationError).toBeNull();

    // Simulate a second independent error (e.g. storage becomes temporarily
    // unavailable again after the app has been running for a while).
    // For this test we just verify that retryHydration can be called again
    // without being silently blocked — by checking that state resets as expected
    // (hydrated goes false during the second retry window).
    const releaseSecond = storage.blockNextGetItem();

    act(() => { handle.result.current.retryHydration(); });

    // The second retry was accepted (guard was clear): hydrated reset to false.
    expect(handle.result.current.hydrated).toBe(false);

    // Clean up — release and let the second retry complete.
    releaseSecond();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.hydrationError).toBeNull();
  });

  it('the second tap leaves hydrationError null — the error screen does not re-appear when the guard drops the call', async () => {
    // Guards a subtle secondary invariant: retryHydration always clears
    // hydrationError eagerly (synchronously) before checking the in-flight
    // guard.  This means the second tap still benefits from the synchronous
    // clear — but because setHydrationAttempt is never called, no second read
    // is queued.  The error screen stays hidden after the first tap, and the
    // dropped second tap does not reset any other state.
    const storage = makeControllableStorage({ [STORAGE_KEY]: '{corrupt-json}' });
    const { handle } = await renderAndAwaitHydration(storage);

    expect(handle.result.current.hydrationError).not.toBeNull();

    storage.store[STORAGE_KEY] = JSON.stringify({ onboardingComplete: true });
    const release = storage.blockNextGetItem();

    // First tap: starts the in-flight read, clears hydrationError.
    act(() => { handle.result.current.retryHydration(); });
    expect(handle.result.current.hydrationError).toBeNull();

    // Second tap while first is in flight: guard drops it.
    // hydrationError must remain null — the guard must not restore the old error.
    act(() => { handle.result.current.retryHydration(); });
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();

    // Complete the first retry.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Final state is clean.
    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.hydrationError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hydrationErrorKind='io' for throwing adapters — UI copy distinction
// ---------------------------------------------------------------------------

describe('useHydrationEffect sets hydrationErrorKind="io" when the storage adapter throws', () => {
  it('a throwing storage adapter results in hydrationErrorKind="io", not "parse"', async () => {
    // Simulates a first-launch read where AsyncStorage itself rejects (device
    // locked, storage quota exhausted, OS I/O failure, etc.).  The hydration
    // effect must distinguish this from a JSON parse failure and set kind='io'.
    //
    // This is the critical path: app/index.tsx uses hydrationErrorKind to
    // decide which title and guidance copy to display.  An I/O error must
    // never show the "data corrupt" message.
    const pm = new PersistenceManager(
      {
        getItem: async (_key): Promise<string | null> => {
          throw new Error('AsyncStorage: device is locked');
        },
        setItem: async () => {},
        removeItem: async () => {},
      },
      STORAGE_KEY,
    );

    let successCalled = false;
    const handle = renderHook(() => {
      const pmRef = useRef(pm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, () => {
        successCalled = true;
      });
    });

    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // The hydration effect must have set kind='io', not 'parse'.
    expect(handle.result.current.hydrationErrorKind).toBe('io');
    // hydrationError must be non-null so the error screen is shown.
    expect(handle.result.current.hydrationError).not.toBeNull();
    // onSuccess was never called — the error branch was taken.
    expect(successCalled).toBe(false);
  });

  it('the io hydration error message does not mention data corruption', async () => {
    // When the storage adapter throws, the failure is transient (device locked,
    // quota exceeded, OS error) — no data was read, parsed, changed, or lost.
    // The error message shown to the user must communicate that storage is
    // temporarily unavailable rather than suggesting their data is corrupt.
    const pm = new PersistenceManager(
      {
        getItem: async (_key): Promise<string | null> => {
          throw new Error('AsyncStorage: quota exceeded');
        },
        setItem: async () => {},
        removeItem: async () => {},
      },
      STORAGE_KEY,
    );

    const handle = renderHook(() => {
      const pmRef = useRef(pm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, () => {});
    });

    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(handle.result.current.hydrationErrorKind).toBe('io');
    // The I/O error copy must never suggest data is corrupt.
    expect(handle.result.current.hydrationError).not.toMatch(/corrupt/i);
    // It should communicate that storage is temporarily unavailable.
    expect(handle.result.current.hydrationError).toMatch(/unavailable|temporarily/i);
  });

  it('io error copy differs from parse error copy — the two failure modes render distinct guidance', async () => {
    // Confirms that app/index.tsx would show meaningfully different text for
    // each kind.  The parse path suggests potential data corruption and
    // exportability; the io path signals a transient, recoverable failure.
    const parsePm = new PersistenceManager(
      {
        getItem: async (_key) => '{not-valid-json}',
        setItem: async () => {},
        removeItem: async () => {},
      },
      STORAGE_KEY,
    );

    const parseHandle = renderHook(() => {
      const pmRef = useRef(parsePm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, () => {});
    });

    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(parseHandle.result.current.hydrationErrorKind).toBe('parse');
    const parseMsg = parseHandle.result.current.hydrationError;
    expect(parseMsg).toMatch(/corrupt/i);

    const ioPm = new PersistenceManager(
      {
        getItem: async (_key): Promise<string | null> => {
          throw new Error('AsyncStorage: device locked');
        },
        setItem: async () => {},
        removeItem: async () => {},
      },
      STORAGE_KEY,
    );

    const ioHandle = renderHook(() => {
      const pmRef = useRef(ioPm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, () => {});
    });

    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(ioHandle.result.current.hydrationErrorKind).toBe('io');
    const ioMsg = ioHandle.result.current.hydrationError;
    expect(ioMsg).not.toMatch(/corrupt/i);

    // The two messages must be distinct.
    expect(ioMsg).not.toBe(parseMsg);
  });
});

// ---------------------------------------------------------------------------
// I/O error retry: tapping 'Try Again' re-runs the storage read without
// restarting the app, and clears hydrationErrorKind when storage recovers.
// ---------------------------------------------------------------------------

/**
 * Storage adapter that throws on `getItem` until `repair()` is called, then
 * returns the provided `validValue`.  Models a device that was temporarily
 * locked or had a quota failure and then became available again.
 */
function makeRecoverableStorage(
  validValue: string,
): ControllableStorage & { repair(): void } {
  let broken = true;
  const store: Record<string, string> = {};
  let readBlocker: Promise<void> | null = null;
  let readRelease: (() => void) | null = null;

  return {
    store,
    repair() {
      broken = false;
      store[STORAGE_KEY] = validValue;
    },
    blockNextGetItem() {
      readBlocker = new Promise<void>((res) => { readRelease = res; });
      return () => {
        readRelease?.();
        readBlocker = null;
        readRelease = null;
      };
    },
    async getItem(key) {
      if (readBlocker) await readBlocker;
      if (broken) throw new Error('AsyncStorage: device is locked');
      return store[key] ?? null;
    },
    async setItem(key, value) { store[key] = value; },
    async removeItem(key) { delete store[key]; },
  };
}

describe('useHydrationEffect (production hook) — I/O error retry re-runs the storage read and restores state', () => {
  it('adapter throws → hydrationErrorKind="io" → retryHydration → adapter returns valid JSON → hydrationErrorKind is null and state is restored', async () => {
    // Full lifecycle for a transient I/O failure:
    //   1. adapter.getItem throws (device locked, quota exceeded)
    //      → pm.read() rejects → catch branch sets kind='io'
    //   2. storage comes back (adapter.repair() is called)
    //   3. user taps 'Try Again' → retryHydration() increments hydrationAttempt
    //      → the useEffect re-runs → pm.read() is called again on the same adapter
    //   4. the second read succeeds → hydrationErrorKind is cleared to null
    //      and the onSuccess callback receives the recovered state
    //
    // This confirms that the retry mechanism goes back to the adapter for a
    // fresh read rather than serving a cached failure — and that hydrationErrorKind
    // is explicitly null after a clean re-read (not just absent from a render).
    const validState = { onboardingComplete: true, logs: [] };
    const storage = makeRecoverableStorage(JSON.stringify(validState));

    const pm = new PersistenceManager(storage, STORAGE_KEY);
    let successPayload: unknown = undefined;

    const handle = renderHook(() => {
      const pmRef = useRef(pm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, (saved) => {
        successPayload = saved;
      });
    });

    // Wait for the initial (failing) hydration to complete.
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Phase 1 — I/O error: error screen should be shown.
    expect(handle.result.current.hydrationErrorKind).toBe('io');
    expect(handle.result.current.hydrationError).not.toBeNull();
    expect(handle.result.current.hydrated).toBe(true);
    // onSuccess was never called during the failing read.
    expect(successPayload).toBeUndefined();

    // Storage comes back (device unlocked, quota freed).
    storage.repair();

    // Phase 2 — user taps 'Try Again'.
    // retryHydration() must synchronously clear hydrationError and hydrationErrorKind
    // before any effect runs, then increment hydrationAttempt to re-trigger the effect.
    act(() => { handle.result.current.retryHydration(); });

    // Synchronous assertions: error state cleared immediately on tap, before the
    // effect runs — closes the stale-render race where the error screen would
    // re-appear between the tap and the new read completing.
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(false);

    // Phase 3 — let the retry effect run to completion.
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Phase 4 — recovery: error state stays null, state is restored.
    expect(handle.result.current.hydrationError).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);

    // The onSuccess callback received the recovered data — the adapter was
    // re-read, not a cached result from the failed first attempt.
    expect(successPayload).toEqual(validState);
  });

  it('hydrationError is null at every render after retryHydration — error screen never re-appears during the I/O retry window', async () => {
    // Guards the invariant that no render between the tap and the completed
    // re-read observes a truthy hydrationError.  app/index.tsx guards on
    // `if (hydrationError)` — any truthy value would flash the error screen.
    const validState = { onboardingComplete: false, logs: [] };
    const storage = makeRecoverableStorage(JSON.stringify(validState));
    const pm = new PersistenceManager(storage, STORAGE_KEY);

    const renderedErrors: Array<string | null> = [];
    const handle = renderHook(() => {
      const pmRef = useRef(pm);
      const result = useHydrationEffect<Record<string, unknown>>(pmRef, () => {});
      renderedErrors.push(result.hydrationError);
      return result;
    });

    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Baseline: I/O error is shown.
    expect(handle.result.current.hydrationErrorKind).toBe('io');
    const baselineIndex = renderedErrors.length - 1;
    expect(renderedErrors[baselineIndex]).not.toBeNull();

    // Repair storage and block the retry read so we can assert the in-flight state.
    storage.repair();
    const release = storage.blockNextGetItem();

    // Trigger retry.
    act(() => { handle.result.current.retryHydration(); });

    // Every render that occurred AFTER the retry tap must have null hydrationError.
    const postRetryErrors = renderedErrors.slice(baselineIndex + 1);
    expect(postRetryErrors.length).toBeGreaterThan(0);
    for (const err of postRetryErrors) {
      expect(err).toBeNull();
    }

    // Let the read complete.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Final render is also null.
    expect(renderedErrors[renderedErrors.length - 1]).toBeNull();
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);
  });

  it('retryHydration after an I/O error performs a fresh adapter read — not a replay of the cached failure', async () => {
    // Explicitly counts how many getItem calls the adapter receives.
    // After one failing read and one successful retry, the adapter must have
    // been called exactly twice — once per attempt — confirming that pm.read()
    // is stateless and returns to the adapter on every invocation.
    let getItemCallCount = 0;
    let broken = true;
    const validState = { onboardingComplete: true };
    const countingStorage: ControllableStorage = {
      store: {},
      blockNextGetItem() { return () => {}; },
      async getItem(_key) {
        getItemCallCount++;
        if (broken) throw new Error('AsyncStorage: quota exceeded');
        return JSON.stringify(validState);
      },
      async setItem(_key, _value) {},
      async removeItem(_key) {},
    };

    const pm = new PersistenceManager(countingStorage, STORAGE_KEY);
    const handle = renderHook(() => {
      const pmRef = useRef(pm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, () => {});
    });

    // Initial failing read.
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(handle.result.current.hydrationErrorKind).toBe('io');
    expect(getItemCallCount).toBe(1);

    // Repair storage, then retry.
    broken = false;

    act(() => { handle.result.current.retryHydration(); });
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Adapter was called a second time — the retry re-read went back to the
    // adapter rather than serving the previous rejection.
    expect(getItemCallCount).toBe(2);
    expect(handle.result.current.hydrationErrorKind).toBeNull();
    expect(handle.result.current.hydrated).toBe(true);
  });

  it('shouldAutosave gates writes correctly through the I/O error retry lifecycle', async () => {
    // Verifies the autosave gate at each phase of the I/O retry lifecycle:
    //   Phase 1 — I/O error:           hydrated=true,  error≠null → blocked
    //   Phase 2 — immediately after tap: hydrated=false, error=null → blocked
    //   Phase 3 — retry in-flight:      hydrated=false, error=null → blocked
    //   Phase 4 — recovery complete:    hydrated=true,  error=null → allowed
    const validState = { onboardingComplete: true };
    const storage = makeRecoverableStorage(JSON.stringify(validState));
    const pm = new PersistenceManager(storage, STORAGE_KEY);

    const handle = renderHook(() => {
      const pmRef = useRef(pm);
      return useHydrationEffect<Record<string, unknown>>(pmRef, () => {});
    });

    // Phase 1 — I/O error after initial read.
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
    expect(shouldAutosave({
      hydrated: handle.result.current.hydrated,
      error: handle.result.current.hydrationError,
    })).toBe(false);

    // Repair storage and block the retry read to inspect the in-flight window.
    storage.repair();
    const release = storage.blockNextGetItem();

    // Phase 2 — immediately after tap (synchronous).
    act(() => { handle.result.current.retryHydration(); });
    expect(shouldAutosave({
      hydrated: handle.result.current.hydrated,
      error: handle.result.current.hydrationError,
    })).toBe(false);

    // Phase 3 — tick to start the effect; read is still in-flight (blocked).
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
    expect(shouldAutosave({
      hydrated: handle.result.current.hydrated,
      error: handle.result.current.hydrationError,
    })).toBe(false);

    // Phase 4 — release the read, let retry complete.
    release();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
    expect(shouldAutosave({
      hydrated: handle.result.current.hydrated,
      error: handle.result.current.hydrationError,
    })).toBe(true);
  });
});
