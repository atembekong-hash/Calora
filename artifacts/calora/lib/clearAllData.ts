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
  // State setters — in production these are React useState dispatchers
  setOnboardingComplete: Setter;
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
  ctx.setConsentAccepted(false);
  ctx.setOutbox([]);
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
}
