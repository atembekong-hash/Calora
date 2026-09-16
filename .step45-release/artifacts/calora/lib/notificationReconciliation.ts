import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { LocalNotificationPreferences, NotificationTime } from './notificationPreferences';

export const CALORA_NOTIFICATION_TAGS = [
  'calora-hydration',
  'calora-meals',
  'calora-goal',
] as const;

type ScheduledNotification = {
  identifier: string;
  content: { data?: Record<string, unknown> | null };
};

type ScheduleRequest = {
  content: {
    title: string;
    body: string;
    data: Record<string, string>;
    sound: boolean;
    /** Android delivery channel selected internally from the reminder category. */
    channelId: typeof CALORA_NOTIFICATION_TAGS[number];
  };
  trigger: { hour: number; minute: number };
};

export type NotificationReconciliationAdapter = {
  getScheduled(): Promise<ScheduledNotification[]>;
  cancel(identifier: string): Promise<void>;
  /**
   * Reconciliation initiated by a settings interaction may request permission.
   * Background account hydration must only inspect the existing grant.
   */
  permissionGranted(options?: { requestPermission: boolean }): Promise<boolean>;
  schedule(request: ScheduleRequest): Promise<unknown>;
  /** Provision category channels before Android schedules reference them. */
  provisionChannels?(): Promise<void>;
};

export type NotificationReconciliationResult = {
  /** `scheduled` means every request in the desired plan was installed. */
  status: 'disabled' | 'denied' | 'scheduled' | 'failed';
  scheduledCount: number;
  failure?: 'cancel' | 'presented' | 'channels' | 'schedule';
};

const HYDRATION_BODIES = [
  'Time for a glass of water 💧 Stay on track.',
  'A quick hydration check-in — how about a glass?',
  'Small sips, steady rhythm. Time to drink some water.',
];

function minutes(value: NotificationTime): number {
  return value.hour * 60 + value.minute;
}

/** Start is inclusive and end is exclusive. Overnight ranges are supported. */
export function isTimeInQuietHours(
  value: NotificationTime,
  quietHours: LocalNotificationPreferences['quietHours'],
): boolean {
  if (!quietHours.enabled) return false;
  const current = minutes(value);
  const start = minutes(quietHours.start);
  const end = minutes(quietHours.end);
  if (start === end) return false;
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

export function buildLocalNotificationPlan(preferences: LocalNotificationPreferences): ScheduleRequest[] {
  if (!preferences.masterEnabled) return [];
  const requests: ScheduleRequest[] = [];
  const hydrationCategory = preferences.categories.hydration;
  const hydration = hydrationCategory.preferences;
  if (hydrationCategory.enabled && hydration.enabled) {
    const wake = hydration.wakeHour * 60 + hydration.wakeMinute;
    // A sleep time at or before wake belongs to tomorrow. Daily triggers must
    // still be normalized to today's clock (rather than e.g. hour 25).
    const configuredSleep = hydration.sleepHour * 60 + hydration.sleepMinute;
    const sleep = configuredSleep <= wake ? configuredSleep + 24 * 60 : configuredSleep;
    const interval = hydration.intervalHours * 60;
    for (let current = wake + interval, slot = 0; current < sleep; current += interval, slot++) {
      const atMinutes = current % (24 * 60);
      const at = { hour: Math.floor(atMinutes / 60), minute: atMinutes % 60 };
      if (!isTimeInQuietHours(at, preferences.quietHours)) {
        requests.push({
          content: {
            title: 'Hydration reminder',
            body: HYDRATION_BODIES[slot % HYDRATION_BODIES.length],
            data: { tag: 'calora-hydration', category: 'hydration', scopeToken: preferences.scopeToken },
            sound: true,
            channelId: 'calora-hydration',
          },
          trigger: at,
        });
      }
    }
  }

  const mealCategory = preferences.categories.meal;
  const meal = mealCategory.preferences;
  (['breakfast', 'lunch', 'dinner'] as const).forEach((key) => {
    if (!mealCategory.enabled || !meal[key]) return;
    const at = meal[`${key}Time`];
    if (isTimeInQuietHours(at, preferences.quietHours)) return;
    requests.push({
      content: {
        title: `${key.charAt(0).toUpperCase()}${key.slice(1)} reminder`,
        body: `Remember to log ${key} in Calora.`,
        data: { tag: 'calora-meals', category: 'meal', meal: key, scopeToken: preferences.scopeToken },
        sound: true,
        channelId: 'calora-meals',
      },
      trigger: at,
    });
  });

  const goalCategory = preferences.categories.goal;
  const goal = goalCategory.preferences;
  const goalAt = { hour: goal.hour, minute: goal.minute };
  if (goalCategory.enabled && goal.enabled && !isTimeInQuietHours(goalAt, preferences.quietHours)) {
    requests.push({
      content: {
        title: 'Daily goal check-in',
        body: 'How are you tracking today? Tap to log your remaining meals.',
        data: { tag: 'calora-goal', category: 'goal', scopeToken: preferences.scopeToken },
        sound: true,
        channelId: 'calora-goal',
      },
      trigger: goalAt,
    });
  }
  return requests;
}

const expoAdapter: NotificationReconciliationAdapter = {
  getScheduled: () => Notifications.getAllScheduledNotificationsAsync(),
  cancel: (identifier) => Notifications.cancelScheduledNotificationAsync(identifier),
  permissionGranted: async ({ requestPermission } = { requestPermission: true }) => {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!requestPermission) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  },
  schedule: (request) => Notifications.scheduleNotificationAsync({
    content: request.content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      ...request.trigger,
    },
  }),
  provisionChannels: async () => {
    // This call is intentionally in reconciliation's serialized lifecycle:
    // Android rejects/re-routes schedules made before their channel exists.
    if (Platform.OS !== 'android' || typeof Notifications.setNotificationChannelAsync !== 'function') return;
    await Promise.all([
      Notifications.setNotificationChannelAsync('calora-hydration', {
        name: 'Hydration reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4caf7d',
      }),
      Notifications.setNotificationChannelAsync('calora-meals', {
        name: 'Meal reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4caf7d',
      }),
      Notifications.setNotificationChannelAsync('calora-goal', {
        name: 'Goal check-ins',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4caf7d',
      }),
    ]);
  },
};

