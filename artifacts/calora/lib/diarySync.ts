/**
 * Background diary sync for cross-device backup.
 *
 * Calora remains local-first: an unsuccessful sync never blocks a meal from
 * appearing locally. This module pushes confirmed diary logs to the server
 * in the background using the authenticated POST /v1/sync endpoint.
 *
 * ── Idempotency ─────────────────────────────────────────────────────────────
 * The server upserts on (user_id, client_id), so re-sending the same log is
 * always safe. We track a content signature per log to avoid re-sending
 * unchanged data and to detect edits that need a re-sync.
 *
 * ── Deletion tracking ───────────────────────────────────────────────────────
 * We persist the set of log IDs that have been accepted by the server to
 * AsyncStorage under SYNCED_IDS_KEY. When the caller calls syncDiaryDeletes()
 * with IDs no longer in the local diary, we send authenticated delete
 * mutations so the server stays in sync with local state.
 *
 * ── Starter / demo logs ─────────────────────────────────────────────────────
 * Logs with IDs starting 'starter-' are always excluded: they are ephemeral
 * display data, not real user entries.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncOutbox } from '@workspace/api-client-react';
import type { FoodLog } from '@/context/CaloraContext';

// ── Persistence ───────────────────────────────────────────────────────────────

const SYNCED_IDS_KEY = '@calora/synced-diary-ids';
/**
 * Persisted map of logId → content signature for logs the server has
 * accepted.  Loading this on startup means we skip re-sending unchanged
 * entries after an app restart or reinstall, keeping large initial syncs
 * from re-batching hundreds of already-synced entries.
 */
const SYNCED_SIGS_KEY = '@calora/synced-diary-sigs';

/** Lazily-loaded, in-memory cache of the persisted synced ID set. */
let _syncedIdSet: Set<string> | null = null;

export async function loadSyncedIds(): Promise<Set<string>> {
  if (_syncedIdSet !== null) return _syncedIdSet;
  try {
    const raw = await AsyncStorage.getItem(SYNCED_IDS_KEY);
    _syncedIdSet = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch {
    _syncedIdSet = new Set();
  }
  return _syncedIdSet;
}

async function persistSyncedIds(): Promise<void> {
  if (!_syncedIdSet) return;
  try {
    await AsyncStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([..._syncedIdSet]));
  } catch {
    // Persist failure is non-fatal; next restart re-syncs from the current
    // local logs, which is always correct.
  }
}

/** Load persisted signatures into the in-memory map. Called once on startup. */
async function loadSyncedSignatures(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SYNCED_SIGS_KEY);
    if (raw) {
      const entries = JSON.parse(raw) as [string, string][];
      for (const [id, sig] of entries) {
        syncedSignatures.set(id, sig);
      }
    }
  } catch {
    // Non-fatal: cold start will re-send changed/new entries only.
  }
}

async function persistSyncedSignatures(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      SYNCED_SIGS_KEY,
      JSON.stringify([...syncedSignatures]),
    );
  } catch {
    // Non-fatal.
  }
}

/**
 * Remove stale signature entries for IDs that are no longer in the synced
 * set (e.g. after a delete).  Keeps the persisted map from growing unboundedly.
 */
async function pruneSignatures(syncedIds: Set<string>): Promise<void> {
  let changed = false;
  for (const id of [...syncedSignatures.keys()]) {
    if (!syncedIds.has(id)) {
      syncedSignatures.delete(id);
      changed = true;
    }
  }
  if (changed) await persistSyncedSignatures();
}

/** True once the persisted signatures have been loaded into the in-memory map. */
let _sigsLoaded = false;

/**
 * Ensures the persisted signatures are loaded before the first sync.
 * Subsequent calls are no-ops.
 */
export async function ensureSigsLoaded(): Promise<void> {
  if (_sigsLoaded) return;
  await loadSyncedSignatures();
  _sigsLoaded = true;
}

// ── UUID helpers ──────────────────────────────────────────────────────────────

function generateUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as Crypto).randomUUID === 'function'
  ) {
    return (crypto as Crypto).randomUUID();
  }
  // RFC 4122 v4 fallback for older Hermes versions.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Per-session stable UUID for each local log ID. */
const logMutationIds = new Map<string, string>();

function getMutationId(logId: string): string {
  let id = logMutationIds.get(logId);
  if (!id) {
    id = generateUUID();
    logMutationIds.set(logId, id);
  }
  return id;
}

// ── In-progress guards ────────────────────────────────────────────────────────

let upsertInFlight = false;
let deleteInFlight = false;

/** Signatures of logs whose current content was already accepted. */
const syncedSignatures = new Map<string, string>();

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isStarterLog(log: FoodLog): boolean {
  return log.id.startsWith('starter-');
}

