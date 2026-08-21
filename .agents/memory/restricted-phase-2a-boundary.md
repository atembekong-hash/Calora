---
name: Restricted Phase 2A boundary
description: Conditions for any future transient Calora contextual-insight delivery before database RLS exists.
---

Restricted Phase 2A may only calculate existing deterministic Foundation facts transiently from the active user's isolated in-memory state. The reviewed exception is one Progress-tab card behind the `intelligence.insights.progress` gate; it must add no server facts, persistent Intelligence record/profile/history, cache, background work, Coach context, cross-user processing, or autonomous behavior.

**Why:** The current database boundary is API authorization, not enforced RLS, and broad fixed-key local persistence has a shared-device/account-switch exposure risk. A transient calculation does not introduce a new persistent server boundary, but it must not surface one user's local state to another.

**How to apply:** Keep every delivery flag except the reviewed Progress gate disabled. The Progress consumer must derive synchronously from the hydrated account's local snapshot, clear on hydration/scope reset, use only bounded deterministic Foundation outputs, return no card for weak or stale evidence, and never persist or transmit derived sensitive data. Any new surface or Coach use needs a separate review.