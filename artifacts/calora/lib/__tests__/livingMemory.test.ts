import { describe, expect, it } from 'vitest';
import {
  buildLivingMemory,
  emptyLivingMemory,
  filterForgottenSources,
  forgetLivingObservation,
  mergeLivingMemory,
  removeMealObservation,
  upsertActivityObservation,
  upsertMealObservation,
  upsertMoodObservation,
  upsertPlannerObservations,
  upsertWaterObservation,
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

describe('living memory', () => {
  it('normalizes confirmed local sources without storing food names', () => {
    const memory = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 16 },
      moodLogs: { '2026-08-06': 'good' },
      activityLogs: { '2026-08-06': 'light' },
      plannerMeals: [
        { id: 'starter-1', day: '2026-08-07', meal: 'Breakfast', name: 'Starter', image: '', serving: '1', calories: 300, proteinG: 10, carbsG: 30, fatG: 10, ingredients: [], description: '' },
        { id: 'planned-1', day: '2026-08-07', meal: 'Lunch', name: 'Planned', image: '', serving: '1', calories: 400, proteinG: 20, carbsG: 40, fatG: 12, ingredients: [], description: '' },
      ],
    });

    expect(memory.mealObservations).toEqual({ 'meal-1': { date: '2026-08-06', meal: 'Breakfast' } });
    expect(memory.waterObservations['2026-08-06']).toEqual({ ounces: 16 });
    expect(memory.moodObservations['2026-08-06']).toEqual({ mood: 'good' });
    expect(memory.activityObservations['2026-08-06']).toEqual({ activity: 'light' });
    expect(memory.plannerObservations).toEqual({ 'planned-1': { day: '2026-08-07', meal: 'Lunch' } });
  });

  it('supports confirmed meal edits and removals by stable log id', () => {
    let memory = upsertMealObservation(emptyLivingMemory(), 'meal-1', '2026-08-06', 'Breakfast');
    memory = upsertMealObservation(memory, 'meal-1', '2026-08-07', 'Lunch');
    expect(memory.mealObservations['meal-1']).toEqual({ date: '2026-08-07', meal: 'Lunch' });
    expect(removeMealObservation(memory, 'meal-1').mealObservations).toEqual({});
  });

  it('does not create a water memory from invalid amounts', () => {
    const memory = upsertWaterObservation(emptyLivingMemory(), '2026-08-06', 0);
    expect(memory.waterObservations).toEqual({});
  });

  it('merges legacy memory with current normalized sources', () => {
    const saved = { ...emptyLivingMemory(), mealObservations: { old: { date: '2026-08-01', meal: 'Dinner' as const } } };
    const current = buildLivingMemory({ logs: [log('new')], waterLogs: {}, moodLogs: {}, activityLogs: {}, plannerMeals: [] });
    const merged = mergeLivingMemory(saved, current);
    expect(Object.keys(merged.mealObservations)).toEqual(['new']);
  });

  it('keeps current sources authoritative when a saved observation is stale', () => {
    const saved = {
      ...emptyLivingMemory(),
      mealObservations: { 'meal-1': { date: '2026-08-01', meal: 'Dinner' as const } },
      waterObservations: { '2026-08-01': { ounces: 32 } },
    };
    const current = buildLivingMemory({
      logs: [log('meal-1', '2026-08-06')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [],
    });
    const merged = mergeLivingMemory(saved, current);
    expect(merged.mealObservations['meal-1']).toEqual({ date: '2026-08-06', meal: 'Breakfast' });
    expect(merged.waterObservations).toEqual({});
  });

  it('keeps planner observations additive and ignores starter assignments', () => {
    const memory = upsertPlannerObservations(emptyLivingMemory(), [
      { id: 'starter-1', day: '2026-08-07', meal: 'Breakfast', name: 'Starter', image: '', serving: '1', calories: 300, proteinG: 10, carbsG: 30, fatG: 10, ingredients: [], description: '' },
      { id: 'planned-1', day: '2026-08-07', meal: 'Dinner', name: 'Dinner', image: '', serving: '1', calories: 400, proteinG: 20, carbsG: 40, fatG: 12, ingredients: [], description: '' },
    ]);
    expect(memory.plannerObservations).toEqual({ 'planned-1': { day: '2026-08-07', meal: 'Dinner' } });
  });

  it('forgets a signal without changing its source record and keeps it forgotten after reload', () => {
    const source = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 16 },
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [],
    });
    const forgotten = forgetLivingObservation(source, 'meal', 'meal-1');
    expect(forgotten.mealObservations).toEqual({});
    expect(forgotten.forgotten.meals).toEqual(['meal-1']);
    expect(mergeLivingMemory(forgotten, source).mealObservations).toEqual({});
  });

  it('makes an explicitly edited source visible again', () => {
    const source = buildLivingMemory({ logs: [log('meal-1')], waterLogs: {}, moodLogs: {}, activityLogs: {}, plannerMeals: [] });
    const forgotten = forgetLivingObservation(source, 'meal', 'meal-1');
    const edited = upsertMealObservation(forgotten, 'meal-1', '2026-08-07', 'Lunch');
    expect(edited.forgotten.meals).toEqual([]);
    expect(edited.mealObservations['meal-1']).toEqual({ date: '2026-08-07', meal: 'Lunch' });
  });

  it('filters forgotten signals for adaptive consumers without deleting source records', () => {
    const source = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 16 },
      moodLogs: { '2026-08-06': 'good' },
      activityLogs: {},
      plannerMeals: [],
    });
    const forgotten = forgetLivingObservation(forgetLivingObservation(source, 'meal', 'meal-1'), 'water', '2026-08-06');
    const filtered = filterForgottenSources(forgotten, {
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 16 },
      moodLogs: { '2026-08-06': 'good' },
      activityLogs: {},
      plannerMeals: [],
    });
    expect(filtered.logs).toEqual([]);
    expect(filtered.waterLogs).toEqual({});
    expect(filtered.moodLogs).toEqual({ '2026-08-06': 'good' });
  });
});

