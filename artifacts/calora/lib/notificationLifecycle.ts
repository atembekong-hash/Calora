import type { LocalNotificationPreferences } from './notificationPreferences';
import {
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

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = nativeLifecycle.then(operation, operation);
  nativeLifecycle = run.then(() => undefined, () => undefined);
  return run;
}

/** Reconcile a user-initiated settings change; this may show the OS prompt. */
export function reconcileUserNotificationPlan(
  preferences: LocalNotificationPreferences,
  adapter?: NotificationReconciliationAdapter,
): Promise<NotificationReconciliationResult> {
  return enqueue(() => reconcileLocalNotifications(preferences, adapter));
}

/**
 * Reconcile the just-hydrated active scope without prompting. This is called
 * for guest and signed-in account scopes alike.
 */
export function reconcileHydratedNotificationPlan(
  preferences: LocalNotificationPreferences,
  adapter?: NotificationReconciliationAdapter,
): Promise<NotificationReconciliationResult> {
  return enqueue(() => reconcileLocalNotifications(preferences, adapter, { requestPermission: false }));
}

/** Put destructive clear work behind any in-flight account reconciliation. */
export function cancelNotificationPlanForClear(
  adapter?: Pick<NotificationReconciliationAdapter, 'getScheduled' | 'cancel'>,
): Promise<void> {
  return enqueue(() => cancelCaloraLocalNotifications(adapter));
}