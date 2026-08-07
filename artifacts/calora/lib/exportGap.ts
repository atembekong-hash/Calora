/**
 * exportGap — production helpers for the mid-clear async export gap.
 *
 * There is a brief async window inside CaloraContext.clearAllData:
 *
 *   1. performClearAllData() is called.
 *   2. It awaits pm.clear() → removeItem executes; storage key is gone.
 *   3. Every React state setter is called → React SCHEDULES a re-render.
 *   4. exportSnapshotRef.current = makeClearedExportSnapshot(…)   ← step 4
 *   ── gap starts ──────────────────────────────────────────────────────────
 *   5. React commits the re-render → closed-over state vars update.
 *   ── gap ends ────────────────────────────────────────────────────────────
 *
 * During the gap, closed-over state vars in CaloraContext still hold the
 * pre-clear (stale) values.  The two extracted functions here are what
 * CaloraContext actually calls — extracting them makes both the snapshot
 * content and the `snap ?? closedOver` priority testable without mounting
 * the full provider.
 *
 * Analogy: this file plays the same role for the export gap that
 * lib/clearAllData.ts plays for the state-setter sequence.
 */

import { buildExportPayload, type CaloraExportState } from './exportPayload';
import { emptyLivingMemory } from './livingMemory';
import { DEFAULT_HYDRATION_PREFS } from './clearAllData';

// ---------------------------------------------------------------------------
// makeClearedExportSnapshot
// ---------------------------------------------------------------------------

export interface ClearExportSnapshotOpts {
  /** Current planner week start — preserved so the export reflects the reset week. */
  getPlannerWeekStart: () => string;
  /**
   * Device-level health connection flag — NOT reset by clearAllData (the user's
   * health app pairing survives a data clear).  Preserved from closed-over state.
   */
  healthConnected: boolean;
  // NOTE: hydrationReminders is intentionally NOT a parameter.  clearAllData
  // resets hydration preferences to DEFAULT_HYDRATION_PREFS, so the snapshot
  // must always contain the default, never the stale pre-clear closed-over value.
  // Owning this invariant here prevents callers from accidentally passing the
  // stale closed-over value and leaking custom reminders through the gap.
}

/**
 * Build the cleared-state export snapshot that CaloraContext.clearAllData
 * assigns to exportSnapshotRef synchronously at step 4 of the gap sequence.
 *
 * This is the EXACT payload that exportData returns during the gap.
 * Extracting it here allows tests to verify every field without mounting
 * the full CaloraProvider.
 *
 * CaloraContext.clearAllData calls:
 *   exportSnapshotRef.current = makeClearedExportSnapshot({ … });
 */
export function makeClearedExportSnapshot(opts: ClearExportSnapshotOpts): CaloraExportState {
  return {
    profile:              null,
    logs:                 [],
    weights:              [],
    waterLogs:            {},
    moodLogs:             {},
    activityLogs:         {},
    activityMinutesLogs:  {},
    savedMeals:           [],
    localRecipes:         [],
    savedRecipeIds:       [],
    plannerWeekStart:     opts.getPlannerWeekStart(),
    plannerMeals:         [],
    shoppingItems:        [],
    foodDrafts:           [],
    foodMemories:         [],
    repeatPatterns:       [],
    memoryCorrections:    [],
    livingMemory:         emptyLivingMemory(),
    // Always use the default — never the stale pre-clear closed-over value.
    hydrationReminders:   DEFAULT_HYDRATION_PREFS,
    healthConnected:      opts.healthConnected,
    consentAccepted:      false,
    coachConsentAccepted: false,
    coachMessages:        [],
  };
}

// ---------------------------------------------------------------------------
// resolveExportData
// ---------------------------------------------------------------------------

/**
 * The body of CaloraContext.exportData, extracted so it can be tested without
 * mounting the provider.
 *
 * Priority: exportSnapshotRef.current (the gap-bridge) wins over the live
 * closed-over state.  The ref is non-null only during the gap (set
 * synchronously by clearAllData at step 4; cleared by the autosave effect
 * at step 5 once React state has committed).
 *
 * CaloraContext.exportData calls:
 *   return resolveExportData(exportSnapshotRef, { profile, logs, … }, STORAGE_SCHEMA_VERSION);
 *
 * MUTATION SENSITIVITY: reversing the priority to `closedOver ?? snap` would
 * return stale pre-clear state during the gap.  Tests that call this function
 * with a non-null ref and stale closedOverState will fail if the priority is
 * wrong.
 */
export function resolveExportData(
  exportSnapshotRef: { current: CaloraExportState | null },
  closedOverState: CaloraExportState,
  schemaVersion: number,
): string {
  const snap = exportSnapshotRef.current;
  // snap ?? closedOver — the ref wins during the gap (see step 4 above).
  return buildExportPayload(schemaVersion, snap ?? closedOverState);
}
