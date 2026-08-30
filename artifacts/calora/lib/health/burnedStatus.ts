import type { HealthConnection } from './types';
import { dateKey } from '../dates';

export type BurnedStatus =
  | { kind: 'ready'; calories: number }
  | { kind: 'past-date'; actionLabel: string }
  | { kind: 'connect'; actionLabel: string }
  | { kind: 'permission'; actionLabel: string }
  | { kind: 'syncing'; actionLabel: string }
  | { kind: 'failed'; actionLabel: string }
  | { kind: 'unavailable'; actionLabel: string };

export function burnedStatusForDay(input: {
  isToday: boolean;
  connection: HealthConnection;
  now?: Date;
}): BurnedStatus {
  const { isToday, connection, now = new Date() } = input;
  if (!isToday) return { kind: 'past-date', actionLabel: 'Burned unavailable for past dates' };
  if (connection.authorization === 'unavailable') return { kind: 'unavailable', actionLabel: 'Health unavailable on this device' };
  if (connection.authorization === 'denied') return { kind: 'permission', actionLabel: 'Allow Health access' };
  if (connection.authorization === 'notConnected') return { kind: 'connect', actionLabel: 'Connect Health' };
  if (!connection.granted.includes('activeEnergy')) return { kind: 'permission', actionLabel: 'Allow active calories' };
  if (connection.syncError) return { kind: 'failed', actionLabel: 'Sync health' };
  if (!connection.snapshot) return { kind: 'syncing', actionLabel: 'Syncing health…' };
  const syncedAt = new Date(connection.snapshot.syncedAt);
  if (Number.isNaN(syncedAt.getTime()) || dateKey(syncedAt) !== dateKey(now)) {
    return { kind: 'syncing', actionLabel: 'Syncing health…' };
  }
  return { kind: 'ready', calories: connection.snapshot.activeEnergyKcal ?? 0 };
}