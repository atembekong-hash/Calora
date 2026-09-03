/**
 * End-to-end integration: export flow produces caloraapp-export.json.
 *
 * What this proves:
 *   After the EXPORT_FILENAME rename ('calora-export.json' → 'caloraapp-export.json'),
 *   the complete production export path — from reading raw bytes out of storage through
 *   writing the file and opening the share sheet — delivers the correct filename and
 *   valid JSON at every step.
 *
 * Scope of coverage:
 *   readRawStorageData  (exportPayload.ts)  — reads the storage key
 *   makeExportHandler   (exportUiHandler.ts) — mutex, loading state, data/no-data branch
 *   shareExportFile     (exportUiHandler.ts) — writes the file, opens the share sheet
 *
 * The FileShareAdapter is injected so no real expo-file-system or expo-sharing
 * modules are required; the spy assertions confirm the exact arguments that the
 * production APIs would receive, including the new filename.
 *
 * Expected keys in the exported JSON are derived from CaloraExportState
 * (exportPayload.ts) which is the canonical export schema.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readRawStorageData }                      from '../exportPayload';
import { makeExportHandler, EXPORT_FILENAME, EXPORT_MIME_TYPE, type FileShareAdapter } from '../exportUiHandler';

// ---------------------------------------------------------------------------
// In-memory storage adapter — same pattern used by other integration tests
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@calora/local-state-v2'; // must match CaloraContext

function makeStore(initial: Record<string, string> = {}): {
  store: Record<string, string>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
} {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    async getItem(key) { return store[key] ?? null; },
    async setItem(key, value) { store[key] = value; },
  };
}

// ---------------------------------------------------------------------------
// Realistic snapshot — mirrors the shape enqueueAutosave writes in production
// ---------------------------------------------------------------------------

/** All keys present in CaloraExportState, populated with minimal realistic values. */
function makeStoredSnapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 2,
    profile: {
      name: 'Alex',
      goal: 'lose',
      activity: 'moderate',
      diet: 'Everything',
      heightCm: 170,
      weightKg: 76,
      targetWeightKg: 70,
      age: 32,
      calorieTarget: 1800,
    },
    logs: [
      { id: 'log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast', calories: 380 },
    ],
    weights: [
      { id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' },
    ],
    waterLogs: { '2026-08-07': 48 },
    moodLogs: { '2026-08-07': 'good' },
    activityLogs: {},
    activityMinutesLogs: {},
    savedMeals: [],
    localRecipes: [],
    savedRecipeIds: [],
    plannerWeekStart: '2026-08-03',
    plannerMeals: [],
    shoppingItems: [],
    foodDrafts: [],
    foodMemories: [],
    repeatPatterns: [],
    memoryCorrections: [],
    livingMemory: null,
    hydrationReminders: { enabled: false, intervalHours: 2, wakeHour: 7, wakeMinute: 0, sleepHour: 22, sleepMinute: 0 },
    mealReminders: { breakfast: false, breakfastTime: { hour: 8, minute: 0 }, lunch: false, lunchTime: { hour: 12, minute: 30 }, dinner: false, dinnerTime: { hour: 18, minute: 30 } },
    goalReminder: { enabled: false, hour: 20, minute: 0 },
    notificationPreferences: { version: 1, delivery: 'local', masterEnabled: true, quietHours: { enabled: false, start: { hour: 22, minute: 0 }, end: { hour: 7, minute: 0 } }, categories: {} },
    healthConnected: false,
    consentAccepted: true,
    coachConsentAccepted: true,
    coachMessages: [],
    ...overrides,
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Injectable FileShareAdapter spy factory
// ---------------------------------------------------------------------------

function makeAdapter(cacheDirectory = 'file:///cache/'): {
  adapter: FileShareAdapter;
  writeAsStringAsync: ReturnType<typeof vi.fn>;
  shareAsync: ReturnType<typeof vi.fn>;
} {
  const writeAsStringAsync = vi.fn().mockResolvedValue(undefined);
  const shareAsync         = vi.fn().mockResolvedValue(undefined);
  return {
    adapter: { cacheDirectory, writeAsStringAsync, shareAsync },
    writeAsStringAsync,
    shareAsync,
  };
}

// ---------------------------------------------------------------------------
// Shared callback spies — reset before every test
// ---------------------------------------------------------------------------

let setLoading: ReturnType<typeof vi.fn>;
let onNoData:   ReturnType<typeof vi.fn>;
let onError:    ReturnType<typeof vi.fn>;

beforeEach(() => {
  setLoading = vi.fn();
  onNoData   = vi.fn();
  onError    = vi.fn();
});

// ---------------------------------------------------------------------------
// 1. readRawStorageData — confirms the production storage reader returns the
//    snapshot as-is so the bytes flowing into makeExportHandler are unmodified.
// ---------------------------------------------------------------------------

describe('readRawStorageData: returns the stored snapshot verbatim', () => {
  it('returns the exact JSON string that was written to storage', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });

    const raw = await readRawStorageData(store.getItem, STORAGE_KEY);

    expect(raw).toBe(snapshot);
  });

  it('returns null when the storage key is absent (post-clear)', async () => {
    const store = makeStore(); // empty
    const raw = await readRawStorageData(store.getItem, STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it('the returned string is valid JSON with schemaVersion at the top level', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });

    const raw = await readRawStorageData(store.getItem, STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    expect(typeof parsed['schemaVersion']).toBe('number');
    expect(parsed['schemaVersion']).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Full chain: storage → readRawStorageData → makeExportHandler →
//    shareExportFile adapter.  These are the assertions that would fail if the
//    filename rename were not applied end-to-end.
// ---------------------------------------------------------------------------

describe('complete export chain: storage → makeExportHandler → FileShareAdapter', () => {
  it('writeAsStringAsync receives a path containing "caloraapp-export.json"', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, writeAsStringAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    expect(writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [path] = writeAsStringAsync.mock.calls[0] as [string, string];
    expect(path).toContain('caloraapp-export.json');
  });

  it('shareAsync receives dialogTitle "caloraapp-export.json"', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, shareAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [, opts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(opts.dialogTitle).toBe('caloraapp-export.json');
    expect(opts.dialogTitle).toBe(EXPORT_FILENAME);
  });

  it('shareAsync receives mimeType "application/json"', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, shareAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [, opts] = shareAsync.mock.calls[0] as [string, { mimeType: string; dialogTitle: string }];
    expect(opts.mimeType).toBe('application/json');
    expect(opts.mimeType).toBe(EXPORT_MIME_TYPE);
  });

  it('the file URI passed to shareAsync contains cacheDirectory and caloraapp-export.json', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, shareAsync } = makeAdapter('file:///var/mobile/cache/');
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [uri] = shareAsync.mock.calls[0] as [string, unknown];
    expect(uri).toContain('file:///var/mobile/cache/');
    expect(uri).toContain('caloraapp-export.json');
  });

  it('writeAsStringAsync receives the exact unmodified bytes from storage', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, writeAsStringAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [, content] = writeAsStringAsync.mock.calls[0] as [string, string];
    expect(content).toBe(snapshot);
  });

  it('write happens before share — the file exists on disk before the sheet opens', async () => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const callOrder: string[] = [];
    const adapter: FileShareAdapter = {
      cacheDirectory: 'file:///cache/',
      writeAsStringAsync: vi.fn().mockImplementation(async () => { callOrder.push('write'); }),
      shareAsync:         vi.fn().mockImplementation(async () => { callOrder.push('share'); }),
    };
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    expect(callOrder).toEqual(['write', 'share']);
  });
});

