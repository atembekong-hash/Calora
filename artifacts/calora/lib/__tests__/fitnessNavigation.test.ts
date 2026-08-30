import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPROVED_FITNESS_PROGRAM_PROVIDER,
  FITNESS_PROGRAM_CONNECTION_KINDS,
  fitnessHealthState,
  formatWorkoutDuration,
  workoutsForLocalDay,
} from '../fitness';
import type { HealthConnection } from '../health/types';

const readyConnection = (overrides: Partial<HealthConnection> = {}): HealthConnection => ({
  provider: 'health-connect',
  authorization: 'authorized',
  granted: ['steps', 'activeEnergy', 'workouts'],
  snapshot: {
    syncedAt: '2026-08-30T14:00:00-04:00',
    steps: 0,
    activeEnergyKcal: 0,
    workouts: [],
    weights: [],
  },
  ...overrides,
});

describe('Fitness health boundary', () => {
  it('preserves measured zeroes as ready values', () => {
    const state = fitnessHealthState(readyConnection(), new Date('2026-08-30T18:00:00-04:00'));
    expect(state.kind).toBe('ready');
    if (state.kind !== 'ready') throw new Error('Expected ready state');
    expect(state.activeEnergyKcal).toBe(0);
    expect(state.steps).toBe(0);
  });

  it('does not present a previous-day snapshot as current activity', () => {
    const state = fitnessHealthState(readyConnection(), new Date('2026-08-31T08:00:00-04:00'));
    expect(state.kind).toBe('sync');
  });

  it('keeps Apple Health requested access usable without claiming individual grants', () => {
    const state = fitnessHealthState(readyConnection({
      provider: 'healthkit',
      authorization: 'requested',
      granted: [],
      snapshot: {
        syncedAt: '2026-08-30T14:00:00-04:00',
        steps: null,
        activeEnergyKcal: null,
        workouts: [],
        weights: [],
      },
    }), new Date('2026-08-30T18:00:00-04:00'));
    expect(state.kind).toBe('ready');
  });

  it('filters and orders imported workouts for the current local day', () => {
    const workouts = workoutsForLocalDay([
      { id: 'old', type: 'Walk', startAt: '2026-08-29T17:00:00-04:00', endAt: '2026-08-29T17:20:00-04:00' },
      { id: 'early', type: 'Run', startAt: '2026-08-30T07:00:00-04:00', endAt: '2026-08-30T07:30:00-04:00' },
      { id: 'late', type: 'Strength', startAt: '2026-08-30T17:00:00-04:00', endAt: '2026-08-30T17:45:00-04:00' },
    ], new Date('2026-08-30T18:00:00-04:00'));
    expect(workouts.map((workout) => workout.id)).toEqual(['late', 'early']);
  });

  it('rejects invalid workout durations instead of inventing zero minutes', () => {
    expect(formatWorkoutDuration('invalid', 'invalid')).toBe('Duration unavailable');
    expect(formatWorkoutDuration('2026-08-30T10:00:00Z', '2026-08-30T09:00:00Z')).toBe('Duration unavailable');
  });

  it('allows only approved provider connection paths', () => {
    expect(FITNESS_PROGRAM_CONNECTION_KINDS).toEqual([
      'official-api',
      'approved-partner-feed',
      'licensed-content',
      'official-link',
    ]);
  });

  it('keeps the selected LES MILLS launch metadata- and link-only', () => {
    expect(APPROVED_FITNESS_PROGRAM_PROVIDER).toMatchObject({
      id: 'les-mills-content',
      connectionKind: 'official-api',
      launchModel: 'metadata-deep-link',
    });
    expect(APPROVED_FITNESS_PROGRAM_PROVIDER.contentPolicy).toContain('No workout instructions');
    expect(APPROVED_FITNESS_PROGRAM_PROVIDER.rightsPolicy).toContain('signed partner agreement');
  });
});

describe('primary navigation contract', () => {
  const layout = readFileSync(resolve(process.cwd(), 'app/(tabs)/_layout.tsx'), 'utf8');
  const more = readFileSync(resolve(process.cwd(), 'app/(tabs)/more.tsx'), 'utf8');

  it('shows Home, Recipes, Scan, Fitness, and More as the five visible destinations', () => {
    for (const route of ['index', 'recipes', 'scan', 'fitness', 'more']) {
      expect(layout).toContain(`name="${route}"`);
    }
    expect(layout.match(/<Tabs\.Screen/g)).toHaveLength(8);
  });

  it('keeps Plan and Progress routes hidden and reachable from More', () => {
    expect(layout).toMatch(/name="insights"[\s\S]*?href: null/);
    expect(layout).toMatch(/name="planner"[\s\S]*?href: null/);
    expect(more).toContain("router.navigate('/(tabs)/planner')");
    expect(more).toContain("router.navigate('/(tabs)/insights')");
    expect(more).toContain('testID="more-route-planner"');
    expect(more).toContain('testID="more-route-insights"');
  });
});