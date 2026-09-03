/**
 * hydrationReminders.ts
 * Schedules local daily notifications to remind the user to drink water.
 * All scheduling is entirely on-device — no data leaves the phone.
 */
import * as Notifications from 'expo-notifications';

export type HydrationReminderPrefs = {
  enabled: boolean;
  /** Hour of day the user wakes up (0–23) */
  wakeHour: number;
  /** Minute of the wake hour */
  wakeMinute: number;
  /** Hour of day the user goes to sleep (0–23) */
  sleepHour: number;
  /** Minute of the sleep hour */
  sleepMinute: number;
  /** Interval in hours between reminders */
  intervalHours: number;
};

const NOTIFICATION_TAG = 'calora-hydration';

const REMINDER_MESSAGES = [
  'Time for a glass of water 💧 Stay on track.',
  'A quick hydration check-in — how about a glass?',
  'Small sips, steady rhythm. Time to drink some water.',
  'Your body will thank you. Drink up!',
  'Halfway through? Keep hydrating — one glass at a time.',
  'Water break. A moment for yourself.',
];

function getMessage(slotIndex: number): string {
  return REMINDER_MESSAGES[slotIndex % REMINDER_MESSAGES.length];
}

/**
 * Request notification permission. Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Cast needed: PermissionResponse.granted is defined at runtime but may not
    // be surfaced in the ambient type declaration of this expo-notifications version.
    const existing = await Notifications.getPermissionsAsync() as unknown as { granted: boolean };
    if (existing.granted) return true;
    const result = await Notifications.requestPermissionsAsync() as unknown as { granted: boolean };
    return result.granted;
  } catch {
    return false;
  }
}

/**
 * Cancel all previously scheduled hydration reminders.
 */
export async function cancelHydrationReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter(
      (n) => n.content.data?.tag === NOTIFICATION_TAG,
    );
    await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {
    // Silently ignore — cancellation failure should not block the user
  }
}

/**
 * Schedule daily hydration reminders based on user preferences.
 * Cancels any existing reminders first, then schedules new ones.
 * Returns the number of reminders scheduled, or -1 on permission failure.
 */
export async function scheduleHydrationReminders(
  prefs: HydrationReminderPrefs,
): Promise<number> {
  await cancelHydrationReminders();

  if (!prefs.enabled) return 0;

  const granted = await requestNotificationPermission();
  if (!granted) return -1;

  // Build a list of reminder times (hour, minute) between wake and sleep
  const slots: Array<{ hour: number; minute: number }> = [];
  const wakeTotal = prefs.wakeHour * 60 + prefs.wakeMinute;
  const sleepTotal = prefs.sleepHour * 60 + prefs.sleepMinute;
  const intervalMins = prefs.intervalHours * 60;

  // Start one interval after wake time
  let current = wakeTotal + intervalMins;
  while (current < sleepTotal) {
    slots.push({ hour: Math.floor(current / 60), minute: current % 60 });
    current += intervalMins;
  }

  // Schedule each slot as a daily repeating notification
  await Promise.all(
    slots.map((slot, i) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hydration reminder',
          body: getMessage(i),
          data: { tag: NOTIFICATION_TAG, category: 'hydration' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
        },
      }).catch(() => null), // Individual failures should not abort the others
    ),
  );

  return slots.length;
}

/**
 * Format a time {hour, minute} as a readable string like "8:00 AM"
 */
export function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = `${minute}`.padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}
