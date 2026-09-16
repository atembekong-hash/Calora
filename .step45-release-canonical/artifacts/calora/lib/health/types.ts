export type HealthProvider = 'health-connect' | 'healthkit' | 'unsupported';
export type HealthMetric = 'steps' | 'activeEnergy' | 'workouts' | 'bodyWeight';
export type HealthAuthorization = 'notConnected' | 'requested' | 'authorized' | 'partial' | 'denied' | 'unavailable' | 'error';

export type HealthWorkout = { id: string; startAt: string; endAt: string; type: string };
export type HealthWeight = { id: string; recordedAt: string; kg: number };
export type HealthSnapshot = {
  syncedAt: string;
  steps: number | null;
  activeEnergyKcal: number | null;
  workouts: HealthWorkout[];
  weights: HealthWeight[];
};
export type HealthConnection = {
  provider: HealthProvider;
  authorization: HealthAuthorization;
  granted: HealthMetric[];
  lastSyncedAt?: string;
  syncError?: string;
  snapshot?: HealthSnapshot;
};

export const EMPTY_HEALTH_CONNECTION: HealthConnection = {
  provider: 'unsupported',
  authorization: 'unavailable',
  granted: [],
};

export interface HealthService {
  getConnection(): Promise<HealthConnection>;
  requestConnection(): Promise<HealthConnection>;
  sync(): Promise<HealthSnapshot>;
}