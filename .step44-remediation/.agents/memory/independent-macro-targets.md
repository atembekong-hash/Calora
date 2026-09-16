---
name: Independent macro targets
description: Product rule for custom daily macro goals and backward-compatible defaults.
---

Saved protein, carbohydrate, and fat goals are independent gram targets and do not need to reconcile mathematically with the daily calorie goal. Profiles without custom macro goals retain the original 26% protein, 44% carbohydrate, and 30% fat calorie-derived defaults.

**Why:** Users need direct control over each Macro balance target without existing profiles changing behavior unexpectedly.

**How to apply:** Any surface that displays or reasons about a macro target should use a saved custom gram target when present and the legacy ratio-derived value otherwise.