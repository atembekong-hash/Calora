import { describe, expect, it } from 'vitest';
import type { FoodLog, Profile } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { buildDailyIntelligenceFacts } from '@/lib/intelligence/facts';
import { selectVisibleLocalInsight } from '@/lib/intelligence/insightDelivery';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';
import { calculateNutritionSevenDayCoverage } from '@/lib/intelligence/nutritionCoverage';

const TODAY = '2026-03-14';
const TIMEZONE = 'America/New_York';
const profile: Profile = {
  name: 'Coverage', goal: 'maintain', activity: 'moderate', diet: 'Everything',
  heightCm: 170, weightKg: 70, targetWeightKg: 70, age: 30, calorieTarget: 2000,
};

function log(date: string, id = `private-log-${date}`, calories = 200): FoodLog {
  return {
    id, name: 'Private food name', date, meal: 'Lunch', calories, protein: 10, carbs: 20, fat: 5,
    source: 'USDA verified', confidence: 100, time: '12:00', serving: '1',
  };
}

function coverage(logs: readonly FoodLog[], date = TODAY, timezone = TIMEZONE) {
  return calculateNutritionSevenDayCoverage(logs, date, timezone);
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

describe('Phase 2A.4 local seven-day nutrition coverage', () => {
  it('counts distinct observed local dates in the inclusive seven-day window without interpreting gaps', () => {
    const input = [
      log('2026-03-08', 'private-log-a'), log('2026-03-08', 'private-log-b'),
      log('2026-03-11', 'private-log-c'), log('2026-03-14', 'private-log-d'),
      log('2026-03-07', 'old-log'),
    ];
    expect(coverage(input)).toEqual({
      loggedDayCount: 3, qualifyingLogCount: 4, start: '2026-03-08', end: TODAY,
    });
    expect(coverage([...input].reverse())).toEqual(coverage(input));
  });

  it.each([
    ['fewer than three distinct logged dates', [log('2026-03-13'), log('2026-03-14')]],
    ['same-day records masquerading as coverage', [log('2026-03-14', 'a'), log('2026-03-14', 'b'), log('2026-03-13')]],
    ['invalid calendar date', [log('2026-03-08'), log('2026-02-30'), log('2026-03-14')]],
    ['future calendar date', [log('2026-03-08'), log('2026-03-11'), log('2026-03-15')]],
  ] as const)('suppresses %s', (_label, input) => {
    expect(coverage(input)).toBeNull();
  });

  it('uses strict local-calendar windows across month, year, DST, and timezone boundaries', () => {
    expect(coverage([
      log('2025-12-31'), log('2026-01-04'), log('2026-01-06'),
    ], '2026-01-06')).toMatchObject({ start: '2025-12-31', end: '2026-01-06', loggedDayCount: 3 });
    expect(coverage([log('2026-03-08'), log('2026-03-11'), log('2026-03-14')], TODAY, 'bad/timezone')).toBeNull();
  });

  it('creates a sanitized, window-specific Foundation fact and permits delivery only behind the dedicated option', () => {
    const foundation = facts(eligibleLogs());
    const fact = foundation.find((item) => item.factType === 'nutrition.seven_day_coverage');
    expect(fact).toMatchObject({
      value: { loggedDayCount: 3, windowDays: 7, state: 'eligible' },
      timeWindow: { start: '2026-03-08', end: TODAY, timezone: TIMEZONE },
      confidence: 'medium',
      evidence: [{ origin: 'derived', quality: 'moderate', count: 4, logIds: [] }],
    });
    expect(JSON.stringify(fact)).not.toContain('private-log-');
    expect(JSON.stringify(fact)).not.toContain('Private food name');
    expect(selectContextualInsight(foundation).type).not.toBe('nutrition_coverage');
    expect(selectContextualInsight(foundation, { includeNutritionCoverage: true })).toMatchObject({
      type: 'nutrition_coverage',
      title: 'Recent nutrition record coverage',
      message: 'Nutrition logged on 3 of the last 7 local-calendar days.',
    });
  });

  it('preserves higher-priority daily nutrition and keeps flag-off, hydration, stale, and next-account paths fail-closed', () => {
    const accountA = facts([
      ...eligibleLogs(), log('2026-03-14', 'today-target', 2100),
    ]);
    const accountB = facts([]);
    expect(selectContextualInsight(accountA, { includeNutritionCoverage: true })).toMatchObject({ type: 'calorie_status' });
    expect(selectVisibleLocalInsight(accountA, {
      hydrated: true, enabled: true, nutritionCoverageEnabled: false,
    })).toMatchObject({ type: 'calorie_status' });

    const coverageOnly = facts(eligibleLogs());
    expect(selectVisibleLocalInsight(coverageOnly, {
      hydrated: true, enabled: true, nutritionCoverageEnabled: false,
    })).toBeNull();
    expect(selectVisibleLocalInsight(coverageOnly, {
      hydrated: false, enabled: true, nutritionCoverageEnabled: true,
    })).toBeNull();
    expect(selectVisibleLocalInsight(coverageOnly.map((fact) => ({ ...fact, freshness: 'stale' as const })), {
      hydrated: true, enabled: true, nutritionCoverageEnabled: true,
    })).toBeNull();
    expect(selectVisibleLocalInsight(accountB, {
      hydrated: true, enabled: true, nutritionCoverageEnabled: true,
    })).toBeNull();
  });
});