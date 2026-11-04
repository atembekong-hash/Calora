import type { LocalNotificationPreferences, NotificationTime } from './notificationPreferences';
import type { LiveStepTrackingState } from './steps/stepTracking';

export const DEFAULT_MOVEMENT_INACTIVITY_MINUTES = 60;
export const MIN_MOVEMENT_INACTIVITY_MINUTES = 30;
export const MAX_MOVEMENT_INACTIVITY_MINUTES = 240;

export type MovementReminderContext = {
  now: Date;
  lastActivityAt: string | null;
};

export function normalizeMovementInactivityMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_MOVEMENT_INACTIVITY_MINUTES;
  return Math.min(MAX_MOVEMENT_INACTIVITY_MINUTES, Math.max(MIN_MOVEMENT_INACTIVITY_MINUTES, Math.round(value)));
}

export function lastStepActivityAt(state: LiveStepTrackingState): string | null {
  return state.updatedAt;
}

function minutes(value: NotificationTime): number {
  return value.hour * 60 + value.minute;
}

function isQuiet(date: Date, quietHours: LocalNotificationPreferences['quietHours']): boolean {
  if (!quietHours.enabled) return false;
  const value = { hour: date.getHours(), minute: date.getMinutes() };
  const current = minutes(value);
  const start = minutes(quietHours.start);
  const end = minutes(quietHours.end);
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

/** Returns the next legal delivery time, moving an alert out of quiet hours. */
export function movementReminderAt(
  preferences: LocalNotificationPreferences,
  context: MovementReminderContext,
): Date | null {
  const category = preferences.categories.movement;
  if (!preferences.masterEnabled || !category.enabled || !category.preferences.enabled) return null;
  if (!context.lastActivityAt) return null;
  const lastActivity = new Date(context.lastActivityAt);
  if (Number.isNaN(lastActivity.getTime())) return null;
  const threshold = normalizeMovementInactivityMinutes(category.preferences.inactivityMinutes);
  const target = new Date(lastActivity.getTime() + threshold * 60_000);
  if (target.getTime() <= context.now.getTime()) {
    target.setTime(context.now.getTime() + 1_000);
  }
  if (isQuiet(target, preferences.quietHours)) {
    const end = new Date(target);
    end.setHours(preferences.quietHours.end.hour, preferences.quietHours.end.minute, 0, 0);
    if (end.getTime() <= target.getTime()) end.setDate(end.getDate() + 1);
    return end;
  }
  return target;
}

export function shouldScheduleMovementReminder(
  preferences: LocalNotificationPreferences,
  state: LiveStepTrackingState,
  now: Date,
): boolean {
  return movementReminderAt(preferences, { now, lastActivityAt: lastStepActivityAt(state) }) !== null;
}
