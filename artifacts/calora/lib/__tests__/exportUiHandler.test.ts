/**
 * exportUiHandler — Settings export tap branch tests.
 *
 * These tests confirm the two UI branches that fire when the user taps
 * "Export your data" in the Settings (Profile) screen:
 *
 *   1. exportRawStorageData() returns null  → onNoData() fires (no share sheet)
 *   2. exportRawStorageData() returns a string → onData(payload) fires
 *
 * The handler is extracted into lib/exportUiHandler.ts so both branches are
 * testable without mounting React, mocking AsyncStorage globally, or reaching
 * into a React Native render tree.
 *
 * shareExportFile tests confirm that a FileShareAdapter mock receives the
 * correct file URI (containing the expected filename), MIME type, and
 * unmodified JSON content — so the platform share sheet routes to Files,
 * email, etc. rather than messaging apps.
 *
 * The production wiring in profile.tsx is:
 *   await handleExportTap({
 *     exportRawStorageData,
 *     onNoData: () => Alert.alert('No data', '…'),
 *     onData:   (payload) =>
 *       shareExportFile(payload, {
 *         cacheDirectory:     FileSystem.cacheDirectory,
 *         writeAsStringAsync: FileSystem.writeAsStringAsync,
 *         shareAsync:         Sharing.shareAsync,
 *       }).catch(() => Alert.alert('Export failed', '…')),
 *   });
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deriveExportHasData,
  handleExportTap,
  makeExportHandler,
  shareExportFile,
  EXPORT_FILENAME,
  EXPORT_MIME_TYPE,
  type ExportPayload,
  type FileShareAdapter,
} from '../exportUiHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the full JSON string that exportRawStorageData returns for a live session. */
function makeRawExport(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 2,
    profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
    logs: [
      { id: 'log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
    ],
    weights: [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
    waterLogs: { '2026-08-07': 48 },
    moodLogs: { '2026-08-07': 'good' },
    savedMeals: [],
    localRecipes: [],
    savedRecipeIds: [],
    plannerMeals: [],
    shoppingItems: [],
    foodDrafts: [],
    foodMemories: [],
    repeatPatterns: [],
    memoryCorrections: [],
    consentAccepted: true,
    coachConsentAccepted: true,
    coachMessages: [],
    healthConnected: false,
    ...overrides,
  }, null, 2);
}

/** Build a test FileShareAdapter with vi.fn() mocks. */
function makeAdapter(cacheDirectory = 'file:///cache/'): {
  adapter: FileShareAdapter;
  writeAsStringAsync: ReturnType<typeof vi.fn>;
  shareAsync: ReturnType<typeof vi.fn>;
} {
  const writeAsStringAsync = vi.fn().mockResolvedValue(undefined);
  const shareAsync = vi.fn().mockResolvedValue(undefined);
  return {
    adapter: { cacheDirectory, writeAsStringAsync, shareAsync },
    writeAsStringAsync,
    shareAsync,
  };
}

// ---------------------------------------------------------------------------
// Shared spies — reset before every test
// ---------------------------------------------------------------------------

let onNoData: ReturnType<typeof vi.fn>;
let onData: ReturnType<typeof vi.fn>;

beforeEach(() => {
  onNoData = vi.fn();
  onData   = vi.fn();
});

// ---------------------------------------------------------------------------
// Null path (post-clear / empty storage)
// ---------------------------------------------------------------------------

