---
name: Planner generation fallback
description: Weekly AI meal-plan generation must remain usable when provider latency exceeds a mobile interaction window.
---

The planner should always have a bounded generation path: use the server-backed AI plan when it responds promptly, accept only an explicit server-declared starter fallback, and preserve the current plan on client transport/API failure.

**Why:** The managed AI planner can take several seconds and native/browser alert behavior is not a reliable way to communicate completion in the mobile UI. Treating a failed request as a successful local replacement can erase intentional edits.

**How to apply:** Keep generation status visible in the planner screen, enforce a client-side deadline, let the server label provider fallback responses, and never fabricate success or overwrite the current week after a failed request.