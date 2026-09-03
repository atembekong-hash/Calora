---
name: Native notification account lifecycle
description: Account isolation rules for device-wide local notification schedules.
---

Only the currently hydrated account or guest scope may own Calora’s device-wide local notification schedules and captured delivery history. Account transitions, user preference edits, and destructive clears must share one serialized lifecycle that replaces the previous schedule set.

**Why:** Local preferences and inboxes are account-scoped, but native schedules, presented notifications, and the last response are device/process-wide. Timing alone cannot prove which account owns a delivery.

**How to apply:** Serialize reconciliation, fail closed before capture readiness, and require exact owned tags plus a persisted non-identifying scope token for every delivery. Preserve matching presented items; reject mismatches.