describe('handleExportTap: null return from exportRawStorageData (post-clear storage)', () => {
  it('calls onNoData and does NOT call onData when storage is empty after a clear', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onNoData).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
  });

  it('does NOT pass null or an empty string to the share-sheet callback', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onData).not.toHaveBeenCalled();
    for (const call of onData.mock.calls) {
      const payload = call[0] as ExportPayload;
      expect(payload.content).not.toBeNull();
      expect(payload.content).not.toBe('');
    }
  });

  it('onNoData fires exactly once — no duplicate alerts on a single tap', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onNoData).toHaveBeenCalledTimes(1);
  });

  it('the export tap resolves without throwing when storage is empty', async () => {
    await expect(
      handleExportTap({
        exportRawStorageData: async () => null,
        onNoData,
        onData,
      }),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Non-null path (live session with data)
// ---------------------------------------------------------------------------

describe('handleExportTap: non-null return from exportRawStorageData (share-sheet path)', () => {
  it('calls onData with the export payload and does NOT call onNoData', async () => {
    const raw = makeRawExport();

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData,
    });

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({
      content: raw,
      filename: EXPORT_FILENAME,
      mimeType: EXPORT_MIME_TYPE,
    });
    expect(onNoData).not.toHaveBeenCalled();
  });

  it('onData receives the exact unmodified bytes in payload.content', async () => {
    const raw = makeRawExport({ profile: { name: 'Jordan', goal: 'maintain', weightKg: 65 } });

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData,
    });

    const payload = onData.mock.calls[0][0] as ExportPayload;
    expect(payload.content).toBe(raw);
    const parsed = JSON.parse(payload.content) as Record<string, unknown>;
    expect((parsed['profile'] as Record<string, unknown>)['name']).toBe('Jordan');
  });

  it('onData fires exactly once — no duplicate share-sheet triggers on a single tap', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    expect(onData).toHaveBeenCalledTimes(1);
  });

  it('the export tap resolves without throwing when data is present', async () => {
    await expect(
      handleExportTap({
        exportRawStorageData: async () => makeRawExport(),
        onNoData,
        onData,
      }),
    ).resolves.toBeUndefined();
  });

  it('onData receives valid JSON in payload.content — the share payload is parseable', async () => {
    const raw = makeRawExport();

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData,
    });

    const payload = onData.mock.calls[0][0] as ExportPayload;
    expect(() => JSON.parse(payload.content)).not.toThrow();
    const parsed = JSON.parse(payload.content) as Record<string, unknown>;
    expect(typeof parsed['schemaVersion']).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Branch exclusivity
// ---------------------------------------------------------------------------

