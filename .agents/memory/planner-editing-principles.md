---
name: Planner editing principles
description: Planner editing should be explicit, reversible in context, and routed through shared local persistence.
---

The Planner should make editing visible before the user acts: an explicit Edit/Done mode exposes direct meal edits, while overflow actions remain available for move, copy, replace, remove, and diary review. Custom meals and serving changes must use the same shared planner mutation path so Shopping, adaptive memory, and summaries stay synchronized. Destructive removals should offer a visible, time-bounded Undo action in the save acknowledgement and restore the exact prior slot through that same mutation path.

**Why:** Hidden or fragmented edit behavior makes a planning workspace feel administrative and can leave downstream surfaces out of sync. A recovery action that disappears too quickly or restores through a separate path risks making an otherwise safe removal feel like data loss.

**How to apply:** Add capabilities inside the existing weekly workspace first. Prefer a clear local form or contextual sheet over a new Planner tab, and route every confirmed change—including Undo—through the canonical planner update function. Keep the recovery window long enough for a normal mobile interaction and clear competing acknowledgement timers when it starts.