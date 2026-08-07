import { describe, expect, it } from 'vitest';
import type { PlannerMeal } from '@workspace/api-client-react';
import { deriveLivingState } from '../livingState';
import { resolveLivingActionEffect } from '../livingActionHandler';
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

  it('routes to log_meal with Log breakfast label on a returning morning without breakfast', () => {
    const state = deriveLivingState({
      profile,
      logs: [log('2026-08-03', 'Dinner'), log('2026-08-04', 'Dinner')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-07T08:30:00.000Z'),
    });

    expect(state.timePeriod).toBe('morning');
    expect(state.signal.hasBreakfastToday).toBe(false);
    expect(state.action.kind).toBe('log_meal');
    expect(state.action.label).toBe('Log breakfast');
  });

  it('routes to log_meal with Find a meal label when afternoon protein is low', () => {
    const lowProteinLog = (date: string): FoodLog => ({
      id: `${date}-snack`,
      name: 'Rice cake',
      date,
      meal: 'Snack',
      calories: 120,
      protein: 2,
      carbs: 26,
      fat: 0,
      source: 'Manual',
      confidence: 70,
      time: '10:00 AM',
      serving: '1 cake',
    });
    const state = deriveLivingState({
      profile,
      logs: [
        log('2026-08-06', 'Breakfast'),
        log('2026-08-06', 'Lunch'),
        lowProteinLog('2026-08-06'),
      ],
      waterLogs: { '2026-08-06': 32 },
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-06T15:30:00.000Z'),
    });

    expect(state.timePeriod).toBe('afternoon');
    expect(state.focus).toBe('protein');
    expect(state.action.kind).toBe('log_meal');
    expect(state.action.label).toBe('Find a meal');
  });

  it('uses timePeriod from now.getHours at each boundary', () => {
    const base = {
      profile,
      logs: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: false,
    };

    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T06:00:00.000Z') }).timePeriod).toBe('morning');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T10:59:00.000Z') }).timePeriod).toBe('morning');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T11:00:00.000Z') }).timePeriod).toBe('midday');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T13:59:00.000Z') }).timePeriod).toBe('midday');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T14:00:00.000Z') }).timePeriod).toBe('afternoon');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T17:59:00.000Z') }).timePeriod).toBe('afternoon');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T18:00:00.000Z') }).timePeriod).toBe('evening');
    expect(deriveLivingState({ ...base, now: new Date('2026-08-07T23:00:00.000Z') }).timePeriod).toBe('evening');
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

// ---------------------------------------------------------------------------
// Background-resume: action button tracks time-of-day correctly
//
// Simulates the app being left open across several hours (or past midnight),
// then re-deriving living state with an updated `now`. The same base user
// history is used for every sub-test so the only variable is clock time.
// Verifies action.kind, action.label, and the effect dispatched by
// resolveLivingActionEffect at each time period.
// ---------------------------------------------------------------------------

