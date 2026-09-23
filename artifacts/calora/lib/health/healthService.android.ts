import type { HealthConnection, HealthMetric, HealthService, HealthSnapshot } from './types';
import { currentLocalDayRange } from './dayRange';

const requested = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
] as const;

const metricFor = (recordType: string): HealthMetric | null => ({
  Steps: 'steps',
  ActiveCaloriesBurned: 'activeEnergy',
  ExerciseSession: 'workouts',
  Weight: 'bodyWeight',
}[recordType] as HealthMetric | undefined) ?? null;

/**
 * Health Connect's native bridge serializes a missing aggregate metric as 0.
 * `dataOrigins` remains the provider evidence for whether an active-calorie
 * record contributed to that aggregate. Do not infer absence from zero: a
 * contributing source can legitimately measure zero active calories.
 */
export function healthConnectActiveEnergyKcal(result: unknown): number | null {
  const aggregate = result as {
    dataOrigins?: unknown;
    ACTIVE_CALORIES_TOTAL?: { inKilocalories?: unknown };
  } | null | undefined;
  const origins = aggregate?.dataOrigins;
  if (!Array.isArray(origins) || !origins.every((origin) => typeof origin === 'string')) {
    throw new Error('Health Connect returned invalid active calorie evidence.');
  }
  if (origins.length === 0) return null;

  const value = aggregate?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Health Connect returned an invalid active calorie total.');
  }
  return value;
}

async function native() {
  return require('react-native-health-connect') as any;
}

async function permissions(): Promise<HealthConnection> {
  const hc = await native();
  const ready = await hc.initialize();
  if (!ready) return { provider: 'health-connect', authorization: 'unavailable', granted: [] };
  const granted = await hc.getGrantedPermissions();
  const metrics = granted.map((permission: { accessType: string; recordType: string }) =>
    permission.accessType === 'read' ? metricFor(permission.recordType) : null,
  ).filter(Boolean) as HealthMetric[];
  return {
    provider: 'health-connect',
    authorization: metrics.length === 0 ? 'notConnected' : metrics.length === requested.length ? 'authorized' : 'partial',
    granted: metrics,
  };
}

export const healthConnectDayRange = (now = new Date()) => {
  const range = currentLocalDayRange(now);
  return {
  timeRangeFilter: {
    operator: 'between',
    startTime: range.startTime,
    endTime: range.endTime,
  },
  };
};

export const healthService: HealthService = {
  getConnection: permissions,
  async openSettings() {
    const hc = await native();
    if (typeof hc.openHealthConnectSettings !== 'function') {
      throw new Error('Health Connect settings are unavailable on this device.');
    }
    hc.openHealthConnectSettings();
  },
  async requestConnection() {
    const hc = await native();
    if (!await hc.initialize()) return { provider: 'health-connect', authorization: 'unavailable', granted: [] };
    await hc.requestPermission(requested);
    const connection = await permissions();
    return connection.granted.length === 0 ? { ...connection, authorization: 'denied' } : connection;
  },
  async sync(): Promise<HealthSnapshot> {
    const hc = await native();
    const connection = await permissions();
    if (connection.authorization === 'unavailable' || connection.granted.length === 0) throw new Error('Allow Health Connect access before syncing.');
    const range = healthConnectDayRange();
    const syncedAt = new Date().toISOString();
    const [steps, calories, workouts, weights] = await Promise.all([
      connection.granted.includes('steps') ? hc.aggregateRecord({ recordType: 'Steps', ...range }) : null,
      connection.granted.includes('activeEnergy') ? hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', ...range }) : null,
      connection.granted.includes('workouts') ? hc.readRecords('ExerciseSession', range) : { records: [] },
      connection.granted.includes('bodyWeight') ? hc.readRecords('Weight', range) : { records: [] },
    ]);
    return {
      syncedAt,
      steps: connection.granted.includes('steps')
        ? Number(steps?.COUNT_TOTAL ?? steps?.count ?? 0)
        : null,
      activeEnergyKcal: connection.granted.includes('activeEnergy')
        ? healthConnectActiveEnergyKcal(calories)
        : null,
      workouts: (workouts?.records ?? []).map((item: any) => ({ id: item.metadata?.id ?? `${item.startTime}-${item.endTime}`, startAt: item.startTime, endAt: item.endTime, type: String(item.exerciseType ?? 'workout') })),
      weights: (weights?.records ?? []).map((item: any) => ({ id: item.metadata?.id ?? `${item.time}-${item.startTime}`, recordedAt: item.time ?? item.startTime, kg: Number(item.weight?.inKilograms ?? item.weight?.inKilogram ?? 0) })).filter((item: { kg: number }) => item.kg > 0),
    };
  },
};
