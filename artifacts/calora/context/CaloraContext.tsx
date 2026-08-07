import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { shouldAutosave, type HydrationErrorKind } from '@/lib/hydrationGuard';
import { useHydrationEffect } from '@/lib/useHydrationEffect';
import { PersistenceManager } from '@/lib/persistenceManager';
import { performClearAllData, DEFAULT_HYDRATION_PREFS } from '@/lib/clearAllData';
import { buildExportPayload, readRawStorageData } from '@/lib/exportPayload';
import { makeClearedExportSnapshot, resolveExportData } from '@/lib/exportGap';
import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import type { CoachMessage, PlannerMeal } from '@workspace/api-client-react';
import type { HydrationReminderPrefs } from '@/lib/hydrationReminders';
import { buildShoppingItems, createStarterPlannerMeals, getPlannerWeekStart } from '@/data/planner';
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
import { dateKey } from '@/lib/dates';
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
export type ThemePreference = 'system' | 'light' | 'dark';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type DietPreference = 'Everything' | 'Vegetarian' | 'Vegan' | 'High protein';
export type FoodSource = 'USDA verified' | 'Brand verified' | 'Barcode verified' | 'Photo estimate' | 'Manual' | 'Recipe';

export type FoodLog = {
  id: string;
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
  category?: string | null;
  area?: string | null;
  description?: string | null;
  instructions?: string | null;
  ingredients: string[];
  tags: string[];
  prepMinutes?: number | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  source: string;
  sourceUrl: string;
  isLocal?: boolean;
};
export type ShoppingItem = { id: string; name: string; quantity: number; checked: boolean; sourceMealIds?: string[]; days?: string[] };

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
  coachConsentAccepted: boolean;
  coachMessages: CoachMessage[];
  livingMemory?: LivingMemory;
  /** The target weight (kg) for which the goal-reached celebration has already been shown. Prevents repeat on reload. */
  goalCelebrationSeenTargetKg?: number;
};

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
  hydrated: boolean;
  hydrationError: string | null;
  hydrationErrorKind: HydrationErrorKind | null;
  themePreference: ThemePreference;
  mode: 'light' | 'dark';
  colors: typeof colors.light;
  syncState: SyncState;
  pendingMutations: OutboxMutation[];
  healthConnected: boolean;
  hydrationReminders: HydrationReminderPrefs;
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
   */
  pendingPlannerAck: string | null;
  setPendingPlannerAck: (message: string | null) => void;
  forgetLivingObservation: (kind: 'meal' | 'water' | 'mood' | 'activity' | 'planner', id: string) => void;
  setCoachConsentAccepted: (accepted: boolean) => void;
  setCoachMessages: (messages: CoachMessage[]) => void;
  clearCoachHistory: () => void;
  setHydrationReminders: (prefs: HydrationReminderPrefs) => void;
  addLog: (log: Omit<FoodLog, 'id'>) => void;
  updateLog: (id: string, patch: Partial<FoodLog>) => void;
  removeLog: (id: string) => void;
  addWeight: (kg: number, source?: WeightEntry['source']) => void;
  addWater: (date: string, ounces?: number) => void;
  setMood: (date: string, mood: Mood) => void;
  setActivity: (date: string, activity: DailyActivity) => void;
  setActivityMinutes: (date: string, minutes: number) => void;
  saveMeal: (meal: Omit<SavedMeal, 'id'>) => void;
  saveRecipe: (recipe: Omit<CaloraRecipe, 'id'>) => void;
  toggleSavedRecipe: (recipeId: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
  completeOnboarding: (profile: Profile, consentAccepted: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setHealthConnected: (connected: boolean) => void;
  clearOutbox: () => void;
  exportData: () => Promise<string>;
  exportRawStorageData: () => Promise<string | null>;
  clearAllData: () => Promise<void>;
  retryHydration: () => void;
  /** The target weight (kg) for which the goal celebration was already displayed. Null means it hasn't been shown yet. */
  goalCelebrationSeenTargetKg: number | null;
  /** Call once when the celebration banner is first shown so it won't appear again on reload. */
  markGoalCelebrationSeen: (targetKg: number) => void;
  plannerWeekStart: string;
  plannerMeals: PlannerMeal[];
  shoppingItems: ShoppingItem[];
  foodDrafts: FoodMemoryDraft[];
  foodMemories: AcceptedFoodMemory[];
  repeatPatterns: RepeatPattern[];
  createFoodMemoryDraft: (analysis: CaptureAnalysis, date?: string, meal?: MealType) => FoodMemoryDraft;
  createFoodMemorySourceDraft: (input: Parameters<typeof sourceComponentsToDraft>[0]) => FoodMemoryDraft;
  createRecipeDraft: (recipe: { id: string; name: string; calories?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; source: string; isLocal?: boolean }, date?: string, meal?: MealType) => FoodMemoryDraft;
  createPlannerDraft: (meal: PlannerMeal) => FoodMemoryDraft;
  updateFoodMemoryDraft: (draftId: string, components: FoodMemoryComponent[]) => void;
  acceptFoodMemory: (draftId: string) => FoodLog | null;
  rejectFoodMemory: (draftId: string) => void;
  teachRepeatMemory: (memoryId: string) => void;
  setPlannerMeals: (weekStart: string, meals: PlannerMeal[]) => void;
  updatePlannerMeals: (meals: PlannerMeal[]) => void;
  movePlannerMeal: (mealId: string, day: string, copy: boolean) => void;
  toggleShoppingItem: (itemId: string) => void;
  toggleShoppingItemByName: (name: string) => void;
};

const STORAGE_KEY = '@calora/local-state-v2';
const STORAGE_SCHEMA_VERSION = 2;
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

export function CaloraProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
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
  const [healthConnected, setHealthConnected] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [outbox, setOutbox] = useState<OutboxMutation[]>([]);
  const [plannerWeekStart, setPlannerWeekStart] = useState(getPlannerWeekStart());
  const [plannerMeals, setPlannerMealsState] = useState<PlannerMeal[]>(() => createStarterPlannerMeals());
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => buildShoppingItems(plannerMeals));
  const starterMemoryState = useMemo(() => migrateFoodMemories(undefined, starterLogs), []);
  const [foodDrafts, setFoodDrafts] = useState<FoodMemoryDraft[]>(starterMemoryState.foodDrafts);
  const [foodMemories, setFoodMemories] = useState<AcceptedFoodMemory[]>(starterMemoryState.foodMemories);
  const [repeatPatterns, setRepeatPatterns] = useState<RepeatPattern[]>(starterMemoryState.repeatPatterns);
  const [memoryCorrections, setMemoryCorrections] = useState<FoodMemoryCorrection[]>(starterMemoryState.memoryCorrections);
  const [hydrationReminders, setHydrationRemindersState] = useState<HydrationReminderPrefs>(DEFAULT_HYDRATION_PREFS);
  const [coachConsentAccepted, setCoachConsentAccepted] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [goalCelebrationSeenTargetKg, setGoalCelebrationSeenTargetKg] = useState<number | null>(null);
  const [livingMemory, setLivingMemory] = useState<LivingMemory>(() => buildLivingMemory({
    logs: starterLogs,
    waterLogs: {},
    moodLogs: {},
    activityLogs: {},
    plannerMeals,
  }));
  const pm = useRef(new PersistenceManager(AsyncStorage, STORAGE_KEY));
  /** Guard that prevents a second tap from entering clearAllData while the first is in progress. */
  const clearingRef = useRef(false);
  /**
   * Cleared-state snapshot set synchronously inside clearAllData after
   * performClearAllData resolves — before React commits the re-render triggered
   * by the state setters.  exportData reads from this ref so it always returns
   * the cleared payload even if called in the async gap before re-render.
   * The autosave useEffect clears the ref once React state has been committed.
   */
  const exportSnapshotRef = useRef<import('@/lib/exportPayload').CaloraExportState | null>(null);
  // Session-only navigation state (not persisted)
  const [plannerViewedDay, setPlannerViewedDay] = useState(dateKey());
  const [recipeSlotTarget, setRecipeSlotTarget] = useState<{ day: string; mealType: PlannerMeal['meal'] } | null>(null);
  const [pendingUndoSwap, setPendingUndoSwap] = useState<{ newMeal: PlannerMeal; originalMeal: PlannerMeal } | null>(null);
  const [pendingPlannerAck, setPendingPlannerAck] = useState<string | null>(null);

  const { hydrated, hydrationError, hydrationErrorKind, retryHydration } = useHydrationEffect<Partial<CaloraState>>(pm, (saved) => {
    if (!saved) return;
    if (saved.onboardingComplete !== undefined) setOnboardingComplete(saved.onboardingComplete);
    if (saved.profile) setProfile(saved.profile);
     const normalizedLogs = saved.logs?.map((log) => ({ ...log, date: log.date ?? today, serving: log.serving ?? '1 serving' })) ?? starterLogs;
     if (saved.logs) setLogs(normalizedLogs);
     const migratedMemories = migrateFoodMemories(saved, normalizedLogs);
     setFoodDrafts(migratedMemories.foodDrafts);
     setFoodMemories(migratedMemories.foodMemories);
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
    if (saved.healthConnected !== undefined) setHealthConnected(saved.healthConnected);
    if (saved.consentAccepted !== undefined) setConsentAccepted(saved.consentAccepted);
    if (saved.outbox) setOutbox(saved.outbox);
    if (saved.plannerWeekStart) setPlannerWeekStart(saved.plannerWeekStart);
    if (saved.plannerMeals) setPlannerMealsState(saved.plannerMeals);
    if (saved.shoppingItems) setShoppingItems(saved.shoppingItems);
    if (saved.hydrationReminders) setHydrationRemindersState(saved.hydrationReminders);
     if (saved.coachConsentAccepted !== undefined) setCoachConsentAccepted(saved.coachConsentAccepted);
     if (saved.coachMessages) setCoachMessages(saved.coachMessages);
     if (saved.goalCelebrationSeenTargetKg !== undefined) setGoalCelebrationSeenTargetKg(saved.goalCelebrationSeenTargetKg ?? null);
  });

  useEffect(() => {
    if (!shouldAutosave({ hydrated, error: hydrationError })) return;
    // React state has been committed — the cleared snapshot ref (set by clearAllData
    // before re-render) is no longer needed; exportData will now read the live state.
    exportSnapshotRef.current = null;
    const state: CaloraState = {
      onboardingComplete,
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
      consentAccepted,
      outbox,
      plannerWeekStart,
      plannerMeals,
      shoppingItems,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      foodDrafts,
      foodMemories,
      repeatPatterns,
      memoryCorrections,
      hydrationReminders,
      coachConsentAccepted,
      coachMessages,
      livingMemory,
      goalCelebrationSeenTargetKg: goalCelebrationSeenTargetKg ?? undefined,
    };
     pm.current.enqueueWrite(state);
  }, [activityLogs, activityMinutesLogs, coachConsentAccepted, coachMessages, consentAccepted, foodDrafts, foodMemories, goalCelebrationSeenTargetKg, healthConnected, hydrated, hydrationError, hydrationReminders, livingMemory, localRecipes, logs, memoryCorrections, moodLogs, onboardingComplete, outbox, plannerMeals, plannerWeekStart, profile, repeatPatterns, savedMeals, savedRecipeIds, shoppingItems, themePreference, waterLogs, weights]);

  const mode = themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePreference;
  const queueMutation = (entity: OutboxMutation['entity'], operation: OutboxMutation['operation']) => {
    setOutbox((current) => [...current, { id: makeId('mutation'), entity, operation, createdAt: new Date().toISOString() }]);
  };
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
  const clockNow = useClock();
  const livingState = useMemo(() => deriveLivingState({
    profile,
    ...rememberedSources,
    repeatPatterns,
    onboardingComplete,
    now: clockNow,
  }), [clockNow, onboardingComplete, profile, rememberedSources, repeatPatterns]);

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
    shoppingItems,
    foodDrafts,
    foodMemories: rememberedFoodMemories,
    repeatPatterns,
    healthConnected,
    addLog: (log) => {
      const id = makeId('log');
      const capturedAt = new Date().toISOString();
      const nextLog = {
        ...log,
        id,
        nutritionSnapshot: {
          calories: log.calories,
          proteinG: log.protein,
          carbsG: log.carbs,
          fatG: log.fat,
          capturedAt,
        },
      };
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
        nutrition: nextLog.nutritionSnapshot,
        originalNutrition: nextLog.nutritionSnapshot,
        provenance: component.provenance,
        sourceLabel: log.source,
        confidence: log.confidence,
        confidenceDimensions: component.confidenceDimensions,
        assumptions: [],
        reviewQuestions: [],
        imageRetention: 'not_collected',
        createdAt: capturedAt,
        updatedAt: capturedAt,
        acceptedAt: capturedAt,
        diaryLogId: id,
        correctionIds: [],
      };
      setLogs((current) => [...current, nextLog]);
      setFoodMemories((current) => [...current, acceptedMemory]);
      setLivingMemory((current) => upsertMealObservation(current, id, nextLog.date, nextLog.meal));
      queueMutation('diaryEntry', 'upsert');
    },
    updateLog: (id, patch) => {
      const existing = logs.find((log) => log.id === id);
      const updated = existing ? { ...existing, ...patch } : null;
      if (updated) {
        setLivingMemory((memory) => upsertMealObservation(
          removeMealObservation(memory, id),
          id,
          updated.date,
          updated.meal,
        ));
      }
      setLogs((current) => current.map((log) => log.id === id ? { ...log, ...patch } : log));
      queueMutation('diaryEntry', 'upsert');
    },
    removeLog: (id) => {
      setLogs((current) => current.filter((log) => log.id !== id));
      setFoodMemories((current) => current.filter((memory) => memory.diaryLogId !== id));
      setLivingMemory((current) => removeMealObservation(current, id));
      queueMutation('diaryEntry', 'delete');
    },
    createFoodMemoryDraft: (analysis, date = dateKey(), meal = 'Snack') => {
      const draft = captureAnalysisToDraft(analysis, date, meal);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    createFoodMemorySourceDraft: (input) => {
      const draft = sourceComponentsToDraft(input);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    createRecipeDraft: (recipe, date = dateKey(), meal = 'Dinner') => {
      const draft = recipeToDraft(recipe, date, meal);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    createPlannerDraft: (meal) => {
      const draft = plannerMealToDraft(meal);
      setFoodDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
      return draft;
    },
    updateFoodMemoryDraft: (draftId, components) => {
      setFoodDrafts((current) => current.map((draft) => draft.id === draftId ? updateDraftComponents(draft, components) : draft));
    },
    acceptFoodMemory: (draftId) => {
      const draft = foodDrafts.find((item) => item.id === draftId && item.status === 'draft');
      if (!draft) return null;
      if (draft.plannerMealId) {
        const existingPlannerLog = logs.find((log) => log.plannerMealId === draft.plannerMealId);
        if (existingPlannerLog) {
          setFoodDrafts((current) => current.filter((item) => item.id !== draftId));
          return existingPlannerLog;
        }
      }
      const logId = makeId('log');
      const acceptedAt = new Date().toISOString();
      const { log, memory } = buildAcceptResult(draft, logId, acceptedAt);
      setLogs((current) => [...current, log]);
      setFoodMemories((current) => [...current, memory]);
      setLivingMemory((current) => upsertMealObservation(current, log.id, log.date, log.meal));
      setFoodDrafts((current) => current.filter((item) => item.id !== draftId));
      setRepeatPatterns((current) => updateRepeatPatterns(current, memory, log, makeId('repeat'), acceptedAt));
      queueMutation('diaryEntry', 'upsert');
      return log;
    },
    rejectFoodMemory: (draftId) => {
      setFoodDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId ? buildRejectDraft(draft, new Date().toISOString()) : draft,
        ),
      );
    },
    teachRepeatMemory: (memoryId) => {
      const memory = foodMemories.find((item) => item.id === memoryId);
      if (!memory) return;
      const signature = memorySignature(memory);
      setRepeatPatterns((current) => current.some((pattern) => pattern.signature === signature) ? current : [...current, {
        id: makeId('repeat'),
        signature,
        title: memory.title,
        componentNames: memory.components.filter((component) => component.included).map((component) => component.name),
        serving: memory.components.filter((component) => component.included).map((component) => component.serving).join(' + '),
        useCount: 1,
        rejectedCount: 0,
        lastAcceptedAt: memory.acceptedAt,
        sourceMemoryId: memory.id,
      }]);
    },
    addWeight: (kg, source = 'manual') => {
      setWeights((current) => [...current, { id: makeId('weight'), date: dateKey(), kg, source }]);
      queueMutation('weight', 'upsert');
    },
    addWater: (date, ounces = 8) => {
      if (!Number.isFinite(ounces) || ounces <= 0) return;
      setWaterLogs((current) => ({ ...current, [date]: Math.max(0, (current[date] ?? 0) + ounces) }));
      setLivingMemory((current) => upsertWaterObservation(current, date, (current.waterObservations[date]?.ounces ?? waterLogs[date] ?? 0) + ounces));
      queueMutation('settings', 'upsert');
    },
    setMood: (date, mood) => {
      setMoodLogs((current) => ({ ...current, [date]: mood }));
      setLivingMemory((current) => upsertMoodObservation(current, date, mood));
      queueMutation('settings', 'upsert');
    },
    setActivity: (date, activity) => {
      setActivityLogs((current) => ({ ...current, [date]: activity }));
      setLivingMemory((current) => upsertActivityObservation(current, date, activity));
      queueMutation('settings', 'upsert');
    },
    setActivityMinutes: (date, minutes) => {
      if (!Number.isFinite(minutes) || minutes < 0) return;
      setActivityMinutesLogs((current) => ({ ...current, [date]: minutes }));
      queueMutation('settings', 'upsert');
    },
    saveMeal: (meal) => {
      setSavedMeals((current) => [...current, { ...meal, id: makeId('meal') }]);
      queueMutation('savedMeal', 'upsert');
    },
    saveRecipe: (recipe) => {
      setLocalRecipes((current) => [...current, { ...recipe, id: makeId('recipe'), isLocal: true }]);
      queueMutation('savedMeal', 'upsert');
    },
    toggleSavedRecipe: (recipeId) => {
      setSavedRecipeIds((current) => current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId]);
      queueMutation('savedMeal', 'upsert');
    },
    setThemePreference: (preference) => {
      setThemePreference(preference);
      queueMutation('settings', 'upsert');
    },
    completeOnboarding: (nextProfile, consent) => {
      setProfile(nextProfile);
      setConsentAccepted(consent);
      setOnboardingComplete(true);
      queueMutation('profile', 'upsert');
    },
    updateProfile: (patch) => {
      setProfile((current) => current ? { ...current, ...patch } : current);
      queueMutation('profile', 'upsert');
    },
    hydrationReminders,
    coachConsentAccepted,
    coachMessages,
    livingState,
     livingMemory,
      forgetLivingObservation: (kind, id) => {
       setLivingMemory((current) => ({ ...forgetMemoryObservation(current, kind, id) }));
       queueMutation('settings', 'upsert');
     },
    setHydrationReminders: (prefs: HydrationReminderPrefs) => {
      setHydrationRemindersState(prefs);
    },
    setHealthConnected,
    clearOutbox: () => setOutbox([]),
      exportRawStorageData: () => readRawStorageData(AsyncStorage.getItem.bind(AsyncStorage), STORAGE_KEY),
      exportData: async () => {
        // resolveExportData reads exportSnapshotRef.current first (the gap-bridge
        // set synchronously by clearAllData before React re-renders) and falls
        // through to the live closed-over state only when the ref is null.
        // See lib/exportGap.ts for the extracted production function.
        return resolveExportData(exportSnapshotRef, {
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
          plannerWeekStart,
          plannerMeals,
          shoppingItems,
          foodDrafts,
          foodMemories,
          repeatPatterns,
          memoryCorrections,
          livingMemory,
          hydrationReminders,
          healthConnected,
          consentAccepted,
          coachConsentAccepted,
          coachMessages,
        }, STORAGE_SCHEMA_VERSION);
      },
    clearAllData: async () => {
      if (clearingRef.current) return;
      clearingRef.current = true;
      try {
        await performClearAllData({
        pm: pm.current,
        emptyLivingMemory: emptyLivingMemory(),
        defaultHydrationPrefs: DEFAULT_HYDRATION_PREFS,
        getPlannerWeekStart,
        getToday: dateKey,
        setOnboardingComplete,
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
        // Build and assign the cleared export snapshot synchronously so that
        // exportData() (which calls resolveExportData) returns cleared values
        // even if called before React commits the re-render triggered by the
        // state setters above.  The autosave useEffect clears this ref once
        // React state is committed and the closed-over state vars are current.
        // See lib/exportGap.ts for the extracted production function.
        exportSnapshotRef.current = makeClearedExportSnapshot({
          getPlannerWeekStart,
          healthConnected,
          // hydrationReminders is intentionally omitted — makeClearedExportSnapshot
          // always resets to DEFAULT_HYDRATION_PREFS, never the stale closure value.
        });
      } finally {
        clearingRef.current = false;
      }
    },
     retryHydration,
    setPlannerMeals: (weekStart, meals) => {
      const previousChecks = new Map(shoppingItems.map((item) => [item.name, item.checked]));
      setPlannerWeekStart(weekStart);
      setPlannerMealsState(meals);
      setShoppingItems(buildShoppingItems(meals, previousChecks));
      setLivingMemory((current) => replacePlannerObservations(current, meals));
      queueMutation('settings', 'upsert');
    },
    updatePlannerMeals: (meals) => {
      const previousChecks = new Map(shoppingItems.map((item) => [item.name, item.checked]));
      setPlannerMealsState(meals);
      setShoppingItems(buildShoppingItems(meals, previousChecks));
      setLivingMemory((current) => replacePlannerObservations(current, meals));
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
      setPlannerMealsState(next);
      setShoppingItems(buildShoppingItems(next, new Map(shoppingItems.map((item) => [item.name, item.checked]))));
      setLivingMemory((current) => replacePlannerObservations(current, next));
      queueMutation('settings', 'upsert');
    },
    toggleShoppingItem: (itemId) => {
      setShoppingItems((items) => items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item));
      queueMutation('settings', 'upsert');
    },
    toggleShoppingItemByName: (name) => {
      setShoppingItems((items) => items.map((item) => item.name === name ? { ...item, checked: !item.checked } : item));
      queueMutation('settings', 'upsert');
    },
     setCoachConsentAccepted: (accepted) => setCoachConsentAccepted(accepted),
     setCoachMessages: (messages) => setCoachMessages(messages.slice(-12)),
     clearCoachHistory: () => setCoachMessages([]),
     plannerViewedDay,
     setPlannerViewedDay,
     recipeSlotTarget,
     setRecipeSlotTarget,
     pendingUndoSwap,
     setPendingUndoSwap,
     pendingPlannerAck,
     setPendingPlannerAck,
     goalCelebrationSeenTargetKg,
     markGoalCelebrationSeen: (targetKg: number) => setGoalCelebrationSeenTargetKg(targetKg),
     }), [activityLogs, activityMinutesLogs, coachConsentAccepted, coachMessages, consentAccepted, foodDrafts, foodMemories, goalCelebrationSeenTargetKg, healthConnected, hydrated, hydrationError, hydrationErrorKind, hydrationReminders, livingMemory, livingState, localRecipes, logs, memoryCorrections, mode, moodLogs, onboardingComplete, outbox, pendingPlannerAck, pendingUndoSwap, plannerMeals, plannerWeekStart, plannerViewedDay, profile, recipeSlotTarget, rememberedFoodMemories, repeatPatterns, savedMeals, savedRecipeIds, shoppingItems, themePreference, waterLogs, weights]);

  return <CaloraContext.Provider value={value}>{children}</CaloraContext.Provider>;
}


export function useCalora() {
  const context = useContext(CaloraContext);
  if (!context) throw new Error('useCalora must be used inside CaloraProvider');
  return context;
}

export { starterProfile };
