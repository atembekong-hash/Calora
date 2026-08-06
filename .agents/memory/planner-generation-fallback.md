---
name: Planner generation fallback
description: Weekly AI meal-plan generation must remain usable when provider latency exceeds a mobile interaction window.
---

The planner should always have a bounded generation path: use the server-backed AI plan when it responds promptly, but fall back to a locally generated starter week with an explicit inline status when the provider is slow, unavailable, or offline.

**Why:** The managed AI planner can take several seconds and native/browser alert behavior is not a reliable way to communicate completion in the mobile UI. An unbounded request leaves users stuck in a loading state.

**How to apply:** Keep generation status visible in the planner screen, enforce a client-side deadline, and preserve the local-first starter-week experience rather than blocking planning on the AI provider.