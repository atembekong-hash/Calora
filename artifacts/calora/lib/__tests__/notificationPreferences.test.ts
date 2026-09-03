import { describe, expect, it } from 'vitest';
import {
  legacyReminderMirrors,
  normalizeNotificationPreferences,
} from '../notificationPreferences';

describe('notification preference migration', () => {
  it('migrates legacy reminder fields without changing effective behavior', () => {
    const legacy = {
      hydrationReminders: {
        enabled: true,
        wakeHour: 6,
        wakeMinute: 15,
        sleepHour: 21,
        sleepMinute: 30,
        intervalHours: 3,
      },
      mealReminders: {
        breakfast: true,
        breakfastTime: { hour: 8, minute: 15 },
        lunch: false,
        lunchTime: { hour: 12, minute: 45 },
        dinner: true,
        dinnerTime: { hour: 19, minute: 0 },
      },
      goalReminder: { enabled: false, hour: 20, minute: 30 },
    };

    const migrated = normalizeNotificationPreferences(undefined, legacy);

    expect(migrated).toMatchObject({
      version: 1,
      delivery: 'local',
      masterEnabled: true,
      quietHours: { enabled: false },
      categories: {
        hydration: { enabled: true, preferences: legacy.hydrationReminders },
        meal: { enabled: true, preferences: legacy.mealReminders },
        goal: { enabled: false, preferences: legacy.goalReminder },
      },
    });
    expect(legacyReminderMirrors(migrated)).toEqual(legacy);
    expect(migrated.scopeToken).toMatch(/^scope_/);
    expect(normalizeNotificationPreferences(migrated).scopeToken).toBe(migrated.scopeToken);
  });

  it('creates distinct non-identifying tokens for new account and guest scopes', () => {
    const accountA = normalizeNotificationPreferences(undefined);
    const accountB = normalizeNotificationPreferences(undefined);
    const guest = normalizeNotificationPreferences(undefined);

    expect(new Set([accountA.scopeToken, accountB.scopeToken, guest.scopeToken]).size).toBe(3);
    for (const token of [accountA.scopeToken, accountB.scopeToken, guest.scopeToken]) {
      expect(token).not.toContain('account');
      expect(token.length).toBeGreaterThanOrEqual(12);
    }
  });

  it('keeps desired categories while legacy mirrors are disabled by master', () => {
    const desired = normalizeNotificationPreferences({
      ...normalizeNotificationPreferences(undefined),
      masterEnabled: false,
      categories: {
        ...normalizeNotificationPreferences(undefined).categories,
        goal: { enabled: true, preferences: { enabled: true, hour: 19, minute: 15 } },
      },
    });

    expect(desired.categories.goal.preferences.enabled).toBe(true);
    expect(legacyReminderMirrors(desired).goalReminder.enabled).toBe(false);
  });
});