/**
 * @vitest-environment jsdom
 *
 * A Planner copy must preserve the source meal and create an independent
 * destination instance. This exercises the real CaloraProvider mutation and
 * its snapshot/update path, rather than a standalone helper only.
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

function plannerMeal(id: string, day: string, meal: PlannerMeal['meal'] = 'Breakfast'): PlannerMeal {
  return {
    id,
    day,
    meal,
    name: 'Copy retention fixture',
    image: '',
    serving: '1 serving',
    calories: 400,
    proteinG: 20,
    carbsG: 35,
    fatG: 14,
    ingredients: ['oats', 'berries'],
    description: '',
  };
}

beforeEach(() => {
  Object.keys(asyncStore).forEach((key) => { delete asyncStore[key]; });
});

describe('Planner copy retention through real CaloraProvider', () => {
  it('retains the source, creates a distinct destination ID, and continues to reject occupied copies', async () => {
    const { result } = await renderAndAwaitHydration();
    const source = plannerMeal('source-breakfast', '2026-10-04');
    const unrelated = plannerMeal('unrelated-dinner', '2026-10-05', 'Dinner');

    await act(async () => {
      result.current.updatePlannerMeals([source, unrelated]);
    });

    let outcome: ReturnType<typeof result.current.movePlannerMeal>;
    await act(async () => {
      outcome = result.current.movePlannerMeal(source.id, '2026-10-05', true);
    });

    expect(outcome!).toBe('applied');
    const sourceAfterCopy = result.current.plannerMeals.find((meal) => meal.id === source.id);
    const copied = result.current.plannerMeals.find(
      (meal) => meal.id !== source.id && meal.day === '2026-10-05' && meal.meal === source.meal,
    );
    expect(sourceAfterCopy).toMatchObject({ id: source.id, day: '2026-10-04', meal: 'Breakfast' });
    expect(copied).toMatchObject({ day: '2026-10-05', meal: 'Breakfast', name: source.name });
    expect(copied?.id).not.toBe(source.id);
    expect(result.current.plannerMeals).toHaveLength(3);

    await act(async () => {
      outcome = result.current.movePlannerMeal(source.id, '2026-10-05', true);
    });
    expect(outcome!).toBe('occupied');
    expect(result.current.plannerMeals).toHaveLength(3);
  });
});
