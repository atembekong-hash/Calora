import { EMPTY_HEALTH_CONNECTION, type HealthConnection } from './health/types';

export const HEALTH_INTEGRATION_AVAILABLE = true;

export function normalizeHealthConnection(value?: boolean | Partial<HealthConnection>): HealthConnection {
  if (!value || typeof value === 'boolean') return EMPTY_HEALTH_CONNECTION;
  return {
    provider: value.provider ?? 'unsupported',
    authorization: value.authorization ?? 'notConnected',
    granted: value.granted ?? [],
    lastSyncedAt: value.lastSyncedAt,
    syncError: value.syncError,
    snapshot: value.snapshot,
  };
}