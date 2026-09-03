import type { GoalReminderPrefs } from './goalReminder';
import type { HydrationReminderPrefs } from './hydrationReminders';
import type { MealReminderPrefs } from './mealReminders';

export const NOTIFICATION_PREFERENCES_VERSION = 1 as const;

export type NotificationTime = { hour: number; minute: number };
export type NotificationCategory<T> = { enabled: boolean; preferences: T };

export type LocalNotificationPreferences = {
  version: typeof NOTIFICATION_PREFERENCES_VERSION;
  delivery: 'local';
  masterEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: NotificationTime;
    end: NotificationTime;
  };
  categories: {
    hydration: NotificationCategory<HydrationReminderPrefs>;
    meal: NotificationCategory<MealReminderPrefs>;
    goal: NotificationCategory<GoalReminderPrefs>;
  };
};

export type LegacyReminderFields = {
  hydrationReminders?: HydrationReminderPrefs;
  mealReminders?: MealReminderPrefs;
  goalReminder?: GoalReminderPrefs;
};

export const DEFAULT_LOCAL_NOTIFICATION_PREFERENCES: LocalNotificationPreferences = {
  version: NOTIFICATION_PREFERENCES_VERSION,
  delivery: 'local',
  masterEnabled: true,
  quietHours: {
    enabled: false,
    start: { hour: 22, minute: 0 },
    end: { hour: 7, minute: 0 },
  },
  categories: {
    hydration: {
      enabled: false,
      preferences: {
        enabled: false,
        wakeHour: 7,
        wakeMinute: 0,
        sleepHour: 22,
        sleepMinute: 0,
        intervalHours: 2,
      },
    },
    meal: {
      enabled: false,
      preferences: {
        breakfast: false,
        breakfastTime: { hour: 8, minute: 0 },
        lunch: false,
        lunchTime: { hour: 12, minute: 30 },
        dinner: false,
        dinnerTime: { hour: 18, minute: 30 },
      },
    },
    goal: { enabled: false, preferences: { enabled: false, hour: 20, minute: 0 } },
  },
};

function finiteInt(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.trunc(value)))
    : fallback;
}

function time(value: unknown, fallback: NotificationTime): NotificationTime {
  const candidate = value && typeof value === 'object' ? value as Partial<NotificationTime> : {};
  return {
    hour: finiteInt(candidate.hour, fallback.hour, 0, 23),
    minute: finiteInt(candidate.minute, fallback.minute, 0, 59),
  };
}

/**
 * Normalizes persisted preferences, or migrates the three legacy top-level
 * reminder fields. Migration leaves every legacy effective toggle unchanged.
 */
export function normalizeNotificationPreferences(
  value: unknown,
  legacy: LegacyReminderFields = {},
): LocalNotificationPreferences {
  const defaults = DEFAULT_LOCAL_NOTIFICATION_PREFERENCES;
  const candidate = value && typeof value === 'object'
    ? value as Partial<LocalNotificationPreferences>
    : undefined;
  const categories = candidate?.categories;
  const hydration = categories?.hydration?.preferences ?? legacy.hydrationReminders ?? defaults.categories.hydration.preferences;
  const meal = categories?.meal?.preferences ?? legacy.mealReminders ?? defaults.categories.meal.preferences;
  const goal = categories?.goal?.preferences ?? legacy.goalReminder ?? defaults.categories.goal.preferences;
  const quiet = candidate?.quietHours;

  return {
    version: NOTIFICATION_PREFERENCES_VERSION,
    delivery: 'local',
    masterEnabled: candidate?.masterEnabled !== false,
    quietHours: {
      enabled: quiet?.enabled === true,
      start: time(quiet?.start, defaults.quietHours.start),
      end: time(quiet?.end, defaults.quietHours.end),
    },
    categories: {
      hydration: {
        enabled: categories?.hydration?.enabled ?? (hydration.enabled === true),
        preferences: {
          enabled: hydration.enabled === true,
          wakeHour: finiteInt(hydration.wakeHour, defaults.categories.hydration.preferences.wakeHour, 0, 23),
          wakeMinute: finiteInt(hydration.wakeMinute, defaults.categories.hydration.preferences.wakeMinute, 0, 59),
          sleepHour: finiteInt(hydration.sleepHour, defaults.categories.hydration.preferences.sleepHour, 0, 23),
          sleepMinute: finiteInt(hydration.sleepMinute, defaults.categories.hydration.preferences.sleepMinute, 0, 59),
          intervalHours: finiteInt(hydration.intervalHours, defaults.categories.hydration.preferences.intervalHours, 1, 23),
        },
      },
      meal: {
        enabled: categories?.meal?.enabled ?? (meal.breakfast === true || meal.lunch === true || meal.dinner === true),
        preferences: {
          breakfast: meal.breakfast === true,
          breakfastTime: time(meal.breakfastTime, defaults.categories.meal.preferences.breakfastTime),
          lunch: meal.lunch === true,
          lunchTime: time(meal.lunchTime, defaults.categories.meal.preferences.lunchTime),
          dinner: meal.dinner === true,
          dinnerTime: time(meal.dinnerTime, defaults.categories.meal.preferences.dinnerTime),
        },
      },
      goal: {
        enabled: categories?.goal?.enabled ?? (goal.enabled === true),
        preferences: {
          enabled: goal.enabled === true,
          ...time({ hour: goal.hour, minute: goal.minute }, defaults.categories.goal.preferences),
        },
      },
    },
  };
}

/**
 * Legacy mirrors reflect effective delivery so rollback cannot accidentally
 * schedule notifications while the new master switch is off. The normalized
 * model still retains the user's desired category settings for later re-enable.
 */
export function legacyReminderMirrors(preferences: LocalNotificationPreferences): Required<LegacyReminderFields> {
  const active = preferences.masterEnabled;
  const hydration = preferences.categories.hydration;
  const meal = preferences.categories.meal;
  const goal = preferences.categories.goal;
  return {
    hydrationReminders: { ...hydration.preferences, enabled: active && hydration.enabled && hydration.preferences.enabled },
    mealReminders: {
      ...meal.preferences,
      breakfast: active && meal.enabled && meal.preferences.breakfast,
      lunch: active && meal.enabled && meal.preferences.lunch,
      dinner: active && meal.enabled && meal.preferences.dinner,
    },
    goalReminder: { ...goal.preferences, enabled: active && goal.enabled && goal.preferences.enabled },
  };
}