import {
  EMPTY_HEALTH_CONNECTION,
  type HealthAuthorization,
  type HealthConnection,
  type HealthMetric,
  type HealthSnapshot,
  type HealthProvider,
  type HealthWeight,
  type HealthWorkout,
} from './health/types';
import { normalizeHealthDailyMetrics } from './health/weekHistory';

export const HEALTH_INTEGRATION_AVAILABLE = true;

const providers = new Set<HealthProvider>(['health-connect', 'healthkit', 'unsupported']);
const authorizations = new Set<HealthAuthorization>(['notConnected', 'requested', 'authorized', 'partial', 'denied', 'unavailable', 'error']);
const metrics = new Set<HealthMetric>(['steps', 'activeEnergy', 'workouts', 'bodyWeight']);
const INVALID_SNAPSHOT_MESSAGE = 'Stored health data was invalid and was ignored.';

function isoTimestamp(value: unknown): string | undefined {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime()) ? value : undefined;
}

function nonNegativeNumberOrNull(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function healthWorkout(value: unknown): HealthWorkout | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const workout = value as Partial<HealthWorkout>;
  const startAt = isoTimestamp(workout.startAt);
  const endAt = isoTimestamp(workout.endAt);
  if (typeof workout.id !== 'string' || !workout.id || !startAt || !endAt || typeof workout.type !== 'string' || !workout.type) return undefined;
  return { id: workout.id, startAt, endAt, type: workout.type };
}

function healthWeight(value: unknown): HealthWeight | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const weight = value as Partial<HealthWeight>;
  const recordedAt = isoTimestamp(weight.recordedAt);
  if (typeof weight.id !== 'string' || !weight.id || !recordedAt || typeof weight.kg !== 'number' || !Number.isFinite(weight.kg) || weight.kg <= 0) return undefined;
  return { id: weight.id, recordedAt, kg: weight.kg };
}

function healthSnapshot(value: unknown): HealthSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<HealthSnapshot>;
  const syncedAt = isoTimestamp(snapshot.syncedAt);
  const steps = nonNegativeNumberOrNull(snapshot.steps);
  const activeEnergyKcal = nonNegativeNumberOrNull(snapshot.activeEnergyKcal);
  if (!syncedAt || steps === undefined || activeEnergyKcal === undefined || !Array.isArray(snapshot.workouts) || !Array.isArray(snapshot.weights)) return undefined;

  const workouts = snapshot.workouts.map(healthWorkout);
  const weights = snapshot.weights.map(healthWeight);
  if (workouts.some((workout) => !workout) || weights.some((weight) => !weight)) return undefined;
  const dailyMetrics = snapshot.dailyMetrics === undefined
    ? undefined
    : normalizeHealthDailyMetrics(snapshot.dailyMetrics);
  return {
    syncedAt,
    steps,
    activeEnergyKcal,
    ...(dailyMetrics === undefined ? {} : { dailyMetrics }),
    workouts: workouts as HealthWorkout[],
    weights: weights as HealthWeight[],
  };
}

/** Whether Android can sync some data but still needs Active Calories read access. */
export function needsActiveEnergyAuthorization(connection: HealthConnection): boolean {
  return connection.provider === 'health-connect'
    && connection.authorization === 'partial'
    && !connection.granted.includes('activeEnergy');
}

/** Whether Android can sync some data but still needs Steps read access. */
export function needsStepsAuthorization(connection: HealthConnection): boolean {
  return connection.provider === 'health-connect'
    && connection.authorization === 'partial'
    && !connection.granted.includes('steps');
}

export function normalizeHealthConnection(value?: boolean | Partial<HealthConnection>): HealthConnection {
  if (!value || typeof value === 'boolean') return EMPTY_HEALTH_CONNECTION;
  const provider = providers.has(value.provider as HealthProvider) ? value.provider as HealthProvider : 'unsupported';
  const authorization = authorizations.has(value.authorization as HealthAuthorization)
    ? value.authorization as HealthAuthorization
    : provider === 'unsupported' ? 'unavailable' : 'notConnected';
  const granted = Array.isArray(value.granted)
    ? [...new Set(value.granted.filter((metric): metric is HealthMetric => metrics.has(metric as HealthMetric)))]
    : [];
  const snapshot = healthSnapshot(value.snapshot);
  const invalidSnapshot = value.snapshot !== undefined && !snapshot;
  const syncError = typeof value.syncError === 'string' && value.syncError.trim()
    ? value.syncError.trim().slice(0, 500)
    : invalidSnapshot ? INVALID_SNAPSHOT_MESSAGE : undefined;

  return {
    provider,
    authorization,
    granted,
    lastSyncedAt: isoTimestamp(value.lastSyncedAt),
    syncError,
    snapshot,
  };
}

/**
 * Native Health permissions are device-wide, whereas Calora's decision to use
 * them is account-scoped. A newly signed-in account must explicitly connect
 * before a provider permission granted while another account was active can
 * cause reads or populate an account-local snapshot.
 */
export function resolveAccountHealthProbe(
  persisted: HealthConnection,
  provider: HealthConnection,
): HealthConnection {
  const accountHasConnected = persisted.provider === provider.provider
    && ['requested', 'authorized', 'partial'].includes(persisted.authorization);
  if (accountHasConnected) return provider;
  if (provider.provider === 'unsupported' || provider.authorization === 'unavailable') {
    return { ...provider, granted: [], snapshot: undefined, lastSyncedAt: undefined };
  }
  return {
    provider: provider.provider,
    authorization: 'notConnected',
    granted: [],
  };
}
