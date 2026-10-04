import type { HealthAuthorization, HealthConnection, HealthMetric, HealthService, HealthSnapshot } from './types';
import { currentLocalDayRange } from './dayRange';
import { buildHealthDailyMetrics, healthMetricForDate, localHealthHistoryRange, type HealthDailyMetric } from './weekHistory';
import { AuthorizationRequestStatus } from '@kingstinct/react-native-healthkit';
import { dateKey } from '@/lib/dates';

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

export function healthKitHistoryFilter(now = new Date()) {
  const range = localHealthHistoryRange(now);
  return {
    filter: {
      date: {
        startDate: range.startDate,
        endDate: range.endDate,
      },
    },
  };
}

export function healthKitHistoryActiveEnergyOptions(now = new Date()) {
  return { ...healthKitHistoryFilter(now), unit: 'kcal' as const };
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

type HealthKitStatistic = {
  startDate?: unknown;
  sumQuantity?: { quantity?: unknown };
};

function healthKitGroupValues(groups: unknown): Map<string, number | null> {
  if (!Array.isArray(groups)) throw new Error('Apple Health returned invalid grouped health data.');
  const values = new Map<string, number | null>();
  for (const entry of groups as HealthKitStatistic[]) {
    if (!entry || typeof entry !== 'object' || entry.startDate === undefined) {
      throw new Error('Apple Health returned an invalid grouped health period.');
    }
    const start = entry.startDate instanceof Date ? entry.startDate : new Date(String(entry.startDate));
    if (!Number.isFinite(start.getTime())) {
      throw new Error('Apple Health returned an invalid grouped health date.');
    }
    values.set(dateKey(start), healthKitCumulativeQuantity(entry));
  }
  return values;
}

/** Builds a gap-preserving seven-day series from HealthKit statistics collections. */
export function healthKitDailyMetrics(
  stepsGroups: unknown,
  activeEnergyGroups: unknown,
  now = new Date(),
): HealthDailyMetric[] {
  const stepsByDate = healthKitGroupValues(stepsGroups);
  const activeEnergyByDate = healthKitGroupValues(activeEnergyGroups);
  const values = new Map<string, Partial<Omit<HealthDailyMetric, 'date'>>>();
  for (const [date, steps] of stepsByDate) values.set(date, { ...(values.get(date) ?? {}), steps });
  for (const [date, activeEnergyKcal] of activeEnergyByDate) {
    values.set(date, { ...(values.get(date) ?? {}), activeEnergyKcal });
  }
  return buildHealthDailyMetrics(values, now);
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
    const now = new Date();
    const todayFilter = healthKitDayFilter(now);
    const historyFilter = healthKitHistoryFilter(now);
    const historyEnergyOptions = healthKitHistoryActiveEnergyOptions(now);
    const range = localHealthHistoryRange(now);
    const syncedAt = now.toISOString();
    const [steps, energy, weight, workouts] = await Promise.all([
      hk.queryStatisticsCollectionForQuantity(identifiers.steps, ['cumulativeSum'], range.startDate, { day: 1 }, historyFilter),
      hk.queryStatisticsCollectionForQuantity(identifiers.activeEnergy, ['cumulativeSum'], range.startDate, { day: 1 }, historyEnergyOptions),
      hk.getMostRecentQuantitySample(identifiers.bodyWeight, HEALTH_KIT_BODY_WEIGHT_UNIT),
      hk.queryWorkoutSamples({ limit: -1, filter: todayFilter.filter }),
    ]);
    const dailyMetrics = healthKitDailyMetrics(steps, energy, now);
    const today = healthMetricForDate(dailyMetrics, dateKey(now));
    return {
      syncedAt,
      steps: today?.steps ?? null,
      activeEnergyKcal: today?.activeEnergyKcal ?? null,
      dailyMetrics,
      workouts: (workouts ?? []).map((item: any) => ({ id: item.uuid ?? `${item.startDate}-${item.endDate}`, startAt: item.startDate, endAt: item.endDate, type: String(item.workoutActivityType ?? 'workout') })),
      weights: weight?.quantity ? [{ id: weight.uuid ?? `${weight.startDate}-${weight.endDate}`, recordedAt: weight.startDate, kg: Number(weight.quantity) }] : [],
    };
  },
};
