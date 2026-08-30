import type { HealthAuthorization, HealthConnection, HealthMetric, HealthService, HealthSnapshot } from './types';
import { currentLocalDayRange } from './dayRange';
import { AuthorizationRequestStatus } from '@kingstinct/react-native-healthkit';

const identifiers = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  activeEnergy: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  bodyWeight: 'HKQuantityTypeIdentifierBodyMass',
  workouts: 'HKWorkoutTypeIdentifier',
} as const;

export function healthKitDayFilter(now = new Date()) {
  const range = currentLocalDayRange(now);
  return {
    filter: {
      date: {
        startDate: range.startDate,
        endDate: range.endDate,
        strictStartDate: true,
        strictEndDate: true,
      },
    },
  };
}

export function healthKitActiveEnergyOptions(now = new Date()) {
  return { ...healthKitDayFilter(now), unit: 'kcal' as const };
}

async function native() {
  return require('@kingstinct/react-native-healthkit') as any;
}

export function healthKitAuthorizationForRequestStatus(requestStatus: unknown): HealthAuthorization {
  return requestStatus === AuthorizationRequestStatus.unnecessary ? 'authorized' : 'notConnected';
}

async function connection(): Promise<HealthConnection> {
  const hk = await native();
  if (!await hk.isHealthDataAvailable()) return { provider: 'healthkit', authorization: 'unavailable', granted: [] };
  const requestStatus = await hk.getRequestStatusForAuthorization({ toRead: Object.values(identifiers) });
  const authorization = healthKitAuthorizationForRequestStatus(requestStatus);
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
    if (current.authorization !== 'authorized') throw new Error('Allow Apple Health access before syncing.');
    const filter = healthKitDayFilter();
    const energyOptions = healthKitActiveEnergyOptions();
    const syncedAt = new Date().toISOString();
    const [steps, energy, weight, workouts] = await Promise.all([
      hk.queryStatisticsForQuantity(identifiers.steps, ['cumulativeSum'], filter),
      hk.queryStatisticsForQuantity(identifiers.activeEnergy, ['cumulativeSum'], energyOptions),
      hk.getMostRecentQuantitySample(identifiers.bodyWeight),
      hk.queryWorkoutSamples({ limit: -1, filter: filter.filter }),
    ]);
    return {
      syncedAt,
      steps: Number(steps?.sumQuantity?.quantity ?? 0),
      activeEnergyKcal: Number(energy?.sumQuantity?.quantity ?? 0),
      workouts: (workouts ?? []).map((item: any) => ({ id: item.uuid ?? `${item.startDate}-${item.endDate}`, startAt: item.startDate, endAt: item.endDate, type: String(item.workoutActivityType ?? 'workout') })),
      weights: weight?.quantity ? [{ id: weight.uuid ?? `${weight.startDate}-${weight.endDate}`, recordedAt: weight.startDate, kg: Number(weight.quantity) }] : [],
    };
  },
};