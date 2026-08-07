/**
 * goalReminder.ts
 * Schedules a single daily local notification as a calorie-goal check-in.
 * All scheduling is entirely on-device — no data leaves the phone.
 */
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './hydrationReminders';

export type GoalReminderPrefs = {
  enabled: boolean;
  /** Hour of day (0–23) */
  hour: number;
  /** Minute (0–59) */
  minute: number;
};

export const DEFAULT_GOAL_REMINDER_PREFS: GoalReminderPrefs = {
  enabled: false,
  hour: 20,
  minute: 0,
};

const NOTIFICATION_TAG = 'calora-goal';

/**
 * Cancel the previously scheduled goal reminder (if any).
 */
export async function cancelGoalReminder(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) => n.content.data?.tag === NOTIFICATION_TAG);
    await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {
    // Silently ignore
  }
}

/**
 * Schedule a daily goal check-in reminder.
 * Returns true if scheduling succeeded or was skipped (disabled), false on permission denial.
 */
export async function scheduleGoalReminder(prefs: GoalReminderPrefs): Promise<boolean> {
  await cancelGoalReminder();
  if (!prefs.enabled) return true;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily goal check-in',
      body: 'How are you tracking today? Tap to log your remaining meals.',
      data: { tag: NOTIFICATION_TAG, category: 'goal' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.hour,
      minute: prefs.minute,
    },
  }).catch(() => null);

  return true;
}
