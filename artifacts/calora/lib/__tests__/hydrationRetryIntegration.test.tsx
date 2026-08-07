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
