import { describe, expect, it } from 'vitest';
import type { PlannerMeal } from '@workspace/api-client-react';
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

const planned = (id: string, day: string, meal: PlannerMeal['meal']): PlannerMeal => ({
  id,
  day,
  meal,
  name: `${meal} plan`,
  image: '',
  serving: '1 serving',
  calories: 400,
  proteinG: 20,
  carbsG: 40,
  fatG: 12,
  ingredients: ['ingredient'],
  description: 'A planned meal.',
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
    expect(state.category).toBe('first_day');
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
    expect(state.category).toBe('incomplete_day');
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
    expect(state.category).toBe('reflection_ready');
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
    expect(state.category).toBe('returning_after_gap');
    expect(state.headline).toBe('Welcome back.');
    expect(state.action.kind).toBe('log_meal');
  });

  it('keeps early habit explicit when history is still sparse', () => {
    const state = deriveLivingState({
      profile,
      logs: [log('2026-08-06', 'Breakfast')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-06T09:00:00.000Z'),
    });

    expect(state.routineStage).toBe('building');
    expect(state.category).toBe('early_habit');
  });

  it('recognizes plan-ready context only from upcoming assigned meals', () => {
    const plannerMeals = [
      planned('p1', '2026-08-07', 'Breakfast'),
      planned('p2', '2026-08-07', 'Lunch'),
      planned('p3', '2026-08-08', 'Dinner'),
    ];
    const state = deriveLivingState({
      profile,
      logs: [
        ...Array.from({ length: 5 }, (_, index) => log(`2026-08-0${index + 1}`, 'Dinner')),
        log('2026-08-06', 'Breakfast'),
        log('2026-08-06', 'Lunch'),
        log('2026-08-06', 'Dinner'),
      ],
      waterLogs: { '2026-08-06': 32 },
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals,
      onboardingComplete: true,
      now: new Date('2026-08-06T12:00:00.000Z'),
    });

    expect(state.category).toBe('plan_ready');
    expect(state.action.kind).toBe('open_planner');
    expect(state.signal.plannedMealsNext7).toBe(3);
    expect(state.signal.plannedDaysNext7).toBe(2);
  });

  it('keeps an urgent hydration need ahead of plan readiness', () => {
    const plannerMeals = [
      planned('p1', '2026-08-07', 'Breakfast'),
      planned('p2', '2026-08-07', 'Lunch'),
      planned('p3', '2026-08-08', 'Dinner'),
    ];
    const state = deriveLivingState({
      profile,
      logs: [
        log('2026-08-06', 'Breakfast'),
        log('2026-08-06', 'Lunch'),
      ],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals,
      onboardingComplete: true,
      now: new Date('2026-08-06T15:00:00.000Z'),
    });

    expect(state.category).not.toBe('plan_ready');
    expect(state.focus).toBe('hydration');
    expect(state.action.kind).toBe('add_water');
  });
});