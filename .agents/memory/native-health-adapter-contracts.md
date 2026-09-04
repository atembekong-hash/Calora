---
name: Native health adapter contracts
description: Non-obvious HealthKit and Health Connect contracts that affect daily active-calorie accuracy.
---

HealthKit statistics must request explicit units: kilocalories for active energy and kilograms for body weight. Its numeric authorization-request status says whether another prompt is needed; it never confirms individual read grants. An absent HealthKit quantity must remain unavailable, while an explicitly returned zero is a measured zero. Daily health snapshots must not remain ready across a local calendar-day boundary.

**Why:** Apple deliberately hides read authorization, and denied reads are indistinguishable from no samples. Treating prompt completion or an empty query as confirmed access fabricates zero values. Preferred units and cached yesterday values can also corrupt displayed totals.

**How to apply:** When changing the adapters, verify the installed package declarations. Keep request completion separate from read evidence, use calendar-day statistics, require explicit units, and cover empty-versus-zero plus day freshness with regression tests.

The UI-facing health sync boundary must return an explicit outcome rather than silently resolving after a native read failure. A successful confirmation is valid only after the snapshot is stored and `lastSyncedAt` is updated; skipped and failed outcomes need distinct user feedback.

**Why:** A swallowed adapter error made the Profile action indistinguishable from a successful sync, which could falsely reassure users while leaving stale health data on screen.

**How to apply:** Keep native adapter errors inside the context's account-safe state update, but return `synced`, `skipped`, or `failed` to the initiating screen so loading, success animation, and retry guidance reflect the actual result.