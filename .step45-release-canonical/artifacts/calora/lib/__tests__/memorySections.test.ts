/**
 * Tests for memorySections helpers.
 *
 * These helpers produce the exact row arrays that MemorySection receives as
 * children in memory.tsx.  React.Children.count() on an array equals the
 * array's .length, so asserting `.length === 0` is equivalent to asserting
 * that the Children.count guard in MemorySection returns null (no header).
 *
 * A regression that removes the Children.count guard in MemorySection would
 * NOT change these helper results — but a regression that breaks the helpers
 * (e.g. always returning stale rows, ignoring forgetLivingObservation) would
 * be caught here.  For that reason the helpers are the canonical source of
 * truth wired directly into the component.
 */
import { describe, expect, it } from 'vitest';
import { buildDiaryRows, buildWellnessRows, buildPlannerRows } from '../memorySections';
import {
  buildLivingMemory,
  emptyLivingMemory,
  forgetLivingObservation,
} from '../livingMemory';
import type { FoodLog } from '@/context/CaloraContext';

const log = (id: string, date = '2026-08-06'): FoodLog => ({
  id,
  name: 'Oats',
  date,
  meal: 'Breakfast',
  calories: 400,
  protein: 20,
  carbs: 40,
  fat: 12,
  source: 'USDA verified',
  confidence: 95,
  time: '8:00 AM',
  serving: '1 bowl',
});

const plannerMeal = (id: string, day = '2026-08-08') => ({
  id,
  day,
  meal: 'Dinner' as const,
  name: 'Salmon',
  image: '',
  serving: '1 fillet',
  calories: 500,
  proteinG: 40,
  carbsG: 20,
  fatG: 18,
  ingredients: [],
  description: '',
});

// ---------------------------------------------------------------------------
// Diary section — buildDiaryRows
// ---------------------------------------------------------------------------

