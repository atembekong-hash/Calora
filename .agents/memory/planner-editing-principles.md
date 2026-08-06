---
name: Planner editing principles
description: Planner editing should be explicit, reversible in context, and routed through shared local persistence.
---

The Planner should make editing visible before the user acts: an explicit Edit/Done mode exposes direct meal edits, while overflow actions remain available for move, copy, replace, remove, and diary review. Custom meals and serving changes must use the same shared planner mutation path so Shopping, adaptive memory, and summaries stay synchronized.

**Why:** Hidden or fragmented edit behavior makes a planning workspace feel administrative and can leave downstream surfaces out of sync.

**How to apply:** Add capabilities inside the existing weekly workspace first. Prefer a clear local form or contextual sheet over a new Planner tab, and route every confirmed change through the canonical planner update function.