describe('handleExportTap: branches are mutually exclusive', () => {
  it('exactly one callback fires — null path calls only onNoData', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    const totalCalls = onNoData.mock.calls.length + onData.mock.calls.length;
    expect(totalCalls).toBe(1);
    expect(onNoData).toHaveBeenCalledTimes(1);
  });

  it('exactly one callback fires — data path calls only onData', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    const totalCalls = onNoData.mock.calls.length + onData.mock.calls.length;
    expect(totalCalls).toBe(1);
    expect(onData).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Post-clear then re-onboard: null → data across two taps
// ---------------------------------------------------------------------------

describe('handleExportTap: across multiple taps, each tap independently reads the current storage state', () => {
  it('first tap returns null (post-clear), second tap returns data (re-onboarded) — each fires the correct branch', async () => {
    let callCount = 0;
    const rawAfterOnboard = makeRawExport({ profile: { name: 'Alex' } });
    const exportRawStorageData = async () => {
      callCount += 1;
      return callCount === 1 ? null : rawAfterOnboard;
    };

    // First tap — post-clear, storage empty
    const onNoData1 = vi.fn();
    const onData1   = vi.fn();
    await handleExportTap({ exportRawStorageData, onNoData: onNoData1, onData: onData1 });
    expect(onNoData1).toHaveBeenCalledTimes(1);
    expect(onData1).not.toHaveBeenCalled();

    // Second tap — re-onboarded, data present
    const onNoData2 = vi.fn();
    const onData2   = vi.fn();
    await handleExportTap({ exportRawStorageData, onNoData: onNoData2, onData: onData2 });
    expect(onData2).toHaveBeenCalledTimes(1);
    expect(onData2).toHaveBeenCalledWith({
      content: rawAfterOnboard,
      filename: EXPORT_FILENAME,
      mimeType: EXPORT_MIME_TYPE,
    });
    expect(onNoData2).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Export payload metadata — filename and MIME type
// ---------------------------------------------------------------------------

/**
 * These tests confirm that the share-sheet callback always receives the exact
 * filename and MIME type needed for iOS/Android to route the file to Files,
 * email clients, or other appropriate targets rather than messaging apps.
 */
describe('handleExportTap: export payload filename and mimeType', () => {
  it('payload.filename is "caloraapp-export.json"', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    const payload = onData.mock.calls[0][0] as ExportPayload;
    expect(payload.filename).toBe('caloraapp-export.json');
  });

  it('payload.mimeType is "application/json"', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    const payload = onData.mock.calls[0][0] as ExportPayload;
    expect(payload.mimeType).toBe('application/json');
  });

  it('EXPORT_FILENAME constant equals "caloraapp-export.json"', () => {
    expect(EXPORT_FILENAME).toBe('caloraapp-export.json');
  });

  it('EXPORT_MIME_TYPE constant equals "application/json"', () => {
    expect(EXPORT_MIME_TYPE).toBe('application/json');
  });

  it('payload.filename and EXPORT_FILENAME are identical — no divergence between constant and injected value', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    const payload = onData.mock.calls[0][0] as ExportPayload;
    expect(payload.filename).toBe(EXPORT_FILENAME);
    expect(payload.mimeType).toBe(EXPORT_MIME_TYPE);
  });

  it('filename and mimeType are present on every call — not only the first', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    expect(onData).toHaveBeenCalledTimes(2);
    for (const call of onData.mock.calls) {
      const payload = call[0] as ExportPayload;
      expect(payload.filename).toBe('caloraapp-export.json');
      expect(payload.mimeType).toBe('application/json');
    }
  });

  it('null path does NOT produce any payload — no phantom filename or mimeType emitted', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onData).not.toHaveBeenCalled();
    expect(onNoData).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// shareExportFile — file-backed share invocation
// ---------------------------------------------------------------------------

/**
 * shareExportFile writes the JSON to a named file in the cache directory
 * then calls the platform share sheet with the correct MIME type.
 *
 * These tests use an injectable FileShareAdapter so no real file system or
 * native modules are involved. The spy assertions confirm the exact arguments
 * the production expo-file-system and expo-sharing APIs would receive.
 */
describe('shareExportFile: writes the export file and invokes the share sheet', () => {
  it('calls writeAsStringAsync exactly once with a path containing the filename', async () => {
    const { adapter, writeAsStringAsync } = makeAdapter();
    const payload: ExportPayload = {
      content: makeRawExport(),
      filename: EXPORT_FILENAME,
      mimeType: EXPORT_MIME_TYPE,
    };

    await shareExportFile(payload, adapter);

    expect(writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [path] = writeAsStringAsync.mock.calls[0] as [string, string];
    expect(path).toContain('caloraapp-export.json');
  });

  it('calls writeAsStringAsync with the exact unmodified content', async () => {
    const { adapter, writeAsStringAsync } = makeAdapter();
    const raw = makeRawExport({ profile: { name: 'Sam' } });
    const payload: ExportPayload = { content: raw, filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE };

    await shareExportFile(payload, adapter);

    const [, content] = writeAsStringAsync.mock.calls[0] as [string, string];
    expect(content).toBe(raw);
  });

  it('calls shareAsync exactly once', async () => {
    const { adapter, shareAsync } = makeAdapter();
    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );
    expect(shareAsync).toHaveBeenCalledTimes(1);
  });

  it('passes mimeType "application/json" to shareAsync', async () => {
    const { adapter, shareAsync } = makeAdapter();
    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );
    const [, opts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(opts.mimeType).toBe('application/json');
  });

  it('passes dialogTitle "caloraapp-export.json" to shareAsync', async () => {
    const { adapter, shareAsync } = makeAdapter();
    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );
    const [, opts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(opts.dialogTitle).toBe('caloraapp-export.json');
  });

  it('passes the file URI (from cacheDirectory + filename) to shareAsync', async () => {
    const { adapter, shareAsync } = makeAdapter('file:///tmp/cache/');
    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );
    const [uri] = shareAsync.mock.calls[0] as [string, unknown];
    expect(uri).toContain('caloraapp-export.json');
    expect(uri).toContain('file:///tmp/cache/');
  });

  it('writeAsStringAsync is called before shareAsync — file must exist before sharing', async () => {
    const callOrder: string[] = [];
    const adapter: FileShareAdapter = {
      cacheDirectory: 'file:///cache/',
      writeAsStringAsync: vi.fn().mockImplementation(async () => { callOrder.push('write'); }),
      shareAsync: vi.fn().mockImplementation(async () => { callOrder.push('share'); }),
    };

    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );

    expect(callOrder).toEqual(['write', 'share']);
  });

  it('propagates write errors — caller (profile.tsx) handles them with an Alert', async () => {
    const adapter: FileShareAdapter = {
      cacheDirectory: 'file:///cache/',
      writeAsStringAsync: vi.fn().mockRejectedValue(new Error('Disk full')),
      shareAsync: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      shareExportFile(
        { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
        adapter,
      ),
    ).rejects.toThrow('Disk full');
    expect(adapter.shareAsync).not.toHaveBeenCalled();
  });

  it('propagates share errors — caller (profile.tsx) handles them with an Alert', async () => {
    const adapter: FileShareAdapter = {
      cacheDirectory: 'file:///cache/',
      writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
      shareAsync: vi.fn().mockRejectedValue(new Error('Share unavailable')),
    };

    await expect(
      shareExportFile(
        { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
        adapter,
      ),
    ).rejects.toThrow('Share unavailable');
  });

  it('resolves without throwing when both write and share succeed', async () => {
    const { adapter } = makeAdapter();
    await expect(
      shareExportFile(
        { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
        adapter,
      ),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// End-to-end: handleExportTap → shareExportFile → adapter mocks
// ---------------------------------------------------------------------------

describe('handleExportTap → shareExportFile: filename and mimeType reach the platform share API', () => {
  it('wires handleExportTap.onData through shareExportFile — adapter receives caloraapp-export.json and application/json', async () => {
    const raw = makeRawExport();
    const { adapter, writeAsStringAsync, shareAsync } = makeAdapter();

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData: (payload) => shareExportFile(payload, adapter),
    });

    // File written with the correct name and unmodified content
    expect(writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [writePath, writeContent] = writeAsStringAsync.mock.calls[0] as [string, string];
    expect(writePath).toContain('caloraapp-export.json');
    expect(writeContent).toBe(raw);

    // Share sheet opened with the correct MIME type and dialog title
    expect(shareAsync).toHaveBeenCalledTimes(1);
    const [shareUri, shareOpts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(shareUri).toContain('caloraapp-export.json');
    expect(shareOpts.mimeType).toBe('application/json');
    expect(shareOpts.dialogTitle).toBe('caloraapp-export.json');

    expect(onNoData).not.toHaveBeenCalled();
  });

  it('adapter is NOT called when storage is empty — null path does not reach the file system or share sheet', async () => {
    const { adapter, writeAsStringAsync, shareAsync } = makeAdapter();

    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData: (payload) => shareExportFile(payload, adapter),
    });

    expect(writeAsStringAsync).not.toHaveBeenCalled();
    expect(shareAsync).not.toHaveBeenCalled();
    expect(onNoData).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// makeExportHandler — concurrent double-tap lock
// ---------------------------------------------------------------------------

/**
 * makeExportHandler wraps the full export flow behind a synchronous ref lock.
 * The ref is checked and set before the first await, so two rapid invocations
 * that share the same event-loop tick both observe the same value — the second
 * one returns immediately without starting a duplicate export.
 *
 * These tests confirm:
 *   1. Two concurrent calls trigger exactly one storage read, one file write,
 *      and one share invocation.
 *   2. A second call that arrives while the first is still in flight is silently
 *      dropped (the lock is held).
 *   3. After the first call settles the lock is released and a subsequent call
 *      succeeds normally.
 *   4. setLoading mirrors the lock: true while in-flight, false when done.
 */
describe('makeExportHandler: concurrent double-tap lock', () => {
  it('two concurrent calls produce exactly one storage read, one file write, and one share', async () => {
    const lockRef = { current: false };
    const setLoading = vi.fn();
    const onNoData = vi.fn();
    const onError = vi.fn();

    // Slow storage read — stays pending while the second tap fires
    let resolveFirst!: (value: string) => void;
    const slowStorage = vi.fn(() => new Promise<string>((res) => { resolveFirst = res; }));
    const { adapter, writeAsStringAsync, shareAsync } = makeAdapter();

    const handler = makeExportHandler(lockRef, slowStorage, adapter, { setLoading, onNoData, onError });

    // Fire two taps without awaiting the first
    const first = handler();
    const second = handler(); // lock is already held — should return immediately

    // Let the first export complete
    resolveFirst(makeRawExport());
    await first;
    await second;

    expect(slowStorage).toHaveBeenCalledTimes(1);
    expect(writeAsStringAsync).toHaveBeenCalledTimes(1);
    expect(shareAsync).toHaveBeenCalledTimes(1);
    expect(onNoData).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('second tap while first is in-flight is silently dropped — setLoading is not called a second time', async () => {
    const lockRef = { current: false };
    const setLoading = vi.fn();

    let resolveFirst!: (value: string) => void;
    const slowStorage = vi.fn(() => new Promise<string>((res) => { resolveFirst = res; }));
    const { adapter } = makeAdapter();

    const handler = makeExportHandler(lockRef, slowStorage, adapter, {
      setLoading,
      onNoData: vi.fn(),
      onError: vi.fn(),
    });

    const first = handler();
    const second = handler(); // dropped

    resolveFirst(makeRawExport());
    await first;
    await second;

    // setLoading(true) and setLoading(false) fire exactly once — from the first call only
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('lock is released after the first call settles — a subsequent tap succeeds normally', async () => {
    const lockRef = { current: false };
    const setLoading = vi.fn();
    const { adapter, writeAsStringAsync, shareAsync } = makeAdapter();

    const handler = makeExportHandler(lockRef, async () => makeRawExport(), adapter, {
      setLoading,
      onNoData: vi.fn(),
      onError: vi.fn(),
    });

    // First call
    await handler();
    expect(writeAsStringAsync).toHaveBeenCalledTimes(1);
    expect(shareAsync).toHaveBeenCalledTimes(1);

    // Second call after first has fully settled — lock was released in finally
    await handler();
    expect(writeAsStringAsync).toHaveBeenCalledTimes(2);
    expect(shareAsync).toHaveBeenCalledTimes(2);
  });

  it('lock is released even when shareExportFile throws — error path clears the ref', async () => {
    const lockRef = { current: false };
    const setLoading = vi.fn();
    const onError = vi.fn();

    const errorAdapter: FileShareAdapter = {
      cacheDirectory: 'file:///cache/',
      writeAsStringAsync: vi.fn().mockRejectedValue(new Error('Disk full')),
      shareAsync: vi.fn().mockResolvedValue(undefined),
    };

    const handler = makeExportHandler(lockRef, async () => makeRawExport(), errorAdapter, {
      setLoading,
      onNoData: vi.fn(),
      onError,
    });

    await handler(); // fails — onError fires, lock must still be released
    expect(onError).toHaveBeenCalledTimes(1);
    expect(lockRef.current).toBe(false);

    // A follow-up tap should be able to proceed
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('calls onNoData and does NOT write or share when storage returns null', async () => {
    const lockRef = { current: false };
    const onNoData = vi.fn();
    const { adapter, writeAsStringAsync, shareAsync } = makeAdapter();

    const handler = makeExportHandler(lockRef, async () => null, adapter, {
      setLoading: vi.fn(),
      onNoData,
      onError: vi.fn(),
    });

    await handler();
    expect(onNoData).toHaveBeenCalledTimes(1);
    expect(writeAsStringAsync).not.toHaveBeenCalled();
    expect(shareAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deriveExportHasData — export row guard (profile screen)
// ---------------------------------------------------------------------------

/**
 * deriveExportHasData drives the "Export your data" row guard in profile.tsx.
 * When it returns false the row is visually dimmed (opacity 0.4) and its
 * onPress is set to undefined — making it non-interactive without any Alert.
 *
 * These tests pin the three behaviorally-distinct states:
 *   A. profile set, any logs     → true  (full session)
 *   B. profile set, no logs      → true  (just onboarded, no diary yet)
 *   C. profile null, logs exist  → true  (edge: logs without profile)
 *   D. profile null, no logs     → false (post-clear / fresh install)
 */
describe('deriveExportHasData: export row interactive guard', () => {
  const profile = { name: 'Alex' };
  const log = { id: 'log-1' };

  it('returns true when profile is set and logs exist (full session)', () => {
    expect(deriveExportHasData(profile, [log])).toBe(true);
  });

  it('returns true when profile is set but logs array is empty (just onboarded)', () => {
    expect(deriveExportHasData(profile, [])).toBe(true);
  });

  it('returns true when profile is null but logs exist (logs-only edge case)', () => {
    expect(deriveExportHasData(null, [log])).toBe(true);
  });

  it('returns false when profile is null and logs array is empty (post-clear / fresh install)', () => {
    expect(deriveExportHasData(null, [])).toBe(false);
  });

  it('the row is non-interactive when hasData is false — onPress must be undefined', () => {
    const hasData = deriveExportHasData(null, []);
    const handleExportMock = vi.fn();
    const resolvedOnPress = hasData ? handleExportMock : undefined;
    expect(resolvedOnPress).toBeUndefined();
    (resolvedOnPress as (() => void) | undefined)?.();
    expect(handleExportMock).not.toHaveBeenCalled();
  });

  it('the row IS interactive when hasData is true — onPress points to the handler', () => {
    const hasData = deriveExportHasData(profile, []);
    const handleExportMock = vi.fn();
    const resolvedOnPress = hasData ? handleExportMock : undefined;
    expect(typeof resolvedOnPress).toBe('function');
    resolvedOnPress?.();
    expect(handleExportMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Onboarding boundary — export row re-enables the moment completeOnboarding lands
// ---------------------------------------------------------------------------

/**
 * completeOnboarding() writes a Profile object and flips onboardingComplete.
 * deriveExportHasData must flip from false → true the instant that profile
 * lands in context so the export row re-enables without any intermediate Alert
 * or dimmed state leaking into the post-onboarding view.
 *
 * These tests assert:
 *   1. Pre-onboarding  (profile null, no logs)  → false  (row dimmed)
 *   2. Post-onboarding (profile set,  no logs)  → true   (row interactive)
 *   3. No intermediate Alert or disabled state exists between the two reads —
 *      the guard is a pure, synchronous boolean with no extra side-effects.
 */
describe('deriveExportHasData: onboarding boundary — export row re-enables immediately', () => {
  const postOnboardingProfile = { name: 'Alex' };

  it('transitions false → true at the exact onboarding boundary (null profile → profile set, no logs in either state)', () => {
    // Before completeOnboarding: context has no profile and no logs
    const beforeOnboarding = deriveExportHasData(null, []);
    expect(beforeOnboarding).toBe(false);

    // After completeOnboarding: profile lands in context; logs are still empty
    const afterOnboarding = deriveExportHasData(postOnboardingProfile, []);
    expect(afterOnboarding).toBe(true);
  });

  it('the row transitions from non-interactive to interactive at the onboarding boundary — no intermediate disabled state', () => {
    const handler = vi.fn();

    // Pre-onboarding: row is dimmed and onPress is undefined
    const preOnboardingHasData = deriveExportHasData(null, []);
    const preOnboardingOnPress = preOnboardingHasData ? handler : undefined;
    expect(preOnboardingOnPress).toBeUndefined();
    preOnboardingOnPress?.();
    expect(handler).not.toHaveBeenCalled();

    // Post-onboarding: row is interactive immediately — no extra step needed
    const postOnboardingHasData = deriveExportHasData(postOnboardingProfile, []);
    const postOnboardingOnPress = postOnboardingHasData ? handler : undefined;
    expect(typeof postOnboardingOnPress).toBe('function');
    postOnboardingOnPress?.();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('the guard is pure and synchronous — the same profile object always produces the same result', () => {
    // Calling the guard multiple times with the same inputs must be stable
    expect(deriveExportHasData(postOnboardingProfile, [])).toBe(true);
    expect(deriveExportHasData(postOnboardingProfile, [])).toBe(true);
    expect(deriveExportHasData(null, [])).toBe(false);
    expect(deriveExportHasData(null, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearAllData() state transition — export row dims immediately, no reload needed
// ---------------------------------------------------------------------------

/**
 * clearAllData() in CaloraContext resets profile → null and logs → [].
 * deriveExportHasData reads those two context values, so the export row
 * must flip from enabled → disabled the instant clearAllData() resolves —
 * no navigation or manual refresh required.
 *
 * These tests simulate the pre/post-clear state transition directly through
 * deriveExportHasData, confirming:
 *   1. Pre-clear  (profile set, logs exist)  → true  (row interactive)
 *   2. Post-clear (profile null, logs empty) → false (row dimmed)
 *   3. No Alert is ever shown in the post-clear state — the row is simply
 *      non-interactive (onPress undefined), so handleExportTap never fires.
 */
describe('deriveExportHasData: clearAllData() transition — export row dims without a reload', () => {
  const preClearProfile = { name: 'Alex' };
  const preClearLogs = [{ id: 'log-1' }, { id: 'log-2' }];

  it('transitions true → false at the clear boundary (profile set + logs → null + empty)', () => {
    // Before clearAllData: user has a profile and diary logs
    const beforeClear = deriveExportHasData(preClearProfile, preClearLogs);
    expect(beforeClear).toBe(true);

    // After clearAllData: CaloraContext resets profile → null, logs → []
    const afterClear = deriveExportHasData(null, []);
    expect(afterClear).toBe(false);
  });

  it('export row flips from interactive to dimmed immediately after clearAllData — no reload', () => {
    const handler = vi.fn();

    // Pre-clear: row is interactive
    const preClearHasData = deriveExportHasData(preClearProfile, preClearLogs);
    const preClearOnPress = preClearHasData ? handler : undefined;
    expect(typeof preClearOnPress).toBe('function');
    preClearOnPress?.();
    expect(handler).toHaveBeenCalledTimes(1);

    handler.mockClear();

    // Post-clear: row is dimmed — onPress is undefined, handler is never reached
    const postClearHasData = deriveExportHasData(null, []);
    const postClearOnPress = postClearHasData ? handler : undefined;
    expect(postClearOnPress).toBeUndefined();
    postClearOnPress?.();
    expect(handler).not.toHaveBeenCalled();
  });

  it('no Alert fires in the post-clear state — handleExportTap is never called when row is dimmed', async () => {
    // Simulate what profile.tsx does: only wire up the tap handler when hasData is true.
    // Post-clear: hasData is false, so the tap handler is never registered and
    // handleExportTap (which would trigger onNoData → Alert) is never invoked.
    const postClearHasData = deriveExportHasData(null, []);
    expect(postClearHasData).toBe(false);

    // The export row's onPress is undefined — handleExportTap never fires
    const exportRawStorageData = vi.fn();
    const onNoDataSpy = vi.fn();
    const onDataSpy = vi.fn();

    const resolvedOnPress = postClearHasData
      ? async () => handleExportTap({ exportRawStorageData, onNoData: onNoDataSpy, onData: onDataSpy })
      : undefined;

    // Simulate a tap (or lack thereof) — the row is non-interactive
    await resolvedOnPress?.();

    expect(exportRawStorageData).not.toHaveBeenCalled();
    expect(onNoDataSpy).not.toHaveBeenCalled();
    expect(onDataSpy).not.toHaveBeenCalled();
  });

  it('post-clear state holds when logs are cleared but profile was also cleared — both must be absent', () => {
    // clearAllData resets both; losing only logs is not a full clear
    expect(deriveExportHasData(preClearProfile, [])).toBe(true);  // profile still present
    expect(deriveExportHasData(null, preClearLogs)).toBe(true);   // logs still present
    expect(deriveExportHasData(null, [])).toBe(false);            // full clear
  });

  it('re-onboarding after a clear re-enables the row immediately — false → true', () => {
    // Full clear
    expect(deriveExportHasData(null, [])).toBe(false);

    // User completes onboarding again — profile lands in context
    const reOnboardedProfile = { name: 'Alex' };
    expect(deriveExportHasData(reOnboardedProfile, [])).toBe(true);
  });
});