describe('buildDiaryRows — MemorySection children predicate for Diary signals', () => {
  it('returns an empty array (no header) when there are no meal observations', () => {
    expect(buildDiaryRows(emptyLivingMemory())).toHaveLength(0);
  });

  it('returns one row per meal observation', () => {
    const memory = buildLivingMemory({
      logs: [log('meal-1'), log('meal-2', '2026-08-05')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [],
    });
    expect(buildDiaryRows(memory)).toHaveLength(2);
  });

  it('returns empty array — no section header — when all diary signals are forgotten', () => {
    let memory = buildLivingMemory({
      logs: [log('meal-1'), log('meal-2', '2026-08-05')],
      waterLogs: { '2026-08-06': 16 },   // wellness signals remain
      moodLogs: { '2026-08-06': 'good' },
      activityLogs: {},
      plannerMeals: [],
    });

    memory = forgetLivingObservation(memory, 'meal', 'meal-1');
    memory = forgetLivingObservation(memory, 'meal', 'meal-2');

    // Diary section must have no renderable children → header suppressed
    expect(buildDiaryRows(memory)).toHaveLength(0);

    // Wellness section is unaffected and still produces rows
    expect(buildWellnessRows(memory).length).toBeGreaterThan(0);
  });

  it('row shape includes id, date, meal, and isStale flag', () => {
    const memory = buildLivingMemory({
      logs: [log('meal-1', '2026-08-06')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [],
    });
    const [row] = buildDiaryRows(memory);
    expect(row.kind).toBe('meal');
    expect(row.id).toBe('meal-1');
    expect(row.date).toBe('2026-08-06');
    expect(row.meal).toBe('Breakfast');
    expect(typeof row.isStale).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Wellness section — buildWellnessRows
// ---------------------------------------------------------------------------

describe('buildWellnessRows — MemorySection children predicate for Wellness check-ins', () => {
  it('returns an empty array (no header) when there are no wellness observations', () => {
    expect(buildWellnessRows(emptyLivingMemory())).toHaveLength(0);
  });

  it('returns one row per water/mood/activity observation', () => {
    const memory = buildLivingMemory({
      logs: [],
      waterLogs: { '2026-08-06': 20 },
      moodLogs: { '2026-08-06': 'okay', '2026-08-05': 'good' },
      activityLogs: { '2026-08-06': 'light' },
      plannerMeals: [],
    });
    // 1 water + 2 mood + 1 activity = 4
    expect(buildWellnessRows(memory)).toHaveLength(4);
  });

  it('returns empty array — no section header — when all water/mood/activity signals are forgotten (mixed sparse case: diary signals exist)', () => {
    let memory = buildLivingMemory({
      logs: [log('meal-1')],          // diary survives
      waterLogs: { '2026-08-06': 20 },
      moodLogs: { '2026-08-06': 'okay' },
      activityLogs: { '2026-08-06': 'light' },
      plannerMeals: [],
    });

    memory = forgetLivingObservation(memory, 'water', '2026-08-06');
    memory = forgetLivingObservation(memory, 'mood', '2026-08-06');
    memory = forgetLivingObservation(memory, 'activity', '2026-08-06');

    // Wellness section must have no renderable children → header suppressed
    expect(buildWellnessRows(memory)).toHaveLength(0);

    // Diary section still has its row
    expect(buildDiaryRows(memory)).toHaveLength(1);
  });

  it('each wellness row has a unique key, date, and correct kind discriminant', () => {
    const memory = buildLivingMemory({
      logs: [],
      waterLogs: { '2026-08-06': 16 },
      moodLogs: { '2026-08-06': 'energized' },
      activityLogs: { '2026-08-06': 'moderate' },
      plannerMeals: [],
    });
    const rows = buildWellnessRows(memory);
    expect(rows).toHaveLength(3);
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toContain('water');
    expect(kinds).toContain('mood');
    expect(kinds).toContain('activity');
    // Keys are unique
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(3);
  });

  it('forgetting only water leaves mood and activity rows intact', () => {
    let memory = buildLivingMemory({
      logs: [],
      waterLogs: { '2026-08-06': 12 },
      moodLogs: { '2026-08-06': 'low' },
      activityLogs: { '2026-08-06': 'rest' },
      plannerMeals: [],
    });
    memory = forgetLivingObservation(memory, 'water', '2026-08-06');

    const rows = buildWellnessRows(memory);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.kind)).not.toContain('water');
  });
});

// ---------------------------------------------------------------------------
// Planner section — buildPlannerRows
// ---------------------------------------------------------------------------

describe('buildPlannerRows — MemorySection children predicate for Planning signals', () => {
  it('returns an empty array (no header) when there are no planner observations', () => {
    expect(buildPlannerRows(emptyLivingMemory())).toHaveLength(0);
  });

  it('returns one row per planner observation, excluding starters', () => {
    const memory = buildLivingMemory({
      logs: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [plannerMeal('plan-1'), plannerMeal('plan-2', '2026-08-09')],
    });
    expect(buildPlannerRows(memory)).toHaveLength(2);
  });

  it('returns empty array — no section header — when all planner signals are forgotten (diary signals exist)', () => {
    let memory = buildLivingMemory({
      logs: [log('meal-1')],          // diary survives
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [plannerMeal('plan-1'), plannerMeal('plan-2', '2026-08-09')],
    });

    memory = forgetLivingObservation(memory, 'planner', 'plan-1');
    memory = forgetLivingObservation(memory, 'planner', 'plan-2');

    // Planning section must have no renderable children → header suppressed
    expect(buildPlannerRows(memory)).toHaveLength(0);

    // Diary section is unaffected
    expect(buildDiaryRows(memory)).toHaveLength(1);
  });

  it('row shape includes id, day, meal, and isStale flag', () => {
    const memory = buildLivingMemory({
      logs: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [plannerMeal('plan-1', '2026-08-08')],
    });
    const [row] = buildPlannerRows(memory);
    expect(row.kind).toBe('planner');
    expect(row.id).toBe('plan-1');
    expect(row.day).toBe('2026-08-08');
    expect(row.meal).toBe('Dinner');
    expect(typeof row.isStale).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Cross-section — all sections simultaneously empty
// ---------------------------------------------------------------------------

describe('all sections simultaneously — no orphaned headers', () => {
  it('all three section helpers return empty after forgetting every signal', () => {
    let memory = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 8 },
      moodLogs: { '2026-08-06': 'good' },
      activityLogs: { '2026-08-06': 'moderate' },
      plannerMeals: [plannerMeal('plan-1')],
    });

    memory = forgetLivingObservation(memory, 'meal', 'meal-1');
    memory = forgetLivingObservation(memory, 'water', '2026-08-06');
    memory = forgetLivingObservation(memory, 'mood', '2026-08-06');
    memory = forgetLivingObservation(memory, 'activity', '2026-08-06');
    memory = forgetLivingObservation(memory, 'planner', 'plan-1');

    expect(buildDiaryRows(memory)).toHaveLength(0);
    expect(buildWellnessRows(memory)).toHaveLength(0);
    expect(buildPlannerRows(memory)).toHaveLength(0);
  });
});
