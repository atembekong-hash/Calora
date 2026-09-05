/**
 * exportPayload — pure helpers that CaloraContext.exportData and
 * CaloraContext.exportRawStorageData delegate to.
 *
 * Extracting them here makes both helpers testable without mounting React or
 * mocking AsyncStorage at the module level: tests import these functions
 * directly and call them with the same injected StorageAdapter used by
 * PersistenceManager.
 *
 * Schema version is intentionally NOT defined here — CaloraContext passes
 * STORAGE_SCHEMA_VERSION directly to buildExportPayload so there is a single
 * source of truth and no risk of the two constants drifting apart.
 */

// ---------------------------------------------------------------------------
// CaloraExportState
// The exact set of fields that CaloraContext.exportData serialises.
// Using `unknown` for complex domain types keeps this module import-free;
// TypeScript allows assigning any concrete type (Profile, FoodLog[], …) to
// an `unknown` slot at the call site.
// ---------------------------------------------------------------------------
export interface CaloraExportState {
  onboardingComplete: boolean;
  onboardingStep?: number;
  profile: unknown;
  logs: unknown[];
  weights: unknown[];
  waterLogs: Record<string, unknown>;
  moodLogs: Record<string, unknown>;
  activityLogs: Record<string, unknown>;
  activityMinutesLogs: Record<string, unknown>;
  savedMeals: unknown[];
  localRecipes: unknown[];
  savedRecipeIds: string[];
  themePreference: unknown;
  plannerWeekStart: string;
  plannerMeals: unknown[];
  shoppingItems: unknown[];
  foodDrafts: unknown[];
  foodMemories: unknown[];
  repeatPatterns: unknown[];
  memoryCorrections: unknown[];
  livingMemory: unknown;
  hydrationReminders: unknown;
  mealReminders: unknown;
  goalReminder: unknown;
  notificationPreferences: unknown;
  healthConnected: boolean;
  healthConnection: unknown;
  consentAccepted: boolean;
  outbox: unknown[];
  coachConsentAccepted: boolean;
  coachMessages: unknown[];
  goalCelebrationSeenTargetKg: number | null;
  plannerPreferences: unknown;
  fontSizeScale: unknown;
  profilePhotoUri: string | null;
}

/**
 * Serialise the current in-memory state to a JSON string suitable for export /
 * sharing.
 *
 * `schemaVersion` is passed by the caller (CaloraContext's STORAGE_SCHEMA_VERSION)
 * rather than being defined here, so there is no independent constant that
 * could drift out of sync with the persisted-state schema.
 *
 * This is the exact body of CaloraContext.exportData — extracted here so tests
 * can call it directly without mounting React.
 */
export function buildExportPayload(schemaVersion: number, state: CaloraExportState): string {
  return JSON.stringify({ schemaVersion, ...state }, null, 2);
}

/**
 * Read the raw storage bytes for a given key.  Returns null when the key is
 * absent (e.g. after a clear) or when the storage is genuinely empty.
 *
 * This is the exact body of CaloraContext.exportRawStorageData — extracted here
 * so tests can call it directly using the injected StorageAdapter's getItem.
 */
export async function readRawStorageData(
  getItem: (key: string) => Promise<string | null>,
  key: string,
): Promise<string | null> {
  return getItem(key);
}
