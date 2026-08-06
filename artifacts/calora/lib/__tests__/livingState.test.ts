import { describe, expect, it } from 'vitest';
import { deriveLivingState } from '../livingState';
import type { FoodLog, Profile } from '@/context/CaloraContext';

const profile: Profile = {
  name: 'Alex Morgan',
  goal: 'maintain',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 172,
  weightKg: 76,
  targetWeightKg: 76,
  age: 31,
  calorieTarget: 2000,
};

const log = (date: string, meal: FoodLog['meal']): FoodLog => ({
  id: `${date}-${meal}`,
  name: meal,
  date,
  meal,
  calories: 400,
  protein: 20,
  carbs: 40,
  fat: 12,
  source: 'USDA verified',
  confidence: 95,
  time: '12:00 PM',
  serving: '1 serving',
});

describe('deriveLivingState', () => {
  it('starts a new user with one useful first action', () => {
    const state = deriveLivingState({
      profile: null,
      logs: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: false,
      now: new Date('2026-08-06T08:00:00.000Z'),
    });

    expect(state.routineStage).toBe('first_day');
    expect(state.focus).toBe('breakfast');
    expect(state.action.label).toBe('Log breakfast');
    expect(state.headline).toBe('Start with one meal.');
  });

  it('responds to an afternoon without lunch or hydration', () => {
    const today = '2026-08-06';
    const state = deriveLivingState({
      profile,
      logs: [log(today, 'Breakfast')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-06T15:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('afternoon');
    expect(state.focus).toBe('lunch');
    expect(state.action.label).toBe('Add lunch');
    expect(state.signal.mealsToday).toBe(1);
  });

  it('recognizes a consistent evening and offers reflection', () => {
    const days = Array.from({ length: 7 }, (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`);
    const logs = days.flatMap((date) => [log(date, 'Breakfast'), log(date, 'Lunch'), log(date, 'Dinner')]);
    const state = deriveLivingState({
      profile,
      logs,
      waterLogs: Object.fromEntries(days.map((date) => [date, 32])),
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-07T20:00:00.000Z'),
    });

    expect(state.routineStage).toBe('consistent');
    expect(state.focus).toBe('reflection');
    expect(state.action.kind).toBe('view_progress');
  });

  it('marks a user as returning after a meaningful gap', () => {
    const state = deriveLivingState({
      profile,
      logs: [log('2026-08-02', 'Dinner')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-06T10:00:00.000Z'),
    });

    expect(state.routineStage).toBe('returning');
    expect(state.headline).toBe('Welcome back.');
    expect(state.action.kind).toBe('log_meal');
  });
});