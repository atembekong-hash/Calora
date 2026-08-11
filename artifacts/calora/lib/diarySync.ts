/**
 * Minimal durable diary sync used by referral qualification.
 *
 * Calora remains local-first: an unsuccessful sync never blocks a meal from
 * appearing locally. This helper only reports which existing local entries
 * have reached the authenticated server so referral activation can wait for
 * evidence the server can independently verify.
 */
import { createDiaryEntry } from '@workspace/api-client-react';
import type { FoodLog } from '@/context/CaloraContext';

const syncedIds = new Set<string>();
const syncingIds = new Map<string, Promise<boolean>>();

function provenanceForSync(source: FoodLog['source']) {
  return source;
}

function toPayload(log: FoodLog) {
  return {
    entryDate: log.date,
    meal: log.meal,
    name: log.name,
    serving: log.serving,
    calories: log.calories,
    proteinG: log.protein,
    carbsG: log.carbs,
    fatG: log.fat,
    provenance: provenanceForSync(log.source),
    confidence: Math.max(0, Math.min(100, Math.round(log.confidence))),
    clientUpdatedAt: log.nutritionSnapshot?.capturedAt ?? new Date().toISOString(),
    notes: log.notes ?? null,
  };
}

/**
 * Synchronizes one confirmed local entry at most once per app process.
 * A failed request is deliberately not cached, allowing a later retry.
 */
export async function syncDiaryLog(log: FoodLog): Promise<boolean> {
  if (syncedIds.has(log.id)) return true;
  const inFlight = syncingIds.get(log.id);
  if (inFlight) return inFlight;

  const request = createDiaryEntry(toPayload(log))
    .then(() => {
      syncedIds.add(log.id);
      return true;
    })
    .catch((err) => {
      console.warn('[diary-sync] entry sync failed', err);
      return false;
    })
    .finally(() => {
      syncingIds.delete(log.id);
    });

  syncingIds.set(log.id, request);
  return request;
}

/** Tries to persist current logs until at least one server-owned entry exists. */
export async function syncFirstDiaryLog(logs: FoodLog[]): Promise<boolean> {
  for (const log of logs) {
    if (await syncDiaryLog(log)) return true;
  }
  return false;
}