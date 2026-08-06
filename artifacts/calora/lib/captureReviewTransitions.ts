/**
 * Pure state-transition functions extracted from CaloraContext for the capture review flow.
 *
 * These functions are the production implementation of "approve", "reject", and
 * "repeat-pattern tracking". Keeping them pure (no React setState, no Date.now() calls
 * without injection) makes them unit-testable and keeps CaloraContext thin.
 */

import { memorySignature } from './foodMemory';
import type {
  AcceptedFoodMemory,
  FoodMemoryDraft,
  RepeatPattern,
} from './foodMemory';

// Re-export the FoodSource type so callers share one definition.
export type FoodSource =
  | 'USDA verified'
  | 'Barcode verified'
  | 'Photo estimate'
  | 'Recipe'
  | 'Manual';

export type FoodLog = {
  id: string;
  name: string;
  date: string;
  meal: FoodMemoryDraft['meal'];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodSource;
  confidence: number;
  time: string;
  serving: string;
  notes?: string;
  memoryId?: string;
  nutritionSnapshot?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    capturedAt: string;
  };
};

// ---------------------------------------------------------------------------
// foodSourceForMemory
// ---------------------------------------------------------------------------

/**
 * Maps a FoodMemoryProvenance to the FoodSource string stored on the diary log.
 * This function is the canonical mapping — change it here to change it everywhere.
 */
export function foodSourceForMemory(
  provenance: AcceptedFoodMemory['provenance'],
): FoodSource {
  if (provenance === 'verified_barcode') return 'Barcode verified';
  if (provenance === 'verified_provider' || provenance === 'verified_label') return 'USDA verified';
  if (provenance === 'recipe_imported' || provenance === 'recipe_personal') return 'Recipe';
  if (provenance === 'manual') return 'Manual';
  return 'Photo estimate';
}

// ---------------------------------------------------------------------------
// buildAcceptResult
// ---------------------------------------------------------------------------

/**
 * Builds the { log, memory } pair produced by accepting a food memory draft.
 *
 * Callers supply the pre-generated `logId` and `acceptedAt` timestamp so the
 * function remains deterministic (no Date.now() or randomness inside).
 */
export function buildAcceptResult(
  draft: FoodMemoryDraft,
  logId: string,
  acceptedAt: string,
): { log: FoodLog; memory: AcceptedFoodMemory } {
  const snapshot = { ...draft.nutrition, capturedAt: acceptedAt };
  const serving =
    draft.components
      .filter((c) => c.included)
      .map((c) => c.serving)
      .join(' + ') || '1 serving';

  const log: FoodLog = {
    id: logId,
    name: draft.title,
    date: draft.date,
    meal: draft.meal,
    calories: snapshot.calories,
    protein: snapshot.proteinG,
    carbs: snapshot.carbsG,
    fat: snapshot.fatG,
    source: foodSourceForMemory(draft.provenance),
    confidence: draft.confidence,
    time: 'Just now',
    serving,
    notes: `${draft.sourceLabel} · Review approved`,
    memoryId: draft.id,
    nutritionSnapshot: snapshot,
  };

  const memory: AcceptedFoodMemory = {
    ...draft,
    status: 'accepted',
    nutrition: snapshot,
    updatedAt: acceptedAt,
    acceptedAt,
    diaryLogId: logId,
  };

  return { log, memory };
}

// ---------------------------------------------------------------------------
// buildRejectDraft
// ---------------------------------------------------------------------------

/**
 * Returns a copy of the draft with `status` set to `'rejected'` and `updatedAt`
 * set to the supplied timestamp. Does NOT insert a diary log — rejection is a
 * pure status change.
 */
export function buildRejectDraft(
  draft: FoodMemoryDraft,
  rejectedAt: string,
): FoodMemoryDraft {
  return { ...draft, status: 'rejected', updatedAt: rejectedAt };
}

// ---------------------------------------------------------------------------
// updateRepeatPatterns
// ---------------------------------------------------------------------------

/**
 * Returns the next `repeatPatterns` array after recording that `memory` was accepted.
 *
 * - If a pattern with the same signature already exists, its `useCount` is incremented.
 * - Otherwise a new pattern is created.
 *
 * Callers supply `repeatId` (used only when creating a new pattern) and `acceptedAt`.
 */
export function updateRepeatPatterns(
  patterns: RepeatPattern[],
  memory: AcceptedFoodMemory,
  log: FoodLog,
  repeatId: string,
  acceptedAt: string,
): RepeatPattern[] {
  const signature = memorySignature(memory);
  const existing = patterns.find((p) => p.signature === signature);

  if (existing) {
    return patterns.map((p) =>
      p.signature === signature
        ? { ...p, useCount: p.useCount + 1, lastAcceptedAt: acceptedAt, sourceMemoryId: memory.id }
        : p,
    );
  }

  return [
    ...patterns,
    {
      id: repeatId,
      signature,
      title: memory.title,
      componentNames: memory.components
        .filter((c) => c.included)
        .map((c) => c.name),
      serving: log.serving,
      useCount: 1,
      rejectedCount: 0,
      lastAcceptedAt: acceptedAt,
      sourceMemoryId: memory.id,
    },
  ];
}

// ---------------------------------------------------------------------------
// deriveThemeMode
// ---------------------------------------------------------------------------

/**
 * Derives the active colour scheme from the user's preference and the OS setting.
 * Extracted here so the same logic can be tested without mounting the React provider.
 */
export function deriveThemeMode(
  themePreference: 'system' | 'light' | 'dark',
  systemScheme: 'light' | 'dark',
): 'light' | 'dark' {
  if (themePreference === 'system') return systemScheme;
  return themePreference;
}
