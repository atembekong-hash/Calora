/**
 * mealReminders.ts
 * Schedules daily local notifications for breakfast, lunch, and dinner logging.
 * All scheduling is entirely on-device — no data leaves the phone.
 */
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './hydrationReminders';

export type MealReminderTime = { hour: number; minute: number };

export type MealReminderPrefs = {
  breakfast: boolean;
  breakfastTime: MealReminderTime;
  lunch: boolean;
  lunchTime: MealReminderTime;
  dinner: boolean;
  dinnerTime: MealReminderTime;
};

export const DEFAULT_MEAL_REMINDER_PREFS: MealReminderPrefs = {
  breakfast: false,
  breakfastTime: { hour: 8, minute: 0 },
  lunch: false,
  lunchTime: { hour: 12, minute: 30 },
  dinner: false,
  dinnerTime: { hour: 18, minute: 30 },
};

const NOTIFICATION_TAG = 'calora-meals';

const MEAL_BODY: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: 'Morning check-in 🌅 Log breakfast to start the day on track.',
  lunch: 'Lunchtime 🥗 Log your midday meal to stay on target.',
  dinner: 'Evening reminder 🍽️ Keep your diary complete before the day ends.',
};

/**
 * Cancel all previously scheduled meal reminders.
 */
export async function cancelMealReminders(): Promise<boolean> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) => n.content.data?.tag === NOTIFICATION_TAG);
    await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    return true;
  } catch (error) {
    console.warn('[Calora][notifications] Could not cancel legacy meal reminders:', error);
    return false;
  }
}

/**
 * Schedule daily meal reminders based on user preferences.
 * Cancels existing reminders first, then schedules new ones.
 * Returns true if scheduling succeeded (or nothing was needed), false when
 * ownership, permission, cancellation, or installation cannot be verified.
 */
export async function scheduleMealReminders(
  prefs: MealReminderPrefs,
  scopeToken?: string,
): Promise<boolean> {
  if (!await cancelMealReminders()) return false;

  const anyEnabled = prefs.breakfast || prefs.lunch || prefs.dinner;
  if (!anyEnabled) return true;
  // Tokenless legacy scheduling cannot establish notification ownership.
  if (!scopeToken) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const entries: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; time: MealReminderTime }> = [
    { key: 'breakfast', time: prefs.breakfastTime },
    { key: 'lunch', time: prefs.lunchTime },
    { key: 'dinner', time: prefs.dinnerTime },
  ];

  const results = await Promise.all(
    entries
      .filter(({ key }) => prefs[key])
      .map(({ key, time }) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: `${key.charAt(0).toUpperCase()}${key.slice(1)} reminder`,
            body: MEAL_BODY[key],
            data: { tag: NOTIFICATION_TAG, category: 'meal', meal: key, scopeToken },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
          },
        }).then(() => true).catch((error) => {
          console.warn('[Calora][notifications] Could not schedule legacy meal reminder:', error);
          return false;
        }),
      ),
  );

  if (results.every(Boolean)) return true;
  await cancelMealReminders();
  return false;
}
