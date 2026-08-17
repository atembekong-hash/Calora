import type { HealthConnection, HealthMetric, HealthService, HealthSnapshot } from './types';

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

const timeRange = () => ({
  timeRangeFilter: {
    operator: 'between',
    startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date().toISOString(),
  },
});

export const healthService: HealthService = {
  getConnection: permissions,
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
    const range = timeRange();
    const [steps, calories, workouts, weights] = await Promise.all([
      connection.granted.includes('steps') ? hc.aggregateRecord({ recordType: 'Steps', ...range }) : null,
      connection.granted.includes('activeEnergy') ? hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', ...range }) : null,
      connection.granted.includes('workouts') ? hc.readRecords('ExerciseSession', range) : { records: [] },
      connection.granted.includes('bodyWeight') ? hc.readRecords('Weight', range) : { records: [] },
    ]);
    return {
      syncedAt: new Date().toISOString(),
      steps: Number(steps?.COUNT_TOTAL ?? steps?.count ?? 0) || null,
      activeEnergyKcal: Number(calories?.ENERGY_TOTAL?.inKilocalories ?? calories?.energy?.inKilocalories ?? 0) || null,
      workouts: (workouts?.records ?? []).map((item: any) => ({ id: item.metadata?.id ?? `${item.startTime}-${item.endTime}`, startAt: item.startTime, endAt: item.endTime, type: String(item.exerciseType ?? 'workout') })),
      weights: (weights?.records ?? []).map((item: any) => ({ id: item.metadata?.id ?? `${item.time}-${item.startTime}`, recordedAt: item.time ?? item.startTime, kg: Number(item.weight?.inKilograms ?? item.weight?.inKilogram ?? 0) })).filter((item: { kg: number }) => item.kg > 0),
    };
  },
};