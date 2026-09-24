import type { HealthConnection, HealthSnapshot } from './types';
import { dateKey } from '../dates';

export type BurnedStatus =
  | { kind: 'ready'; calories: number }
  | { kind: 'past-date'; actionLabel: string }
  | { kind: 'future-date'; actionLabel: string }
  | { kind: 'connect'; actionLabel: string }
  | { kind: 'permission'; actionLabel: string }
  | { kind: 'no-data'; actionLabel: string }
  | { kind: 'syncing'; actionLabel: string }
  | { kind: 'failed'; actionLabel: string }
  | { kind: 'unavailable'; actionLabel: string };

export function healthSnapshotIsFreshForDay(snapshot: HealthSnapshot | undefined, now: Date = new Date()): boolean {
  if (!snapshot) return false;
  const syncedAt = new Date(snapshot.syncedAt);
  return !Number.isNaN(syncedAt.getTime()) && dateKey(syncedAt) === dateKey(now);
}

export function burnedStatusForDay(input: {
  isToday: boolean;
  isFuture?: boolean;
  connection: HealthConnection;
  now?: Date;
}): BurnedStatus {
  const { isToday, isFuture = false, connection, now = new Date() } = input;
  if (!isToday) {
    return isFuture
      ? { kind: 'future-date', actionLabel: 'Burned unavailable for future dates' }
      : { kind: 'past-date', actionLabel: 'Burned unavailable for past dates' };
  }
  if (connection.authorization === 'unavailable') return { kind: 'unavailable', actionLabel: 'Health unavailable on this device' };
  if (connection.authorization === 'error') return { kind: 'failed', actionLabel: 'Connect Health' };
  if (connection.authorization === 'denied') return { kind: 'permission', actionLabel: 'Allow Health access' };
  if (connection.authorization === 'notConnected') return { kind: 'connect', actionLabel: 'Connect Health' };
  const appleReadAccessIsIndeterminate = connection.provider === 'healthkit' && connection.authorization === 'requested';
  if (!connection.granted.includes('activeEnergy') && !appleReadAccessIsIndeterminate) return { kind: 'permission', actionLabel: 'Allow active calories' };
  if (connection.syncError) return { kind: 'failed', actionLabel: 'Sync health' };
  if (!connection.snapshot) return { kind: 'syncing', actionLabel: 'Syncing health…' };
  if (!healthSnapshotIsFreshForDay(connection.snapshot, now)) {
    return { kind: 'syncing', actionLabel: 'Syncing health…' };
  }
  if (connection.snapshot.activeEnergyKcal === null) {
    return connection.provider === 'healthkit'
      ? { kind: 'permission', actionLabel: 'Review Apple Health access' }
      : { kind: 'no-data', actionLabel: 'No active calories recorded today' };
  }
  return { kind: 'ready', calories: connection.snapshot.activeEnergyKcal };
}
