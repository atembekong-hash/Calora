import type { LocalNotificationPreferences } from './notificationPreferences';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  CALORA_NOTIFICATION_TAGS,
  cancelCaloraLocalNotifications,
  reconcileLocalNotifications,
  type NotificationReconciliationAdapter,
  type NotificationReconciliationResult,
} from './notificationReconciliation';

/**
 * Process-wide native notification mutex. Providers remount when the active
 * account changes, so a component-local ref cannot protect transitions. Every
 * Calora native operation enters this queue: each desired plan first removes
 * all Calora-tagged schedules, then (only if allowed) installs its own plan.
 *
 * Account identities intentionally never enter native notification content or
 * data. The active account is represented solely by the plan currently at the
 * head of this serialized lifecycle.
 */
let nativeLifecycle: Promise<void> = Promise.resolve();

/**
 * Calora reminders are scheduled locally by the native Expo module. Web has no
 * native scheduler, so lifecycle calls must be an explicit no-op there rather
 * than surfacing a false cancellation or scheduling failure to the user.
 */
export function supportsLocalNotificationScheduling(platform = Platform.OS): boolean {
  return platform !== 'web';
}

function unavailableResult(): NotificationReconciliationResult {
  return { status: 'unavailable', scheduledCount: 0 };
}

async function dismissPresentedCaloraNotifications(activeScopeToken: string): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((item) => {
        const data = item.request.content.data;
        return CALORA_NOTIFICATION_TAGS.includes(
          data?.tag as typeof CALORA_NOTIFICATION_TAGS[number],
        ) && data?.scopeToken !== activeScopeToken;
      })
      .map((item) => Notifications.dismissNotificationAsync(item.request.identifier)),
  );
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = nativeLifecycle.then(operation, operation);
  nativeLifecycle = run.then(() => undefined, () => undefined);
  return run;
}

/** Reconcile a user-initiated settings change; this may show the OS prompt. */
export function reconcileUserNotificationPlan(
  preferences: LocalNotificationPreferences,
  adapter?: NotificationReconciliationAdapter,
  platform = Platform.OS,
): Promise<NotificationReconciliationResult> {
  if (!supportsLocalNotificationScheduling(platform)) return Promise.resolve(unavailableResult());
  return enqueue(() => reconcileLocalNotifications(preferences, adapter));
}

/**
 * Reconcile the just-hydrated active scope without prompting. This is called
 * for guest and signed-in account scopes alike.
 */
export function reconcileHydratedNotificationPlan(
  preferences: LocalNotificationPreferences,
  adapter?: NotificationReconciliationAdapter,
  platform = Platform.OS,
): Promise<NotificationReconciliationResult> {
  if (!supportsLocalNotificationScheduling(platform)) return Promise.resolve(unavailableResult());
  return enqueue(async () => {
    // Cancellation and presented cleanup share this queue, closing the window
    // in which an old scope could deliver or be captured by the next scope.
    return reconcileLocalNotifications(preferences, adapter, {
      requestPermission: false,
      afterCancel: () => dismissPresentedCaloraNotifications(preferences.scopeToken),
    });
  });
}

/** Put destructive clear work behind any in-flight account reconciliation. */
export function cancelNotificationPlanForClear(
  adapter?: Pick<NotificationReconciliationAdapter, 'getScheduled' | 'cancel'>,
  platform = Platform.OS,
): Promise<void> {
  if (!supportsLocalNotificationScheduling(platform)) return Promise.resolve();
  return enqueue(() => cancelCaloraLocalNotifications(adapter));
}
