---
name: Native notification account lifecycle
description: Account isolation rules for device-wide local notification schedules.
---

Only the currently hydrated account or guest scope may own Calora’s device-wide local notification schedules. Account transitions, user preference edits, and destructive clears must share one serialized lifecycle that replaces the previous schedule set.

**Why:** Local preferences and inboxes are account-scoped, but native notification schedules are device-wide. Independent cancellation or scheduling can race account switches, remove another account’s reminders, or leave the previous account’s reminders active.

**How to apply:** Reconcile once after successful account hydration without prompting for permission, allow user-initiated changes to request permission, and queue clear operations behind any in-flight reconciliation.