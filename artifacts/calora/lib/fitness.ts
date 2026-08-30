import type { HealthConnection, HealthWorkout } from './health/types';
import { healthSnapshotIsFreshForDay } from './health/burnedStatus';
import { dateKey } from './dates';

export const FITNESS_PROGRAM_CONNECTION_KINDS = [
  'official-api',
  'approved-partner-feed',
  'licensed-content',
  'official-link',
] as const;

export type FitnessProgramConnectionKind = typeof FITNESS_PROGRAM_CONNECTION_KINDS[number];

/**
 * The first approved program source is intentionally metadata- and link-only.
 * This is a product boundary, not a claim that partner credentials or a
 * content license are already active.
 */
export const APPROVED_FITNESS_PROGRAM_PROVIDER = {
  id: 'les-mills-content',
  name: 'LES MILLS Content',
  connectionKind: 'official-api',
  launchModel: 'metadata-deep-link',
  officialUrl: 'https://www.lesmills.com/',
  apiDocsUrl: 'https://api.content.lesmills.com/docs/',
  accessLabel: 'Attributed metadata + official deep links',
  contentPolicy: 'No workout instructions, media, or playback in Calora.',
  rightsPolicy: 'A signed partner agreement is required before importing provider metadata.',
} as const;

export type FitnessHealthState =
  | { kind: 'connect'; providerLabel: string; message: string }
  | { kind: 'unavailable'; providerLabel: string; message: string }
  | { kind: 'permission'; providerLabel: string; message: string }
  | { kind: 'failed'; providerLabel: string; message: string }
  | { kind: 'sync'; providerLabel: string; message: string }
  | {
      kind: 'ready';
      providerLabel: string;
      message: string;
      activeEnergyKcal: number | null;
      steps: number | null;
      workouts: HealthWorkout[];
      partial: boolean;
    };

export function fitnessProviderLabel(connection: HealthConnection): string {
  if (connection.provider === 'healthkit') return 'Apple Health';
  if (connection.provider === 'health-connect') return 'Health Connect';
  return 'Health';
}

export function workoutsForLocalDay(workouts: HealthWorkout[], now: Date = new Date()): HealthWorkout[] {
  const today = dateKey(now);
  return workouts
    .filter((workout) => {
      const start = new Date(workout.startAt);
      return !Number.isNaN(start.getTime()) && dateKey(start) === today;
    })
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}

export function fitnessHealthState(connection: HealthConnection, now: Date = new Date()): FitnessHealthState {
  const providerLabel = fitnessProviderLabel(connection);
  if (connection.authorization === 'unavailable') {
    return { kind: 'unavailable', providerLabel, message: 'Native activity import is unavailable on this device.' };
  }
  if (connection.authorization === 'notConnected') {
    return { kind: 'connect', providerLabel, message: `Connect ${providerLabel} to import today’s activity and workouts.` };
  }
  if (connection.authorization === 'denied') {
    return { kind: 'permission', providerLabel, message: `Review ${providerLabel} access to import workouts and activity.` };
  }
  if (connection.authorization === 'error' || connection.syncError) {
    return { kind: 'failed', providerLabel, message: connection.syncError ?? `${providerLabel} could not be connected.` };
  }
  if (!connection.snapshot || !healthSnapshotIsFreshForDay(connection.snapshot, now)) {
    return { kind: 'sync', providerLabel, message: `Sync ${providerLabel} to refresh today’s activity.` };
  }
  const appleReadAccessIsIndeterminate = connection.provider === 'healthkit' && connection.authorization === 'requested';
  const canReadWorkouts = connection.granted.includes('workouts') || appleReadAccessIsIndeterminate;
  return {
    kind: 'ready',
    providerLabel,
    message: connection.authorization === 'partial'
      ? `Showing the ${providerLabel} activity you allowed.`
      : `Today’s activity from ${providerLabel}.`,
    activeEnergyKcal: connection.snapshot.activeEnergyKcal,
    steps: connection.snapshot.steps,
    workouts: canReadWorkouts ? workoutsForLocalDay(connection.snapshot.workouts, now) : [],
    partial: connection.authorization === 'partial' || !canReadWorkouts,
  };
}

export function formatWorkoutDuration(startAt: string, endAt: string): string {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'Duration unavailable';
  const minutes = Math.max(1, Math.round((end - start) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function fitnessGoalCopy(goal: string | undefined): { label: string; message: string } {
  if (goal === 'gain') return { label: 'Build muscle', message: 'Future programs will prioritize progressive strength and recovery.' };
  if (goal === 'lose') return { label: 'Lose weight', message: 'Future programs will balance sustainable activity, strength, and recovery.' };
  return { label: 'Maintain', message: 'Future programs will support balanced strength, mobility, and conditioning.' };
}