/**
 * Unit tests for the diary sync outbox retirement logic.
 *
 * Covers:
 *  - PERMANENT_CONFLICT_REASONS membership
 *  - recordTransientFailure counter and MAX_TRANSIENT_RETRIES threshold
 *  - processSyncConflicts routing:
 *      · permanent reasons persist to AsyncStorage (survives restart)
 *      · server_error quarantines session-only (does NOT persist; retries after restart)
 *  - syncDiaryLogs skips permanently-rejected and session-quarantined log IDs
 *  - syncDiaryLogs retires a log (permanently) after a permanent conflict response
 *  - syncDiaryLogs quarantines a log (session-only) after MAX_TRANSIENT_RETRIES server errors
 *  - After session exhaustion, a fresh module instance (simulated restart) retries the log
 *  - syncDiaryDeletes skips permanently-rejected and session-quarantined del-keys
 *
 * Each describe block uses vi.resetModules() so in-memory caches (syncedIds,
 * rejectedKeys, sessionQuarantinedKeys, transientCounts) all start fresh.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MealType, FoodSource } from '@/context/CaloraContext';

// ---------------------------------------------------------------------------
// Inline AsyncStorage mock — simple in-memory key-value store
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    }),
  },
}));

// ---------------------------------------------------------------------------
// syncOutbox mock — controlled per test via mockResolvedValueOnce
// ---------------------------------------------------------------------------

const mockSyncOutbox = vi.fn();

vi.mock('@workspace/api-client-react', () => ({
  syncOutbox: (...args: unknown[]) => mockSyncOutbox(...args),
}));

// ---------------------------------------------------------------------------
// FoodLog fixture builder
// ---------------------------------------------------------------------------

function makeLog(overrides: Partial<{
  id: string;
  date: string;
  time: string;
  meal: MealType;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodSource;
  confidence: number;
  notes: string;
  imageUrl: string;
  imageSource: 'provider' | 'recipe' | 'planner';
  nutritionSnapshot: { calories: number; proteinG: number; carbsG: number; fatG: number; capturedAt: string } | undefined;
  syncUpdatedAt: string;
}> = {}) {
  return {
    id: 'log-1',
    date: '2025-01-15',
    time: '12:00 PM',
    meal: 'Lunch' as MealType,
    name: 'Chicken breast',
    serving: '100 g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    source: 'Manual' as FoodSource,
    confidence: 90,
    nutritionSnapshot: undefined,
    ...overrides,
  };
}

function makeServerRecord(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'log-1',
    captureSessionId: null,
    entryDate: '2025-01-15',
    meal: 'Lunch',
    name: 'Chicken breast',
    serving: '100 g',
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    provenance: 'Manual',
    confidence: 90,
    notes: null,
    imageUrl: null,
    imageSource: null,
    clientUpdatedAt: '2026-08-27T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: import a fresh module instance (resets all in-memory state)
// ---------------------------------------------------------------------------

async function freshDiarySync() {
  vi.resetModules();
  vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key];
      }),
    },
  }));
  vi.mock('@workspace/api-client-react', () => ({
    syncOutbox: (...args: unknown[]) => mockSyncOutbox(...args),
  }));
  return import('../diarySync');
}

// ---------------------------------------------------------------------------
// PERMANENT_CONFLICT_REASONS — constant membership
// ---------------------------------------------------------------------------

describe('PERMANENT_CONFLICT_REASONS', () => {
  it('includes validation_failed', async () => {
    const { PERMANENT_CONFLICT_REASONS } = await freshDiarySync();
    expect(PERMANENT_CONFLICT_REASONS.has('validation_failed')).toBe(true);
  });

  it('includes unsupported_entity', async () => {
    const { PERMANENT_CONFLICT_REASONS } = await freshDiarySync();
    expect(PERMANENT_CONFLICT_REASONS.has('unsupported_entity')).toBe(true);
  });

  it('includes unsupported_operation', async () => {
    const { PERMANENT_CONFLICT_REASONS } = await freshDiarySync();
    expect(PERMANENT_CONFLICT_REASONS.has('unsupported_operation')).toBe(true);
  });

  it('includes invalid_mutation_id', async () => {
    const { PERMANENT_CONFLICT_REASONS } = await freshDiarySync();
    expect(PERMANENT_CONFLICT_REASONS.has('invalid_mutation_id')).toBe(true);
  });

  it('does NOT include server_error (transient)', async () => {
    const { PERMANENT_CONFLICT_REASONS } = await freshDiarySync();
    expect(PERMANENT_CONFLICT_REASONS.has('server_error')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// recordTransientFailure — per-session counter
// ---------------------------------------------------------------------------

describe('recordTransientFailure', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('returns false on the first failure', async () => {
    const { recordTransientFailure } = await freshDiarySync();
    expect(recordTransientFailure('some-key')).toBe(false);
  });

  it('returns false on failures below MAX_TRANSIENT_RETRIES', async () => {
    const { recordTransientFailure, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    let result = false;
    for (let i = 0; i < MAX_TRANSIENT_RETRIES - 1; i++) {
      result = recordTransientFailure('key-under-limit');
    }
    expect(result).toBe(false);
  });

  it('returns true exactly at MAX_TRANSIENT_RETRIES', async () => {
    const { recordTransientFailure, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    let result = false;
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      result = recordTransientFailure('key-at-limit');
    }
    expect(result).toBe(true);
  });

  it('tracks counters independently per key', async () => {
    const { recordTransientFailure, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      recordTransientFailure('key-a');
    }
    expect(recordTransientFailure('key-b')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// processSyncConflicts — routing: permanent vs session-only quarantine
// ---------------------------------------------------------------------------

describe('processSyncConflicts: permanent reasons persist to AsyncStorage', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('writes validation_failed to the persistent rejected-keys store', async () => {
    const { processSyncConflicts, loadPermanentlyRejectedKeys } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'mut-1', reason: 'validation_failed' }],
      new Map([['mut-1', 'log-abc']]),
    );
    expect((await loadPermanentlyRejectedKeys()).has('log-abc')).toBe(true);
  });

  it('writes unsupported_entity to the persistent store', async () => {
    const { processSyncConflicts, loadPermanentlyRejectedKeys } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'mut-2', reason: 'unsupported_entity' }],
      new Map([['mut-2', 'log-xyz']]),
    );
    expect((await loadPermanentlyRejectedKeys()).has('log-xyz')).toBe(true);
  });

  it('writes unsupported_operation to the persistent store', async () => {
    const { processSyncConflicts, loadPermanentlyRejectedKeys } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'mut-3', reason: 'unsupported_operation' }],
      new Map([['mut-3', 'log-op']]),
    );
    expect((await loadPermanentlyRejectedKeys()).has('log-op')).toBe(true);
  });

  it('writes invalid_mutation_id to the persistent store', async () => {
    const { processSyncConflicts, loadPermanentlyRejectedKeys } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'bad-id', reason: 'invalid_mutation_id' }],
      new Map([['bad-id', 'log-bad']]),
    );
    expect((await loadPermanentlyRejectedKeys()).has('log-bad')).toBe(true);
  });

  it('permanent rejection survives a simulated app restart (fresh module load)', async () => {
    const { processSyncConflicts } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'mut-persist', reason: 'validation_failed' }],
      new Map([['mut-persist', 'log-persist']]),
    );
    // Fresh import reads the same AsyncStorage.
    const { loadPermanentlyRejectedKeys: reload } = await freshDiarySync();
    expect((await reload()).has('log-persist')).toBe(true);
  });

  it('ignores conflicts for unknown mutationIds (not in map)', async () => {
    const { processSyncConflicts, loadPermanentlyRejectedKeys } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'ghost-id', reason: 'validation_failed' }],
      new Map(),
    );
    expect((await loadPermanentlyRejectedKeys()).size).toBe(0);
  });
});

describe('processSyncConflicts: server_error uses session-only quarantine', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('does NOT write to AsyncStorage on the first server_error', async () => {
    const {
      processSyncConflicts,
      loadPermanentlyRejectedKeys,
      getSessionQuarantinedKeys,
    } = await freshDiarySync();
    await processSyncConflicts(
      [{ mutationId: 'mut-se', reason: 'server_error' }],
      new Map([['mut-se', 'log-se']]),
    );
    expect((await loadPermanentlyRejectedKeys()).has('log-se')).toBe(false);
    expect(getSessionQuarantinedKeys().has('log-se')).toBe(false);
  });

  it('adds to session quarantine after MAX_TRANSIENT_RETRIES server_error responses', async () => {
    const {
      processSyncConflicts,
      getSessionQuarantinedKeys,
      MAX_TRANSIENT_RETRIES,
    } = await freshDiarySync();
    const map = new Map([['mut-se2', 'log-se2']]);
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      await processSyncConflicts([{ mutationId: 'mut-se2', reason: 'server_error' }], map);
    }
    expect(getSessionQuarantinedKeys().has('log-se2')).toBe(true);
  });

  it('does NOT persist to AsyncStorage after transient exhaustion', async () => {
    const {
      processSyncConflicts,
      loadPermanentlyRejectedKeys,
      MAX_TRANSIENT_RETRIES,
    } = await freshDiarySync();
    const map = new Map([['mut-se3', 'log-se3']]);
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      await processSyncConflicts([{ mutationId: 'mut-se3', reason: 'server_error' }], map);
    }
    expect((await loadPermanentlyRejectedKeys()).has('log-se3')).toBe(false);
  });

  it('session quarantine does NOT survive a simulated app restart (fresh module load)', async () => {
    const { processSyncConflicts, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    const map = new Map([['mut-restart', 'log-restart']]);
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      await processSyncConflicts([{ mutationId: 'mut-restart', reason: 'server_error' }], map);
    }
    // Simulate restart: load a fresh module. The session quarantine resets.
    const { getSessionQuarantinedKeys: freshQuarantine } = await freshDiarySync();
    expect(freshQuarantine().has('log-restart')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// syncDiaryLogs — skips permanently-rejected log IDs
// ---------------------------------------------------------------------------

describe('syncDiaryLogs: skips permanently-rejected logs', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('does not call syncOutbox for a permanently-rejected log', async () => {
    const { syncDiaryLogs } = await freshDiarySync();
    store['@calora/permanently-rejected-keys'] = JSON.stringify(['log-1']);
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryLogs([makeLog({ id: 'log-1' })]);
    expect(mockSyncOutbox).not.toHaveBeenCalled();
  });

  it('sends non-rejected logs even when some are rejected', async () => {
    const { syncDiaryLogs } = await freshDiarySync();
    store['@calora/permanently-rejected-keys'] = JSON.stringify(['log-1']);
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryLogs([makeLog({ id: 'log-1' }), makeLog({ id: 'log-2', name: 'Apple' })]);
    expect(mockSyncOutbox).toHaveBeenCalledOnce();
    const sentIds = (mockSyncOutbox.mock.calls[0][0].mutations as Array<{ payload: { clientId: string } }>)
      .map((m) => m.payload.clientId);
    expect(sentIds).not.toContain('log-1');
    expect(sentIds).toContain('log-2');
  });
});

describe('syncDiaryLogs: image metadata', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('syncs image metadata and detects an image-only update', async () => {
    const { syncDiaryLogs } = await freshDiarySync();
    mockSyncOutbox.mockImplementation(async (request: { mutations: Array<{ mutationId: string }> }) => ({
      accepted: request.mutations.map((mutation) => mutation.mutationId),
      conflicts: [],
      nextCursor: '',
    }));

    const original = makeLog({ id: 'log-image' });
    await syncDiaryLogs([original]);
    await syncDiaryLogs([{
      ...original,
      imageUrl: 'https://images.openfoodfacts.org/chicken.jpg',
      imageSource: 'provider',
    }]);

    expect(mockSyncOutbox).toHaveBeenCalledTimes(2);
    const secondPayload = mockSyncOutbox.mock.calls[1][0].mutations[0].payload;
    expect(secondPayload.imageUrl).toBe('https://images.openfoodfacts.org/chicken.jpg');
    expect(secondPayload.imageSource).toBe('provider');
  });

  it('uses a new mutation id for a later edit of the same diary record', async () => {
    const { syncDiaryLogs } = await freshDiarySync();
    mockSyncOutbox.mockImplementation(async (request: { mutations: Array<{ mutationId: string }> }) => ({
      accepted: request.mutations.map((mutation) => mutation.mutationId),
      conflicts: [],
      records: [],
      nextCursor: '',
    }));
    const original = makeLog({ id: 'log-edit-id', syncUpdatedAt: '2026-08-27T10:00:00.000Z' });
    const edited = {
      ...original,
      time: '6:45 PM',
      serving: '140 g',
      protein: 42,
      notes: 'Serving-only style edit',
      syncUpdatedAt: '2026-08-27T10:01:00.000Z',
    };

    await syncDiaryLogs([original]);
    await syncDiaryLogs([edited]);

    const firstId = mockSyncOutbox.mock.calls[0][0].mutations[0].mutationId;
    const secondId = mockSyncOutbox.mock.calls[1][0].mutations[0].mutationId;
    expect(secondId).not.toBe(firstId);
  });
});

describe('reconcileDiaryState: cross-device restore and merge', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('restores the server diary into a fresh install with no local logs', async () => {
    const { reconcileDiaryState } = await freshDiarySync();
    mockSyncOutbox.mockResolvedValue({
      accepted: [],
      conflicts: [],
      records: [makeServerRecord({
        clientId: 'restored-log',
        name: 'Restored oats',
        time: '7:35 AM',
        fiber: 8,
        sugar: 4,
        sodium: 210,
        preparation: 'Warm with oat milk',
        memoryId: 'memory-oats',
        plannerMealId: 'planner-oats',
        sourceRecipeId: 'recipe-oats',
      })],
      nextCursor: '',
    });

    const restored = await reconcileDiaryState([]);

    expect(restored).toEqual([
      expect.objectContaining({
        id: 'restored-log',
        name: 'Restored oats',
        time: '7:35 AM',
        fiber: 8,
        sugar: 4,
        sodium: 210,
        preparation: 'Warm with oat milk',
        memoryId: 'memory-oats',
        plannerMealId: 'planner-oats',
        sourceRecipeId: 'recipe-oats',
        syncUpdatedAt: '2026-08-27T10:00:00.000Z',
      }),
    ]);
  });

  it('keeps a newer offline edit when its upload fails, then retries it', async () => {
    const { reconcileDiaryState } = await freshDiarySync();
    const local = makeLog({
      id: 'offline-edit',
      name: 'Newest local name',
      syncUpdatedAt: '2026-08-27T10:05:00.000Z',
    });
    mockSyncOutbox
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        accepted: [],
        conflicts: [],
        records: [makeServerRecord({
          clientId: 'offline-edit',
          name: 'Older server name',
          clientUpdatedAt: '2026-08-27T10:00:00.000Z',
        })],
        nextCursor: '',
      });

    const merged = await reconcileDiaryState([local]);

    expect(merged.find((log) => log.id === 'offline-edit')?.name).toBe('Newest local name');
    expect(mockSyncOutbox).toHaveBeenCalledTimes(2);
  });

  it('removes an unchanged local record after another device deletes it', async () => {
    const { reconcileDiaryState } = await freshDiarySync();
    const local = makeLog({
      id: 'remote-delete',
      syncUpdatedAt: '2026-08-27T10:00:00.000Z',
    });
    const record = makeServerRecord({ clientId: 'remote-delete' });
    mockSyncOutbox
      .mockImplementationOnce(async (request: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: request.mutations.map((mutation) => mutation.mutationId),
        conflicts: [],
        records: [record],
        nextCursor: '',
      }))
      .mockResolvedValueOnce({ accepted: [], conflicts: [], records: [record], nextCursor: '' })
      .mockResolvedValueOnce({ accepted: [], conflicts: [], records: [], nextCursor: '' });

    const firstMerge = await reconcileDiaryState([local]);
    const afterRemoteDelete = await reconcileDiaryState(firstMerge);

    expect(afterRemoteDelete.some((log) => log.id === 'remote-delete')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// syncDiaryLogs — retires entries permanently after a permanent conflict
// ---------------------------------------------------------------------------

describe('syncDiaryLogs: permanently retires entries after a permanent conflict response', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('adds a log to the persistent rejected set when the server returns validation_failed', async () => {
    const { syncDiaryLogs, loadPermanentlyRejectedKeys } = await freshDiarySync();
    mockSyncOutbox.mockImplementationOnce(
      async (req: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: [],
        conflicts: [{ mutationId: req.mutations[0].mutationId, reason: 'validation_failed' }],
        nextCursor: '',
      }),
    );
    await syncDiaryLogs([makeLog({ id: 'log-bad-data' })]);
    expect((await loadPermanentlyRejectedKeys()).has('log-bad-data')).toBe(true);
  });

  it('stops sending the log on subsequent calls after a permanent conflict', async () => {
    const { syncDiaryLogs } = await freshDiarySync();
    mockSyncOutbox.mockImplementationOnce(
      async (req: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: [],
        conflicts: [{ mutationId: req.mutations[0].mutationId, reason: 'unsupported_entity' }],
        nextCursor: '',
      }),
    );
    await syncDiaryLogs([makeLog({ id: 'log-unsupported' })]);
    mockSyncOutbox.mockReset();
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryLogs([makeLog({ id: 'log-unsupported' })]);
    expect(mockSyncOutbox).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// syncDiaryLogs — session-only quarantine after MAX_TRANSIENT_RETRIES
// ---------------------------------------------------------------------------

describe('syncDiaryLogs: session-only quarantine after MAX_TRANSIENT_RETRIES server errors', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('keeps sending the log until the transient threshold is reached', async () => {
    const { syncDiaryLogs, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    mockSyncOutbox.mockImplementation(
      async (req: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: [],
        conflicts: [{ mutationId: req.mutations[0].mutationId, reason: 'server_error' }],
        nextCursor: '',
      }),
    );
    const log = makeLog({ id: 'log-transient' });
    for (let i = 0; i < MAX_TRANSIENT_RETRIES - 1; i++) {
      await syncDiaryLogs([log]);
    }
    expect(mockSyncOutbox).toHaveBeenCalledTimes(MAX_TRANSIENT_RETRIES - 1);
  });

  it('quarantines the log (session-only) after MAX_TRANSIENT_RETRIES failures', async () => {
    const {
      syncDiaryLogs,
      getSessionQuarantinedKeys,
      loadPermanentlyRejectedKeys,
      MAX_TRANSIENT_RETRIES,
    } = await freshDiarySync();
    mockSyncOutbox.mockImplementation(
      async (req: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: [],
        conflicts: [{ mutationId: req.mutations[0].mutationId, reason: 'server_error' }],
        nextCursor: '',
      }),
    );
    const log = makeLog({ id: 'log-quarantine' });
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      await syncDiaryLogs([log]);
    }
    // Session quarantine set should contain the key.
    expect(getSessionQuarantinedKeys().has('log-quarantine')).toBe(true);
    // Persistent rejected-keys store must NOT contain it.
    expect((await loadPermanentlyRejectedKeys()).has('log-quarantine')).toBe(false);
  });

  it('stops sending the log within the same session after quarantine', async () => {
    const { syncDiaryLogs, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    mockSyncOutbox.mockImplementation(
      async (req: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: [],
        conflicts: [{ mutationId: req.mutations[0].mutationId, reason: 'server_error' }],
        nextCursor: '',
      }),
    );
    const log = makeLog({ id: 'log-stop' });
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      await syncDiaryLogs([log]);
    }
    mockSyncOutbox.mockReset();
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryLogs([log]);
    expect(mockSyncOutbox).not.toHaveBeenCalled();
  });

  it('retries the log after a simulated app restart (session quarantine resets)', async () => {
    const { syncDiaryLogs: syncFirst, MAX_TRANSIENT_RETRIES } = await freshDiarySync();
    mockSyncOutbox.mockImplementation(
      async (req: { mutations: Array<{ mutationId: string }> }) => ({
        accepted: [],
        conflicts: [{ mutationId: req.mutations[0].mutationId, reason: 'server_error' }],
        nextCursor: '',
      }),
    );
    const log = makeLog({ id: 'log-restart' });
    for (let i = 0; i < MAX_TRANSIENT_RETRIES; i++) {
      await syncFirst([log]);
    }

    // Fresh module = app restart. Session quarantine is gone.
    const { syncDiaryLogs: syncAfterRestart } = await freshDiarySync();
    mockSyncOutbox.mockReset();
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncAfterRestart([log]);
    expect(mockSyncOutbox).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// syncDiaryDeletes — skips permanently-rejected and session-quarantined del-keys
// ---------------------------------------------------------------------------

describe('syncDiaryDeletes: skips rejected and session-quarantined del-keys', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    mockSyncOutbox.mockReset();
  });

  it('does not send a delete mutation when del:logId is permanently rejected', async () => {
    const { syncDiaryDeletes } = await freshDiarySync();
    store['@calora/permanently-rejected-keys'] = JSON.stringify(['del:log-gone']);
    store['@calora/synced-diary-ids'] = JSON.stringify(['log-gone']);
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryDeletes(['log-gone']);
    expect(mockSyncOutbox).not.toHaveBeenCalled();
  });

  it('sends the delete when the del-key is not rejected', async () => {
    const { syncDiaryDeletes } = await freshDiarySync();
    store['@calora/synced-diary-ids'] = JSON.stringify(['log-ok']);
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryDeletes(['log-ok']);
    expect(mockSyncOutbox).toHaveBeenCalledOnce();
  });

  it('sends only the non-rejected deletes when the list is mixed', async () => {
    const { syncDiaryDeletes } = await freshDiarySync();
    store['@calora/permanently-rejected-keys'] = JSON.stringify(['del:log-rej']);
    store['@calora/synced-diary-ids'] = JSON.stringify(['log-rej', 'log-ok2']);
    mockSyncOutbox.mockResolvedValue({ accepted: [], conflicts: [], nextCursor: '' });
    await syncDiaryDeletes(['log-rej', 'log-ok2']);
    expect(mockSyncOutbox).toHaveBeenCalledOnce();
    const sentIds = (mockSyncOutbox.mock.calls[0][0].mutations as Array<{ payload: { clientId: string } }>)
      .map((m) => m.payload.clientId);
    expect(sentIds).not.toContain('log-rej');
    expect(sentIds).toContain('log-ok2');
  });
});
