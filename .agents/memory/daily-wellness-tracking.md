---
name: Daily wellness tracking
description: Product boundary for Calora’s dashboard hydration, meal-count, and mood modules.
---

Calora’s daily wellness layer is intentionally lightweight: hydration and mood are optional per-day local entries, while meals logged is derived from approved food diary entries rather than a second counter.

**Why:** The dashboard should support behavior context without competing with calorie logging or creating conflicting sources of truth.

**How to apply:** Keep water and mood persisted through the local-first context, allow quick corrections or repeated taps, derive meal counts from the selected day’s approved logs, and keep any future weight/activity integrations explicit until connected.