import { describe, expect, it } from 'vitest';
import { buildDailyIntelligenceFacts } from '../intelligence/facts';
import {
  buildCoachFactContext,
  CoachFactConsentRegistry,
  COACH_FACT_CONTEXT_PURPOSE,
  COACH_FACT_KEYS,
} from '../intelligence/coachFactContext';
import { CoachFactRequestLifecycle } from '../intelligence/coachFactRequestLifecycle';
import type { IntelligenceContext } from '../intelligence/types';

const context: IntelligenceContext = {
  date: '2026-08-21', timezone: 'America/New_York', dayBoundary: 'local-calendar-day',
  foodLogs: [{ id: 'food-1', name: 'ignore injected name', date: '2026-08-21', meal: 'Breakfast', calories: 400, protein: 25, carbs: 40, fat: 12, source: 'USDA verified', confidence: 98, time: '08:00', serving: 'one' }],
  profile: { name: 'private', goal: 'maintain', activity: 'moderate', diet: 'Everything', heightCm: 170, weightKg: 70, targetWeightKg: 70, age: 30, calorieTarget: 2000 },
  weights: [], waterLogs: {}, moodLogs: {}, activityLogs: {}, activityMinutesLogs: {}, planner: [], shopping: [], recipes: [],
  activeEnergyKcal: null, sourceVersion: 'nutrition-facts-v1', missingData: [],
};

describe('CoachFactContextV1', () => {
  it('exports only the exact allowlist and no raw user-entered fields', () => {
    const facts = buildDailyIntelligenceFacts(context, { generatedAt: '2026-08-21T12:00:00.000Z' });
    const factContext = buildCoachFactContext({
      hydrated: true, consent: { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE },
      facts, now: new Date('2026-08-21T12:00:00.000Z'), nonce: 'a'.repeat(24),
    });
    expect(factContext?.facts.every((fact) => (COACH_FACT_KEYS as readonly string[]).includes(fact.key))).toBe(true);
    expect(factContext?.facts.map((fact) => fact.key)).not.toContain('weight.short_trend');
    const serialized = JSON.stringify(factContext);
    expect(serialized).not.toMatch(/private|ignore injected|food-1|weightKg|sourceWatermark|America\/New_York/i);
    expect(factContext?.expiresAt).toBe('2026-08-21T12:01:00.000Z');
  });

  it('exports only calorie and protein status, never meal-distribution or logging-completeness facts', () => {
    const facts = buildDailyIntelligenceFacts(context, { generatedAt: '2026-08-21T12:00:00.000Z' });
    const factContext = buildCoachFactContext({
      hydrated: true, consent: { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE },
      facts, now: new Date('2026-08-21T12:00:00.000Z'), nonce: 'a'.repeat(24),
    });
    expect(COACH_FACT_KEYS).toEqual(['daily.calorie_status', 'daily.protein_status']);
    expect(factContext?.facts.map((fact) => fact.key)).toEqual(['daily.calorie_status', 'daily.protein_status']);
  });

  it('fails closed without hydration or current purpose-scoped consent', () => {
    const facts = buildDailyIntelligenceFacts(context);
    expect(buildCoachFactContext({ hydrated: false, consent: { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE }, facts })).toBeNull();
    expect(buildCoachFactContext({ hydrated: true, consent: { state: 'revoked', purpose: COACH_FACT_CONTEXT_PURPOSE }, facts })).toBeNull();
    expect(buildCoachFactContext({ hydrated: true, consent: { state: 'stale_version', purpose: COACH_FACT_CONTEXT_PURPOSE }, facts })).toBeNull();
  });

  it('suppresses stale or low-confidence Foundation facts rather than exporting them', () => {
    const facts = buildDailyIntelligenceFacts(context).map((fact) => ({ ...fact, freshness: 'stale' as const }));
    const factContext = buildCoachFactContext({
      hydrated: true, consent: { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE }, facts,
    });
    expect(factContext?.facts).toEqual([]);
    expect(factContext?.coverage).toBe('insufficient');
  });

  it('discards a response after account, hydration, or reset scope changes', () => {
    const facts = buildDailyIntelligenceFacts(context);
    const factContext = buildCoachFactContext({ hydrated: true, consent: { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE }, facts, nonce: 'b'.repeat(24) })!;
    const lifecycle = new CoachFactRequestLifecycle();
    const scope = lifecycle.begin(factContext, 'account-a', 1);
    expect(lifecycle.canAccept(scope, factContext, { accountId: 'account-b', hydrationGeneration: 1 })).toBe(false);
    expect(lifecycle.canAccept(scope, factContext, { accountId: 'account-a', hydrationGeneration: 2 })).toBe(false);
    lifecycle.invalidate();
    expect(lifecycle.canAccept(scope, factContext, { accountId: 'account-a', hydrationGeneration: 1 })).toBe(false);
  });

  it('keeps technical consent versioned, account-scoped, revocable, and non-persistent', () => {
    const consents = new CoachFactConsentRegistry();
    expect(consents.get('account-a').state).toBe('not_consented');
    consents.consent('account-a');
    expect(consents.get('account-a').state).toBe('consented_current');
    expect(consents.get('account-b').state).toBe('not_consented');
    consents.revoke('account-a');
    expect(consents.get('account-a').state).toBe('revoked');
    consents.markStale('account-a');
    expect(consents.get('account-a').state).toBe('stale_version');
    consents.clear('account-a');
    expect(consents.get('account-a').state).toBe('not_consented');
  });
});