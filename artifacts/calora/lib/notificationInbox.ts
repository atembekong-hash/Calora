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
  /** Expo's delivery timestamp is stable when the same presented event is read again. */
  date?: number;
};

type InboxListener = (items: NotificationInboxItem[]) => void;
const listeners = new Map<string, Set<InboxListener>>();
const writeQueues = new Map<string, Promise<void>>();
const OWNED_TAGS = ['calora-hydration', 'calora-meals', 'calora-goal'] as const;

export function isNotificationOwnedByScope(
  notification: NotificationLike,
  scopeToken: string,
): boolean {
  const data = notification.request.content.data;
  return typeof scopeToken === 'string'
    && scopeToken.length > 0
    && data?.scopeToken === scopeToken
    && OWNED_TAGS.includes(data?.tag as typeof OWNED_TAGS[number]);
}

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
    const deliveryAt = notification.date !== undefined
      ? new Date(notification.date).toISOString()
      : receivedAt;
    // Recurring requests reuse their request identifier. A delivery timestamp
    // gives each occurrence a stable identity while repeated capture of the
    // same delivered notification remains idempotent.
    // Older callers/testing shims may not expose Expo's date. Preserve their
    // historical request-id identity; native Expo deliveries always do.
    const deliveryId = notification.date !== undefined
      ? `${notification.request.identifier}:${deliveryAt}`
      : notification.request.identifier;
    const existing = items.find((item) => item.id === deliveryId);
    const nextItem: NotificationInboxItem = {
      id: deliveryId,
      title: content.title?.trim() || 'Calora update',
      body: content.body?.trim() || 'You have a new update from Calora.',
      receivedAt: existing?.receivedAt ?? deliveryAt,
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