/**
 * @vitest-environment jsdom
 *
 * Recipe-detail shopping entries must survive a later Planner context update.
 *
 * The production flow is Recipe detail → select ingredients → Add to list →
 * Planner.  Planner mutations derive their next shopping collection from the
 * provider's authoritative ref, so this integration test exercises the real
 * provider boundary rather than only a pure collection helper.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const asyncStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStore[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { asyncStore[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete asyncStore[key]; }),
  },
}));

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync: vi.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
}));

vi.mock('react-native', () => ({
  useColorScheme: vi.fn().mockReturnValue('light'),
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
}));

import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type { PlannerMeal } from '@workspace/api-client-react';
import { CaloraProvider, useCalora } from '@/context/CaloraContext';
import { shoppingNameKey } from '@/data/planner';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CaloraProvider, null, children);
}

async function renderAndAwaitHydration() {
  const handle = renderHook(() => useCalora(), { wrapper });
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  return handle;
}

function plannerMeal(id: string, ingredients: string[]): PlannerMeal {
  return {
    id,
    day: '2026-10-04',
    meal: 'Dinner',
    name: 'Planner refresh meal',
    image: '',
    serving: '1 serving',
    calories: 400,
    proteinG: 20,
    carbsG: 35,
    fatG: 14,
    ingredients,
    description: '',
  };
}

beforeEach(() => {
  Object.keys(asyncStore).forEach((key) => { delete asyncStore[key]; });
});

describe('recipe-detail shopping persistence through real CaloraProvider', () => {
  it('retains normalized recipe-source rows when the next Planner update shares the same React batch', async () => {
    const { result } = await renderAndAwaitHydration();

    await act(async () => {
      // These names are deliberately absent from the starter Planner fixture.
      // A planner-overlap has its own canonical planner row and is not a
      // recipe-source duplicate.
      result.current.addIngredientsToShopping(['  Ground   Pork  ', 'Duck Sauce'], 'source-recipe');
      // A context mutation may follow before React has committed the first
      // render. The authoritative ref must already contain source rows or this
      // Planner rebuild silently drops the confirmed shopping selection.
      result.current.updatePlannerMeals([plannerMeal('planner-refresh', ['Lettuce'])]);
    });

    const sourceRows = result.current.shoppingItems.filter((item) => item.recipeSource);
    expect(sourceRows.map((item) => item.name)).toEqual(['Ground Pork', 'Duck Sauce']);

    await act(async () => {
      result.current.addIngredientsToShopping([' ground pork ', ' DUCK SAUCE '], 'source-recipe');
    });

    const sourceKeys = result.current.shoppingItems
      .filter((item) => item.recipeSource)
      .map((item) => shoppingNameKey(item.name));
    expect(sourceKeys).toEqual(['ground pork', 'duck sauce']);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
  });
});