function signature(log: FoodLog): string {
  return [
    log.date,
    log.meal,
    log.name,
    log.serving,
    log.calories,
    log.protein,
    log.carbs,
    log.fat,
    log.source,
    log.confidence,
    log.notes ?? '',
  ].join('|');
}

function toUpsertMutation(log: FoodLog) {
  return {
    mutationId: getMutationId(log.id),
    entity: 'diaryEntry' as const,
    operation: 'upsert' as const,
    clientUpdatedAt:
      log.nutritionSnapshot?.capturedAt ?? new Date().toISOString(),
    payload: {
      clientId: log.id,
      entryDate: log.date,
      meal: log.meal,
      name: log.name,
      serving: log.serving,
      calories: log.calories,
      proteinG: log.protein,
      carbsG: log.carbs,
      fatG: log.fat,
      provenance: log.source,
      confidence: Math.max(0, Math.min(100, Math.round(log.confidence))),
      notes: log.notes ?? null,
    },
  };
}

function toDeleteMutation(logId: string) {
  return {
    mutationId: getMutationId(`del:${logId}`),
    entity: 'diaryEntry' as const,
    operation: 'delete' as const,
    clientUpdatedAt: new Date().toISOString(),
    payload: { clientId: logId },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pushes new and edited diary logs to the server via upsert mutations.
 * Already-synced-and-unchanged logs are skipped. Starter/demo logs are
 * always excluded.
 *
 * Returns the full set of log IDs that have ever been accepted by the server
 * (current session + persisted from prior sessions).
 */
export async function syncDiaryLogs(logs: FoodLog[]): Promise<Set<string>> {
  // Ensure persisted signatures are loaded so unchanged entries that were
  // synced in a previous session are skipped rather than re-batched.
  await ensureSigsLoaded();

  const syncedIds = await loadSyncedIds();

  if (upsertInFlight) return syncedIds;

  const pending = logs.filter((log) => {
    if (isStarterLog(log)) return false;
    return syncedSignatures.get(log.id) !== signature(log);
  });

  if (pending.length === 0) return syncedIds;

  upsertInFlight = true;
  try {
    for (let i = 0; i < pending.length; i += 100) {
      const batch = pending.slice(i, i + 100);
      try {
        const response = await syncOutbox({
          deviceId: 'calora-mobile',
          mutations: batch.map(toUpsertMutation),
        });
        const acceptedSet = new Set(response.accepted);
        for (const log of batch) {
          if (acceptedSet.has(getMutationId(log.id))) {
            syncedSignatures.set(log.id, signature(log));
            syncedIds.add(log.id);
          }
        }
        // Persist both IDs and signatures after each successful batch so
        // partial progress survives an app kill mid-large-sync.
        await persistSyncedIds();
        await persistSyncedSignatures();
      } catch (err) {
        console.warn('[diary-sync] upsert batch failed', err);
      }
    }
  } finally {
    upsertInFlight = false;
  }

  return syncedIds;
}

/**
 * Sends delete mutations for diary log IDs that have been confirmed as
 * server-owned (exist in the persisted synced set) but have since been
 * removed from the local diary.
 *
 * Only IDs that were previously accepted by the server are sent — there is
 * no point deleting a log that never made it to the server.
 */
export async function syncDiaryDeletes(deletedIds: string[]): Promise<void> {
  if (deleteInFlight || deletedIds.length === 0) return;

  const syncedIds = await loadSyncedIds();
  // Only send deletes for IDs that actually reached the server.
  const toDelete = deletedIds.filter((id) => syncedIds.has(id));
  if (toDelete.length === 0) return;

  deleteInFlight = true;
  try {
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      try {
        await syncOutbox({
          deviceId: 'calora-mobile',
          mutations: batch.map(toDeleteMutation),
        });
        // Remove from synced set whether or not the server confirmed:
        // the server DELETE is idempotent (row-not-found is fine).
        for (const id of batch) {
          syncedIds.delete(id);
          syncedSignatures.delete(id);
          logMutationIds.delete(id);
        }
        await persistSyncedIds();
        await persistSyncedSignatures();
      } catch (err) {
        console.warn('[diary-sync] delete batch failed', err);
      }
    }
  } finally {
    deleteInFlight = false;
    // Prune any leftover signature entries whose IDs are gone from the synced
    // set (handles partial batch failures where some deletes succeeded).
    await pruneSignatures(syncedIds);
  }
}

/** Delegates to the batch path for a single log. */
export async function syncDiaryLog(log: FoodLog): Promise<boolean> {
  const ids = await syncDiaryLogs([log]);
  return ids.size > 0;
}

/** Tries to persist current logs. Convenience wrapper used by the first-log flow. */
export async function syncFirstDiaryLog(logs: FoodLog[]): Promise<boolean> {
  const ids = await syncDiaryLogs(logs);
  return ids.size > 0;
}