describe('deriveLivingState — action button after background resume', () => {
  // Six prior days of consistent logging.  Today (2026-08-07) starts empty.
  const priorDays = Array.from({ length: 6 }, (_, i) =>
    `2026-08-${String(i + 1).padStart(2, '0')}`,
  );
  const priorLogs = priorDays.flatMap((date) => [
    log(date, 'Breakfast'),
    log(date, 'Lunch'),
    log(date, 'Dinner'),
  ]);
  const waterLogs = Object.fromEntries(priorDays.map((d) => [d, 48]));
  const TODAY = '2026-08-07';

  // Base input shared across all resume scenarios — no meals logged today yet.
  const baseInput = {
    profile,
    logs: priorLogs,
    waterLogs,
    moodLogs: {},
    activityLogs: {},
    repeatPatterns: [],
    plannerMeals: [],
    onboardingComplete: true,
  };

  // ------------------------------------------------------------------
  // Morning resume (08:00) — no breakfast yet
  // ------------------------------------------------------------------

  it('morning resume: timePeriod is morning and action prompts breakfast log', () => {
    const state = deriveLivingState({
      ...baseInput,
      now: new Date('2026-08-07T08:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('morning');
    expect(state.signal.hasBreakfastToday).toBe(false);
    expect(state.action.kind).toBe('log_meal');
    expect(state.action.label).toBe('Log breakfast');
  });

  it('morning resume: resolveLivingActionEffect dispatches open_add_food', () => {
    const state = deriveLivingState({
      ...baseInput,
      now: new Date('2026-08-07T08:00:00.000Z'),
    });

    const effect = resolveLivingActionEffect(state.action.kind);
    expect(effect).toEqual({ kind: 'open_add_food' });
  });

  // ------------------------------------------------------------------
  // Midday resume (12:30) — breakfast logged, no lunch
  // ------------------------------------------------------------------

  it('midday resume: timePeriod is midday and action prompts lunch log', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...priorLogs, log(TODAY, 'Breakfast')],
      now: new Date('2026-08-07T12:30:00.000Z'),
    });

    expect(state.timePeriod).toBe('midday');
    expect(state.signal.hasBreakfastToday).toBe(true);
    expect(state.signal.hasLunchToday).toBe(false);
    expect(state.action.kind).toBe('log_meal');
    expect(state.action.label).toBe('Add lunch');
  });

  it('midday resume: resolveLivingActionEffect dispatches open_add_food', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...priorLogs, log(TODAY, 'Breakfast')],
      now: new Date('2026-08-07T12:30:00.000Z'),
    });

    const effect = resolveLivingActionEffect(state.action.kind);
    expect(effect).toEqual({ kind: 'open_add_food' });
  });

  // ------------------------------------------------------------------
  // Afternoon resume (15:00) — breakfast + lunch logged, no water today
  // ------------------------------------------------------------------

  it('afternoon resume: timePeriod is afternoon and action prompts water when hydration is low', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...priorLogs, log(TODAY, 'Breakfast'), log(TODAY, 'Lunch')],
      waterLogs: { ...waterLogs }, // no entry for TODAY → waterToday === 0
      now: new Date('2026-08-07T15:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('afternoon');
    expect(state.signal.waterToday).toBe(0);
    expect(state.action.kind).toBe('add_water');
    expect(state.action.label).toBe('Add 8 fl oz');
  });

  it('afternoon resume: resolveLivingActionEffect dispatches add_water with 8 ounces', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...priorLogs, log(TODAY, 'Breakfast'), log(TODAY, 'Lunch')],
      waterLogs: { ...waterLogs },
      now: new Date('2026-08-07T15:00:00.000Z'),
    });

    const effect = resolveLivingActionEffect(state.action.kind);
    expect(effect).toEqual({ kind: 'add_water', ounces: 8 });
  });

  // ------------------------------------------------------------------
  // Evening resume (20:00) — all three meals logged → reflection_ready
  // ------------------------------------------------------------------

  it('evening resume: timePeriod is evening and action shifts to view_progress', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...priorLogs,
        log(TODAY, 'Breakfast'),
        log(TODAY, 'Lunch'),
        log(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-07T20:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('evening');
    expect(state.signal.mealsToday).toBe(3);
    expect(state.category).toBe('reflection_ready');
    expect(state.action.kind).toBe('view_progress');
    expect(state.action.label).toBe('See your progress');
  });

  it('evening resume: resolveLivingActionEffect dispatches navigate to insights', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...priorLogs,
        log(TODAY, 'Breakfast'),
        log(TODAY, 'Lunch'),
        log(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-07T20:00:00.000Z'),
    });

    const effect = resolveLivingActionEffect(state.action.kind);
    expect(effect).toEqual({ kind: 'navigate', route: '/(tabs)/insights' });
  });

  // ------------------------------------------------------------------
  // Cross-midnight resume: date rolls over, state reflects the new day
  // ------------------------------------------------------------------

  it('post-midnight resume: currentDate advances and greeting shifts to morning', () => {
    // App was open during the evening of Aug 7 and resumes at 01:00 on Aug 8.
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...priorLogs,
        log(TODAY, 'Breakfast'),
        log(TODAY, 'Lunch'),
        log(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-08T01:00:00.000Z'),
    });

    expect(state.currentDate).toBe('2026-08-08');
    expect(state.timePeriod).toBe('morning');
    // Aug 8 has no meals yet → action prompts breakfast
    expect(state.signal.mealsToday).toBe(0);
    expect(state.action.kind).toBe('log_meal');
    expect(state.greeting).toBe('Good morning');
  });

  it('post-midnight resume: resolveLivingActionEffect still dispatches open_add_food', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...priorLogs,
        log(TODAY, 'Breakfast'),
        log(TODAY, 'Lunch'),
        log(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-08T01:00:00.000Z'),
    });

    const effect = resolveLivingActionEffect(state.action.kind);
    expect(effect).toEqual({ kind: 'open_add_food' });
  });
});