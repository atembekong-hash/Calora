/**
 * HealthKit and Health Connect are not available in the current Calora build.
 * Keep legacy local state from implying that health data is being synchronized
 * until an authorized provider integration is implemented.
 */
export const HEALTH_INTEGRATION_AVAILABLE = false;

export function normalizeHealthConnection(_persistedValue?: boolean): false {
  return false;
}