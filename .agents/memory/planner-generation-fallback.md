---
name: Planner generation fallback
description: Weekly AI meal-plan generation must remain usable when provider latency exceeds a mobile interaction window.
---

The planner should always have a bounded generation path: use the server-backed AI plan when it responds promptly, accept only an explicit server-declared starter fallback, and preserve the current plan on client transport/API failure.

**Why:** The managed AI planner can take several seconds and native/browser alert behavior is not a reliable way to communicate completion in the mobile UI. Treating a failed request as a successful local replacement can erase intentional edits.

**How to apply:** Keep generation status visible in the planner screen, enforce a client-side deadline, let the server label provider fallback responses, and never fabricate success or overwrite the current week after an ordinary failed request.

An explicit Program selection is different from an ordinary build: when the AI request is unavailable because the user is signed out or receives a 401, apply a deterministic local Program-shaped rebuild instead. Preserve logged and user-authored meals, record the week as an offline fallback, and tell the user that sign-in unlocks the personalized AI version.

**Why:** The Program action is an explicit request to reshape the generated portion of the week; leaving it unchanged after an auth-gated request makes the selector appear broken.

**How to apply:** Keep the local fallback scoped to confirmed Program actions, use the same rebuild merge/protection rules as a successful generation, and invalidate any late network response before it can overwrite the local result.