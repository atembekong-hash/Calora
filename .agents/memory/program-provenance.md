---
name: Program provenance records
description: Rules for recording which Program shaped a generated planner week
---

Per-week Program application records live in planner preferences (`appliedPrograms`) and must stay truthful.

**Rules:**
- Every primary-Program switch must go through the history-preserving selector; never construct a primary-only preferences object.
- Record provenance only when a generation *materially changed* the week (merge reports inserted/replaced counts). No-op fills and fully protected rebuilds record nothing.
- Fill builds may only ESTABLISH a record for a week without one; they never overwrite the Program that originally shaped it. Only an explicit confirmed rebuild upserts.
- The planner API returns starter meals as a **200** with a "starter planner" provider when its AI provider fails — treat that as a fallback: never record the requested Program; a fallback rebuild that changed the week clears the stale record instead.
- All generation-completion preference writes must be latest-state functional updates so a Program the user selects while a request is in flight is never clobbered by a stale snapshot.

**Why:** provenance claims must match what actually happened to the meals; snapshot-based writes and fill-time overwrites silently rewrite history for past weeks.
**How to apply:** any code touching planner preferences during or after generation goes through the pure helpers in the plan-type module and the functional preference updater in the app context.