describe('living memory review states', () => {
  it('empty memory has zero reviewable observations of every kind', () => {
    const memory = emptyLivingMemory();
    expect(Object.keys(memory.mealObservations)).toHaveLength(0);
    expect(Object.keys(memory.waterObservations)).toHaveLength(0);
    expect(Object.keys(memory.moodObservations)).toHaveLength(0);
    expect(Object.keys(memory.activityObservations)).toHaveLength(0);
    expect(Object.keys(memory.plannerObservations)).toHaveLength(0);
  });

  it('sparse memory shows only the observation kinds that have confirmed data', () => {
    // Only water and mood are logged — meal/activity/planner should be empty
    const memory = buildLivingMemory({
      logs: [],
      waterLogs: { '2026-08-06': 24 },
      moodLogs: { '2026-08-06': 'okay' },
      activityLogs: {},
      plannerMeals: [],
    });
    expect(Object.keys(memory.mealObservations)).toHaveLength(0);
    expect(Object.keys(memory.waterObservations)).toHaveLength(1);
    expect(Object.keys(memory.moodObservations)).toHaveLength(1);
    expect(Object.keys(memory.activityObservations)).toHaveLength(0);
    expect(Object.keys(memory.plannerObservations)).toHaveLength(0);
  });

  it('stale-dated observations remain reviewable until explicitly forgotten', () => {
    // Old dates are valid signals — the user should be able to review and forget them
    const memory = buildLivingMemory({
      logs: [log('meal-old', '2025-01-10')],
      waterLogs: { '2025-01-10': 32 },
      moodLogs: { '2025-01-10': 'low' },
      activityLogs: { '2025-01-10': 'rest' },
      plannerMeals: [],
    });
    expect(memory.mealObservations['meal-old']).toEqual({ date: '2025-01-10', meal: 'Breakfast' });
    expect(memory.waterObservations['2025-01-10']).toEqual({ ounces: 32 });
    expect(memory.moodObservations['2025-01-10']).toEqual({ mood: 'low' });
    expect(memory.activityObservations['2025-01-10']).toEqual({ activity: 'rest' });
    // Stale observation can still be forgotten
    const forgotten = forgetLivingObservation(memory, 'water', '2025-01-10');
    expect(forgotten.waterObservations['2025-01-10']).toBeUndefined();
    expect(forgotten.forgotten.water).toContain('2025-01-10');
  });

  it('forgetting signals from different kinds is independent and does not cross-contaminate', () => {
    let memory = emptyLivingMemory();
    memory = upsertMealObservation(memory, 'meal-1', '2026-08-06', 'Lunch');
    memory = upsertWaterObservation(memory, '2026-08-06', 16);
    memory = upsertMoodObservation(memory, '2026-08-06', 'good');
    memory = upsertActivityObservation(memory, '2026-08-06', 'moderate');

    const afterForget = forgetLivingObservation(memory, 'meal', 'meal-1');
    expect(afterForget.mealObservations['meal-1']).toBeUndefined();
    // Other kinds are untouched
    expect(afterForget.waterObservations['2026-08-06']).toEqual({ ounces: 16 });
    expect(afterForget.moodObservations['2026-08-06']).toEqual({ mood: 'good' });
    expect(afterForget.activityObservations['2026-08-06']).toEqual({ activity: 'moderate' });
    // Forgotten lists are independent
    expect(afterForget.forgotten.meals).toContain('meal-1');
    expect(afterForget.forgotten.water).toHaveLength(0);
    expect(afterForget.forgotten.mood).toHaveLength(0);
    expect(afterForget.forgotten.activity).toHaveLength(0);
  });

  it('reload with no persisted memory starts from a clean reviewable state', () => {
    const current = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 8 },
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [],
    });
    // null simulates first launch with no saved state
    const merged = mergeLivingMemory(null, current);
    expect(merged.mealObservations['meal-1']).toBeDefined();
    expect(merged.waterObservations['2026-08-06']).toEqual({ ounces: 8 });
    expect(merged.forgotten.meals).toHaveLength(0);
  });

  it('wellness check-in section has no renderable rows when all water/mood/activity signals are forgotten', () => {
    // Diary signals exist — but all wellness signals are forgotten.
    // MemorySection for "Wellness check-ins" derives its children from waterObservations,
    // moodObservations, and activityObservations. When those maps are empty the section
    // receives no children and Children.count returns 0, suppressing the header.
    let memory = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 20 },
      moodLogs: { '2026-08-06': 'okay' },
      activityLogs: { '2026-08-06': 'light' },
      plannerMeals: [],
    });

    // Forget every wellness signal
    memory = forgetLivingObservation(memory, 'water', '2026-08-06');
    memory = forgetLivingObservation(memory, 'mood', '2026-08-06');
    memory = forgetLivingObservation(memory, 'activity', '2026-08-06');

    // Diary section still has data → its MemorySection renders
    expect(Object.keys(memory.mealObservations)).toHaveLength(1);

    // Wellness section data is completely empty → MemorySection receives no children
    const wellnessRowCount =
      Object.keys(memory.waterObservations).length +
      Object.keys(memory.moodObservations).length +
      Object.keys(memory.activityObservations).length;
    expect(wellnessRowCount).toBe(0);
  });

  it('diary section has no renderable rows when all diary signals are forgotten (mixed sparse case)', () => {
    // Water and mood exist; only diary signals are all forgotten.
    // The "Diary signals" MemorySection should receive no children.
    let memory = buildLivingMemory({
      logs: [log('meal-1'), log('meal-2', '2026-08-05')],
      waterLogs: { '2026-08-06': 16 },
      moodLogs: { '2026-08-06': 'good' },
      activityLogs: {},
      plannerMeals: [],
    });

    memory = forgetLivingObservation(memory, 'meal', 'meal-1');
    memory = forgetLivingObservation(memory, 'meal', 'meal-2');

    // Diary section data empty → MemorySection for diary receives no children
    expect(Object.keys(memory.mealObservations)).toHaveLength(0);

    // Wellness section still has signals → its MemorySection renders normally
    const wellnessRowCount =
      Object.keys(memory.waterObservations).length +
      Object.keys(memory.moodObservations).length +
      Object.keys(memory.activityObservations).length;
    expect(wellnessRowCount).toBe(2);
  });

  it('planning section has no renderable rows when all planner signals are forgotten', () => {
    let memory = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      plannerMeals: [
        { id: 'plan-1', day: '2026-08-08', meal: 'Dinner', name: 'D1', image: '', serving: '1', calories: 500, proteinG: 30, carbsG: 50, fatG: 15, ingredients: [], description: '' },
        { id: 'plan-2', day: '2026-08-09', meal: 'Lunch', name: 'L1', image: '', serving: '1', calories: 400, proteinG: 20, carbsG: 40, fatG: 12, ingredients: [], description: '' },
      ],
    });

    memory = forgetLivingObservation(memory, 'planner', 'plan-1');
    memory = forgetLivingObservation(memory, 'planner', 'plan-2');

    // Planning section data empty → MemorySection receives no children
    expect(Object.keys(memory.plannerObservations)).toHaveLength(0);

    // Diary section is still populated
    expect(Object.keys(memory.mealObservations)).toHaveLength(1);
  });

  it('all five observation kinds are reviewable and independently forgettable', () => {
    const memory = buildLivingMemory({
      logs: [log('meal-1')],
      waterLogs: { '2026-08-06': 12 },
      moodLogs: { '2026-08-06': 'energized' },
      activityLogs: { '2026-08-06': 'high' },
      plannerMeals: [
        { id: 'plan-1', day: '2026-08-08', meal: 'Dinner', name: 'D', image: '', serving: '1', calories: 500, proteinG: 30, carbsG: 50, fatG: 15, ingredients: [], description: '' },
      ],
    });
    const total =
      Object.keys(memory.mealObservations).length +
      Object.keys(memory.waterObservations).length +
      Object.keys(memory.moodObservations).length +
      Object.keys(memory.activityObservations).length +
      Object.keys(memory.plannerObservations).length;
    expect(total).toBe(5);

    // Forget one of each kind and verify they are removed independently
    let m = forgetLivingObservation(memory, 'meal', 'meal-1');
    m = forgetLivingObservation(m, 'water', '2026-08-06');
    m = forgetLivingObservation(m, 'mood', '2026-08-06');
    m = forgetLivingObservation(m, 'activity', '2026-08-06');
    m = forgetLivingObservation(m, 'planner', 'plan-1');
    const remaining =
      Object.keys(m.mealObservations).length +
      Object.keys(m.waterObservations).length +
      Object.keys(m.moodObservations).length +
      Object.keys(m.activityObservations).length +
      Object.keys(m.plannerObservations).length;
    expect(remaining).toBe(0);
    // All forgotten lists have one entry each
    expect(m.forgotten.meals).toHaveLength(1);
    expect(m.forgotten.water).toHaveLength(1);
    expect(m.forgotten.mood).toHaveLength(1);
    expect(m.forgotten.activity).toHaveLength(1);
    expect(m.forgotten.planner).toHaveLength(1);
  });
});