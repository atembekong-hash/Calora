import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  getAllScheduledNotificationsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
}));

import { normalizeNotificationPreferences } from '../notificationPreferences';
import {
  buildLocalNotificationPlan,
  cancelCaloraLocalNotifications,
  isTimeInQuietHours,
  reconcileLocalNotifications,
  type NotificationReconciliationAdapter,
} from '../notificationReconciliation';
import {
  cancelNotificationPlanForClear,
  reconcileHydratedNotificationPlan,
} from '../notificationLifecycle';

function makeAdapter(permission = true) {
  const scheduled: Array<{ identifier: string; content: { data?: Record<string, unknown> } }> = [
    { identifier: 'hydration-old', content: { data: { tag: 'calora-hydration' } } },
    { identifier: 'unrelated', content: { data: { tag: 'another-app-feature' } } },
  ];
  const adapter: NotificationReconciliationAdapter = {
    getScheduled: vi.fn(async () => scheduled),
    cancel: vi.fn(async () => {}),
    permissionGranted: vi.fn(async () => permission),
    schedule: vi.fn(async () => 'new-id'),
  };
  return adapter;
}

describe('local notification reconciliation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('master off cancels Calora reminders without requesting permission', async () => {
    const adapter = makeAdapter();
    const preferences = normalizeNotificationPreferences({
      ...normalizeNotificationPreferences(undefined),
      masterEnabled: false,
      categories: {
        ...normalizeNotificationPreferences(undefined).categories,
        goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } },
      },
    });

    const result = await reconcileLocalNotifications(preferences, adapter);

    expect(result).toEqual({ status: 'disabled', scheduledCount: 0 });
    expect(adapter.cancel).toHaveBeenCalledWith('hydration-old');
    expect(adapter.cancel).not.toHaveBeenCalledWith('unrelated');
    expect(adapter.permissionGranted).not.toHaveBeenCalled();
    expect(preferences.categories.goal.preferences.enabled).toBe(true);
  });

  it('schedules only enabled categories and preserves desires on denial', async () => {
    const adapter = makeAdapter(false);
    const preferences = normalizeNotificationPreferences({
      ...normalizeNotificationPreferences(undefined),
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
          enabled: true,
          preferences: {
            breakfast: true,
            breakfastTime: { hour: 8, minute: 0 },
            lunch: false,
            lunchTime: { hour: 12, minute: 30 },
            dinner: true,
            dinnerTime: { hour: 18, minute: 30 },
          },
        },
        goal: { enabled: false, preferences: { enabled: false, hour: 20, minute: 0 } },
      },
    });

    expect(buildLocalNotificationPlan(preferences).map((item) => item.content.data.meal)).toEqual(['breakfast', 'dinner']);
    expect(await reconcileLocalNotifications(preferences, adapter)).toEqual({ status: 'denied', scheduledCount: 0 });
    expect(adapter.schedule).not.toHaveBeenCalled();
    expect(preferences.categories.meal.preferences.breakfast).toBe(true);
    expect(preferences.categories.meal.preferences.dinner).toBe(true);
  });

  it('filters daytime and overnight quiet-hour windows', () => {
    expect(isTimeInQuietHours(
      { hour: 13, minute: 0 },
      { enabled: true, start: { hour: 12, minute: 0 }, end: { hour: 14, minute: 0 } },
    )).toBe(true);
    const overnight = { enabled: true, start: { hour: 22, minute: 0 }, end: { hour: 7, minute: 0 } };
    expect(isTimeInQuietHours({ hour: 23, minute: 0 }, overnight)).toBe(true);
    expect(isTimeInQuietHours({ hour: 6, minute: 59 }, overnight)).toBe(true);
    expect(isTimeInQuietHours({ hour: 7, minute: 0 }, overnight)).toBe(false);
    expect(isTimeInQuietHours({ hour: 12, minute: 0 }, overnight)).toBe(false);
  });

  it('assigns the internally managed Android channel for each reminder category', () => {
    const preferences = normalizeNotificationPreferences({
      categories: {
        hydration: { enabled: true, preferences: { enabled: true, wakeHour: 7, wakeMinute: 0, sleepHour: 12, sleepMinute: 0, intervalHours: 2 } },
        meal: { enabled: true, preferences: { breakfast: true, breakfastTime: { hour: 8, minute: 0 }, lunch: false, lunchTime: { hour: 12, minute: 0 }, dinner: false, dinnerTime: { hour: 18, minute: 0 } } },
        goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } },
      },
    });
    expect(buildLocalNotificationPlan(preferences).map((item) => item.content.channelId))
      .toEqual(['calora-hydration', 'calora-hydration', 'calora-meals', 'calora-goal']);
  });

  it('cancels every Calora-tagged schedule without touching other notifications', async () => {
    const adapter = makeAdapter();
    await cancelCaloraLocalNotifications(adapter);
    expect(adapter.cancel).toHaveBeenCalledWith('hydration-old');
    expect(adapter.cancel).not.toHaveBeenCalledWith('unrelated');
  });

  it('never requests permission during hydrated reconciliation', async () => {
    const adapter = makeAdapter(false);
    const preferences = normalizeNotificationPreferences({
      categories: {
        hydration: { enabled: false, preferences: { enabled: false, wakeHour: 7, wakeMinute: 0, sleepHour: 22, sleepMinute: 0, intervalHours: 2 } },
        meal: { enabled: false, preferences: { breakfast: false, breakfastTime: { hour: 8, minute: 0 }, lunch: false, lunchTime: { hour: 12, minute: 0 }, dinner: false, dinnerTime: { hour: 18, minute: 0 } } },
        goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } },
      },
    });

    await reconcileHydratedNotificationPlan(preferences, adapter);

    expect(adapter.permissionGranted).toHaveBeenCalledWith({ requestPermission: false });
    expect(adapter.schedule).not.toHaveBeenCalled();
  });

  it('serializes A → B → A hydrated plans, leaving only the final active plan', async () => {
    const scheduled: Array<{ identifier: string; content: { data?: Record<string, unknown> } }> = [];
    const events: string[] = [];
    let nextId = 0;
    const adapter: NotificationReconciliationAdapter = {
      getScheduled: async () => [...scheduled],
      cancel: async (identifier) => {
        events.push(`cancel:${identifier}`);
        const index = scheduled.findIndex((item) => item.identifier === identifier);
        if (index >= 0) scheduled.splice(index, 1);
      },
      permissionGranted: async () => true,
      schedule: async (request) => {
        const identifier = `schedule-${++nextId}`;
        events.push(`schedule:${request.trigger.hour}`);
        scheduled.push({ identifier, content: { data: request.content.data } });
        return identifier;
      },
    };
    const planAt = (hour: number) => normalizeNotificationPreferences({
      categories: {
        hydration: { enabled: false, preferences: { enabled: false, wakeHour: 7, wakeMinute: 0, sleepHour: 22, sleepMinute: 0, intervalHours: 2 } },
        meal: { enabled: false, preferences: { breakfast: false, breakfastTime: { hour: 8, minute: 0 }, lunch: false, lunchTime: { hour: 12, minute: 0 }, dinner: false, dinnerTime: { hour: 18, minute: 0 } } },
        goal: { enabled: true, preferences: { enabled: true, hour, minute: 0 } },
      },
    });

    await Promise.all([
      reconcileHydratedNotificationPlan(planAt(8), adapter),
      reconcileHydratedNotificationPlan(planAt(12), adapter),
      reconcileHydratedNotificationPlan(planAt(18), adapter),
    ]);

    expect(events).toEqual([
      'schedule:8',
      'cancel:schedule-1',
      'schedule:12',
      'cancel:schedule-2',
      'schedule:18',
    ]);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.content.data).toEqual({ tag: 'calora-goal', category: 'goal' });
  });

  it('queues clear after an active hydrated plan and leaves no Calora schedules', async () => {
    const scheduled: Array<{ identifier: string; content: { data?: Record<string, unknown> } }> = [];
    const adapter: NotificationReconciliationAdapter = {
      getScheduled: async () => [...scheduled],
      cancel: async (identifier) => {
        const index = scheduled.findIndex((item) => item.identifier === identifier);
        if (index >= 0) scheduled.splice(index, 1);
      },
      permissionGranted: async () => true,
      schedule: async (request) => {
        scheduled.push({ identifier: 'active-a', content: { data: request.content.data } });
        return 'active-a';
      },
    };
    const preferences = normalizeNotificationPreferences({
      categories: {
        hydration: { enabled: false, preferences: { enabled: false, wakeHour: 7, wakeMinute: 0, sleepHour: 22, sleepMinute: 0, intervalHours: 2 } },
        meal: { enabled: false, preferences: { breakfast: false, breakfastTime: { hour: 8, minute: 0 }, lunch: false, lunchTime: { hour: 12, minute: 0 }, dinner: false, dinnerTime: { hour: 18, minute: 0 } } },
        goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } },
      },
    });

    await Promise.all([
      reconcileHydratedNotificationPlan(preferences, adapter),
      cancelNotificationPlanForClear(adapter),
    ]);

    expect(scheduled).toEqual([]);
  });
});