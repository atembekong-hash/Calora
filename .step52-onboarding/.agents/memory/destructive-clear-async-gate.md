---
name: Destructive clear async gate
description: Preventing detached or newly started work from repopulating state during account data deletion.
---

A destructive local-data clear must both invalidate operations already in flight and prevent new state-producing operations from starting until the entire clear boundary finishes.

**Why:** Epoch invalidation alone stops older completions, but work started after the epoch changes can still carry the new generation and repopulate React state, live exports, and persisted storage after the core removal.

**How to apply:** Set the clear gate before the first await, reject or no-op every relevant start path while it is active, and validate both the gate and generation after every await before mutating refs, state, exports, or autosave inputs.