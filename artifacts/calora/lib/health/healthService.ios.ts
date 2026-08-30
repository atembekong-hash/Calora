import type { HealthAuthorization, HealthConnection, HealthMetric, HealthService, HealthSnapshot } from './types';
import { currentLocalDayRange } from './dayRange';
import { AuthorizationRequestStatus } from '@kingstinct/react-native-healthkit';

const identifiers = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  activeEnergy: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  bodyWeight: 'HKQuantityTypeIdentifierBodyMass',
  workouts: 'HKWorkoutTypeIdentifier',
} as const;

export const HEALTH_KIT_BODY_WEIGHT_UNIT = 'kg' as const;

export function healthKitDayFilter(now = new Date()) {
  const range = currentLocalDayRange(now);
  return {
    filter: {
      date: {
        startDate: range.startDate,
        endDate: range.endDate,
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
  if (requestStatus === AuthorizationRequestStatus.unnecessary) return 'requested';
  if (requestStatus === AuthorizationRequestStatus.shouldRequest) return 'notConnected';
  return 'error';
}

export function healthKitCumulativeQuantity(result: unknown): number | null {
  const value = (result as { sumQuantity?: { quantity?: unknown } } | null | undefined)?.sumQuantity?.quantity;
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Apple Health returned an invalid cumulative quantity.');
  }
  return value;
}

async function connection(): Promise<HealthConnection> {
  const hk = await native();
  if (!await hk.isHealthDataAvailable()) return { provider: 'healthkit', authorization: 'unavailable', granted: [] };
  const requestStatus = await hk.getRequestStatusForAuthorization({ toRead: Object.values(identifiers) });
  const authorization = healthKitAuthorizationForRequestStatus(requestStatus);
  return { provider: 'healthkit', authorization, granted: [] };
}

export const healthService: HealthService = {
  getConnection: connection,
  async requestConnection() {
    const hk = await native();
    if (!await hk.isHealthDataAvailable()) return { provider: 'healthkit', authorization: 'unavailable', granted: [] };
    const completed = await hk.requestAuthorization({ toRead: Object.values(identifiers) });
    const next = await connection();
    return completed ? next : { ...next, authorization: 'error', syncError: 'Apple Health authorization could not be completed.' };
  },
  async sync(): Promise<HealthSnapshot> {
    const hk = await native();
    const current = await connection();
    if (current.authorization !== 'requested') throw new Error('Request Apple Health access before syncing.');
    const filter = healthKitDayFilter();
    const energyOptions = healthKitActiveEnergyOptions();
    const range = currentLocalDayRange();
    const syncedAt = new Date().toISOString();
    const [steps, energy, weight, workouts] = await Promise.all([
      hk.queryStatisticsCollectionForQuantity(identifiers.steps, ['cumulativeSum'], range.startDate, { day: 1 }, filter),
      hk.queryStatisticsCollectionForQuantity(identifiers.activeEnergy, ['cumulativeSum'], range.startDate, { day: 1 }, energyOptions),
      hk.getMostRecentQuantitySample(identifiers.bodyWeight, HEALTH_KIT_BODY_WEIGHT_UNIT),
      hk.queryWorkoutSamples({ limit: -1, filter: filter.filter }),
    ]);
    const stepTotal = healthKitCumulativeQuantity(steps?.at?.(-1) ?? steps?.[steps.length - 1]);
    const activeEnergyTotal = healthKitCumulativeQuantity(energy?.at?.(-1) ?? energy?.[energy.length - 1]);
    return {
      syncedAt,
      steps: stepTotal,
      activeEnergyKcal: activeEnergyTotal,
      workouts: (workouts ?? []).map((item: any) => ({ id: item.uuid ?? `${item.startDate}-${item.endDate}`, startAt: item.startDate, endAt: item.endDate, type: String(item.workoutActivityType ?? 'workout') })),
      weights: weight?.quantity ? [{ id: weight.uuid ?? `${weight.startDate}-${weight.endDate}`, recordedAt: weight.startDate, kg: Number(weight.quantity) }] : [],
    };
  },
};