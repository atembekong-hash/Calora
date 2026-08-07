import { describe, expect, it } from 'vitest';
import {
  parseStorageValue,
  queueClearAfterPendingWrites,
  shouldAutosave,
} from '../hydrationGuard';

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
