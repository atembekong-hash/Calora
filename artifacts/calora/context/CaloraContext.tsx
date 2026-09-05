import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { shouldAutosave, type HydrationErrorKind } from '@/lib/hydrationGuard';
import { STORAGE_SCHEMA_VERSION, enqueueAutosave } from '@/lib/storageSchema';
import { useHydrationEffect } from '@/lib/useHydrationEffect';
import { PersistenceManager } from '@/lib/persistenceManager';
import { performClearAllData, DEFAULT_HYDRATION_PREFS, ClearAllDataError } from '@/lib/clearAllData';
import { verifyProfilePhotoExists, deleteProfilePhoto } from '@/lib/profilePhotoStorage';
import { buildExportPayload, readRawStorageData, type CaloraExportState } from '@/lib/exportPayload';
import { makeClearedExportSnapshot } from '@/lib/exportGap';
import { normalizeHealthConnection } from '@/lib/healthConnection';
import { healthService } from '@/lib/health/healthService';
import { EMPTY_HEALTH_CONNECTION, type HealthConnection, type HealthSnapshot } from '@/lib/health/types';
import { AppState, useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import type { CoachMessage, PlannerMeal } from '@workspace/api-client-react';
import type { HydrationReminderPrefs } from '@/lib/hydrationReminders';
import { type MealReminderPrefs, DEFAULT_MEAL_REMINDER_PREFS } from '@/lib/mealReminders';
import { type GoalReminderPrefs, DEFAULT_GOAL_REMINDER_PREFS } from '@/lib/goalReminder';
import { buildShoppingItems, createStarterPlannerMeals, getPlannerWeekStart, normalizePlannerMealImageIdentities, shoppingChecksByName, shoppingNameKey } from '@/data/planner';
import {
  type AcceptedFoodMemory,
  type FoodMemoryCorrection,
  type FoodMemoryDraft,
  type FoodMemoryComponent,
  type RepeatPattern,
  captureAnalysisToDraft,
  memorySignature,
  migrateFoodMemories,
  nutritionForComponents,
  plannerMealToDraft,
  provenanceForCapture,
  recipeToDraft,
  sourceComponentsToDraft,
  updateDraftComponents,
} from '@/lib/foodMemory';
import {
  buildAcceptResult,
  buildRejectDraft,
  updateRepeatPatterns,
} from '@/lib/captureReviewTransitions';
import type { CaptureAnalysis } from '@workspace/api-client-react';
import { dateKey, formatLogTime } from '@/lib/dates';
import { deriveLivingState, type LivingState } from '@/lib/livingState';
import { useClock } from '@/lib/useClock';
import {
  buildLivingMemory,
  emptyLivingMemory,
  mergeLivingMemory,
  removeMealObservation,
  replacePlannerObservations,
  forgetLivingObservation as forgetMemoryObservation,
  upsertActivityObservation,
  upsertMealObservation,
  upsertMoodObservation,
  upsertWaterObservation,
  filterForgottenSources,
  type LivingMemory,
} from '@/lib/livingMemory';
import type { PlannerAck } from '@/lib/plannerAck';
import { normalizePlannerPreferences } from '@/lib/planType';
import { quarantineLegacyStorage, storageKeyForAccount } from '@/lib/accountStorage';
import { EncryptedStorageAdapter } from '@/lib/encryptedStorage';
import { secureStoreKeyAdapter } from '@/lib/secureStoreKeyAdapter';
import {
  buildDailyIntelligenceFacts,
  createIntelligenceContext,
  isIntelligenceFeatureEnabled,
  selectPostLogInsight,
  type PostLogInsight,
} from '@/lib/intelligence';
import { coachFactConsentCache, CoachFactRequestLifecycle, invalidateAllCoachLifecycleEpochs } from '@/lib/intelligence';
import {
  normalizeFoodImageMetadata,
  normalizeFoodImageUrl,
  type FoodImageSource,
} from '@/lib/foodImageMetadata';
import { recordDiaryDelete } from '@/lib/diarySync';
import {
  DEFAULT_LOCAL_NOTIFICATION_PREFERENCES,
  legacyReminderMirrors,
  normalizeNotificationPreferences,
  type LocalNotificationPreferences,
} from '@/lib/notificationPreferences';
import {
  cancelNotificationPlanForClear,
  reconcileHydratedNotificationPlan,
} from '@/lib/notificationLifecycle';

export type HealthSyncOutcome =
  | { status: 'synced'; syncedAt: string }
  | { status: 'skipped'; message: string }
  | { status: 'failed'; message: string };
import { clearNotificationInbox } from '@/lib/notificationInbox';
export type { PlannerPreferences, PlanTypeId } from '@/lib/planType';
export type ThemePreference = 'system' | 'light' | 'dark';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type DietPreference = 'Everything' | 'Vegetarian' | 'Vegan' | 'High protein';
export type FoodSource = 'USDA verified' | 'Brand verified' | 'Barcode verified' | 'Photo estimate' | 'Manual' | 'Recipe';

export type FoodLog = {
  id: string;
  /** Stable last-write timestamp used by cross-device diary reconciliation. */
  syncUpdatedAt?: string;
  /**
   * Server-issued capture session id (UUID) inherited from a capture-backed
   * draft. Only logs carrying this can anchor the referral first-log sync.
   */
  captureSessionId?: string;
  name: string;
  date: string;
  meal: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  source: FoodSource;
  confidence: number;
  time: string;
  serving: string;
  preparation?: string;
  notes?: string;
  memoryId?: string;
  plannerMealId?: string;
  sourceRecipeId?: string;
  /** Stable bundled identity for curated food imagery; never sent as a remote URL. */
  imageAssetKey?: string;
  imageUrl?: string;
  imageSource?: FoodImageSource;
  nutritionSnapshot?: { calories: number; proteinG: number; carbsG: number; fatG: number; capturedAt: string };
};

export type WeightEntry = { id: string; date: string; kg: number; source: 'manual' | 'health' };
export type Mood = 'energized' | 'good' | 'okay' | 'low' | 'stressed';
export type WaterLog = Record<string, number>;
export type MoodLog = Record<string, Mood>;
export type DailyActivity = 'rest' | 'light' | 'moderate' | 'high';
export type ActivityLog = Record<string, DailyActivity>;
export type ActivityMinutesLog = Record<string, number>;
export type SavedMeal = { id: string; name: string; kind: 'meal' | 'recipe'; foodIds: string[]; calories: number; protein: number; carbs: number; fat: number };
export type CaloraRecipe = {
  id: string;
  name: string;
  image?: string | null;
  /** Private generated-photo reference. The signed display URL can be renewed safely. */
  imageId?: string | null;
  imageUrlExpiresAt?: string | null;
  imageStatus?: 'pending' | 'ready' | 'failed';
  category?: string | null;
  area?: string | null;
  description?: string | null;
  instructions?: string | null;
  ingredients: string[];
  tags: string[];
  prepMinutes?: number | null;
  servings?: number | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  source: string;
  sourceUrl: string;
  isLocal?: boolean;
  /** Optional source metadata; older locally persisted recipes safely omit these. */
  sourceType?: import('@/lib/recipeModel').RecipeSourceType;
  sourceProvider?: string;
  sourceId?: string;
  nutritionConfidence?: import('@/lib/recipeModel').NutritionConfidence;
  nutritionSource?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type ShoppingItem = { id: string; name: string; quantity: number; checked: boolean; sourceMealIds?: string[]; days?: string[]; recipeSource?: boolean };

export type Profile = {
  name: string;
  goal: Goal;
  activity: ActivityLevel;
  diet: DietPreference;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  age: number;
  calorieTarget: number;
  proteinTargetGrams?: number;
  carbsTargetGrams?: number;
  fatTargetGrams?: number;
  /** Missing on older installs; legacy targets are always treated as custom. */
  targetMode?: 'automatic' | 'custom';
  units?: 'metric' | 'imperial';
};

export type SyncState = 'offline' | 'local' | 'synced' | 'needs-connection';
export type OutboxMutation = {
  id: string;
  entity: 'profile' | 'diaryEntry' | 'weight' | 'savedMeal' | 'settings';
  operation: 'upsert' | 'delete';
  createdAt: string;
};


type CaloraState = {
  schemaVersion?: number;
  onboardingComplete: boolean;
  onboardingStep?: number;
  profile: Profile | null;
  logs: FoodLog[];
  weights: WeightEntry[];
  waterLogs: WaterLog;
  moodLogs: MoodLog;
  activityLogs: ActivityLog;
  activityMinutesLogs?: ActivityMinutesLog;
  savedMeals: SavedMeal[];
  localRecipes: CaloraRecipe[];
  savedRecipeIds: string[];
  themePreference: ThemePreference;
  healthConnected: boolean;
  healthConnection?: HealthConnection;
  consentAccepted: boolean;
  outbox: OutboxMutation[];
  plannerWeekStart: string;
  plannerMeals: PlannerMeal[];
  shoppingItems: ShoppingItem[];
  foodDrafts: FoodMemoryDraft[];
  foodMemories: AcceptedFoodMemory[];
  repeatPatterns: RepeatPattern[];
  memoryCorrections: FoodMemoryCorrection[];
  hydrationReminders: HydrationReminderPrefs;
  mealReminders?: MealReminderPrefs;
  goalReminder?: GoalReminderPrefs;
  notificationPreferences?: LocalNotificationPreferences;
  coachConsentAccepted: boolean;
  coachMessages: CoachMessage[];
  livingMemory?: LivingMemory;
  /** The target weight (kg) for which the goal-reached celebration has already been shown. Prevents repeat on reload. */
  goalCelebrationSeenTargetKg?: number;
  /** Persisted planner plan-type preferences. null means the user has not yet selected a plan type. */
  plannerPreferences?: import('@/lib/planType').PlannerPreferences | null;
  fontSizeScale?: 'small' | 'default' | 'large' | 'xlarge';
  profilePhotoUri?: string;
};

function normalizeLogImageMetadata(log: FoodLog): FoodLog {
  const recordedAt = log.syncUpdatedAt ?? log.nutritionSnapshot?.capturedAt;
  return {
    ...log,
    time: log.time === 'Just now' && recordedAt
      ? formatLogTime(new Date(recordedAt))
      : log.time,
    ...normalizeFoodImageMetadata(log.imageUrl, log.imageSource),
  };
}

const ONBOARDING_STEP_COUNT = 7;

function normalizeOnboardingStep(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(ONBOARDING_STEP_COUNT - 1, Math.max(0, Math.floor(value)));
}

function normalizeMemoryImageMetadata<T extends FoodMemoryDraft>(memory: T): T {
  return {
    ...memory,
    ...normalizeFoodImageMetadata(memory.imageUrl, memory.imageSource),
    components: memory.components.map((component) => ({
      ...component,
      imageUrl: normalizeFoodImageUrl(component.imageUrl),
    })),
  };
}

type CaloraContextValue = {
  logs: FoodLog[];
  weights: WeightEntry[];
  waterLogs: WaterLog;
  moodLogs: MoodLog;
  activityLogs: ActivityLog;
  activityMinutesLogs: ActivityMinutesLog;
  savedMeals: SavedMeal[];
  localRecipes: CaloraRecipe[];
  savedRecipeIds: string[];
  profile: Profile | null;
  onboardingComplete: boolean;
  onboardingStep: number;
  hydrated: boolean;
  hydrationError: string | null;
  hydrationErrorKind: HydrationErrorKind | null;
  themePreference: ThemePreference;
  mode: 'light' | 'dark';
  colors: typeof colors.light;
  syncState: SyncState;
  pendingMutations: OutboxMutation[];
  applySyncedDiaryLogs: (logs: FoodLog[]) => void;
  healthConnected: boolean;
  healthConnection: HealthConnection;
  hydrationReminders: HydrationReminderPrefs;
  mealReminders: MealReminderPrefs;
  goalReminder: GoalReminderPrefs;
  notificationPreferences: LocalNotificationPreferences;
  /**
   * True only after this account/guest scope has completed a non-failing,
   * serialized native notification reconciliation. Notification capture must
   * not cross this privacy boundary.
   */
  notificationScopeReady: boolean;
  fontScale: number;
  fontSizeScale: 'small' | 'default' | 'large' | 'xlarge';
  setFontSizeScale: (scale: 'small' | 'default' | 'large' | 'xlarge') => void;
  profilePhotoUri: string | null;
  setProfilePhotoUri: (uri: string | null) => void;
  /** Delete the profile photo file from disk and clear its URI from state. Call on sign-out. */
  clearProfilePhoto: () => Promise<void>;
  coachConsentAccepted: boolean;
  coachMessages: CoachMessage[];
  livingState: LivingState;
  livingMemory: LivingMemory;
  /** The day currently viewed in the Planner (session only, not persisted). */
  plannerViewedDay: string;
  setPlannerViewedDay: (day: string) => void;
  /** Slot context set by the Planner when the user taps "Browse Recipes" on an empty slot. */
  recipeSlotTarget: { day: string; mealType: PlannerMeal['meal'] } | null;
  setRecipeSlotTarget: (target: { day: string; mealType: PlannerMeal['meal'] } | null) => void;
  /**
   * Set by the Recipes screen when a recipe replaces an existing planned meal.
   * The Planner consumes this on focus to offer a brief undo window.
   * Session-only — not persisted to storage.
   */
  pendingUndoSwap: { newMeal: PlannerMeal; originalMeal: PlannerMeal } | null;
  setPendingUndoSwap: (swap: { newMeal: PlannerMeal; originalMeal: PlannerMeal } | null) => void;
  /**
   * Set by the Recipes screen when a recipe fills an empty planner slot (no displaced meal).
   * The Planner consumes this on focus to show a plain save acknowledgment without an Undo action.
   * Session-only — not persisted to storage.
   * Carries the mealId so the Planner can guard against showing a stale banner when the
   * referenced meal has since been removed (e.g. by a concurrent clearAllData).
   */
  pendingPlannerAck: PlannerAck | null;
  setPendingPlannerAck: (ack: PlannerAck | null) => void;
  /** Ephemeral only: a single sanitized post-log transition for the active account. */
  postLogInsight: PostLogInsight | null;
  clearPostLogInsight: () => void;
  forgetLivingObservation: (kind: 'meal' | 'water' | 'mood' | 'activity' | 'planner', id: string) => void;
  setCoachConsentAccepted: (accepted: boolean) => void;
  setCoachMessages: (messages: CoachMessage[]) => void;
  clearCoachHistory: () => void;
  setHydrationReminders: (prefs: HydrationReminderPrefs) => void;
  setMealReminders: (prefs: MealReminderPrefs) => void;
  setGoalReminder: (prefs: GoalReminderPrefs) => void;
  setNotificationPreferences: (prefs: LocalNotificationPreferences) => void;
  updateNotificationPreferences: (
    updater: (current: LocalNotificationPreferences) => LocalNotificationPreferences,
  ) => LocalNotificationPreferences;
  deleteSavedMeal: (id: string) => void;
  addLog: (log: Omit<FoodLog, 'id'>) => void;
  updateLog: (id: string, patch: Partial<FoodLog>) => void;
  removeLog: (id: string) => void;
  addWeight: (kg: number, source?: WeightEntry['source']) => void;
  removeWeight: (id: string) => void;
  updateWeight: (id: string, kg: number) => void;
  addWater: (date: string, ounces?: number) => void;
  setMood: (date: string, mood: Mood) => void;
  setActivity: (date: string, activity: DailyActivity) => void;
  setActivityMinutes: (date: string, minutes: number) => void;
  saveMeal: (meal: Omit<SavedMeal, 'id'>) => void;
  saveRecipe: (recipe: Omit<CaloraRecipe, 'id'>) => CaloraRecipe;
  updateRecipe: (recipeId: string, patch: Partial<Omit<CaloraRecipe, 'id'>>) => void;
  toggleSavedRecipe: (recipeId: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: (profile: Profile, consentAccepted: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setHealthConnected: (connected: boolean) => void;
  connectHealth: () => Promise<HealthConnection>;
  syncHealth: () => Promise<HealthSyncOutcome>;
  disconnectHealth: () => void;
  clearOutbox: () => void;
  exportData: () => Promise<string>;
  exportRawStorageData: () => Promise<string | null>;
  clearAllData: () => Promise<void>;
  isClearing: boolean;
  retryHydration: () => void;
  /** True while a retry read is in flight — drives disabled/loading state on the error screen's 'Try Again' button. */
  isRetrying: boolean;
  /** The target weight (kg) for which the goal celebration was already displayed. Null means it hasn't been shown yet. */
  goalCelebrationSeenTargetKg: number | null;
  /** Call once when the celebration banner is first shown so it won't appear again on reload. */
  markGoalCelebrationSeen: (targetKg: number) => void;
  /**
   * Reset the celebration seen flag to null so the celebration can replay if the user
   * re-crosses their goal after previously going above it. Call when goalReached transitions
   * from true → false (genuine drift above goal) with showGoalProgress in place.
   */
  resetGoalCelebrationSeen: () => void;
  plannerWeekStart: string;
  plannerMeals: PlannerMeal[];
  /** Session-only revision used to protect async planner writes from stale state. */
  plannerRevision: number;
  plannerPreferences: import('@/lib/planType').PlannerPreferences | null;
  setPlannerPreferences: (prefs: import('@/lib/planType').PlannerPreferences | null) => void;
  /**
   * Latest-state functional update — required for async completions (e.g. a
   * finished generation recording provenance) so they merge into whatever the
   * user has selected since, instead of overwriting it with a stale snapshot.
   */
  updatePlannerPreferences: (
    updater: (prev: import('@/lib/planType').PlannerPreferences | null) => import('@/lib/planType').PlannerPreferences | null,
  ) => void;
  shoppingItems: ShoppingItem[];
  foodDrafts: FoodMemoryDraft[];
  foodMemories: AcceptedFoodMemory[];
  repeatPatterns: RepeatPattern[];
  createFoodMemoryDraft: (analysis: CaptureAnalysis, date?: string, meal?: MealType) => FoodMemoryDraft;
  createFoodMemorySourceDraft: (input: Parameters<typeof sourceComponentsToDraft>[0]) => FoodMemoryDraft;
  createRecipeDraft: (recipe: { id: string; name: string; calories?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; source: string; isLocal?: boolean; image?: string | null }, date?: string, meal?: MealType) => FoodMemoryDraft;
  createPlannerDraft: (meal: PlannerMeal) => FoodMemoryDraft;
  updateFoodMemoryDraft: (draftId: string, components: FoodMemoryComponent[]) => void;
  acceptFoodMemory: (draftId: string, draftOverride?: FoodMemoryDraft) => FoodLog | null;
  rejectFoodMemory: (draftId: string) => void;
  teachRepeatMemory: (memoryId: string) => void;
  setPlannerMeals: (weekStart: string, meals: PlannerMeal[]) => void;
  updatePlannerMeals: (meals: PlannerMeal[]) => void;
  movePlannerMeal: (mealId: string, day: string, copy: boolean) => void;
  toggleShoppingItem: (itemId: string) => void;
  toggleShoppingItemByName: (name: string) => void;
  addIngredientsToShopping: (ingredients: string[], sourceId: string) => void;
};

const today = dateKey();

// foodSourceForMemory moved to lib/captureReviewTransitions.ts

const starterLogs: FoodLog[] = [
  {
    id: 'starter-oats',
    name: 'Overnight oats with berries',
    date: today,
    meal: 'Breakfast',
    calories: 420,
    protein: 18,
    carbs: 58,
    fat: 14,
    fiber: 8,
    sugar: 19,
    sodium: 180,
    source: 'USDA verified',
    confidence: 98,
    time: '8:10 AM',
    serving: '1 bowl',
    preparation: 'Ready to eat',
  },
  {
    id: 'starter-salad',
    name: 'Chicken harvest salad',
    date: today,
    meal: 'Lunch',
    calories: 510,
    protein: 38,
    carbs: 34,
    fat: 25,
    fiber: 7,
    sugar: 8,
    sodium: 620,
    source: 'Brand verified',
    confidence: 95,
    time: '12:45 PM',
    serving: '1 bowl',
    preparation: 'Fresh',
  },
  {
    id: 'starter-apple',
    name: 'Honeycrisp apple',
    date: today,
    meal: 'Snack',
    calories: 95,
    protein: 0,
    carbs: 25,
    fat: 0,
    fiber: 4,
    sugar: 19,
    sodium: 2,
    source: 'USDA verified',
    confidence: 99,
    time: '3:20 PM',
    serving: '1 medium',
    preparation: 'Raw',
  },
];

const starterProfile: Profile = {
  name: 'Alex Morgan',
  goal: 'lose',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 172,
  weightKg: 76,
  targetWeightKg: 68,
  age: 31,
  calorieTarget: 2000,
};

const CaloraContext = createContext<CaloraContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeHealthWeights(current: WeightEntry[], snapshot: HealthSnapshot): WeightEntry[] {
  return snapshot.weights.reduce<WeightEntry[]>((next, healthWeight) => {
    const date = healthWeight.recordedAt.slice(0, 10);
    // Manual entries always win for a day; repeated syncs reuse the provider record id.
    if (next.some((entry) => entry.date === date && entry.source === 'manual')) return next;
    if (next.some((entry) => entry.id === `health-${healthWeight.id}`)) return next;
    return [...next, { id: `health-${healthWeight.id}`, date, kg: healthWeight.kg, source: 'health' }];
  }, current);
}

function canSyncHealthConnection(connection: HealthConnection): boolean {
  return connection.authorization === 'requested'
    || connection.authorization === 'authorized'
    || connection.authorization === 'partial';
}

export function CaloraProvider({
  children,
  accountId,
}: {
  children: ReactNode;
  /** The Supabase identity that owns this provider instance (null = guest). */
  accountId?: string | null;
}) {
  const systemScheme = useColorScheme();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingStep, setOnboardingStepState] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>(starterLogs);
  const [weights, setWeights] = useState<WeightEntry[]>([
    { id: 'weight-1', date: today, kg: 76, source: 'manual' },
  ]);
  const [waterLogs, setWaterLogs] = useState<WaterLog>({});
  const [moodLogs, setMoodLogs] = useState<MoodLog>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLog>({});
  const [activityMinutesLogs, setActivityMinutesLogs] = useState<ActivityMinutesLog>({});
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [localRecipes, setLocalRecipes] = useState<CaloraRecipe[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [healthConnection, setHealthConnection] = useState<HealthConnection>(EMPTY_HEALTH_CONNECTION);
  const healthConnected = canSyncHealthConnection(healthConnection);
  const healthConnectionRef = useRef(healthConnection);
  const healthSyncPromiseRef = useRef<Promise<HealthSyncOutcome> | null>(null);
  const healthSyncEpochRef = useRef(0);
  const lastHealthRefreshDayRef = useRef<string | null>(null);
  useEffect(() => {
    healthConnectionRef.current = healthConnection;
  }, [healthConnection]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [outbox, setOutbox] = useState<OutboxMutation[]>([]);
  const outboxRef = useRef<OutboxMutation[]>([]);
  const [plannerWeekStart, setPlannerWeekStart] = useState(getPlannerWeekStart());
  const [plannerMeals, setPlannerMealsState] = useState<PlannerMeal[]>(() => createStarterPlannerMeals());
  const [plannerRevision, setPlannerRevision] = useState(0);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => buildShoppingItems(plannerMeals));
  const shoppingItemsRef = useRef(shoppingItems);
  useEffect(() => {
    shoppingItemsRef.current = shoppingItems;
  }, [shoppingItems]);
  const starterMemoryState = useMemo(() => migrateFoodMemories(undefined, starterLogs), []);
  const [foodDrafts, setFoodDrafts] = useState<FoodMemoryDraft[]>(starterMemoryState.foodDrafts);
  const [foodMemories, setFoodMemories] = useState<AcceptedFoodMemory[]>(starterMemoryState.foodMemories);
  const [repeatPatterns, setRepeatPatterns] = useState<RepeatPattern[]>(starterMemoryState.repeatPatterns);
  const [memoryCorrections, setMemoryCorrections] = useState<FoodMemoryCorrection[]>(starterMemoryState.memoryCorrections);
  const [hydrationReminders, setHydrationRemindersState] = useState<HydrationReminderPrefs>(DEFAULT_HYDRATION_PREFS);
  const [mealReminders, setMealRemindersState] = useState<MealReminderPrefs>(DEFAULT_MEAL_REMINDER_PREFS);
  const [goalReminder, setGoalReminderState] = useState<GoalReminderPrefs>(DEFAULT_GOAL_REMINDER_PREFS);
  const initialNotificationPreferencesRef = useRef<LocalNotificationPreferences | null>(null);
  if (!initialNotificationPreferencesRef.current) {
    initialNotificationPreferencesRef.current = normalizeNotificationPreferences(undefined);
  }
  const [notificationPreferences, setNotificationPreferencesState] = useState<LocalNotificationPreferences>(
    initialNotificationPreferencesRef.current,
  );
  // Canonical same-tick notification state. React state alone is not sufficient
  // here: two controls can fire before a render and would otherwise both merge
  // against the same stale closure.
  const notificationPreferencesRef = useRef<LocalNotificationPreferences>(
    initialNotificationPreferencesRef.current,
  );
  const notificationHydrationAppliedRef = useRef(false);
  const pendingNotificationUpdatesRef = useRef<Array<
    (current: LocalNotificationPreferences) => LocalNotificationPreferences
  >>([]);
  const [notificationScopeReady, setNotificationScopeReady] = useState(false);
  const [coachConsentAccepted, setCoachConsentAccepted] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [goalCelebrationSeenTargetKg, setGoalCelebrationSeenTargetKg] = useState<number | null>(null);
  const [plannerPreferences, setPlannerPreferencesState] = useState<import('@/lib/planType').PlannerPreferences | null>(null);
  const [fontSizeScale, setFontSizeScaleState] = useState<'small' | 'default' | 'large' | 'xlarge'>('default');
  // Keep xlarge as a legacy persisted value, but render it at the new maximum
  // so people who selected it before the option was removed land on A+.
  const fontScale = ({ small: 0.82, default: 1.0, large: 1.2, xlarge: 1.2 } as const)[fontSizeScale];
  const [profilePhotoUri, setProfilePhotoUriState] = useState<string | null>(null);
  const [livingMemory, setLivingMemory] = useState<LivingMemory>(() => buildLivingMemory({
    logs: starterLogs,
    waterLogs: {},
    moodLogs: {},
    activityLogs: {},
    plannerMeals,
  }));
  const storageKey = storageKeyForAccount(accountId);
  useEffect(() => {
    return () => {
      // An account switch/unmount makes every completion owned by this scope
      // stale before the next provider can begin health work.
      healthSyncEpochRef.current += 1;
      healthSyncPromiseRef.current = null;
      CoachFactRequestLifecycle.invalidateAll();
      invalidateAllCoachLifecycleEpochs('account_switch');
      void coachFactConsentCache.clear(accountId ?? null);
    };
  }, [accountId]);
  const encryptedStorage = useRef(new EncryptedStorageAdapter(AsyncStorage, secureStoreKeyAdapter)).current;
  const pm = useRef(new PersistenceManager(encryptedStorage, storageKey));
  /** Guard that prevents a second tap from entering clearAllData while the first is in progress. */
  const clearingRef = useRef(false);
  const [isClearing, setIsClearing] = useState(false);
  /**
   * Complete authoritative export snapshot. Renders initialize/refresh every
   * field; exposed mutations synchronously patch it before React rerenders.
   */
  const exportSnapshotRef = useRef<CaloraExportState | null>(null);
  const patchExportSnapshot = useCallback((patch: Partial<CaloraExportState>) => {
    if (exportSnapshotRef.current) {
      exportSnapshotRef.current = { ...exportSnapshotRef.current, ...patch };
    }
  }, []);
  const updateExportField = useCallback(<K extends keyof CaloraExportState,>(
    key: K,
    updater: (current: CaloraExportState[K]) => CaloraExportState[K],
  ) => {
    const snapshot = exportSnapshotRef.current;
    if (snapshot) {
      exportSnapshotRef.current = { ...snapshot, [key]: updater(snapshot[key]) };
    }
  }, []);
  const setHealthConnected = (connected: boolean) => {
    if (!connected) {
      patchExportSnapshot({ healthConnected: false, healthConnection: EMPTY_HEALTH_CONNECTION });
      setHealthConnection(EMPTY_HEALTH_CONNECTION);
    }
  };
  // Session-only navigation state (not persisted)
  const [plannerViewedDay, setPlannerViewedDay] = useState(dateKey());
  const [recipeSlotTarget, setRecipeSlotTarget] = useState<{ day: string; mealType: PlannerMeal['meal'] } | null>(null);
  const [pendingUndoSwap, setPendingUndoSwap] = useState<{ newMeal: PlannerMeal; originalMeal: PlannerMeal } | null>(null);
  const [pendingPlannerAck, setPendingPlannerAck] = useState<PlannerAck | null>(null);
  const [postLogInsight, setPostLogInsight] = useState<PostLogInsight | null>(null);
  const postLogSourceIdRef = useRef<string | null>(null);
  // Keeps explicit commit boundaries atomic across rapid calls before React rerenders.
  // It is not persisted and is never exposed to UI consumers.
  const logsRef = useRef<FoodLog[]>([]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);
  useEffect(() => {
    outboxRef.current = outbox;
  }, [outbox]);

  const commitNotificationPreferences = useCallback((
    updater: LocalNotificationPreferences
      | ((current: LocalNotificationPreferences) => LocalNotificationPreferences),
  ): LocalNotificationPreferences => {
    const operation = typeof updater === 'function'
      ? updater
      : () => updater;
    if (!notificationHydrationAppliedRef.current) {
      // A control can land in the microtask where storage has resolved but its
      // React hydration commit has not rendered. Replay that exact functional
      // edit over the hydrated canonical value instead of losing either side.
      pendingNotificationUpdatesRef.current.push(operation);
    }
    const candidate = operation(notificationPreferencesRef.current);
    const committed = normalizeNotificationPreferences(candidate);
    const mirrors = legacyReminderMirrors(committed);
    notificationPreferencesRef.current = committed;
    setNotificationPreferencesState(committed);
    // All compatibility fields are always derived from the exact same commit.
    setHydrationRemindersState(mirrors.hydrationReminders);
    setMealRemindersState(mirrors.mealReminders);
    setGoalReminderState(mirrors.goalReminder);
    patchExportSnapshot({
      notificationPreferences: committed,
      hydrationReminders: mirrors.hydrationReminders,
      mealReminders: mirrors.mealReminders,
      goalReminder: mirrors.goalReminder,
    });
    return committed;
  }, [patchExportSnapshot]);

  const { hydrated, hydrationError, hydrationErrorKind, retryHydration, isRetrying } = useHydrationEffect<Partial<CaloraState>>(pm, (saved) => {
    if (!saved) {
      const initial = notificationPreferencesRef.current;
      setNotificationPreferencesState(initial);
      notificationHydrationAppliedRef.current = true;
      pendingNotificationUpdatesRef.current = [];
      return;
    }
    if (saved.onboardingComplete !== undefined) setOnboardingComplete(saved.onboardingComplete);
    if (saved.onboardingStep !== undefined) {
      setOnboardingStepState(normalizeOnboardingStep(saved.onboardingStep));
    }
    if (saved.profile) {
      const hydratedProfile = { ...saved.profile, targetMode: saved.profile.targetMode ?? 'custom' } as Profile;
      profileRef.current = hydratedProfile;
      setProfile(hydratedProfile);
    }
     const normalizedLogs = saved.logs?.map((log) => normalizeLogImageMetadata({
       ...log,
       date: log.date ?? today,
       serving: log.serving ?? '1 serving',
     })) ?? starterLogs;
     if (saved.logs) {
       logsRef.current = normalizedLogs;
       setLogs(normalizedLogs);
     }
     const migratedMemories = migrateFoodMemories(saved, normalizedLogs);
     setFoodDrafts(migratedMemories.foodDrafts.map(normalizeMemoryImageMetadata));
     setFoodMemories(migratedMemories.foodMemories.map(normalizeMemoryImageMetadata));
     setRepeatPatterns(migratedMemories.repeatPatterns);
     setMemoryCorrections(migratedMemories.memoryCorrections);
      setLivingMemory(mergeLivingMemory(saved.livingMemory, buildLivingMemory({
        logs: normalizedLogs,
        waterLogs: saved.waterLogs ?? {},
        moodLogs: saved.moodLogs ?? {},
        activityLogs: saved.activityLogs ?? {},
        plannerMeals: saved.plannerMeals ?? [],
      })));
    if (saved.weights) setWeights(saved.weights);
     if (saved.waterLogs) setWaterLogs(saved.waterLogs);
     if (saved.moodLogs) setMoodLogs(saved.moodLogs);
      if (saved.activityLogs) setActivityLogs(saved.activityLogs);
      if (saved.activityMinutesLogs) setActivityMinutesLogs(saved.activityMinutesLogs);
    if (saved.savedMeals) setSavedMeals(saved.savedMeals.map((meal) => ({ ...meal, kind: meal.kind ?? 'meal' })));
    if (saved.localRecipes) setLocalRecipes(saved.localRecipes);
    if (saved.savedRecipeIds) setSavedRecipeIds(saved.savedRecipeIds);
    if (saved.themePreference) setThemePreference(saved.themePreference);
    if (saved.healthConnection) setHealthConnection(normalizeHealthConnection(saved.healthConnection));
    else if (saved.healthConnected !== undefined) setHealthConnection(normalizeHealthConnection(saved.healthConnected));
    if (saved.consentAccepted !== undefined) setConsentAccepted(saved.consentAccepted);
    if (saved.outbox) {
      // The server currently syncs diary entries only. Older versions queued
      // local Profile/settings/saved-meal edits here, which could never be
      // flushed or restored on another device and made sync status misleading.
      const diaryOutbox = saved.outbox.filter((mutation) => mutation.entity === 'diaryEntry');
      outboxRef.current = diaryOutbox;
      setOutbox(diaryOutbox);
    }
    if (saved.plannerWeekStart) setPlannerWeekStart(saved.plannerWeekStart);
    if (saved.plannerMeals) setPlannerMealsState(normalizePlannerMealImageIdentities(saved.plannerMeals));
    if (saved.shoppingItems) setShoppingItems(saved.shoppingItems);
    let normalizedNotificationPreferences = normalizeNotificationPreferences(saved.notificationPreferences, saved);
    for (const update of pendingNotificationUpdatesRef.current) {
      normalizedNotificationPreferences = normalizeNotificationPreferences(update(normalizedNotificationPreferences));
    }
    pendingNotificationUpdatesRef.current = [];
    notificationHydrationAppliedRef.current = true;
    const reminderMirrors = legacyReminderMirrors(normalizedNotificationPreferences);
    notificationPreferencesRef.current = normalizedNotificationPreferences;
    setNotificationPreferencesState(normalizedNotificationPreferences);
    setHydrationRemindersState(reminderMirrors.hydrationReminders);
    setMealRemindersState(reminderMirrors.mealReminders);
    setGoalReminderState(reminderMirrors.goalReminder);
     if (saved.coachConsentAccepted !== undefined) setCoachConsentAccepted(saved.coachConsentAccepted);
     if (saved.coachMessages) setCoachMessages(saved.coachMessages);
     if (saved.goalCelebrationSeenTargetKg !== undefined) setGoalCelebrationSeenTargetKg(saved.goalCelebrationSeenTargetKg ?? null);
     if (saved.plannerPreferences !== undefined) setPlannerPreferencesState(normalizePlannerPreferences(saved.plannerPreferences));
     if (saved.fontSizeScale) setFontSizeScaleState(saved.fontSizeScale as 'small' | 'default' | 'large' | 'xlarge');
     if (saved.profilePhotoUri) setProfilePhotoUriState(saved.profilePhotoUri);
     const base = exportSnapshotRef.current;
     if (base) {
       const hydratedHealthConnection = saved.healthConnection
         ? normalizeHealthConnection(saved.healthConnection)
         : saved.healthConnected !== undefined
           ? normalizeHealthConnection(saved.healthConnected)
           : base.healthConnection as HealthConnection;
       const hydratedLivingMemory = mergeLivingMemory(saved.livingMemory, buildLivingMemory({
         logs: normalizedLogs,
         waterLogs: saved.waterLogs ?? {},
         moodLogs: saved.moodLogs ?? {},
         activityLogs: saved.activityLogs ?? {},
         plannerMeals: saved.plannerMeals ?? [],
       }));
       exportSnapshotRef.current = {
         ...base,
          onboardingComplete: saved.onboardingComplete ?? base.onboardingComplete,
          onboardingStep: saved.onboardingStep !== undefined
            ? normalizeOnboardingStep(saved.onboardingStep)
            : base.onboardingStep,
         profile: saved.profile ? { ...saved.profile, targetMode: saved.profile.targetMode ?? 'custom' } : base.profile,
         logs: saved.logs ? normalizedLogs : base.logs,
         weights: saved.weights ?? base.weights,
         waterLogs: saved.waterLogs ?? base.waterLogs,
         moodLogs: saved.moodLogs ?? base.moodLogs,
         activityLogs: saved.activityLogs ?? base.activityLogs,
         activityMinutesLogs: saved.activityMinutesLogs ?? base.activityMinutesLogs,
         savedMeals: saved.savedMeals?.map((meal) => ({ ...meal, kind: meal.kind ?? 'meal' })) ?? base.savedMeals,
         localRecipes: saved.localRecipes ?? base.localRecipes,
         savedRecipeIds: saved.savedRecipeIds ?? base.savedRecipeIds,
         themePreference: saved.themePreference ?? base.themePreference,
         healthConnected: canSyncHealthConnection(hydratedHealthConnection),
         healthConnection: hydratedHealthConnection,
         consentAccepted: saved.consentAccepted ?? base.consentAccepted,
         outbox: saved.outbox ?? base.outbox,
         plannerWeekStart: saved.plannerWeekStart ?? base.plannerWeekStart,
         plannerMeals: saved.plannerMeals ? normalizePlannerMealImageIdentities(saved.plannerMeals) : base.plannerMeals,
         shoppingItems: saved.shoppingItems ?? base.shoppingItems,
         foodDrafts: migratedMemories.foodDrafts.map(normalizeMemoryImageMetadata),
         foodMemories: migratedMemories.foodMemories.map(normalizeMemoryImageMetadata),
         repeatPatterns: migratedMemories.repeatPatterns,
         memoryCorrections: migratedMemories.memoryCorrections,
         livingMemory: hydratedLivingMemory,
         hydrationReminders: reminderMirrors.hydrationReminders,
         mealReminders: reminderMirrors.mealReminders,
         goalReminder: reminderMirrors.goalReminder,
         notificationPreferences: normalizedNotificationPreferences,
         coachConsentAccepted: saved.coachConsentAccepted ?? base.coachConsentAccepted,
         coachMessages: saved.coachMessages ?? base.coachMessages,
         goalCelebrationSeenTargetKg: saved.goalCelebrationSeenTargetKg !== undefined
           ? saved.goalCelebrationSeenTargetKg ?? null
           : base.goalCelebrationSeenTargetKg,
         plannerPreferences: saved.plannerPreferences !== undefined
           ? normalizePlannerPreferences(saved.plannerPreferences)
           : base.plannerPreferences,
         fontSizeScale: saved.fontSizeScale ?? base.fontSizeScale,
         profilePhotoUri: saved.profilePhotoUri ?? base.profilePhotoUri,
       };
     }
  });

  // A provider is keyed by the active account/guest scope. Reconcile precisely
  // once after each successful hydration so schedules from the previous scope
  // are cancelled before this scope's desired plan is installed. This path
  // deliberately never asks the OS for permission.
  useEffect(() => {
    if (!hydrated || hydrationError) return;
    let active = true;
    setNotificationScopeReady(false);
    void reconcileHydratedNotificationPlan(notificationPreferences)
      .then((result) => {
        // A denied or disabled plan is still safely reconciled. A failed plan
        // is not a safe capture boundary because the native state is unknown.
        if (active && result.status !== 'failed') setNotificationScopeReady(true);
      })
      .catch((error) => {
        // Reconciliation normally returns failures, but do not let a native
        // exception create an unhandled hydration rejection.
        console.warn('[Calora][notifications] Hydrated reconciliation crashed:', error);
      });
    return () => { active = false; };
  // notificationPreferences is intentionally read from the hydration commit;
  // user edits reconcile themselves through the same native lifecycle queue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, hydrated, hydrationError]);

  // The former device-wide key had no reliable owner. Never attach it to an
  // account automatically; quarantine it only after a successful raw copy.
  useEffect(() => {
    quarantineLegacyStorage(encryptedStorage).catch((error) => {
      console.warn('[Calora][storage] Could not quarantine legacy local data:', error);
    });
  }, []);

  // ── Profile photo stale-URI guard ─────────────────────────────────────────
  // On the first render after hydration completes, verify that the persisted
  // photo URI still points to an existing file.  The OS may have reclaimed app
  // storage between sessions, leaving the URI pointing to a missing file which
  // would otherwise render as a broken image.  If the file is gone we clear the
  // URI so the initials placeholder is shown instead.
  useEffect(() => {
    if (!hydrated || !profilePhotoUri) return;
    let cancelled = false;
    verifyProfilePhotoExists(profilePhotoUri, FileSystem)
      .then((exists) => {
        if (!cancelled && !exists) {
          setProfilePhotoUriState(null);
        }
      })
      .catch((error) => {
        console.warn('[Calora][profile-photo] Could not verify saved photo:', error);
      });
    return () => { cancelled = true; };
  // Run once after hydration; profilePhotoUri is intentionally excluded from
  // deps — re-running on every photo change would be wasteful and the picked
  // photos are freshly copied so they always exist.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ── Health sync ───────────────────────────────────────────────────────────
  // Dependency array is intentionally empty because every value closed over is
  // guaranteed stable for the lifetime of the provider:
  //   • healthService  — module-level singleton import
  //   • setHealthConnection, setWeights — React useState setters (stable by spec)
  //   • mergeHealthWeights — module-level pure function
  // If health-service internals change to require component-scoped values, those
  // values must be either memoized or added to this dep array.
  const syncHealth = useCallback(async (): Promise<HealthSyncOutcome> => {
    if (clearingRef.current) return { status: 'skipped', message: 'Health sync is temporarily unavailable while data is being cleared.' };
    if (healthSyncPromiseRef.current) return healthSyncPromiseRef.current;
    const epoch = healthSyncEpochRef.current;
    const generationIsCurrent = () =>
      !clearingRef.current && epoch === healthSyncEpochRef.current;
    const run = (async (): Promise<HealthSyncOutcome> => {
      let current: HealthConnection;
      try {
        current = await healthService.getConnection();
      } catch (error) {
        if (generationIsCurrent()) {
          const failedConnection = {
            ...healthConnectionRef.current,
            syncError: error instanceof Error ? error.message : 'Health data could not be read.',
          };
          healthConnectionRef.current = failedConnection;
          patchExportSnapshot({ healthConnected: canSyncHealthConnection(failedConnection), healthConnection: failedConnection });
          setHealthConnection(failedConnection);
        }
        return { status: 'failed', message: error instanceof Error ? error.message : 'Health data could not be read.' };
      }
      if (!generationIsCurrent()) return { status: 'skipped', message: 'Health sync was cancelled.' };
      healthConnectionRef.current = current;
      patchExportSnapshot({ healthConnected: canSyncHealthConnection(current), healthConnection: current });
      setHealthConnection(current);
      if (!canSyncHealthConnection(current)) {
        return { status: 'skipped', message: 'Health access is not ready. Connect or update access before syncing.' };
      }
      try {
        const snapshot = await healthService.sync();
        if (!generationIsCurrent()) return { status: 'skipped', message: 'Health sync was cancelled.' };
        const syncedConnection = { ...current, snapshot, lastSyncedAt: snapshot.syncedAt, syncError: undefined };
        healthConnectionRef.current = syncedConnection;
        patchExportSnapshot({ healthConnected: canSyncHealthConnection(syncedConnection), healthConnection: syncedConnection });
        updateExportField('weights', (weights) => mergeHealthWeights(weights as WeightEntry[], snapshot));
        setHealthConnection(syncedConnection);
        setWeights((ws) => mergeHealthWeights(ws, snapshot));
        return { status: 'synced', syncedAt: snapshot.syncedAt };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Health data could not be read.';
        if (generationIsCurrent()) {
          const failedConnection = { ...current, syncError: message };
          healthConnectionRef.current = failedConnection;
          patchExportSnapshot({ healthConnected: canSyncHealthConnection(failedConnection), healthConnection: failedConnection });
          setHealthConnection(failedConnection);
        }
        return { status: 'failed', message };
      }
    })();
    healthSyncPromiseRef.current = run;
    try {
      return await run;
    } finally {
      if (healthSyncPromiseRef.current === run) healthSyncPromiseRef.current = null;
    }
  }, [patchExportSnapshot, updateExportField]);

  const clockNow = useClock();
  const healthDayKey = dateKey(clockNow);

  // ── Health availability probe ──────────────────────────────────────────────
  // On mount (after hydration), probe the native health service to see if it is
  // actually available on this device. This updates the initial 'unavailable'
  // state to 'notConnected' if the provider (Health Connect / HealthKit) is
  // present, enabling the connection UI.
  useEffect(() => {
    if (!hydrated || clearingRef.current) return;
    // Only probe if we don't have a definitive authorized/denied status yet.
    // 'unavailable' is the default for fresh installs.
    if (healthConnection.authorization === 'unavailable') {
      const probeEpoch = healthSyncEpochRef.current;
      healthService.getConnection().then((conn) => {
        if (clearingRef.current || probeEpoch !== healthSyncEpochRef.current) return;
        healthConnectionRef.current = conn;
        patchExportSnapshot({ healthConnected: canSyncHealthConnection(conn), healthConnection: conn });
        setHealthConnection(conn);
        // If already authorized, trigger an initial sync to refresh data.
        if (canSyncHealthConnection(conn)) {
          void syncHealth();
        }
      }).catch((error) => {
        if (clearingRef.current || probeEpoch !== healthSyncEpochRef.current) return;
        console.warn('[Calora][health] Availability probe failed:', error);
        // Fallback to unavailable on error
        healthConnectionRef.current = EMPTY_HEALTH_CONNECTION;
        patchExportSnapshot({ healthConnected: false, healthConnection: EMPTY_HEALTH_CONNECTION });
        setHealthConnection(EMPTY_HEALTH_CONNECTION);
      });
    } else if (healthConnected) {
      // Already connected from a previous session; refresh data on mount.
      syncHealth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active'
        && !clearingRef.current
        && canSyncHealthConnection(healthConnectionRef.current)
      ) {
        void syncHealth();
      }
    });
    return () => subscription.remove();
  }, [hydrated, syncHealth]);

  // Refresh once when the device crosses into a new local calendar day while
  // the app remains in the foreground. AppState handles background resume;
  // this covers an open app crossing midnight.
  useEffect(() => {
    if (!hydrated || clearingRef.current) return;
    if (!canSyncHealthConnection(healthConnection)) return;
    if (lastHealthRefreshDayRef.current === healthDayKey) return;
    lastHealthRefreshDayRef.current = healthDayKey;
    void syncHealth();
  }, [healthConnection.authorization, healthDayKey, hydrated, syncHealth]);

  useEffect(() => {
    if (!shouldAutosave({ hydrated, error: hydrationError })) return;
    const state: CaloraState = {
      onboardingComplete,
      onboardingStep,
      profile,
      logs,
      weights,
      waterLogs,
      moodLogs,
      activityLogs,
      activityMinutesLogs,
      savedMeals,
      localRecipes,
      savedRecipeIds,
      themePreference,
      healthConnected,
      healthConnection,
      consentAccepted,
      outbox,
      plannerWeekStart,
      plannerMeals,
      shoppingItems,
      foodDrafts,
      foodMemories,
      repeatPatterns,
      memoryCorrections,
      hydrationReminders,
      mealReminders,
      goalReminder,
      notificationPreferences,
      coachConsentAccepted,
      coachMessages,
      livingMemory,
      goalCelebrationSeenTargetKg: goalCelebrationSeenTargetKg ?? undefined,
      plannerPreferences: plannerPreferences ?? undefined,
      fontSizeScale,
      profilePhotoUri: profilePhotoUri ?? undefined,
    };
     enqueueAutosave(pm.current, state);
  }, [activityLogs, activityMinutesLogs, coachConsentAccepted, coachMessages, consentAccepted, fontSizeScale, foodDrafts, foodMemories, goalCelebrationSeenTargetKg, goalReminder, healthConnected, healthConnection, hydrated, hydrationError, hydrationReminders, livingMemory, localRecipes, logs, mealReminders, memoryCorrections, moodLogs, notificationPreferences, onboardingComplete, onboardingStep, outbox, plannerMeals, plannerPreferences, plannerWeekStart, profile, profilePhotoUri, repeatPatterns, savedMeals, savedRecipeIds, shoppingItems, themePreference, waterLogs]);

  const mode = themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePreference;
  const queueMutation = (entity: OutboxMutation['entity'], operation: OutboxMutation['operation']) => {
    if (entity !== 'diaryEntry') return;
    const mutation = { id: makeId('mutation'), entity, operation, createdAt: new Date().toISOString() };
    outboxRef.current = [...outboxRef.current, mutation];
    setOutbox(outboxRef.current);
    patchExportSnapshot({ outbox: outboxRef.current });
  };
  const clearPostLogInsight = () => {
    postLogSourceIdRef.current = null;
    setPostLogInsight(null);
  };
  const publishPostLogInsight = (beforeLogs: FoodLog[], afterLogs: FoodLog[], addedLog: FoodLog) => {
    clearPostLogInsight();
    const todayKey = dateKey();
    if (!accountId || !hydrated || addedLog.date !== todayKey) return;
    try {
      const common = {
        profile,
        weights,
        waterLogs,
        moodLogs,
        activityLogs,
        activityMinutesLogs,
        plannerMeals,
        shoppingItems,
        localRecipes,
        activeEnergyKcal: healthConnection.snapshot?.activeEnergyKcal ?? null,
      };
      const before = buildDailyIntelligenceFacts(createIntelligenceContext({ ...common, logs: beforeLogs }, { date: todayKey }));
      const after = buildDailyIntelligenceFacts(createIntelligenceContext({ ...common, logs: afterLogs }, { date: todayKey }));
      const insight = selectPostLogInsight(before, after, {
        hydrated,
        enabled: isIntelligenceFeatureEnabled('intelligence.insights.post_log'),
        accountScopeMatches: Boolean(accountId),
        currentDay: addedLog.date === todayKey,
        addedCalories: addedLog.calories,
        addedMeal: addedLog.meal,
      });
      if (insight) {
        postLogSourceIdRef.current = addedLog.id;
        setPostLogInsight(insight);
      }
    } catch (error) {
      console.warn('[Calora][intelligence] Could not build post-log insight:', error);
      clearPostLogInsight();
    }
  };
  useEffect(() => {
    if (!hydrated) clearPostLogInsight();
  }, [hydrated]);
  const rememberedSources = useMemo(() => filterForgottenSources(livingMemory, {
    logs,
    waterLogs,
    moodLogs,
    activityLogs,
    plannerMeals,
  }), [activityLogs, livingMemory, logs, moodLogs, plannerMeals, waterLogs]);
  const rememberedFoodMemories = useMemo(
    () => foodMemories.filter((memory) => !memory.diaryLogId || !livingMemory.forgotten.meals.includes(memory.diaryLogId)),
    [foodMemories, livingMemory],
  );
  const livingState = useMemo(() => deriveLivingState({
    profile,
    ...rememberedSources,
    repeatPatterns,
    onboardingComplete,
    now: clockNow,
  }), [clockNow, onboardingComplete, profile, rememberedSources, repeatPatterns]);

  // Authoritative export state. Every committed render refreshes the complete
  // snapshot, while exposed mutations patch it synchronously before scheduling
  // React state. Export therefore never mixes refs with stale render closures.
  const normalizedExportPreferences = normalizeNotificationPreferences(notificationPreferences);
  const normalizedExportMirrors = legacyReminderMirrors(normalizedExportPreferences);
  exportSnapshotRef.current = {
    onboardingComplete,
    onboardingStep,
    profile,
    logs,
    weights,
    waterLogs,
    moodLogs,
    activityLogs,
    activityMinutesLogs,
    savedMeals,
    localRecipes,
    savedRecipeIds,
    themePreference,
    plannerWeekStart,
    plannerMeals,
    shoppingItems,
    foodDrafts,
    foodMemories,
    repeatPatterns,
    memoryCorrections,
    livingMemory,
    hydrationReminders: normalizedExportMirrors.hydrationReminders,
    mealReminders: normalizedExportMirrors.mealReminders,
    goalReminder: normalizedExportMirrors.goalReminder,
    notificationPreferences: normalizedExportPreferences,
    healthConnected,
    healthConnection,
    consentAccepted,
    outbox,
    coachConsentAccepted,
    coachMessages,
    goalCelebrationSeenTargetKg,
    plannerPreferences,
    fontSizeScale,
    profilePhotoUri,
  };

  const value = useMemo<CaloraContextValue>(() => ({
    logs,
    weights,
    waterLogs,
    moodLogs,
    activityLogs,
    activityMinutesLogs,
    savedMeals,
    localRecipes,
    savedRecipeIds,
    profile,
    onboardingComplete,
    onboardingStep,
    hydrated,
    hydrationError,
    hydrationErrorKind,
    themePreference,
    mode,
    colors: mode === 'dark' ? colors.dark : colors.light,
    syncState: hydrated ? (outbox.length > 0 ? 'needs-connection' : 'local') : 'offline',
    pendingMutations: outbox,
    plannerWeekStart,
    plannerMeals,
    plannerRevision,
    plannerPreferences,
    setPlannerPreferences: (prefs) => {
      patchExportSnapshot({ plannerPreferences: prefs });
      setPlannerPreferencesState(prefs);
    },
    updatePlannerPreferences: (updater) => {
      const next = updater((exportSnapshotRef.current?.plannerPreferences ?? null) as import('@/lib/planType').PlannerPreferences | null);
      patchExportSnapshot({ plannerPreferences: next });
      setPlannerPreferencesState(next);
    },
    shoppingItems,
    foodDrafts,
    foodMemories: rememberedFoodMemories,
    repeatPatterns,
    healthConnected,
    healthConnection,
    connectHealth: async () => {
      if (clearingRef.current) return healthConnectionRef.current;
      const connectEpoch = ++healthSyncEpochRef.current;
      const previousSync = healthSyncPromiseRef.current;
      if (previousSync) await previousSync;
      if (clearingRef.current || connectEpoch !== healthSyncEpochRef.current) {
        return healthConnectionRef.current;
      }
      const next = await healthService.requestConnection();
      // Do not let a disconnect or account-state change during permission
      // approval get overwritten by this older connection result.
      if (clearingRef.current || connectEpoch !== healthSyncEpochRef.current) {
        return healthConnectionRef.current;
      }
      healthConnectionRef.current = next;
      setHealthConnection(next);
      patchExportSnapshot({ healthConnected: canSyncHealthConnection(next), healthConnection: next });
      if (canSyncHealthConnection(next)) {
        await syncHealth();
      }
      return !clearingRef.current && connectEpoch === healthSyncEpochRef.current
        ? next
        : healthConnectionRef.current;
    },
    syncHealth,
    disconnectHealth: () => {
      healthSyncEpochRef.current += 1;
      healthConnectionRef.current = EMPTY_HEALTH_CONNECTION;
      patchExportSnapshot({ healthConnected: false, healthConnection: EMPTY_HEALTH_CONNECTION });
      setHealthConnection(EMPTY_HEALTH_CONNECTION);
    },
    addLog: (log) => {
      const id = makeId('log');
      const capturedAt = new Date().toISOString();
      const nutritionSnapshot = {
        calories: log.calories,
        proteinG: log.protein,
        carbsG: log.carbs,
        fatG: log.fat,
        capturedAt,
      };
      const nextLog = normalizeLogImageMetadata({
        ...log,
        id,
        time: log.time === 'Just now' ? formatLogTime(new Date(capturedAt)) : log.time,
        syncUpdatedAt: capturedAt,
        nutritionSnapshot,
      });
      const component: FoodMemoryComponent = {
        id: `${id}-component`,
        name: log.name,
        serving: log.serving,
        calories: log.calories,
        proteinG: log.protein,
        carbsG: log.carbs,
        fatG: log.fat,
        included: true,
        eatenFraction: 1,
        provenance: provenanceForCapture(log.source, log.source === 'Recipe' ? 'recipe' : log.source === 'Manual' ? 'manual' : 'text'),
        sourceLabel: log.source,
        confidence: log.confidence,
        confidenceDimensions: { identity: log.confidence, portion: log.confidence, nutritionSource: log.confidence, preparation: log.confidence },
        assumptions: [],
        reviewQuestions: [],
        imageUrl: nextLog.imageUrl,
      };
      const acceptedMemory: AcceptedFoodMemory = {
        id: `memory-${id}`,
       schemaVersion: 1,
        inputType: log.source === 'Recipe' ? 'recipe' : log.source === 'Manual' ? 'manual' : 'text',
        status: 'accepted',
        title: log.name,
        date: log.date,
        meal: log.meal,
        components: [component],
        nutrition: nutritionSnapshot,
        originalNutrition: nutritionSnapshot,
        provenance: component.provenance,
        sourceLabel: log.source,
        confidence: log.confidence,
        confidenceDimensions: component.confidenceDimensions,
        assumptions: [],
        reviewQuestions: [],
        imageRetention: 'not_collected',
       imageUrl: nextLog.imageUrl,
       imageSource: nextLog.imageSource,
        createdAt: capturedAt,
        updatedAt: capturedAt,
        acceptedAt: capturedAt,
        diaryLogId: id,
        correctionIds: [],
      };
      const beforeLogs = logsRef.current;
      const nextLogs = [...beforeLogs, nextLog];
      logsRef.current = nextLogs;
      updateExportField('logs', () => nextLogs);
      updateExportField('foodMemories', (current) => [...current as AcceptedFoodMemory[], acceptedMemory]);
      updateExportField('livingMemory', (current) => upsertMealObservation(current as LivingMemory, id, nextLog.date, nextLog.meal));
      setLogs((current) => current.some((log) => log.id === nextLog.id) ? current : [...current, nextLog]);
      setFoodMemories((current) => [...current, acceptedMemory]);
      setLivingMemory((current) => upsertMealObservation(current, id, nextLog.date, nextLog.meal));
      queueMutation('diaryEntry', 'upsert');
      publishPostLogInsight(beforeLogs, nextLogs, nextLog);
    },
    updateLog: (id, patch) => {
      const existing = logsRef.current.find((log) => log.id === id);
       const syncUpdatedAt = new Date().toISOString();
       const updated = existing ? normalizeLogImageMetadata({ ...existing, ...patch, syncUpdatedAt }) : null;
      if (updated) {
        updateExportField('livingMemory', (current) => upsertMealObservation(
          removeMealObservation(current as LivingMemory, id), id, updated.date, updated.meal));
        setLivingMemory((memory) => upsertMealObservation(
          removeMealObservation(memory, id),
          id,
          updated.date,
          updated.meal,
        ));
      }
      logsRef.current = logsRef.current.map((log) => log.id === id ? normalizeLogImageMetadata({ ...log, ...patch, syncUpdatedAt }) : log);
      patchExportSnapshot({ logs: logsRef.current });
      setLogs((current) => current.map((log) => log.id === id ? normalizeLogImageMetadata({ ...log, ...patch, syncUpdatedAt }) : log));
      queueMutation('diaryEntry', 'upsert');
      if (postLogSourceIdRef.current === id) clearPostLogInsight();
    },
    removeLog: (id) => {
      recordDiaryDelete(id, new Date().toISOString());
      logsRef.current = logsRef.current.filter((log) => log.id !== id);
      patchExportSnapshot({
        logs: logsRef.current,
        foodMemories: (exportSnapshotRef.current?.foodMemories as AcceptedFoodMemory[] ?? []).filter((memory) => memory.diaryLogId !== id),
      });
      updateExportField('livingMemory', (current) => removeMealObservation(current as LivingMemory, id));
      setLogs((current) => current.filter((log) => log.id !== id));
      setFoodMemories((current) => current.filter((memory) => memory.diaryLogId !== id));
      setLivingMemory((current) => removeMealObservation(current, id));
      queueMutation('diaryEntry', 'delete');
      if (postLogSourceIdRef.current === id) clearPostLogInsight();
    },
    applySyncedDiaryLogs: (nextLogs) => {
      logsRef.current = nextLogs;
      patchExportSnapshot({ logs: nextLogs });
      updateExportField('livingMemory', (current) => mergeLivingMemory(current as LivingMemory, buildLivingMemory({
        logs: nextLogs, waterLogs, moodLogs, activityLogs, plannerMeals,
      })));
      setLogs(nextLogs);
      setLivingMemory((current) => mergeLivingMemory(current, buildLivingMemory({
        logs: nextLogs,
        waterLogs,
        moodLogs,
        activityLogs,
        plannerMeals,
      })));
    },
    createFoodMemoryDraft: (analysis, date = dateKey(), meal = 'Snack') => {
      const draft = captureAnalysisToDraft(analysis, date, meal);
      updateExportField('foodDrafts', (current) => [...(current as FoodMemoryDraft[]).filter((item) => item.id !== draft.id), draft]);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    createFoodMemorySourceDraft: (input) => {
      const draft = sourceComponentsToDraft(input);
      updateExportField('foodDrafts', (current) => [...(current as FoodMemoryDraft[]).filter((item) => item.id !== draft.id), draft]);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    createRecipeDraft: (recipe, date = dateKey(), meal = 'Dinner') => {
      const draft = recipeToDraft(recipe, date, meal);
      updateExportField('foodDrafts', (current) => [...(current as FoodMemoryDraft[]).filter((item) => item.id !== draft.id), draft]);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    createPlannerDraft: (meal) => {
      const draft = plannerMealToDraft(meal);
      updateExportField('foodDrafts', (current) => [...(current as FoodMemoryDraft[]).filter((item) => item.id !== draft.id), draft]);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    updateFoodMemoryDraft: (draftId, components) => {
      updateExportField('foodDrafts', (current) => (current as FoodMemoryDraft[]).map((draft) => draft.id === draftId ? updateDraftComponents(draft, components) : draft));
      setFoodDrafts((current) => current.map((draft) => draft.id === draftId ? updateDraftComponents(draft, components) : draft));
    },
    acceptFoodMemory: (draftId, draftOverride) => {
      // draftOverride lets callers that just created the draft (in the same
      // render cycle) pass it directly, avoiding the stale-closure issue that
      // would otherwise cause setFoodDrafts' queued update to be invisible here.
      const rawDraft = draftOverride ?? foodDrafts.find((item) => item.id === draftId && item.status === 'draft');
      if (!rawDraft) return null;
      const draft = normalizeMemoryImageMetadata(rawDraft);
      if (draft.plannerMealId) {
        const existingPlannerLog = logsRef.current.find((log) => log.plannerMealId === draft.plannerMealId);
        if (existingPlannerLog) {
          setFoodDrafts((current) => current.filter((item) => item.id !== draftId));
          return existingPlannerLog;
        }
      }
      const logId = makeId('log');
      const acceptedAt = new Date().toISOString();
      const { log, memory } = buildAcceptResult(draft, logId, acceptedAt);
      (log as FoodLog).syncUpdatedAt = acceptedAt;
      const beforeLogs = logsRef.current;
      const nextLogs = [...beforeLogs, log];
      logsRef.current = nextLogs;
      patchExportSnapshot({
        logs: nextLogs,
        foodDrafts: (exportSnapshotRef.current?.foodDrafts as FoodMemoryDraft[] ?? []).filter((item) => item.id !== draftId),
      });
      updateExportField('foodMemories', (current) => [...current as AcceptedFoodMemory[], memory]);
      const nextRepeatPatterns = updateRepeatPatterns(
        exportSnapshotRef.current?.repeatPatterns as RepeatPattern[],
        memory,
        log,
        makeId('repeat'),
        acceptedAt,
      );
      patchExportSnapshot({ repeatPatterns: nextRepeatPatterns });
      updateExportField('livingMemory', (current) => upsertMealObservation(current as LivingMemory, log.id, log.date, log.meal));
      setLogs((current) => current.some((item) => item.id === log.id) ? current : [...current, log]);
      setFoodMemories((current) => [...current, memory]);
      setLivingMemory((current) => upsertMealObservation(current, log.id, log.date, log.meal));
      setFoodDrafts((current) => current.filter((item) => item.id !== draftId));
      setRepeatPatterns(nextRepeatPatterns);
      queueMutation('diaryEntry', 'upsert');
      publishPostLogInsight(beforeLogs, nextLogs, log);
      return log;
    },
    rejectFoodMemory: (draftId) => {
      const rejectedAt = new Date().toISOString();
      updateExportField('foodDrafts', (current) =>
        (current as FoodMemoryDraft[]).map((draft) =>
          draft.id === draftId ? buildRejectDraft(draft, rejectedAt) : draft));
      setFoodDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId ? buildRejectDraft(draft, rejectedAt) : draft,
        ),
      );
    },
    teachRepeatMemory: (memoryId) => {
      const memory = foodMemories.find((item) => item.id === memoryId);
      if (!memory) return;
      const signature = memorySignature(memory);
      const pattern: RepeatPattern = {
        id: makeId('repeat'), signature, title: memory.title,
        componentNames: memory.components.filter((component) => component.included).map((component) => component.name),
        serving: memory.components.filter((component) => component.included).map((component) => component.serving).join(' + '),
        useCount: 1, rejectedCount: 0, lastAcceptedAt: memory.acceptedAt, sourceMemoryId: memory.id,
      };
      const next = (exportSnapshotRef.current?.repeatPatterns as RepeatPattern[]).some((item) => item.signature === signature)
        ? exportSnapshotRef.current?.repeatPatterns as RepeatPattern[]
        : [...exportSnapshotRef.current?.repeatPatterns as RepeatPattern[], pattern];
      patchExportSnapshot({ repeatPatterns: next });
      setRepeatPatterns(next);
    },
    addWeight: (kg, source = 'manual') => {
      const entry = { id: makeId('weight'), date: dateKey(), kg, source };
      updateExportField('weights', (current) => [...current as WeightEntry[], entry]);
      setWeights((current) => [...current, entry]);
      queueMutation('weight', 'upsert');
    },
    removeWeight: (id) => {
      updateExportField('weights', (current) => (current as WeightEntry[]).filter((w) => w.id !== id));
      setWeights((current) => current.filter((w) => w.id !== id));
      queueMutation('weight', 'delete');
    },
    updateWeight: (id, kg) => {
      updateExportField('weights', (current) => (current as WeightEntry[]).map((w) => w.id === id ? { ...w, kg } : w));
      setWeights((current) => current.map((w) => w.id === id ? { ...w, kg } : w));
      queueMutation('weight', 'upsert');
    },
    addWater: (date, ounces = 8) => {
      if (!Number.isFinite(ounces) || ounces === 0) return;
      updateExportField('waterLogs', (current) => {
        const values = current as WaterLog;
        return { ...values, [date]: Math.max(0, (values[date] ?? 0) + ounces) };
      });
      updateExportField('livingMemory', (current) => {
        const memory = current as LivingMemory;
        const exportWater = exportSnapshotRef.current?.waterLogs as WaterLog;
        return upsertWaterObservation(memory, date, exportWater[date] ?? 0);
      });
      setWaterLogs((current) => ({ ...current, [date]: Math.max(0, (current[date] ?? 0) + ounces) }));
      setLivingMemory((current) => upsertWaterObservation(current, date, Math.max(0, (current.waterObservations[date]?.ounces ?? waterLogs[date] ?? 0) + ounces)));
      queueMutation('settings', 'upsert');
    },
    setMood: (date, mood) => {
      updateExportField('moodLogs', (current) => ({ ...current as MoodLog, [date]: mood }));
      updateExportField('livingMemory', (current) => upsertMoodObservation(current as LivingMemory, date, mood));
      setMoodLogs((current) => ({ ...current, [date]: mood }));
      setLivingMemory((current) => upsertMoodObservation(current, date, mood));
      queueMutation('settings', 'upsert');
    },
    setActivity: (date, activity) => {
      updateExportField('activityLogs', (current) => ({ ...current as ActivityLog, [date]: activity }));
      updateExportField('livingMemory', (current) => upsertActivityObservation(current as LivingMemory, date, activity));
      setActivityLogs((current) => ({ ...current, [date]: activity }));
      setLivingMemory((current) => upsertActivityObservation(current, date, activity));
      queueMutation('settings', 'upsert');
    },
    setActivityMinutes: (date, minutes) => {
      if (!Number.isFinite(minutes) || minutes < 0) return;
      updateExportField('activityMinutesLogs', (current) => ({ ...current as ActivityMinutesLog, [date]: minutes }));
      setActivityMinutesLogs((current) => ({ ...current, [date]: minutes }));
      queueMutation('settings', 'upsert');
    },
    saveMeal: (meal) => {
      const saved = { ...meal, id: makeId('meal') };
      updateExportField('savedMeals', (current) => [...current as SavedMeal[], saved]);
      setSavedMeals((current) => [...current, saved]);
      queueMutation('savedMeal', 'upsert');
    },
    saveRecipe: (recipe) => {
      const saved = { ...recipe, id: makeId('recipe'), isLocal: true };
      updateExportField('localRecipes', (current) => [...current as CaloraRecipe[], saved]);
      setLocalRecipes((current) => [...current, saved]);
      queueMutation('savedMeal', 'upsert');
      return saved;
    },
    updateRecipe: (recipeId, patch) => {
      const updatedAt = new Date().toISOString();
      updateExportField('localRecipes', (current) => (current as CaloraRecipe[]).map((recipe) => recipe.id === recipeId ? { ...recipe, ...patch, updatedAt } : recipe));
      setLocalRecipes((current) => current.map((recipe) => recipe.id === recipeId ? { ...recipe, ...patch, updatedAt } : recipe));
      queueMutation('savedMeal', 'upsert');
    },
    toggleSavedRecipe: (recipeId) => {
      updateExportField('savedRecipeIds', (current) => current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId]);
      setSavedRecipeIds((current) => current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId]);
      queueMutation('savedMeal', 'upsert');
    },
    setThemePreference: (preference) => {
      patchExportSnapshot({ themePreference: preference });
      setThemePreference(preference);
      queueMutation('settings', 'upsert');
    },
    setOnboardingStep: (step) => {
      const nextStep = normalizeOnboardingStep(step);
      patchExportSnapshot({ onboardingStep: nextStep });
      setOnboardingStepState(nextStep);
    },
    completeOnboarding: (nextProfile, consent) => {
      patchExportSnapshot({ profile: nextProfile, consentAccepted: consent, onboardingComplete: true, onboardingStep: 0 });
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      setConsentAccepted(consent);
      setOnboardingComplete(true);
      setOnboardingStepState(0);
      queueMutation('profile', 'upsert');
    },
    updateProfile: (patch) => {
      profileRef.current = profileRef.current ? { ...profileRef.current, ...patch } : null;
      setProfile(profileRef.current);
      patchExportSnapshot({ profile: profileRef.current });
      queueMutation('profile', 'upsert');
    },
    hydrationReminders,
    coachConsentAccepted,
    coachMessages,
    livingState,
     livingMemory,
      forgetLivingObservation: (kind, id) => {
        updateExportField('livingMemory', (current) => ({ ...forgetMemoryObservation(current as LivingMemory, kind, id) }));
       setLivingMemory((current) => ({ ...forgetMemoryObservation(current, kind, id) }));
       queueMutation('settings', 'upsert');
     },
    setHydrationReminders: (prefs: HydrationReminderPrefs) => {
      commitNotificationPreferences((current) => ({
        ...current,
        categories: {
          ...current.categories,
          hydration: { enabled: prefs.enabled, preferences: prefs },
        },
      }));
      queueMutation('settings', 'upsert');
    },
    fontScale,
    fontSizeScale,
    setFontSizeScale: (scale) => {
      const next = scale === 'xlarge' ? 'large' : scale;
      patchExportSnapshot({ fontSizeScale: next });
      setFontSizeScaleState(next);
    },
    profilePhotoUri,
    setProfilePhotoUri: (uri) => {
      patchExportSnapshot({ profilePhotoUri: uri });
      setProfilePhotoUriState(uri);
    },
    clearProfilePhoto: async () => {
      const result = await deleteProfilePhoto(FileSystem, accountId);
      if (!result.ok) throw new Error('Could not delete the local profile photo.');
      patchExportSnapshot({ profilePhotoUri: null });
      setProfilePhotoUriState(null);
    },
    mealReminders,
    goalReminder,
    notificationPreferences,
    notificationScopeReady,
    setNotificationPreferences: (prefs: LocalNotificationPreferences) => {
      commitNotificationPreferences(prefs);
      queueMutation('settings', 'upsert');
    },
    updateNotificationPreferences: (updater) => {
      const committed = commitNotificationPreferences(updater);
      queueMutation('settings', 'upsert');
      return committed;
    },
    setMealReminders: (prefs: MealReminderPrefs) => {
      commitNotificationPreferences((current) => ({
        ...current,
        categories: {
          ...current.categories,
          meal: { enabled: prefs.breakfast || prefs.lunch || prefs.dinner, preferences: prefs },
        },
      }));
      queueMutation('settings', 'upsert');
    },
    setGoalReminder: (prefs: GoalReminderPrefs) => {
      commitNotificationPreferences((current) => ({
        ...current,
        categories: {
          ...current.categories,
          goal: { enabled: prefs.enabled, preferences: prefs },
        },
      }));
      queueMutation('settings', 'upsert');
    },
    deleteSavedMeal: (id: string) => {
      updateExportField('savedMeals', (current) => (current as SavedMeal[]).filter((meal) => meal.id !== id));
      setSavedMeals((current) => current.filter((meal) => meal.id !== id));
      queueMutation('savedMeal', 'delete');
    },
    setHealthConnected,
    clearOutbox: () => {
      outboxRef.current = [];
      patchExportSnapshot({ outbox: [] });
      setOutbox([]);
    },
      exportRawStorageData: () => readRawStorageData(encryptedStorage.getRawItem.bind(encryptedStorage), storageKey),
      exportData: async () => {
        if (!exportSnapshotRef.current) {
          throw new Error('Export state is not initialized.');
        }
        return buildExportPayload(STORAGE_SCHEMA_VERSION, exportSnapshotRef.current);
      },
    clearAllData: async () => {
      if (clearingRef.current) return;
      clearingRef.current = true;
      // Invalidate health work before the first async clear boundary. Every
      // sync completion is epoch-gated, so stale device results cannot
      // repopulate state or trigger an autosave after the durable removal.
      healthSyncEpochRef.current += 1;
       // Invalidate any planner generation before the destructive work starts,
       // not after its async photo/storage operations complete.
       setPlannerRevision((revision) => revision + 1);
      setIsClearing(true);
      try {
        CoachFactRequestLifecycle.invalidateAll();
        invalidateAllCoachLifecycleEpochs('clear_data');
        let coreFailure: unknown = null;
        try {
          // The account-scoped state is the destructive commit boundary. It is
          // serialized behind pending autosaves by PersistenceManager.
          await performClearAllData({
        pm: pm.current,
        emptyLivingMemory: emptyLivingMemory(),
        defaultHydrationPrefs: DEFAULT_HYDRATION_PREFS,
        getPlannerWeekStart,
        getToday: dateKey,
        setOnboardingComplete,
         setOnboardingStep: setOnboardingStepState,
        setProfile,
        setLogs,
        setWeights,
        setWaterLogs,
        setMoodLogs,
        setActivityLogs,
        setActivityMinutesLogs,
        setSavedMeals,
        setLocalRecipes,
        setSavedRecipeIds,
        setConsentAccepted,
        setOutbox,
        setPlannerWeekStart,
        setPlannerViewedDay,
        setRecipeSlotTarget,
        setPendingUndoSwap,
        setPendingPlannerAck,
        setPlannerPreferences: setPlannerPreferencesState,
        setPlannerMeals: setPlannerMealsState,
        setShoppingItems,
        setFoodDrafts,
        setFoodMemories,
        setRepeatPatterns,
        setMemoryCorrections,
        setLivingMemory,
        setHydrationReminders: setHydrationRemindersState,
        setCoachConsentAccepted,
        setCoachMessages,
        setGoalCelebrationSeenTargetKg,
          });
        } catch (error) {
          coreFailure = error;
        }

        if (!coreFailure) {
          // Finish the in-memory core reset immediately after the durable
          // account-key removal. Auxiliary native cleanup below may be slow or
          // fail, but must not delay/undo this committed destructive boundary.
          setMealRemindersState(DEFAULT_MEAL_REMINDER_PREFS);
          setGoalReminderState(DEFAULT_GOAL_REMINDER_PREFS);
          const clearedNotificationPreferences = normalizeNotificationPreferences(undefined);
          setNotificationPreferencesState(clearedNotificationPreferences);
          notificationPreferencesRef.current = clearedNotificationPreferences;
          profileRef.current = null;
          logsRef.current = [];
          outboxRef.current = [];
          shoppingItemsRef.current = [];
          setThemePreference('system');
          setFontSizeScaleState('default');
          setProfilePhotoUriState(null);
          exportSnapshotRef.current = makeClearedExportSnapshot({
            getPlannerWeekStart,
            healthConnected: canSyncHealthConnection(healthConnectionRef.current),
            healthConnection: healthConnectionRef.current,
            notificationPreferences: clearedNotificationPreferences,
          });
        }

        // Attempt every independent cleanup even when another cleanup fails.
        // These run only after the core commit attempt, so an auxiliary native
        // failure can never prevent already-committed personal-data deletion.
        const cleanup = await Promise.allSettled([
          cancelNotificationPlanForClear(),
          clearNotificationInbox(accountId ?? null),
          coachFactConsentCache.clear(accountId ?? null),
          deleteProfilePhoto(FileSystem, accountId).then((result) => {
            if (!result.ok) throw new Error('profile-photo');
          }),
        ]);
        const cleanupNames = ['native schedules', 'notification inbox', 'coach cache', 'profile photo'];
        const cleanupFailures = cleanup.flatMap((result, index) =>
          result.status === 'rejected' ? [cleanupNames[index]] : []);

        if (coreFailure) {
          throw new ClearAllDataError('core-clear-failed', cleanupFailures, { cause: coreFailure });
        }

        if (cleanupFailures.length) {
          throw new ClearAllDataError('partial-cleanup', cleanupFailures);
        }
      } finally {
        clearingRef.current = false;
        setIsClearing(false);
      }
    },
     isClearing,
     retryHydration,
     isRetrying,
     setPlannerMeals: (weekStart, meals) => {
        const normalizedMeals = normalizePlannerMealImageIdentities(meals);
       const currentShoppingItems = shoppingItemsRef.current;
       const previousChecks = shoppingChecksByName(currentShoppingItems);
       const recipeItems = currentShoppingItems.filter((item) => item.recipeSource);
       const plannerBuilt = buildShoppingItems(normalizedMeals, previousChecks);
       const plannerNames = new Set(plannerBuilt.map((i) => shoppingNameKey(i.name)));
       const nextShopping = [...plannerBuilt, ...recipeItems.filter((r) => !plannerNames.has(shoppingNameKey(r.name))).map((r) => ({ ...r, checked: previousChecks.get(shoppingNameKey(r.name)) ?? r.checked }))];
       shoppingItemsRef.current = nextShopping;
       patchExportSnapshot({ plannerWeekStart: weekStart, plannerMeals: normalizedMeals, shoppingItems: nextShopping });
       updateExportField('livingMemory', (current) => replacePlannerObservations(current as LivingMemory, normalizedMeals));
       setPlannerWeekStart(weekStart);
       setPlannerMealsState(normalizedMeals);
       setShoppingItems(nextShopping);
       setPlannerRevision((revision) => revision + 1);
       setLivingMemory((current) => replacePlannerObservations(current, normalizedMeals));
      queueMutation('settings', 'upsert');
    },
     updatePlannerMeals: (meals) => {
        const normalizedMeals = normalizePlannerMealImageIdentities(meals);
       const currentShoppingItems = shoppingItemsRef.current;
       const previousChecks = shoppingChecksByName(currentShoppingItems);
       const recipeItems = currentShoppingItems.filter((item) => item.recipeSource);
       const plannerBuilt = buildShoppingItems(normalizedMeals, previousChecks);
       const plannerNames = new Set(plannerBuilt.map((i) => shoppingNameKey(i.name)));
       const nextShopping = [...plannerBuilt, ...recipeItems.filter((r) => !plannerNames.has(shoppingNameKey(r.name))).map((r) => ({ ...r, checked: previousChecks.get(shoppingNameKey(r.name)) ?? r.checked }))];
       shoppingItemsRef.current = nextShopping;
       patchExportSnapshot({ plannerMeals: normalizedMeals, shoppingItems: nextShopping });
       updateExportField('livingMemory', (current) => replacePlannerObservations(current as LivingMemory, normalizedMeals));
       setPlannerMealsState(normalizedMeals);
       setShoppingItems(nextShopping);
       setPlannerRevision((revision) => revision + 1);
       setLivingMemory((current) => replacePlannerObservations(current, normalizedMeals));
      queueMutation('settings', 'upsert');
    },
    movePlannerMeal: (mealId, day, copy) => {
      const existing = plannerMeals.find((meal) => meal.id === mealId);
      if (!existing) return;
      // Always deduplicate: remove any existing meal occupying the destination slot
      // before placing the moved/copied meal there. This prevents two meals of the
      // same type appearing in the same (day, mealType) slot.
      const next = copy
        ? [
            ...plannerMeals.filter((meal) => !(meal.day === day && meal.meal === existing.meal)),
            { ...existing, id: makeId('planned'), day },
          ]
        : [
            ...plannerMeals.filter((meal) => meal.id !== mealId && !(meal.day === day && meal.meal === existing.meal)),
            { ...existing, day },
          ];
       const currentShoppingItems = shoppingItemsRef.current;
       const previousChecks = shoppingChecksByName(currentShoppingItems);
       const recipeItems = currentShoppingItems.filter((item) => item.recipeSource);
      const plannerBuilt = buildShoppingItems(next, previousChecks);
       const plannerNames = new Set(plannerBuilt.map((i) => shoppingNameKey(i.name)));
      const nextShopping = [...plannerBuilt, ...recipeItems.filter((r) => !plannerNames.has(shoppingNameKey(r.name))).map((r) => ({ ...r, checked: previousChecks.get(shoppingNameKey(r.name)) ?? r.checked }))];
      shoppingItemsRef.current = nextShopping;
      patchExportSnapshot({ plannerMeals: next, shoppingItems: nextShopping });
      updateExportField('livingMemory', (current) => replacePlannerObservations(current as LivingMemory, next));
      setPlannerMealsState(next);
       setShoppingItems(nextShopping);
       setPlannerRevision((revision) => revision + 1);
      setLivingMemory((current) => replacePlannerObservations(current, next));
      queueMutation('settings', 'upsert');
    },
    toggleShoppingItem: (itemId) => {
      updateExportField('shoppingItems', (current) => (current as ShoppingItem[]).map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item));
      shoppingItemsRef.current = shoppingItemsRef.current.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item);
      setShoppingItems((items) => items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item));
      queueMutation('settings', 'upsert');
    },
    toggleShoppingItemByName: (name) => {
       const key = shoppingNameKey(name);
       updateExportField('shoppingItems', (current) => (current as ShoppingItem[]).map((item) => shoppingNameKey(item.name) === key ? { ...item, checked: !item.checked } : item));
       shoppingItemsRef.current = shoppingItemsRef.current.map((item) => shoppingNameKey(item.name) === key ? { ...item, checked: !item.checked } : item);
       setShoppingItems((items) => items.map((item) => shoppingNameKey(item.name) === key ? { ...item, checked: !item.checked } : item));
      queueMutation('settings', 'upsert');
    },
    addIngredientsToShopping: (ingredients, sourceId) => {
      updateExportField('shoppingItems', (current) => {
        const next = [...current as ShoppingItem[]];
        ingredients.forEach((ingredient) => {
          const name = ingredient.trim().replace(/\s+/g, ' ');
          const key = name.toLocaleLowerCase();
          if (!next.some((item) => item.name.toLocaleLowerCase() === key)) {
            next.push({ id: `recipe-shop-${sourceId}-${key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}`, name, quantity: 1, checked: false, recipeSource: true, sourceMealIds: [sourceId] });
          }
        });
        return next;
      });
      setShoppingItems((prev) => {
        const next = [...prev];
        ingredients.forEach((ingredient) => {
          const name = ingredient.trim().replace(/\s+/g, ' ');
          const key = name.toLocaleLowerCase();
          if (!next.some((i) => i.name.toLocaleLowerCase() === key)) {
            next.push({ id: `recipe-shop-${sourceId}-${key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}`, name, quantity: 1, checked: false, recipeSource: true, sourceMealIds: [sourceId] });
          }
        });
        return next;
      });
       setPlannerRevision((revision) => revision + 1);
      queueMutation('settings', 'upsert');
    },
     setCoachConsentAccepted: (accepted) => {
       patchExportSnapshot({ coachConsentAccepted: accepted });
       setCoachConsentAccepted(accepted);
     },
     setCoachMessages: (messages) => {
       const next = messages.slice(-12);
       patchExportSnapshot({ coachMessages: next });
       setCoachMessages(next);
     },
     clearCoachHistory: () => {
       patchExportSnapshot({ coachMessages: [] });
       setCoachMessages([]);
     },
     plannerViewedDay,
     setPlannerViewedDay,
     recipeSlotTarget,
     setRecipeSlotTarget,
     pendingUndoSwap,
     setPendingUndoSwap,
     pendingPlannerAck,
     setPendingPlannerAck,
      postLogInsight,
      clearPostLogInsight,
     goalCelebrationSeenTargetKg,
     markGoalCelebrationSeen: (targetKg: number) => {
       patchExportSnapshot({ goalCelebrationSeenTargetKg: targetKg });
       setGoalCelebrationSeenTargetKg(targetKg);
     },
     resetGoalCelebrationSeen: () => {
       patchExportSnapshot({ goalCelebrationSeenTargetKg: null });
       setGoalCelebrationSeenTargetKg(null);
     },
       }), [activityLogs, activityMinutesLogs, coachConsentAccepted, coachMessages, consentAccepted, fontScale, fontSizeScale, foodDrafts, foodMemories, goalCelebrationSeenTargetKg, goalReminder, healthConnected, hydrated, hydrationError, hydrationErrorKind, hydrationReminders, isClearing, isRetrying, livingMemory, livingState, localRecipes, logs, mealReminders, memoryCorrections, mode, moodLogs, notificationPreferences, notificationScopeReady, onboardingComplete, onboardingStep, outbox, pendingPlannerAck, pendingUndoSwap, plannerMeals, plannerPreferences, plannerRevision, plannerWeekStart, plannerViewedDay, postLogInsight, profile, profilePhotoUri, recipeSlotTarget, rememberedFoodMemories, repeatPatterns, savedMeals, savedRecipeIds, shoppingItems, themePreference, waterLogs, weights]);

  return <CaloraContext.Provider value={value}>{children}</CaloraContext.Provider>;
}


export function useCalora() {
  const context = useContext(CaloraContext);
  if (!context) throw new Error('useCalora must be used inside CaloraProvider');
  return context;
}

export { starterProfile };
