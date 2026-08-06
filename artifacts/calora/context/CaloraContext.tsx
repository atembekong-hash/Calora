import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export type ThemePreference = 'system' | 'light' | 'dark';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type DietPreference = 'Everything' | 'Vegetarian' | 'Vegan' | 'High protein';
export type FoodSource = 'USDA verified' | 'Brand verified' | 'Photo estimate' | 'Manual' | 'Recipe';

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
};

export type WeightEntry = { id: string; date: string; kg: number; source: 'manual' | 'health' };
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
  onboardingComplete: boolean;
  profile: Profile | null;
  logs: FoodLog[];
  weights: WeightEntry[];
  savedMeals: SavedMeal[];
  localRecipes: CaloraRecipe[];
  savedRecipeIds: string[];
  themePreference: ThemePreference;
  healthConnected: boolean;
  consentAccepted: boolean;
  outbox: OutboxMutation[];
};

type CaloraContextValue = {
  logs: FoodLog[];
  weights: WeightEntry[];
  savedMeals: SavedMeal[];
  localRecipes: CaloraRecipe[];
  savedRecipeIds: string[];
  profile: Profile | null;
  onboardingComplete: boolean;
  themePreference: ThemePreference;
  mode: 'light' | 'dark';
  colors: typeof colors.light;
  syncState: SyncState;
  pendingMutations: OutboxMutation[];
  healthConnected: boolean;
  addLog: (log: Omit<FoodLog, 'id'>) => void;
  updateLog: (id: string, patch: Partial<FoodLog>) => void;
  removeLog: (id: string) => void;
  addWeight: (kg: number, source?: WeightEntry['source']) => void;
  saveMeal: (meal: Omit<SavedMeal, 'id'>) => void;
  saveRecipe: (recipe: Omit<CaloraRecipe, 'id'>) => void;
  toggleSavedRecipe: (recipeId: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
  completeOnboarding: (profile: Profile, consentAccepted: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setHealthConnected: (connected: boolean) => void;
  clearOutbox: () => void;
  exportData: () => Promise<string>;
  clearAllData: () => Promise<void>;
};

const STORAGE_KEY = '@calora/local-state-v2';
const today = new Date().toISOString().slice(0, 10);

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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [localRecipes, setLocalRecipes] = useState<CaloraRecipe[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [healthConnected, setHealthConnected] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [outbox, setOutbox] = useState<OutboxMutation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<CaloraState>;
        if (saved.onboardingComplete !== undefined) setOnboardingComplete(saved.onboardingComplete);
        if (saved.profile) setProfile(saved.profile);
        if (saved.logs) setLogs(saved.logs.map((log) => ({ ...log, date: log.date ?? today, serving: log.serving ?? '1 serving' })));
        if (saved.weights) setWeights(saved.weights);
        if (saved.savedMeals) setSavedMeals(saved.savedMeals.map((meal) => ({ ...meal, kind: meal.kind ?? 'meal' })));
        if (saved.localRecipes) setLocalRecipes(saved.localRecipes);
        if (saved.savedRecipeIds) setSavedRecipeIds(saved.savedRecipeIds);
        if (saved.themePreference) setThemePreference(saved.themePreference);
        if (saved.healthConnected !== undefined) setHealthConnected(saved.healthConnected);
        if (saved.consentAccepted !== undefined) setConsentAccepted(saved.consentAccepted);
        if (saved.outbox) setOutbox(saved.outbox);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: CaloraState = {
      onboardingComplete,
      profile,
      logs,
      weights,
      savedMeals,
      localRecipes,
      savedRecipeIds,
      themePreference,
      healthConnected,
      consentAccepted,
      outbox,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [consentAccepted, healthConnected, hydrated, localRecipes, logs, onboardingComplete, outbox, profile, savedMeals, savedRecipeIds, themePreference, weights]);

  const mode = themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePreference;
  const queueMutation = (entity: OutboxMutation['entity'], operation: OutboxMutation['operation']) => {
    setOutbox((current) => [...current, { id: makeId('mutation'), entity, operation, createdAt: new Date().toISOString() }]);
  };
  const value = useMemo<CaloraContextValue>(() => ({
    logs,
    weights,
    savedMeals,
    localRecipes,
    savedRecipeIds,
    profile,
    onboardingComplete,
    themePreference,
    mode,
    colors: mode === 'dark' ? colors.dark : colors.light,
    syncState: hydrated ? (outbox.length > 0 ? 'needs-connection' : 'local') : 'offline',
    pendingMutations: outbox,
    healthConnected,
    addLog: (log) => {
      setLogs((current) => [...current, { ...log, id: makeId('log') }]);
      queueMutation('diaryEntry', 'upsert');
    },
    updateLog: (id, patch) => {
      setLogs((current) => current.map((log) => log.id === id ? { ...log, ...patch } : log));
      queueMutation('diaryEntry', 'upsert');
    },
    removeLog: (id) => {
      setLogs((current) => current.filter((log) => log.id !== id));
      queueMutation('diaryEntry', 'delete');
    },
    addWeight: (kg, source = 'manual') => {
      setWeights((current) => [...current, { id: makeId('weight'), date: today, kg, source }]);
      queueMutation('weight', 'upsert');
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
    setHealthConnected,
    clearOutbox: () => setOutbox([]),
    exportData: async () => JSON.stringify({ profile, logs, weights, savedMeals, localRecipes, savedRecipeIds, consentAccepted }, null, 2),
    clearAllData: async () => {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setLogs([]);
      setWeights([]);
      setSavedMeals([]);
      setLocalRecipes([]);
      setSavedRecipeIds([]);
      setProfile(null);
      setOnboardingComplete(false);
      setConsentAccepted(false);
      setOutbox([]);
    },
  }), [consentAccepted, healthConnected, hydrated, localRecipes, logs, mode, onboardingComplete, outbox, profile, savedMeals, savedRecipeIds, themePreference, weights]);

  return <CaloraContext.Provider value={value}>{children}</CaloraContext.Provider>;
}

export function useCalora() {
  const context = useContext(CaloraContext);
  if (!context) throw new Error('useCalora must be used inside CaloraProvider');
  return context;
}

export { starterProfile };