import type { HealthAuthorization, HealthConnection, HealthMetric, HealthService, HealthSnapshot } from './types';

const identifiers = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  activeEnergy: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  bodyWeight: 'HKQuantityTypeIdentifierBodyMass',
  workouts: 'HKWorkoutTypeIdentifier',
} as const;

async function native() {
  return require('@kingstinct/react-native-healthkit') as any;
}

async function connection(): Promise<HealthConnection> {
  const hk = await native();
  if (!await hk.isHealthDataAvailable()) return { provider: 'healthkit', authorization: 'unavailable', granted: [] };
  const requestStatus = await hk.getRequestStatusForAuthorization({ toRead: Object.values(identifiers) });
  const authorization: HealthAuthorization = requestStatus === 'unnecessary' ? 'authorized' : 'notConnected';
  return { provider: 'healthkit', authorization, granted: authorization === 'authorized' ? ['steps', 'activeEnergy', 'workouts', 'bodyWeight'] : [] };
}

export const healthService: HealthService = {
  getConnection: connection,
  async requestConnection() {
    const hk = await native();
    if (!await hk.isHealthDataAvailable()) return { provider: 'healthkit', authorization: 'unavailable', granted: [] };
    const granted = await hk.requestAuthorization({ toRead: Object.values(identifiers) });
    const next = await connection();
    return granted === false && next.granted.length === 0 ? { ...next, authorization: 'denied' } : next;
  },
  async sync(): Promise<HealthSnapshot> {
    const hk = await native();
    const current = await connection();
    if (current.authorization === 'unavailable') throw new Error('Apple Health is unavailable on this device.');
    const [steps, energy, weight, workouts] = await Promise.all([
      hk.getMostRecentQuantitySample(identifiers.steps),
      hk.getMostRecentQuantitySample(identifiers.activeEnergy),
      hk.getMostRecentQuantitySample(identifiers.bodyWeight),
      hk.queryWorkoutSamples({}),
    ]);
    return {
      syncedAt: new Date().toISOString(),
      steps: Number(steps?.quantity ?? 0) || null,
      activeEnergyKcal: Number(energy?.quantity ?? 0) || null,
      workouts: (workouts ?? []).map((item: any) => ({ id: item.uuid ?? `${item.startDate}-${item.endDate}`, startAt: item.startDate, endAt: item.endDate, type: String(item.workoutActivityType ?? 'workout') })),
      weights: weight?.quantity ? [{ id: weight.uuid ?? `${weight.startDate}-${weight.endDate}`, recordedAt: weight.startDate, kg: Number(weight.quantity) }] : [],
    };
  },
};