import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@calora/notification-inbox/';
const MAX_NOTIFICATIONS = 100;

export type NotificationInboxItem = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
  category?: string;
  tag?: string;
};

type NotificationLike = {
  request: {
    identifier: string;
    content: {
      title?: string | null;
      body?: string | null;
      data?: Record<string, unknown> | null;
    };
  };
};

type InboxListener = (items: NotificationInboxItem[]) => void;
const listeners = new Map<string, Set<InboxListener>>();
const writeQueues = new Map<string, Promise<void>>();

function storageKey(accountId: string | null | undefined): string {
  return `${STORAGE_PREFIX}${accountId ?? 'guest'}`;
}

function normalize(value: unknown): NotificationInboxItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is NotificationInboxItem => (
      !!item
      && typeof item === 'object'
      && typeof (item as NotificationInboxItem).id === 'string'
      && typeof (item as NotificationInboxItem).title === 'string'
      && typeof (item as NotificationInboxItem).body === 'string'
      && typeof (item as NotificationInboxItem).receivedAt === 'string'
    ))
    .map((item) => ({ ...item, read: item.read === true }))
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
    .slice(0, MAX_NOTIFICATIONS);
}

async function readInbox(key: string): Promise<NotificationInboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return normalize(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

async function writeInbox(key: string, items: NotificationInboxItem[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  listeners.get(key)?.forEach((listener) => listener(items));
}

function enqueueWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  writeQueues.set(key, next.then(() => {}, () => {}));
  return next;
}

export async function getNotificationInbox(accountId?: string | null): Promise<NotificationInboxItem[]> {
  return readInbox(storageKey(accountId));
}

export function subscribeToNotificationInbox(
  accountId: string | null | undefined,
  listener: InboxListener,
): () => void {
  const key = storageKey(accountId);
  const scopedListeners = listeners.get(key) ?? new Set<InboxListener>();
  scopedListeners.add(listener);
  listeners.set(key, scopedListeners);
  return () => {
    scopedListeners.delete(listener);
    if (!scopedListeners.size) listeners.delete(key);
  };
}

export async function recordReceivedNotification(
  accountId: string | null | undefined,
  notification: NotificationLike,
  receivedAt = new Date().toISOString(),
): Promise<void> {
  const key = storageKey(accountId);
  await enqueueWrite(key, async () => {
    const items = await readInbox(key);
    const content = notification.request.content;
    const existing = items.find((item) => item.id === notification.request.identifier);
    const nextItem: NotificationInboxItem = {
      id: notification.request.identifier,
      title: content.title?.trim() || 'Calora update',
      body: content.body?.trim() || 'You have a new update from Calora.',
      receivedAt: existing?.receivedAt ?? receivedAt,
      read: existing?.read ?? false,
      category: typeof content.data?.category === 'string' ? content.data.category : undefined,
      tag: typeof content.data?.tag === 'string' ? content.data.tag : undefined,
    };
    await writeInbox(key, [nextItem, ...items.filter((item) => item.id !== nextItem.id)]);
  });
}

export async function markNotificationRead(
  accountId: string | null | undefined,
  notificationId: string,
): Promise<void> {
  const key = storageKey(accountId);
  await enqueueWrite(key, async () => {
    const items = await readInbox(key);
    await writeInbox(key, items.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  });
}

export async function markAllNotificationsRead(accountId: string | null | undefined): Promise<void> {
  const key = storageKey(accountId);
  await enqueueWrite(key, async () => {
    const items = await readInbox(key);
    await writeInbox(key, items.map((item) => ({ ...item, read: true })));
  });
}

export async function clearNotificationInbox(accountId: string | null | undefined): Promise<void> {
  const key = storageKey(accountId);
  await enqueueWrite(key, async () => {
    await writeInbox(key, []);
  });
}