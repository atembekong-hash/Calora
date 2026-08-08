---
name: Calora diary logging race condition pattern
description: Pattern to avoid when creating a draft and immediately consuming it within the same React event handler.
---

## Rule
Never create a local state entry (via `setState`) and then immediately read it back within the same synchronous call chain.

**Why:** React batches state updates. A setState call in one function does not make the new value available to the next function call in the same event handler. The state read will see the pre-update (stale) value.

**How to apply:** When a function creates a draft and another function needs that draft immediately, pass the draft object directly as a parameter rather than relying on state. Pattern:

```typescript
// WRONG — state not yet settled
createDraft(draftData);          // queues setDrafts(...)
consumeDraft(draftData.id);      // reads from drafts state → undefined

// RIGHT — pass object directly
const draft = buildDraft(draftData);
setDrafts(prev => [...prev, draft]);   // still queued
consumeDraft(draft.id, draft);         // uses object, not state
```

This pattern was fixed in `acceptFoodMemory` (CaloraContext) which now accepts an optional `draftOverride` parameter used by `logToDiary` in recipes.tsx.
