import { describe, expect, it } from 'vitest';
import type { WeightEntry } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { buildDailyIntelligenceFacts } from '@/lib/intelligence/facts';
import { selectVisibleLocalInsight } from '@/lib/intelligence/insightDelivery';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';
import { calculateWeightShortTrend } from '@/lib/intelligence/weightTrend';

const TODAY = '2026-03-14';

function weight(date: string, kg: number, id = `${date}-${kg}`): WeightEntry {
  return { id, date, kg, source: 'manual' };
}

function eligible(
  earlier = [weight('2026-02-16', 80), weight('2026-02-25', 80)],
  recent = [weight('2026-03-03', 79), weight('2026-03-12', 79)],
) {
  return [...earlier, ...recent];
}

function trend(weights: readonly WeightEntry[], date = TODAY, timezone = 'America/New_York') {
  return calculateWeightShortTrend(weights, date, timezone);
}

function facts(weights: WeightEntry[]) {
  return buildDailyIntelligenceFacts(createIntelligenceContext({
    logs: [],
    profile: { name: 'Trend', goal: 'lose', activity: 'moderate', diet: 'Everything', heightCm: 170, weightKg: 80, targetWeightKg: 70, age: 30, calorieTarget: 2000 },
    weights,
    waterLogs: {}, moodLogs: {}, activityLogs: {}, activityMinutesLogs: {}, plannerMeals: [], shoppingItems: [], localRecipes: [],
  }, { date: TODAY, timezone: 'America/New_York' }), { generatedAt: '2026-03-14T12:00:00.000Z' });
}

