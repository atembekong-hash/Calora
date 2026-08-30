---
name: Native health adapter contracts
description: Non-obvious HealthKit and Health Connect contracts that affect daily active-calorie accuracy.
---

HealthKit statistics must request the app’s fixed energy unit explicitly as kilocalories, and its authorization-request status is a numeric enum rather than a string. Daily health snapshots must not remain ready across a local calendar-day boundary.

**Why:** The native libraries can otherwise return values in a user-preferred unit or make a completed permission request look disconnected, while cached yesterday values can be mistaken for today’s Burned total.

**How to apply:** When changing the adapters, verify the installed package declarations and keep explicit units, enum comparisons, local-day query bounds, and day-freshness checks covered by regression tests.