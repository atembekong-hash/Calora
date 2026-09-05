/**
 * performClearAllData — extracted from CaloraContext.clearAllData so the
 * sequence (await pm.clear → call every state setter) can be tested without
 * mounting React.
 *
 * In production, each `setter` is the corresponding React useState dispatcher
 * from CaloraProvider. After those dispatchers fire, React re-renders and the
 * autosave useEffect picks up the new (cleared) state and calls
 * pm.enqueueWrite(clearedCaloraState).
 *
 * In tests, each setter is a lightweight spy that records the cleared value.
 * The test then calls pm.enqueueWrite(capturedState) itself to simulate the
 * autosave, and asserts on the final storage content.
 */

import type { PersistenceManager } from './persistenceManager';
import type { LivingMemory } from './livingMemory';
import type { HydrationReminderPrefs } from './hydrationReminders';

export type ClearAllDataFailureKind = 'core-clear-failed' | 'partial-cleanup';

/** Error surfaced by the provider so UI copy can accurately describe the outcome. */
export class ClearAllDataError extends Error {
  constructor(
    public readonly kind: ClearAllDataFailureKind,
    public readonly cleanupFailures: string[] = [],
    options?: { cause?: unknown },
  ) {
    super(kind === 'core-clear-failed'
      ? 'Core personal data could not be deleted.'
      : 'Personal data was deleted, but some device cleanup did not finish.',
    options);
    this.name = 'ClearAllDataError';
  }
}

/** Default hydration-reminder preferences — shared between CaloraContext and tests. */
export const DEFAULT_HYDRATION_PREFS: HydrationReminderPrefs = {
  enabled: false,
  wakeHour: 7,
  wakeMinute: 0,
  sleepHour: 22,
  sleepMinute: 0,
  intervalHours: 2,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Setter = (value: any) => void;

/**
 * All dependencies clearAllData needs, injected so the function is testable
 * without React or AsyncStorage.
 */
export interface ClearAllDataCtx {
  pm: PersistenceManager;
  /** Returned value of emptyLivingMemory() — passed in to avoid an import cycle. */
  emptyLivingMemory: LivingMemory;
  defaultHydrationPrefs: HydrationReminderPrefs;
  /**
   * Returns the Monday date-key for the current week (YYYY-MM-DD).
   * Injected so tests can supply a deterministic date without mocking globals.
   * In production this is the `getPlannerWeekStart` function from data/planner.ts.
   */
  getPlannerWeekStart: () => string;
  /**
   * Returns today's date-key (YYYY-MM-DD).
   * Injected so tests can supply a deterministic date without mocking globals.
   * In production this is the `dateKey` function from lib/dates.ts.
   */
  getToday: () => string;
  // State setters — in production these are React useState dispatchers
  setOnboardingComplete: Setter;
  setOnboardingStep?: Setter;
  setProfile: Setter;
  setLogs: Setter;
  setWeights: Setter;
  setWaterLogs: Setter;
  setMoodLogs: Setter;
  setActivityLogs: Setter;
  setActivityMinutesLogs: Setter;
  setSavedMeals: Setter;
  setLocalRecipes: Setter;
  setSavedRecipeIds: Setter;
  setConsentAccepted: Setter;
  setOutbox: Setter;
  setPlannerWeekStart: Setter;
  setPlannerMeals: Setter;
  setShoppingItems: Setter;
  setFoodDrafts: Setter;
  setFoodMemories: Setter;
  setRepeatPatterns: Setter;
  setMemoryCorrections: Setter;
  setLivingMemory: Setter;
  setHydrationReminders: Setter;
  setCoachConsentAccepted: Setter;
  setCoachMessages: Setter;
  setGoalCelebrationSeenTargetKg: Setter;
  /** Resets the session-only planner viewed day so it is consistent with the reset week. */
  setPlannerViewedDay: Setter;
  /** Resets the session-only slot-browse context so no stale slot target persists after a clear. */
  setRecipeSlotTarget: Setter;
  /** Resets the session-only undo-swap context so no stale swap offer persists after a clear. */
  setPendingUndoSwap: Setter;
  /** Resets the session-only planner-ack banner so no stale acknowledgment persists after a clear. */
  setPendingPlannerAck: Setter;
  /** Resets the persisted plan type preference so the user must re-select after clearing. */
  setPlannerPreferences: Setter;
}

/**
 * Execute the clearAllData lifecycle:
 * 1. Await pm.clear() so the storage removeItem runs after any pending write.
 * 2. Call every state setter with its cleared default value.
 *
 * After this function resolves, the React autosave effect will fire and call
 * pm.enqueueWrite(clearedCaloraState) — that write is the final operation that
 * wins as the last writer in storage.
 */
export async function performClearAllData(ctx: ClearAllDataCtx): Promise<void> {
  await ctx.pm.clear();
  ctx.setLogs([]);
  ctx.setWeights([]);
  ctx.setWaterLogs({});
  ctx.setMoodLogs({});
  ctx.setActivityLogs({});
  ctx.setActivityMinutesLogs({});
  ctx.setSavedMeals([]);
  ctx.setLocalRecipes([]);
  ctx.setSavedRecipeIds([]);
  ctx.setProfile(null);
  ctx.setOnboardingComplete(false);
  ctx.setOnboardingStep?.(0);
  ctx.setConsentAccepted(false);
  ctx.setOutbox([]);
  // Reset to the current week so the planner opens on the right week after a
  // fresh start, regardless of which week the user had navigated to before clearing.
  ctx.setPlannerWeekStart(ctx.getPlannerWeekStart());
  // Reset the session-only viewed day to today so it is consistent with the
  // week that was just reset above. Without this, a user who navigated to a
  // future/past day before clearing would still see that day highlighted even
  // though plannerWeekStart has jumped back to the current week.
  ctx.setPlannerViewedDay(ctx.getToday());
  // Reset session-only slot-browse, undo-swap, and ack-banner state so stale
  // planner context from before the clear cannot resurface in the fresh empty planner.
  ctx.setRecipeSlotTarget(null);
  ctx.setPendingUndoSwap(null);
  ctx.setPendingPlannerAck(null);
  ctx.setPlannerMeals([]);
  ctx.setShoppingItems([]);
  ctx.setFoodDrafts([]);
  ctx.setFoodMemories([]);
  ctx.setRepeatPatterns([]);
  ctx.setMemoryCorrections([]);
  ctx.setLivingMemory(ctx.emptyLivingMemory);
  ctx.setHydrationReminders(ctx.defaultHydrationPrefs);
  ctx.setCoachConsentAccepted(false);
  ctx.setCoachMessages([]);
  ctx.setGoalCelebrationSeenTargetKg(null);
  ctx.setPlannerPreferences(null);
}
