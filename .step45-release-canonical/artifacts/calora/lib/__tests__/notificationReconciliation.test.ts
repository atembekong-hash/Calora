import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  getAllScheduledNotificationsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  getPresentedNotificationsAsync: vi.fn(async () => []),
  dismissNotificationAsync: vi.fn(),
}));

import * as Notifications from 'expo-notifications';
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValue([]);
    vi.mocked(Notifications.dismissNotificationAsync).mockResolvedValue();
  });

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

  it('preserves the supported 1.5-hour interval and wraps overnight hydration slots', () => {
    const preferences = normalizeNotificationPreferences({
      categories: {
        hydration: {
          enabled: true,
          preferences: {
            enabled: true, wakeHour: 22, wakeMinute: 30, sleepHour: 2, sleepMinute: 30, intervalHours: 1.5,
          },
        },
      },
    });

    expect(preferences.categories.hydration.preferences.intervalHours).toBe(1.5);
    expect(buildLocalNotificationPlan(preferences).map((request) => request.trigger))
      .toEqual([{ hour: 0, minute: 0 }, { hour: 1, minute: 30 }]);
    expect(normalizeNotificationPreferences({
      categories: { hydration: { enabled: true, preferences: { ...preferences.categories.hydration.preferences, intervalHours: 1.25 } } },
    }).categories.hydration.preferences.intervalHours).toBe(2);
  });

  it('reports failed and removes new schedules when a plan is only partially installed', async () => {
    const cancelled: string[] = [];
    let calls = 0;
    const adapter: NotificationReconciliationAdapter = {
      getScheduled: async () => [],
      cancel: async (id) => { cancelled.push(id); },
      permissionGranted: async () => true,
      schedule: async () => {
        calls++;
        if (calls === 2) throw new Error('injected scheduling failure');
        return 'new-1';
      },
    };
    const preferences = normalizeNotificationPreferences({
      categories: {
        goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } },
        meal: {
          enabled: true,
          preferences: {
            breakfast: true, breakfastTime: { hour: 8, minute: 0 },
            lunch: false, lunchTime: { hour: 12, minute: 0 },
            dinner: false, dinnerTime: { hour: 18, minute: 0 },
          },
        },
      },
    });

    await expect(reconcileLocalNotifications(preferences, adapter))
      .resolves.toEqual({ status: 'failed', scheduledCount: 1, failure: 'schedule' });
    expect(cancelled).toEqual(['new-1']);
  });

  it('does not schedule when cancelling the previous plan fails', async () => {
    const adapter = makeAdapter();
    adapter.cancel = vi.fn(async () => { throw new Error('injected cancel failure'); });
    await expect(reconcileLocalNotifications(normalizeNotificationPreferences({
      categories: { goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } } },
    }), adapter)).resolves.toEqual({ status: 'failed', scheduledCount: 0, failure: 'cancel' });
    expect(adapter.schedule).not.toHaveBeenCalled();
  });

  it('awaits channel provisioning before it installs a plan', async () => {
    const events: string[] = [];
    const adapter = makeAdapter();
    adapter.provisionChannels = async () => { events.push('channels'); };
    adapter.schedule = async () => { events.push('schedule'); return 'new'; };
    await reconcileLocalNotifications(normalizeNotificationPreferences({
      categories: { goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } } },
    }), adapter);
    expect(events).toEqual(['channels', 'schedule']);
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
    expect(scheduled[0]?.content.data).toEqual({
      tag: 'calora-goal',
      category: 'goal',
      scopeToken: expect.any(String),
    });
  });

  it('cancels schedules before exact-tag presented cleanup and scheduling', async () => {
    const events: string[] = [];
    vi.mocked(Notifications.getPresentedNotificationsAsync).mockImplementation(async () => {
      events.push('list-presented');
      return [
        { request: { identifier: 'owned', content: { data: { tag: 'calora-goal' } } } },
        { request: { identifier: 'same-scope', content: { data: { tag: 'calora-goal', scopeToken: 'scope-current-token' } } } },
        { request: { identifier: 'lookalike', content: { data: { tag: 'calora-goal-extra' } } } },
      ] as unknown as Awaited<ReturnType<typeof Notifications.getPresentedNotificationsAsync>>;
    });
    vi.mocked(Notifications.dismissNotificationAsync).mockImplementation(async (id) => {
      events.push(`dismiss:${id}`);
    });
    const adapter = makeAdapter();
    adapter.cancel = vi.fn(async (id) => { events.push(`cancel:${id}`); });
    adapter.schedule = vi.fn(async () => { events.push('schedule'); return 'new'; });

    const preferences = normalizeNotificationPreferences({
      scopeToken: 'scope-current-token',
      categories: { goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } } },
    });
    const result = await reconcileHydratedNotificationPlan(preferences, adapter);

    expect(result.status).toBe('scheduled');
    expect(events).toEqual(['cancel:hydration-old', 'list-presented', 'dismiss:owned', 'schedule']);
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalledWith('lookalike');
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalledWith('same-scope');
  });

  it('preserves a matching presented delivery across same-account restart', async () => {
    vi.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValue([
      {
        request: {
          identifier: 'same-account-delivery',
          content: { data: { tag: 'calora-hydration', scopeToken: 'scope-same-account' } },
        },
      },
    ] as unknown as Awaited<ReturnType<typeof Notifications.getPresentedNotificationsAsync>>);
    const adapter = makeAdapter();

    const result = await reconcileHydratedNotificationPlan(normalizeNotificationPreferences({
      scopeToken: 'scope-same-account',
      categories: { goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } } },
    }), adapter);

    expect(result.status).toBe('scheduled');
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalled();
  });

  it('dismisses mismatched and tokenless exact-tag deliveries for the next scope', async () => {
    vi.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValue([
      { request: { identifier: 'from-a', content: { data: { tag: 'calora-goal', scopeToken: 'scope-a-token' } } } },
      { request: { identifier: 'legacy', content: { data: { tag: 'calora-meals' } } } },
      { request: { identifier: 'guest-match', content: { data: { tag: 'calora-hydration', scopeToken: 'scope-guest-token' } } } },
    ] as unknown as Awaited<ReturnType<typeof Notifications.getPresentedNotificationsAsync>>);

    await reconcileHydratedNotificationPlan(normalizeNotificationPreferences({
      scopeToken: 'scope-guest-token',
    }), makeAdapter());

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('from-a');
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('legacy');
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalledWith('guest-match');
  });

  it('fails closed after cancellation when presented cleanup fails', async () => {
    const events: string[] = [];
    vi.mocked(Notifications.getPresentedNotificationsAsync).mockRejectedValue(new Error('injected listing failure'));
    const adapter = makeAdapter();
    adapter.cancel = vi.fn(async () => { events.push('cancel'); });
    adapter.schedule = vi.fn(async () => { events.push('schedule'); return 'new'; });

    await expect(reconcileHydratedNotificationPlan(normalizeNotificationPreferences({
      categories: { goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } } },
    }), adapter)).resolves.toEqual({ status: 'failed', scheduledCount: 0, failure: 'presented' });
    expect(events).toEqual(['cancel']);
  });

  it('fails closed when dismissing a stale presented delivery fails', async () => {
    vi.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValue([
      { request: { identifier: 'stale-a', content: { data: { tag: 'calora-goal', scopeToken: 'scope-account-a' } } } },
    ] as unknown as Awaited<ReturnType<typeof Notifications.getPresentedNotificationsAsync>>);
    vi.mocked(Notifications.dismissNotificationAsync).mockRejectedValue(new Error('injected dismissal failure'));
    const adapter = makeAdapter();

    await expect(reconcileHydratedNotificationPlan(normalizeNotificationPreferences({
      scopeToken: 'scope-account-b',
      categories: { goal: { enabled: true, preferences: { enabled: true, hour: 20, minute: 0 } } },
    }), adapter)).resolves.toEqual({ status: 'failed', scheduledCount: 0, failure: 'presented' });
    expect(adapter.schedule).not.toHaveBeenCalled();
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