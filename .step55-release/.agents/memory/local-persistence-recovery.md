---
name: Local persistence recovery
description: Rules for protecting local-first state during hydration failures, retries, and destructive clears.
---

Failed local hydration must never be treated as a successful empty/default load, and destructive clear operations must run after queued writes rather than racing them.

**Why:** A failed parse or read can leave starter state in memory; persisting it would overwrite the user’s saved local data. Likewise, a queued write that runs after clear can resurrect data the user intentionally deleted.

**How to apply:** Gate persistence on both successful hydration and no hydration error. Route removal/reset through the same serialized storage queue and await it before resetting in-memory state.