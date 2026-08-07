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
  it('payload.filename is "calora-export.json"', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    const payload = onData.mock.calls[0][0] as ExportPayload;
    expect(payload.filename).toBe('calora-export.json');
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

  it('EXPORT_FILENAME constant equals "calora-export.json"', () => {
    expect(EXPORT_FILENAME).toBe('calora-export.json');
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
      expect(payload.filename).toBe('calora-export.json');
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
    expect(path).toContain('calora-export.json');
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

  it('passes dialogTitle "calora-export.json" to shareAsync', async () => {
    const { adapter, shareAsync } = makeAdapter();
    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );
    const [, opts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(opts.dialogTitle).toBe('calora-export.json');
  });

  it('passes the file URI (from cacheDirectory + filename) to shareAsync', async () => {
    const { adapter, shareAsync } = makeAdapter('file:///tmp/cache/');
    await shareExportFile(
      { content: makeRawExport(), filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
      adapter,
    );
    const [uri] = shareAsync.mock.calls[0] as [string, unknown];
    expect(uri).toContain('calora-export.json');
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
  it('wires handleExportTap.onData through shareExportFile — adapter receives calora-export.json and application/json', async () => {
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
    expect(writePath).toContain('calora-export.json');
    expect(writeContent).toBe(raw);

    // Share sheet opened with the correct MIME type and dialog title
    expect(shareAsync).toHaveBeenCalledTimes(1);
    const [shareUri, shareOpts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(shareUri).toContain('calora-export.json');
    expect(shareOpts.mimeType).toBe('application/json');
    expect(shareOpts.dialogTitle).toBe('calora-export.json');

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
