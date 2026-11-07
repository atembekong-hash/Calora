import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveLiveInsights } from '../insights/deriveLiveInsights';

const source = readFileSync(resolve(__dirname, '../../app/progress-insights.tsx'), 'utf8');
const progressSource = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');
const profileSource = readFileSync(resolve(__dirname, '../../app/(tabs)/profile.tsx'), 'utf8');
const rootLayoutSource = readFileSync(resolve(__dirname, '../../app/_layout.tsx'), 'utf8');

const base = {
  now: new Date('2026-11-07T12:00:00'),
  logs: [],
  waterLogs: {},
  hydrationGoalOunces: 80,
  healthConnection: { provider: 'unsupported' as const, authorization: 'unavailable' as const, granted: [] as never[] },
  dailyStepGoal: 10000,
  fasting: { selectedPlanId: '12:12' as const, activeStartedAt: null, activePlannedHours: null, history: [] },
  moodLogs: {},
  activityMinutesLogs: {},
  weights: [],
  plannerMeals: [],
  syncState: 'local' as const,
  hydrated: true,
};

describe('Insights derivation', () => {
  it('welcomes an empty state without treating missing logs as proof of inactivity', () => {
    const result = deriveLiveInsights(base);
    expect(result.briefing.title).toBe('Let’s get your day started');
    expect(result.recommendations.some((item) => item.summary.includes('not proof'))).toBe(true);
    expect(result.activity).toEqual([]);
  });

  it('derives hydration, nutrition, steps, and fasting observations from verified state', () => {
    const result = deriveLiveInsights({
      ...base,
      waterLogs: { '2026-11-07': 40 },
      logs: [{ id: 'meal-1', name: 'Oats', date: '2026-11-07', meal: 'Breakfast', calories: 400, protein: 20, carbs: 50, fat: 12, source: 'Manual', confidence: 1, time: '08:30', serving: '1 bowl' }],
      healthConnection: { provider: 'health-connect', authorization: 'authorized', granted: ['steps'], lastSyncedAt: '2026-11-07T11:30:00', snapshot: { syncedAt: '2026-11-07T11:30:00', steps: 4200, activeEnergyKcal: 220, workouts: [], weights: [] } },
      fasting: { ...base.fasting, activeStartedAt: '2026-11-07T10:00:00', activePlannedHours: 12 },
    });
    expect([...result.observations, ...result.recommendations].map((item) => item.id)).toEqual(expect.arrayContaining(['hydration-progress', 'nutrition-logged', 'steps-today', 'fasting-active']));
    expect(result.activity.some((event) => event.source === 'food-log')).toBe(true);
    expect(result.activity.some((event) => event.source === 'health-provider')).toBe(true);
  });

  it('suppresses stale health as a live step observation and exposes a refresh action', () => {
    const result = deriveLiveInsights({
      ...base,
      healthConnection: { provider: 'healthkit', authorization: 'authorized', granted: ['steps'], lastSyncedAt: '2026-11-03T11:30:00', snapshot: { syncedAt: '2026-11-03T11:30:00', steps: 4200, activeEnergyKcal: 220, workouts: [], weights: [] } },
    });
    expect(result.observations.some((item) => item.id === 'steps-today')).toBe(false);
    expect(result.recommendations.find((item) => item.id === 'connect-health')?.action?.route).toBe('/profile?tab=account&open=health');
  });

  it('keeps activity identifiers stable and duplicate-free across repeated derivation', () => {
    const first = deriveLiveInsights({ ...base, logs: [{ id: 'meal-1', name: 'Oats', date: '2026-11-07', meal: 'Breakfast', calories: 400, protein: 20, carbs: 50, fat: 12, source: 'Manual', confidence: 1, time: '08:30', serving: '1 bowl' }] });
    const second = deriveLiveInsights({ ...base, logs: [{ id: 'meal-1', name: 'Oats', date: '2026-11-07', meal: 'Breakfast', calories: 400, protein: 20, carbs: 50, fat: 12, source: 'Manual', confidence: 1, time: '08:30', serving: '1 bowl' }] });
    expect(first.activity.map((item) => item.id)).toEqual(second.activity.map((item) => item.id));
    expect(new Set(first.activity.map((item) => item.id)).size).toBe(first.activity.length);
  });
});

describe('Insights navigation contracts', () => {
  it('opens the dedicated route from Progress', () => {
    expect(progressSource).toContain('testID="progress-insights-header-button"');
    expect(progressSource).toContain("router.push('/progress-insights' as never)");
    expect(rootLayoutSource).toContain('<Stack.Screen name="progress-insights" options={{ headerShown: false }} />');
  });

  it('preserves Living Memory through Profile', () => {
    expect(profileSource).toContain('testID="review-living-memory"');
    expect(profileSource).toContain('router.push("/memory")');
  });

  it('renders without graphs and exposes refresh, evidence, activity, and recommendation sections', () => {
    expect(source).toContain('What is happening now.');
    expect(source).toContain('What Calora noticed');
    expect(source).toContain('Your activity stream');
    expect(source).toContain('NEXT BEST MOVES');
    expect(source).toContain('RefreshControl');
    expect(source).toContain('Recorded events only');
    expect(source).not.toContain('ProgressLineGraph');
  });
});