// ---------------------------------------------------------------------------
// 3. JSON schema: exported content contains the expected top-level keys.
//    A missing key here would silently drop user data on every export.
// ---------------------------------------------------------------------------

describe('exported JSON contains the expected CaloraExportState keys', () => {
  const EXPECTED_KEYS = [
    'schemaVersion',
    'profile',
    'logs',
    'weights',
    'waterLogs',
    'moodLogs',
    'savedMeals',
    'localRecipes',
    'savedRecipeIds',
    'plannerMeals',
    'shoppingItems',
    'foodDrafts',
    'foodMemories',
    'repeatPatterns',
    'memoryCorrections',
    'consentAccepted',
    'coachConsentAccepted',
    'coachMessages',
    'healthConnected',
    'hydrationReminders',
    'mealReminders',
    'goalReminder',
    'notificationPreferences',
  ];

  it.each(EXPECTED_KEYS)('exported JSON contains top-level key "%s"', async (key) => {
    const snapshot = makeStoredSnapshot();
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, writeAsStringAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [, content] = writeAsStringAsync.mock.calls[0] as [string, string];
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(parsed, key)).toBe(true);
  });

  it('profile.name round-trips correctly through the export chain', async () => {
    const snapshot = makeStoredSnapshot({ profile: { name: 'Jordan', goal: 'maintain', weightKg: 70 } });
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, writeAsStringAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [, content] = writeAsStringAsync.mock.calls[0] as [string, string];
    const parsed = JSON.parse(content) as { profile: { name: string } };
    expect(parsed.profile.name).toBe('Jordan');
  });

  it('logs array round-trips correctly — entry count is preserved', async () => {
    const logs = [
      { id: 'a', name: 'Eggs', date: '2026-08-07', meal: 'Breakfast', calories: 200 },
      { id: 'b', name: 'Salad', date: '2026-08-07', meal: 'Lunch', calories: 320 },
    ];
    const snapshot = makeStoredSnapshot({ logs });
    const store = makeStore({ [STORAGE_KEY]: snapshot });
    const { adapter, writeAsStringAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    const [, content] = writeAsStringAsync.mock.calls[0] as [string, string];
    const parsed = JSON.parse(content) as { logs: unknown[] };
    expect(parsed.logs).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Post-clear path: empty storage → onNoData fires, no file write or share.
//    Confirms the null guard in makeExportHandler still works after the rename.
// ---------------------------------------------------------------------------

describe('post-clear: empty storage → onNoData fires, adapter is never called', () => {
  it('onNoData fires when storage is empty', async () => {
    const store = makeStore(); // empty — simulates post-clearAllData()
    const { adapter } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    expect(onNoData).toHaveBeenCalledTimes(1);
  });

  it('writeAsStringAsync is NOT called when storage is empty', async () => {
    const store = makeStore();
    const { adapter, writeAsStringAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    expect(writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('shareAsync is NOT called when storage is empty', async () => {
    const store = makeStore();
    const { adapter, shareAsync } = makeAdapter();
    const lockRef = { current: false };

    const handler = makeExportHandler(
      lockRef,
      () => readRawStorageData(store.getItem, STORAGE_KEY),
      adapter,
      { setLoading, onNoData, onError },
    );

    await handler();

    expect(shareAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. EXPORT_FILENAME constant — single source of truth for the new name.
// ---------------------------------------------------------------------------

describe('EXPORT_FILENAME constant', () => {
  it('equals "caloraapp-export.json" — the renamed value', () => {
    expect(EXPORT_FILENAME).toBe('caloraapp-export.json');
  });

  it('does not contain the old name "calora-export.json"', () => {
    expect(EXPORT_FILENAME).not.toBe('calora-export.json');
    expect(EXPORT_FILENAME).not.toContain('calora-export');
  });
});
