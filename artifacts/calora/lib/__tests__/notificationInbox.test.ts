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
  isNotificationOwnedByScope,
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

  it('uses request id plus native delivery timestamp for recurring notifications', async () => {
    const recurring = { ...notification('daily'), date: Date.parse('2026-09-03T12:00:00.000Z') };
    await recordReceivedNotification('account-a', recurring, 'ignored');
    await markNotificationRead('account-a', 'daily:2026-09-03T12:00:00.000Z');
    await recordReceivedNotification('account-a', recurring, 'ignored-again');
    await recordReceivedNotification('account-a', {
      ...notification('daily'),
      date: Date.parse('2026-09-04T12:00:00.000Z'),
    });

    expect(await getNotificationInbox('account-a')).toMatchObject([
      { id: 'daily:2026-09-04T12:00:00.000Z', read: false },
      { id: 'daily:2026-09-03T12:00:00.000Z', read: true },
    ]);
  });

  it('deduplicates a cold-start last response replayed after live capture', async () => {
    const delivered = {
      ...notification('launch-request', 'goal'),
      date: Date.parse('2026-09-05T20:00:00.000Z'),
    };
    // The response listener and getLastNotificationResponseAsync can expose
    // the same delivered object during startup.
    await recordReceivedNotification('account-b', delivered);
    await recordReceivedNotification('account-b', delivered);

    expect(await getNotificationInbox('account-b')).toEqual([
      expect.objectContaining({
        id: 'launch-request:2026-09-05T20:00:00.000Z',
        category: 'goal',
      }),
    ]);
  });

  it('fails retained responses closed across A → B → guest scopes', () => {
    const retainedFromA = {
      ...notification('retained', 'goal'),
      request: {
        ...notification('retained', 'goal').request,
        content: {
          ...notification('retained', 'goal').request.content,
          data: { tag: 'calora-goal', category: 'goal', scopeToken: 'scope-token-account-a' },
        },
      },
    };

    expect(isNotificationOwnedByScope(retainedFromA, 'scope-token-account-a')).toBe(true);
    expect(isNotificationOwnedByScope(retainedFromA, 'scope-token-account-b')).toBe(false);
    expect(isNotificationOwnedByScope(retainedFromA, 'scope-token-guest')).toBe(false);
    expect(isNotificationOwnedByScope(notification('legacy', 'goal'), 'scope-token-account-a')).toBe(false);
  });

  it('captures one matching presented delivery once after same-account restart', async () => {
    const scopeToken = 'scope-stable-account-token';
    const presented = {
      ...notification('presented-request', 'hydration'),
      date: Date.parse('2026-09-06T09:00:00.000Z'),
      request: {
        ...notification('presented-request', 'hydration').request,
        content: {
          ...notification('presented-request', 'hydration').request.content,
          data: { tag: 'calora-hydration', category: 'hydration', scopeToken },
        },
      },
    };

    expect(isNotificationOwnedByScope(presented, scopeToken)).toBe(true);
    await recordReceivedNotification('account-a', presented);
    // A second presented-list read on the same restart remains idempotent.
    await recordReceivedNotification('account-a', presented);

    expect(await getNotificationInbox('account-a')).toEqual([
      expect.objectContaining({ id: 'presented-request:2026-09-06T09:00:00.000Z' }),
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