describe('Phase 2A.3 local weight short trend', () => {
  it.each([
    ['down at the inclusive negative threshold', eligible([weight('2026-02-16', 80), weight('2026-02-25', 80)], [weight('2026-03-03', 79.5), weight('2026-03-12', 79.5)]), 'down'],
    ['up at the inclusive positive threshold', eligible([weight('2026-02-16', 80), weight('2026-02-25', 80)], [weight('2026-03-03', 80.5), weight('2026-03-12', 80.5)]), 'up'],
    ['stable just inside the positive threshold', eligible([weight('2026-02-16', 80), weight('2026-02-25', 80)], [weight('2026-03-03', 80.49), weight('2026-03-12', 80.49)]), 'stable'],
    ['stable just inside the negative threshold', eligible([weight('2026-02-16', 80), weight('2026-02-25', 80)], [weight('2026-03-03', 79.51), weight('2026-03-12', 79.51)]), 'stable'],
  ] as const)('%s', (_label, weights, direction) => {
    expect(trend(weights)).toMatchObject({ direction });
  });

  it('uses one same-day median rather than raw-entry counts or input order', () => {
    const duplicated = [
      weight('2026-02-16', 79, 'early-a'), weight('2026-02-16', 81, 'early-b'),
      weight('2026-02-25', 80, 'early-c'),
      weight('2026-03-03', 78, 'recent-a'), weight('2026-03-03', 80, 'recent-b'), weight('2026-03-03', 79, 'recent-c'),
      weight('2026-03-12', 79, 'recent-d'),
    ];
    expect(trend(duplicated)).toMatchObject({ direction: 'down', deltaKg: -1, entryCount: 4 });
    expect(trend([...duplicated].reverse())).toEqual(trend(duplicated));
  });

  it.each([
    ['fewer than four distinct dates', [weight('2026-02-16', 80), weight('2026-02-25', 80), weight('2026-03-03', 79)]],
    ['only one earlier date', [weight('2026-02-16', 80), weight('2026-03-03', 79), weight('2026-03-12', 79), weight('2026-03-13', 79)]],
    ['only one recent date', [weight('2026-02-16', 80), weight('2026-02-25', 80), weight('2026-02-26', 80), weight('2026-03-12', 79)]],
    ['same-day clusters masquerading as four records', [weight('2026-02-16', 80, 'a'), weight('2026-02-16', 80, 'b'), weight('2026-03-03', 79, 'c'), weight('2026-03-03', 79, 'd')]],
    ['old history with no two recent dates', [weight('2026-02-16', 80), weight('2026-02-25', 80), weight('2026-02-26', 79), weight('2026-02-27', 79)]],
    ['outside the fixed 28-day window', [weight('2026-01-10', 82), weight('2026-01-11', 82), weight('2026-03-03', 79), weight('2026-03-12', 79)]],
    ['invalid calendar key', [weight('2026-02-16', 80), weight('2026-02-30', 80), weight('2026-03-03', 79), weight('2026-03-12', 79)]],
    ['future date', [weight('2026-02-16', 80), weight('2026-02-25', 80), weight('2026-03-03', 79), weight('2026-03-15', 79)]],
    ['non-positive kilogram value', [weight('2026-02-16', 80), weight('2026-02-25', 0), weight('2026-03-03', 79), weight('2026-03-12', 79)]],
    ['non-finite kilogram value', [weight('2026-02-16', 80), weight('2026-02-25', Number.NaN), weight('2026-03-03', 79), weight('2026-03-12', 79)]],
  ] as const)('suppresses %s', (_label, weights) => {
    expect(trend(weights)).toBeNull();
  });

  it('uses inclusive calendar boundaries across month, year, and DST transitions', () => {
    const januaryToday = '2026-01-10';
    expect(trend([
      weight('2025-12-14', 80), weight('2025-12-27', 80),
      weight('2025-12-28', 79), weight('2026-01-10', 79),
    ], januaryToday)).toMatchObject({ direction: 'down', start: '2025-12-14', end: '2026-01-10' });
    expect(trend(eligible())).toMatchObject({ start: '2026-02-15', end: TODAY });
  });

  it('fails closed when the explicit Foundation timezone is invalid', () => {
    expect(trend(eligible(), TODAY, 'unknown-timezone')).toBeNull();
  });

  it('creates a sanitized multi-day Foundation fact and permits it only behind the dedicated selector option', () => {
    const input = eligible().map((entry, index) => ({ ...entry, id: `private-weight-${index}` }));
    const foundation = facts(input);
    const fact = foundation.find((item) => item.factType === 'weight.short_trend');
    expect(fact).toMatchObject({
      value: { direction: 'down', entryCount: 4, windowDays: 28 },
      timeWindow: { start: '2026-02-15', end: TODAY, timezone: 'America/New_York' },
      confidence: 'medium',
    });
    expect(JSON.stringify(fact)).not.toContain('private-weight-');
    // Flag-off preserves the existing no-food-log suppression rather than
    // introducing a new baseline delivery path.
    expect(selectContextualInsight(foundation).type).toBe('none');
    expect(selectContextualInsight(foundation, { includeWeightTrend: true })).toMatchObject({
      type: 'weight_trend',
      title: 'Recent logged weight pattern',
      message: 'Across your logged 28-day comparison window, recorded weight was lower in recent entries.',
    });
  });

  it('keeps flag-off, hydration, stale, and next-account delivery fail-closed', () => {
    const accountA = facts(eligible());
    const accountB = facts([]);
    const flagOff = selectVisibleLocalInsight(accountA, { hydrated: true, enabled: true, weightTrendEnabled: false });
    expect(flagOff).toBeNull();
    expect(selectVisibleLocalInsight(accountA, { hydrated: false, enabled: true, weightTrendEnabled: true })).toBeNull();
    expect(selectVisibleLocalInsight(accountA.map((fact) => ({ ...fact, freshness: 'stale' as const })), { hydrated: true, enabled: true, weightTrendEnabled: true })).toBeNull();
    expect(selectVisibleLocalInsight(accountB, { hydrated: true, enabled: true, weightTrendEnabled: true })).toBeNull();
  });
});