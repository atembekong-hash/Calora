---
name: Restricted Phase 2A boundary
description: Conditions for any future transient Calora contextual-insight delivery before database RLS exists.
---

Restricted Phase 2A may only calculate existing deterministic Foundation facts transiently from the active user's isolated in-memory state. It must add no server facts, persistent Intelligence record/profile/history, cache, background work, Coach context, cross-user processing, or autonomous behavior.

**Why:** The current database boundary is API authorization, not enforced RLS, and broad fixed-key local persistence has a shared-device/account-switch exposure risk. A transient calculation does not introduce a new persistent server boundary, but it must not surface one user's local state to another.

**How to apply:** Keep all Contextual Intelligence and Coach flags disabled until a future implementation proves account-local state isolation/clear behavior, uses only bounded deterministic Foundation outputs, returns no-insight/insufficient-data for weak evidence, and does not persist or transmit derived sensitive data.