/** Cancel every schedule owned by Calora, without requesting notification permission. */
export async function cancelCaloraLocalNotifications(
  adapter: Pick<NotificationReconciliationAdapter, 'getScheduled' | 'cancel'> = expoAdapter,
): Promise<void> {
  const scheduled = await adapter.getScheduled();
  await Promise.all(
    scheduled
      .filter((item) => CALORA_NOTIFICATION_TAGS.includes(item.content.data?.tag as typeof CALORA_NOTIFICATION_TAGS[number]))
      .map((item) => adapter.cancel(item.identifier)),
  );
}

/**
 * The sole reconciliation boundary for Calora local reminders. Desired
 * preferences are never mutated when OS permission is denied.
 */
export async function reconcileLocalNotifications(
  preferences: LocalNotificationPreferences,
  adapter: NotificationReconciliationAdapter = expoAdapter,
  options: { requestPermission?: boolean; afterCancel?: () => Promise<void> } = {},
): Promise<NotificationReconciliationResult> {
  try {
    await cancelCaloraLocalNotifications(adapter);
  } catch {
    // Installing over an unknown old plan can leak cross-scope reminders.
    return { status: 'failed', scheduledCount: 0, failure: 'cancel' };
  }

  try {
    await options.afterCancel?.();
  } catch {
    return { status: 'failed', scheduledCount: 0, failure: 'presented' };
  }

  const plan = buildLocalNotificationPlan(preferences);
  if (!plan.length) return { status: 'disabled', scheduledCount: 0 };
  if (!await adapter.permissionGranted({ requestPermission: options.requestPermission ?? true })) {
    return { status: 'denied', scheduledCount: 0 };
  }

  try {
    await adapter.provisionChannels?.();
  } catch {
    return { status: 'failed', scheduledCount: 0, failure: 'channels' };
  }

  const created: string[] = [];
  let installedCount = 0;
  for (const request of plan) {
    try {
      const identifier = await adapter.schedule(request);
      installedCount++;
      if (typeof identifier === 'string') created.push(identifier);
    } catch {
      // Best effort rollback prevents a partial plan from masquerading as a
      // valid active scope. Retain preferences so the user can retry.
      await Promise.allSettled(created.map((identifier) => adapter.cancel(identifier)));
      return { status: 'failed', scheduledCount: installedCount, failure: 'schedule' };
    }
  }
  return { status: 'scheduled', scheduledCount: plan.length };
}