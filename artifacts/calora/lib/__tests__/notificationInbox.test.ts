import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

import {
  clearNotificationInbox,
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  recordReceivedNotification,
} from '@/lib/notificationInbox';

const notification = (id: string, category = 'meal') => ({
  request: {
    identifier: id,
    content: {
      title: 'Lunch reminder',
      body: 'Log your midday meal.',
      data: { category, tag: `calora-${category}` },
    },
  },
});

describe('notification inbox persistence', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('stores received notifications per account and newest first', async () => {
    await recordReceivedNotification('account-a', notification('older'), '2026-09-03T12:00:00.000Z');
    await recordReceivedNotification('account-a', notification('newer', 'goal'), '2026-09-03T13:00:00.000Z');

    expect(await getNotificationInbox('account-a')).toMatchObject([
      { id: 'newer', category: 'goal', read: false },
      { id: 'older', category: 'meal', read: false },
    ]);
    expect(await getNotificationInbox('account-b')).toEqual([]);
  });

  it('deduplicates repeated delivery while preserving the read state', async () => {
    await recordReceivedNotification('account-a', notification('same'), '2026-09-03T12:00:00.000Z');
    await markNotificationRead('account-a', 'same');
    await recordReceivedNotification('account-a', notification('same'), '2026-09-03T13:00:00.000Z');

    expect(await getNotificationInbox('account-a')).toEqual([
      expect.objectContaining({ id: 'same', read: true, receivedAt: '2026-09-03T12:00:00.000Z' }),
    ]);
  });

  it('supports mark-all-read and clearing only the selected account', async () => {
    await recordReceivedNotification('account-a', notification('a'));
    await recordReceivedNotification('account-b', notification('b'));

    await markAllNotificationsRead('account-a');
    expect((await getNotificationInbox('account-a'))[0].read).toBe(true);
    expect((await getNotificationInbox('account-b'))[0].read).toBe(false);

    await clearNotificationInbox('account-a');
    expect(await getNotificationInbox('account-a')).toEqual([]);
    expect(await getNotificationInbox('account-b')).toHaveLength(1);
  });
});