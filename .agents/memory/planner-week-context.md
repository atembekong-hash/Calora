---
name: Planner week context
description: Planner browsing, shopping, and adaptive memory must share one explicit viewed-week source of truth.
---

The Planner must distinguish the week being viewed from the persisted plan week without letting those contexts drift. Selected days must always belong to the visible week, shopping quantities and checked state must be scoped to that visible week, and planner memory must be rebuilt from the current meal assignments so removed or replaced meals cannot remain as remembered plan signals. Hydration must derive planner meals, shopping, and memory from one effective meal snapshot, including when older storage omits shopping data.

**Why:** Premium planning interactions become confusing when browsing changes the visible range but summaries, shopping, or memory still describe another week.

**How to apply:** Any future Planner feature that reads or mutates meals should explicitly choose the viewed-week or persisted-plan scope and preserve that scope across navigation, sheets, and local save updates. Persist week-scoped shopping checks separately from the legacy global checked flag, and normalize loaded week keys to a valid Monday.

The Planner’s nutrition card is intentionally a seven-day planned average, not the selected day’s total; label it as a seven-day average so a day header and the summary card are not mistaken for conflicting values.

**Why:** A selected day can legitimately differ from the week’s average, but unlabeled aggregation looks like stale or incorrect nutrition.

**How to apply:** Keep selected-day totals beside the day heading and keep the weekly summary derived from the visible week, with explicit aggregation language.