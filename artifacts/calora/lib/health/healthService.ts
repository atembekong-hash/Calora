import type { HealthConnection, HealthService } from './types';
import { EMPTY_HEALTH_CONNECTION } from './types';

const unavailable: HealthService = {
  async getConnection(): Promise<HealthConnection> { return EMPTY_HEALTH_CONNECTION; },
  async requestConnection(): Promise<HealthConnection> { return EMPTY_HEALTH_CONNECTION; },
  async sync() { throw new Error('Health data is unavailable on this platform.'); },
};

export const healthService = unavailable;