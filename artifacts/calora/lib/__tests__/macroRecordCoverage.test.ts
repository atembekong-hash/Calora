import { describe, expect, it } from 'vitest';
import type { FoodLog, Profile } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { buildDailyIntelligenceFacts } from '@/lib/intelligence/facts';
import { selectVisibleLocalInsight } from '@/lib/intelligence/insightDelivery';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';
import { calculateSevenDayMacroRecordCoverage } from '@/lib/intelligence/macroRecordCoverage';

const TODAY = '2026-03-14';
const TIMEZONE = 'America/New_York';
const profile: Profile = {
  name: 'Macro coverage', goal: 'maintain', activity: 'moderate', diet: 'Everything',
  heightCm: 170, weightKg: 70, targetWeightKg: 70, age: 30, calorieTarget: 2000,
};

function log(date: string, id = `private-macro-log-${date}`, calories = 200): FoodLog {
  return {
    id, name: 'Private macro food', date, meal: 'Lunch', calories, protein: 10, carbs: 20, fat: 5,
    source: 'USDA verified', confidence: 100, time: '12:00', serving: '1',
  };
}

function coverage(logs: readonly FoodLog[], date = TODAY, timezone = TIMEZONE) {
  return calculateSevenDayMacroRecordCoverage(logs, date, timezone);
}

function facts(logs: FoodLog[]) {
  return buildDailyIntelligenceFacts(createIntelligenceContext({
    logs, profile, weights: [], waterLogs: {}, moodLogs: {}, activityLogs: {}, activityMinutesLogs: {},
    plannerMeals: [], shoppingItems: [], localRecipes: [],
  }, { date: TODAY, timezone: TIMEZONE }), { generatedAt: '2026-03-14T12:00:00.000Z' });
}

function eligibleLogs(): FoodLog[] {
  return [
    log('2026-03-08'), log('2026-03-11'),
    log('2026-03-14', 'today-lunch'),
    { ...log('2026-03-14', 'today-breakfast'), meal: 'Breakfast' },
  ];
}

describe('Phase 2A.5 local seven-day macro record coverage', () => {
  it('counts only distinct observed dates with complete stored macro records', () => {
    const input = [
      log('2026-03-08', 'private-macro-a'), log('2026-03-08', 'private-macro-b'),
      log('2026-03-11', 'private-macro-c'), log('2026-03-14', 'private-macro-d'),
      { ...log('2026-03-14', 'zero-is-valid'), calories: 0, protein: 0, carbs: 0, fat: 0 },
      log('2026-03-07', 'old-log'),
    ];
    expect(coverage(input)).toEqual({
      qualifiedDayCount: 3, qualifyingLogCount: 5, start: '2026-03-08', end: TODAY,
    });
    expect(coverage([...input].reverse())).toEqual(coverage(input));
  });

  it.each([
    ['fewer than three distinct qualified dates', [log('2026-03-13'), log('2026-03-14')]],
    ['same-day records masquerading as coverage', [log('2026-03-14', 'a'), log('2026-03-14', 'b'), log('2026-03-13')]],
    ['invalid calendar date', [log('2026-03-08'), log('2026-02-30'), log('2026-03-14')]],
    ['future calendar date', [log('2026-03-08'), log('2026-03-11'), log('2026-03-15')]],
    ['missing/NaN protein', [log('2026-03-08'), { ...log('2026-03-11'), protein: Number.NaN }, log('2026-03-14')]],
    ['infinite carbohydrates', [log('2026-03-08'), { ...log('2026-03-11'), carbs: Number.POSITIVE_INFINITY }, log('2026-03-14')]],
    ['negative fat', [log('2026-03-08'), { ...log('2026-03-11'), fat: -1 }, log('2026-03-14')]],
    ['negative calories', [log('2026-03-08'), { ...log('2026-03-11'), calories: -1 }, log('2026-03-14')]],
  ] as const)('fails closed for %s', (_label, input) => {
    expect(coverage(input)).toBeNull();
  });

  it('uses strict local-calendar boundaries across month, year, DST, and timezone checks', () => {
    expect(coverage([log('2025-12-31'), log('2026-01-04'), log('2026-01-06')], '2026-01-06')).toMatchObject({
      start: '2025-12-31', end: '2026-01-06', qualifiedDayCount: 3,
    });
    expect(coverage(eligibleLogs(), TODAY, 'bad/timezone')).toBeNull();
  });

  it('creates a sanitized macro-aware Foundation fact whose watermark changes for a prior macro edit', () => {
    const before = facts(eligibleLogs());
    const beforeFact = before.find((item) => item.factType === 'nutrition.seven_day_macro_record_coverage');
    const after = facts(eligibleLogs().map((item) => item.id === 'private-macro-log-2026-03-08'
      ? { ...item, protein: 11 } : item));
    const afterFact = after.find((item) => item.factType === 'nutrition.seven_day_macro_record_coverage');
    expect(beforeFact).toMatchObject({
      value: { qualifiedDayCount: 3, windowDays: 7, state: 'eligible' },
      timeWindow: { start: '2026-03-08', end: TODAY, timezone: TIMEZONE },
      confidence: 'medium',
      evidence: [{ origin: 'derived', quality: 'moderate', count: 4, logIds: [] }],
    });
    expect(afterFact?.sourceWatermark.value).not.toBe(beforeFact?.sourceWatermark.value);
    expect(JSON.stringify(beforeFact)).not.toContain('private-macro-log-');
    expect(JSON.stringify(beforeFact)).not.toContain('Private macro food');
  });

  it('is Progress-only, default-off, below existing candidates, and fail-closed for unsafe delivery', () => {
    const macroOnly = facts(eligibleLogs());
    expect(selectContextualInsight(macroOnly, { includeMacroRecordCoverage: true })).toMatchObject({
      type: 'macro_record_coverage',
      title: 'Macro record coverage',
      message: 'Macro records are complete on 3 of the last 7 local-calendar days.',
      priority: 110,
    });
    expect(selectContextualInsight(macroOnly, {
      includeNutritionCoverage: true, includeMacroRecordCoverage: true,
    })).toMatchObject({ type: 'nutrition_coverage' });

    const highPriority = facts([...eligibleLogs(), log('2026-03-14', 'today-target', 2100)]);
    expect(selectContextualInsight(highPriority, { includeMacroRecordCoverage: true })).toMatchObject({ type: 'calorie_status' });
    expect(selectVisibleLocalInsight(macroOnly, {
      hydrated: true, enabled: true, macroRecordCoverageEnabled: false,
    })).toBeNull();
    expect(selectVisibleLocalInsight(macroOnly, {
      hydrated: false, enabled: true, macroRecordCoverageEnabled: true,
    })).toBeNull();
    expect(selectVisibleLocalInsight(macroOnly.map((fact) => ({ ...fact, freshness: 'stale' as const })), {
      hydrated: true, enabled: true, macroRecordCoverageEnabled: true,
    })).toBeNull();
    expect(selectVisibleLocalInsight(facts([]), {
      hydrated: true, enabled: true, macroRecordCoverageEnabled: true,
    })).toBeNull();
  });
});