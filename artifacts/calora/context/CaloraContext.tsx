import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export type ThemePreference = 'system' | 'light' | 'dark';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type FoodLog = {
  id: string;
  name: string;
  meal: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'USDA verified' | 'Brand verified' | 'Photo estimate' | 'Manual';
  confidence: number;
  time: string;
};

type CaloraState = {
  logs: FoodLog[];
  themePreference: ThemePreference;
};

type CaloraContextValue = {
  logs: FoodLog[];
  themePreference: ThemePreference;
  mode: 'light' | 'dark';
  colors: typeof colors.light;
  addLog: (log: Omit<FoodLog, 'id'>) => void;
  removeLog: (id: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = '@calora/local-state-v1';

const starterLogs: FoodLog[] = [
  {
    id: 'starter-oats',
    name: 'Overnight oats with berries',
    meal: 'Breakfast',
    calories: 420,
    protein: 18,
    carbs: 58,
    fat: 14,
    source: 'USDA verified',
    confidence: 98,
    time: '8:10 AM',
  },
  {
    id: 'starter-salad',
    name: 'Chicken harvest salad',
    meal: 'Lunch',
    calories: 510,
    protein: 38,
    carbs: 34,
    fat: 25,
    source: 'Brand verified',
    confidence: 95,
    time: '12:45 PM',
  },
  {
    id: 'starter-apple',
    name: 'Honeycrisp apple',
    meal: 'Snack',
    calories: 95,
    protein: 0,
    carbs: 25,
    fat: 0,
    source: 'USDA verified',
    confidence: 99,
    time: '3:20 PM',
  },
];

const CaloraContext = createContext<CaloraContextValue | null>(null);

export function CaloraProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [logs, setLogs] = useState<FoodLog[]>(starterLogs);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Partial<CaloraState>;
          if (saved.logs) setLogs(saved.logs);
          if (saved.themePreference) setThemePreference(saved.themePreference);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: CaloraState = { logs, themePreference };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [hydrated, logs, themePreference]);

  const mode = themePreference === 'system'
    ? systemScheme === 'dark' ? 'dark' : 'light'
    : themePreference;

  const value = useMemo<CaloraContextValue>(() => ({
    logs,
    themePreference,
    mode,
    colors: mode === 'dark' ? colors.dark : colors.light,
    addLog: (log) => setLogs((current) => [
      ...current,
      { ...log, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    ]),
    removeLog: (id) => setLogs((current) => current.filter((log) => log.id !== id)),
    setThemePreference,
  }), [logs, mode, themePreference]);

  return <CaloraContext.Provider value={value}>{children}</CaloraContext.Provider>;
}

export function useCalora() {
  const context = useContext(CaloraContext);
  if (!context) throw new Error('useCalora must be used inside CaloraProvider');
  return context;
}