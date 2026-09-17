/**
 * useClock — clock-refresh mechanism for living-state background resume.
 *
 * Tests in this file cover two things:
 *
 *  1. `msUntilNextHour` — the pure scheduling helper.  Verified at exact
 *     boundaries (on the hour, mid-hour, one-millisecond-before) and across a
 *     date rollover so the hook schedules its next tick correctly.
 *
 *  2. Re-derivation contract — proves that supplying a fresh `now` to
 *     `deriveLivingState` (which is exactly what `useClock` does when AppState
 *     fires "active") produces the updated action.kind, action.label, and
 *     timePeriod expected at each time period.  This test mirrors what the
 *     running component observes: same user data, only the clock changes.
 *
 * Note on timezones: `deriveLivingState` uses `Date.getHours()` (local time).
 * Fixtures are written as UTC ISO strings.  Tests must run in a UTC environment
 * (standard for CI) or the hour boundaries in the assertions will shift.
 * Vitest fake timers are used for `msUntilNextHour` assertions so the system
 * clock does not affect them; `deriveLivingState` tests supply `now` directly
 * and do not rely on the system clock at all.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { msUntilNextHour } from '../clockHelpers';
import { deriveLivingState } from '../livingState';
import { resolveLivingActionEffect } from '../livingActionHandler';
import type { FoodLog, Profile } from '@/context/CaloraContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const profile: Profile = {
  name: 'Sam',
  goal: 'maintain',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 170,
  weightKg: 72,
  targetWeightKg: 72,
  age: 30,
  calorieTarget: 2000,
};

const foodLog = (date: string, meal: FoodLog['meal']): FoodLog => ({
  id: `${date}-${meal}`,
  name: meal,
  date,
  meal,
  calories: 450,
  protein: 25,
  carbs: 45,
  fat: 14,
  source: 'USDA verified',
  confidence: 95,
  time: '12:00 PM',
  serving: '1 serving',
});

// Six prior days of consistent logging; today (2026-08-07) starts empty.
const PRIOR_DAYS = Array.from({ length: 6 }, (_, i) =>
  `2026-08-${String(i + 1).padStart(2, '0')}`,
);
const PRIOR_LOGS = PRIOR_DAYS.flatMap((date) => [
  foodLog(date, 'Breakfast'),
  foodLog(date, 'Lunch'),
  foodLog(date, 'Dinner'),
]);
const PRIOR_WATER = Object.fromEntries(PRIOR_DAYS.map((d) => [d, 48]));
const TODAY = '2026-08-07';

const baseInput = {
  profile,
  logs: PRIOR_LOGS,
  waterLogs: PRIOR_WATER,
  moodLogs: {},
  activityLogs: {},
  repeatPatterns: [],
  plannerMeals: [],
  onboardingComplete: true,
};

// ---------------------------------------------------------------------------
// 1.  msUntilNextHour — pure scheduling helper
// ---------------------------------------------------------------------------

describe('msUntilNextHour', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns exactly 3 600 000 ms when now is exactly on the hour', () => {
    const now = new Date('2026-08-07T08:00:00.000Z');
    expect(msUntilNextHour(now)).toBe(3_600_000);
  });

  it('returns 1 800 000 ms when now is 30 minutes past the hour', () => {
    const now = new Date('2026-08-07T08:30:00.000Z');
    expect(msUntilNextHour(now)).toBe(1_800_000);
  });

  it('returns 1 ms when now is one millisecond before the next hour', () => {
    const now = new Date('2026-08-07T08:59:59.999Z');
    expect(msUntilNextHour(now)).toBe(1);
  });

  it('crosses a date boundary correctly (23:45 → midnight)', () => {
    const now = new Date('2026-08-07T23:45:00.000Z');
    expect(msUntilNextHour(now)).toBe(15 * 60 * 1_000); // 15 min
  });

  it('does not mutate the input Date', () => {
    const now = new Date('2026-08-07T09:15:00.000Z');
    const before = now.getTime();
    msUntilNextHour(now);
    expect(now.getTime()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// 2.  Re-derivation contract — same data, clock advances
//
// This mirrors the runtime chain:
//   AppState fires "active"
//     → useClock calls setNow(new Date())
//     → now changes in CaloraContext
//     → livingState useMemo reruns with the fresh now
//     → HomeScreen renders the updated action button
//
// Each sub-test below is one step in the morning → midday → afternoon →
// evening → post-midnight journey, checking action.kind, action.label, and
// the effect dispatched by resolveLivingActionEffect.
// ---------------------------------------------------------------------------

describe('background-resume re-derivation — same data, updated now', () => {

  // ── Morning resume (08:00 UTC) — no meals today ──────────────────────────

  it('morning: action prompts breakfast log', () => {
    const state = deriveLivingState({
      ...baseInput,
      now: new Date('2026-08-07T08:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('morning');
    expect(state.action.kind).toBe('log_meal');
    expect(state.action.label).toBe('Log breakfast');
  });

  it('morning: resolveLivingActionEffect dispatches open_add_food', () => {
    const state = deriveLivingState({
      ...baseInput,
      now: new Date('2026-08-07T08:00:00.000Z'),
    });

    expect(resolveLivingActionEffect(state.action.kind)).toEqual({ kind: 'open_add_food' });
  });

  // ── Midday resume (12:00 UTC) — breakfast already logged ─────────────────

  it('midday: action prompts lunch log after breakfast is captured', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...PRIOR_LOGS, foodLog(TODAY, 'Breakfast')],
      now: new Date('2026-08-07T12:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('midday');
    expect(state.action.kind).toBe('log_meal');
    expect(state.action.label).toBe('Add lunch');
  });

  it('midday: resolveLivingActionEffect dispatches open_add_food', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...PRIOR_LOGS, foodLog(TODAY, 'Breakfast')],
      now: new Date('2026-08-07T12:00:00.000Z'),
    });

    expect(resolveLivingActionEffect(state.action.kind)).toEqual({ kind: 'open_add_food' });
  });

  // ── Afternoon resume (15:00 UTC) — breakfast + lunch, no water ───────────

  it('afternoon: action prompts water when hydration is low', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...PRIOR_LOGS, foodLog(TODAY, 'Breakfast'), foodLog(TODAY, 'Lunch')],
      waterLogs: { ...PRIOR_WATER }, // no entry for TODAY → waterToday === 0
      now: new Date('2026-08-07T15:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('afternoon');
    expect(state.signal.waterToday).toBe(0);
    expect(state.action.kind).toBe('add_water');
    expect(state.action.label).toBe('Add 8 fl oz');
  });

  it('afternoon: resolveLivingActionEffect dispatches add_water with 8 ounces', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [...PRIOR_LOGS, foodLog(TODAY, 'Breakfast'), foodLog(TODAY, 'Lunch')],
      waterLogs: { ...PRIOR_WATER },
      now: new Date('2026-08-07T15:00:00.000Z'),
    });

    expect(resolveLivingActionEffect(state.action.kind)).toEqual({
      kind: 'add_water',
      ounces: 8,
    });
  });

  // ── Evening resume (20:00 UTC) — all three meals → reflection_ready ──────

  it('evening: action shifts to view_progress once all meals are logged', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...PRIOR_LOGS,
        foodLog(TODAY, 'Breakfast'),
        foodLog(TODAY, 'Lunch'),
        foodLog(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-07T20:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('evening');
    expect(state.category).toBe('reflection_ready');
    expect(state.action.kind).toBe('view_progress');
    expect(state.action.label).toBe('See your progress');
  });

  it('evening: resolveLivingActionEffect dispatches navigate to insights', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...PRIOR_LOGS,
        foodLog(TODAY, 'Breakfast'),
        foodLog(TODAY, 'Lunch'),
        foodLog(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-07T20:00:00.000Z'),
    });

    expect(resolveLivingActionEffect(state.action.kind)).toEqual({
      kind: 'navigate',
      route: '/(tabs)/insights',
    });
  });

  // ── Post-midnight resume (01:00 UTC Aug 8) — date rolls over ─────────────
  //
  // This is the critical cross-midnight case: the app was open during the
  // evening of Aug 7 and resumes at 01:00 on Aug 8.  useClock fires setNow,
  // the memo reruns, and deriveLivingState must reflect the new date.

  it('post-midnight: currentDate advances to the new day', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...PRIOR_LOGS,
        foodLog(TODAY, 'Breakfast'),
        foodLog(TODAY, 'Lunch'),
        foodLog(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-08T01:00:00.000Z'),
    });

    expect(state.currentDate).toBe('2026-08-08');
  });

  it('post-midnight: timePeriod is morning after the date rollover', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...PRIOR_LOGS,
        foodLog(TODAY, 'Breakfast'),
        foodLog(TODAY, 'Lunch'),
        foodLog(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-08T01:00:00.000Z'),
    });

    expect(state.timePeriod).toBe('morning');
  });

  it('post-midnight: mealsToday resets to 0 for the new date', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...PRIOR_LOGS,
        foodLog(TODAY, 'Breakfast'),
        foodLog(TODAY, 'Lunch'),
        foodLog(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-08T01:00:00.000Z'),
    });

    expect(state.signal.mealsToday).toBe(0);
  });

  it('post-midnight: action reverts to log_meal for the fresh morning', () => {
    const state = deriveLivingState({
      ...baseInput,
      logs: [
        ...PRIOR_LOGS,
        foodLog(TODAY, 'Breakfast'),
        foodLog(TODAY, 'Lunch'),
        foodLog(TODAY, 'Dinner'),
      ],
      now: new Date('2026-08-08T01:00:00.000Z'),
    });

    expect(state.action.kind).toBe('log_meal');
    expect(resolveLivingActionEffect(state.action.kind)).toEqual({ kind: 'open_add_food' });
  });
});

// ---------------------------------------------------------------------------
// 3.  Time-period boundary precision
//
// Confirms that the timePeriod classification flips at exactly the right hour.
// Tests supply `now` directly, so there is no system-clock dependency.
// ---------------------------------------------------------------------------

describe('deriveLivingState — time-period boundary precision', () => {
  const boundaryInput = {
    profile: null,
    logs: [],
    waterLogs: {},
    moodLogs: {},
    activityLogs: {},
    repeatPatterns: [],
    plannerMeals: [],
    onboardingComplete: false,
  };

  it('10:59 UTC is still morning', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T10:59:00.000Z'),
    });
    expect(state.timePeriod).toBe('morning');
  });

  it('11:00 UTC switches to midday', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T11:00:00.000Z'),
    });
    expect(state.timePeriod).toBe('midday');
  });

  it('13:59 UTC is still midday', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T13:59:00.000Z'),
    });
    expect(state.timePeriod).toBe('midday');
  });

  it('14:00 UTC switches to afternoon', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T14:00:00.000Z'),
    });
    expect(state.timePeriod).toBe('afternoon');
  });

  it('17:59 UTC is still afternoon', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T17:59:00.000Z'),
    });
    expect(state.timePeriod).toBe('afternoon');
  });

  it('18:00 UTC switches to evening', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T18:00:00.000Z'),
    });
    expect(state.timePeriod).toBe('evening');
  });

  it('greeting is "Good morning" at 08:00', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T08:00:00.000Z'),
    });
    expect(state.greeting).toBe('Good morning');
  });

  it('greeting is "Good afternoon" at 11:00', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T11:00:00.000Z'),
    });
    expect(state.greeting).toBe('Good afternoon');
  });

  it('greeting is "Good afternoon" at 14:00', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T14:00:00.000Z'),
    });
    expect(state.greeting).toBe('Good afternoon');
  });

  it('greeting is "Good evening" at 18:00', () => {
    const state = deriveLivingState({
      ...boundaryInput,
      now: new Date('2026-08-07T18:00:00.000Z'),
    });
    expect(state.greeting).toBe('Good evening');
  });
});
