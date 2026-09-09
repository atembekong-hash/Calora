---
name: Local persistence recovery
description: Rules for protecting local-first state during hydration failures, retries, and destructive clears.
---

Failed local hydration must never be treated as a successful empty/default load, destructive clear operations must run after queued writes, and rapid whole-snapshot commits must enter one lazy serialized transaction boundary before reading shared state.

**Why:** A failed parse or read can leave starter state in memory; persisting it would overwrite the user’s saved local data. A queued write after clear can resurrect deleted data. Per-item duplicate guards are not enough for snapshot commits: eager work can start before coalescing, while two different items can read the same snapshot and lose one another through last-writer-wins persistence.

**How to apply:** Gate persistence on successful hydration with no hydration error. Route clears and snapshot mutations through one awaited queue. Admit transaction callbacks lazily, coalesce duplicate item requests, serialize different-item snapshot commits globally, and publish in-memory state only after the durable write succeeds.