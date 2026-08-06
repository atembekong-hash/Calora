import { describe, expect, it } from 'vitest';
import { buildLivingMemory, emptyLivingMemory, mergeLivingMemory, removeMealObservation, upsertMealObservation, upsertPlannerObservations, upsertWaterObservation } from '../livingMemory';
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
});