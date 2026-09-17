---
name: Planner week context
description: Planner browsing, shopping, and adaptive memory must share one explicit viewed-week source of truth.
---

The Planner must distinguish the week being viewed from the persisted plan week without letting those contexts drift. Selected days must always belong to the visible week, shopping quantities and checked state must be scoped to that visible week, and planner memory must be rebuilt from the current meal assignments so removed or replaced meals cannot remain as remembered plan signals.

**Why:** Premium planning interactions become confusing when browsing changes the visible range but summaries, shopping, or memory still describe another week.

**How to apply:** Any future Planner feature that reads or mutates meals should explicitly choose the viewed-week or persisted-plan scope and preserve that scope across navigation, sheets, and local save updates.