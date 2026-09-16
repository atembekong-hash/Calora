/**
 * Unit tests: makeExportHandler double-tap guard.
 *
 * Problem being prevented:
 *   Without the exportLockRef mutex, two rapid taps can enter the handler
 *   concurrently and each complete a full write + share cycle — producing two
 *   temp files and opening two share sheets.  The ref is checked and set
 *   *before* the first await, so both taps in the same event-loop tick see the
 *   same value; the second returns immediately without doing any work.
 *
 * Scenarios:
 *   1. Happy path — two simultaneous taps: only one write + one share.
 *   2. Happy path — sequential taps (second fires after first finishes): both
 *      complete normally, each producing exactly one write + one share.
 *   3. No-data path — two simultaneous taps: onNoData fires exactly once,
 *      writeAsStringAsync and shareAsync are never called.
 *   4. No-data path — data present: onNoData is never called.
 *   5. Error path — adapter throws: onError fires exactly once per trigger,
 *      double-tap still only triggers onError once.
 *   6. Loading flag lifecycle — setLoading is called true then false correctly.
 *   7. Lock is released after completion — a subsequent single tap works.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeExportHandler, EXPORT_FILENAME, EXPORT_MIME_TYPE } from '../exportUiHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLockRef() {
  return { current: false };
}

function makeAdapter(overrides?: {
  cacheDirectory?: string | null;
  writeAsStringAsync?: () => Promise<void>;
  shareAsync?: () => Promise<void>;
}) {
  return {
    cacheDirectory: overrides?.cacheDirectory ?? 'file:///cache/',
    writeAsStringAsync: overrides?.writeAsStringAsync ?? vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    shareAsync: overrides?.shareAsync ?? vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function makeCallbacks(overrides?: {
  setLoading?: (v: boolean) => void;
  onNoData?: () => void;
  onError?: () => void;
}) {
  return {
    setLoading: overrides?.setLoading ?? vi.fn(),
    onNoData: overrides?.onNoData ?? vi.fn(),
    onError: overrides?.onError ?? vi.fn(),
  };
}

const DATA_JSON = '{"profile":{"name":"Alex"},"logs":[]}';

// ---------------------------------------------------------------------------
// 1. Happy path — two simultaneous taps → exactly one write + one share
// ---------------------------------------------------------------------------

describe('makeExportHandler: happy path — two simultaneous taps', () => {
  it('calls writeAsStringAsync exactly once even when both taps fire before the first await resolves', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    // Fire two taps without awaiting — they hit the lock check in the same tick.
    const tap1 = handler();
    const tap2 = handler();
    await Promise.all([tap1, tap2]);

    expect(adapter.writeAsStringAsync).toHaveBeenCalledTimes(1);
  });

  it('calls shareAsync exactly once even when both taps fire before the first await resolves', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    const tap1 = handler();
    const tap2 = handler();
    await Promise.all([tap1, tap2]);

    expect(adapter.shareAsync).toHaveBeenCalledTimes(1);
  });

  it('passes the correct file URI to writeAsStringAsync', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(adapter.writeAsStringAsync).toHaveBeenCalledWith(
      `file:///cache/${EXPORT_FILENAME}`,
      DATA_JSON,
    );
  });

  it('passes correct mimeType and dialogTitle to shareAsync', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(adapter.shareAsync).toHaveBeenCalledWith(
      `file:///cache/${EXPORT_FILENAME}`,
      { mimeType: EXPORT_MIME_TYPE, dialogTitle: EXPORT_FILENAME },
    );
  });

  it('does not call onNoData or onError on a successful export', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(callbacks.onNoData).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Happy path — sequential taps (second fires after first fully completes)
// ---------------------------------------------------------------------------

describe('makeExportHandler: happy path — sequential taps after lock is released', () => {
  it('each sequential tap completes a full write + share cycle', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    await handler(); // first tap completes — lock is released
    await handler(); // second tap runs normally

    expect(adapter.writeAsStringAsync).toHaveBeenCalledTimes(2);
    expect(adapter.shareAsync).toHaveBeenCalledTimes(2);
  });

  it('lock is false after a completed export — the guard resets correctly', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(lockRef.current).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. No-data path — two simultaneous taps → onNoData fires exactly once
// ---------------------------------------------------------------------------

describe('makeExportHandler: no-data path — two simultaneous taps', () => {
  it('calls onNoData exactly once when both taps fire concurrently and storage is empty', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    const tap1 = handler();
    const tap2 = handler();
    await Promise.all([tap1, tap2]);

    expect(callbacks.onNoData).toHaveBeenCalledTimes(1);
  });

  it('never calls writeAsStringAsync or shareAsync when storage is empty', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    const tap1 = handler();
    const tap2 = handler();
    await Promise.all([tap1, tap2]);

    expect(adapter.writeAsStringAsync).not.toHaveBeenCalled();
    expect(adapter.shareAsync).not.toHaveBeenCalled();
  });

  it('lock is released after the no-data branch — a subsequent tap can trigger onNoData again', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler(); // first tap — onNoData fires, lock released
    await handler(); // second tap after lock released — onNoData fires again

    expect(callbacks.onNoData).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 4. No-data path — onNoData is never called when data is present
// ---------------------------------------------------------------------------

describe('makeExportHandler: onNoData is not called when data is present', () => {
  it('does not call onNoData when exportRawStorageData returns a non-null string', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(callbacks.onNoData).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Error path — adapter throws → onError fires, double-tap still fires once
// ---------------------------------------------------------------------------

describe('makeExportHandler: adapter error path', () => {
  it('calls onError exactly once when the adapter throws', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter({
      writeAsStringAsync: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('disk full')),
    });
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(callbacks.onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError exactly once — not twice — when two rapid taps fire and adapter throws', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter({
      writeAsStringAsync: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('disk full')),
    });
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    const tap1 = handler();
    const tap2 = handler();
    await Promise.all([tap1, tap2]);

    expect(callbacks.onError).toHaveBeenCalledTimes(1);
  });

  it('does not call onNoData when the adapter throws', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter({
      shareAsync: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('share cancelled')),
    });
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(callbacks.onNoData).not.toHaveBeenCalled();
  });

  it('lock is released after an error — a subsequent tap can attempt the export again', async () => {
    const writeAsStringAsync = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue(undefined);
    const lockRef = makeLockRef();
    const adapter = makeAdapter({ writeAsStringAsync });
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler(); // first tap — throws, onError fires, lock released
    await handler(); // second tap — succeeds

    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(adapter.shareAsync).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Loading flag lifecycle
// ---------------------------------------------------------------------------

describe('makeExportHandler: setLoading lifecycle', () => {
  it('calls setLoading(true) then setLoading(false) on a successful export', async () => {
    const loadingCalls: boolean[] = [];
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks({ setLoading: (v) => loadingCalls.push(v) });
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(loadingCalls).toEqual([true, false]);
  });

  it('calls setLoading(true) then setLoading(false) on a no-data result', async () => {
    const loadingCalls: boolean[] = [];
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks({ setLoading: (v) => loadingCalls.push(v) });
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(loadingCalls).toEqual([true, false]);
  });

  it('calls setLoading(false) even when the adapter throws', async () => {
    const loadingCalls: boolean[] = [];
    const lockRef = makeLockRef();
    const adapter = makeAdapter({
      writeAsStringAsync: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('disk full')),
    });
    const callbacks = makeCallbacks({ setLoading: (v) => loadingCalls.push(v) });
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);
    await handler();

    expect(loadingCalls).toEqual([true, false]);
  });

  it('does not call setLoading at all when the second tap is blocked by the lock', async () => {
    // The lock is held for the duration of the first tap.  The second tap
    // returns immediately without touching setLoading, so the call count
    // for the pair is exactly [true, false] — not [true, true, false, false].
    const loadingCalls: boolean[] = [];
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks({ setLoading: (v) => loadingCalls.push(v) });
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    const tap1 = handler();
    const tap2 = handler(); // blocked by lock — exits before setLoading(true)
    await Promise.all([tap1, tap2]);

    expect(loadingCalls).toEqual([true, false]);
  });
});

// ---------------------------------------------------------------------------
// 7. Lock reset — a third tap after completion works normally
// ---------------------------------------------------------------------------

describe('makeExportHandler: lock resets after each completion', () => {
  it('three taps fired sequentially each complete a full cycle', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    await handler();
    await handler();
    await handler();

    expect(adapter.writeAsStringAsync).toHaveBeenCalledTimes(3);
    expect(adapter.shareAsync).toHaveBeenCalledTimes(3);
  });

  it('three simultaneous taps — only the first completes, the other two are dropped', async () => {
    const lockRef = makeLockRef();
    const adapter = makeAdapter();
    const callbacks = makeCallbacks();
    const exportRaw = vi.fn<() => Promise<string | null>>().mockResolvedValue(DATA_JSON);

    const handler = makeExportHandler(lockRef, exportRaw, adapter, callbacks);

    await Promise.all([handler(), handler(), handler()]);

    expect(adapter.writeAsStringAsync).toHaveBeenCalledTimes(1);
    expect(adapter.shareAsync).toHaveBeenCalledTimes(1);
  });
});
