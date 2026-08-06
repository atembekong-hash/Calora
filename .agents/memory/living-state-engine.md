---
name: Living state engine
description: Durable principles for Calora’s shared adaptive interface state.
---

Calora’s adaptive UI should derive from existing local data through a deterministic shared state model. Classify time of day, routine maturity, recent gaps, daily meal context, hydration, protein, and wellness signals before choosing copy or a next action. Higher-context states such as returning users and evening reflection must take precedence over lower-priority nudges.

**Why:** A stateful companion feels trustworthy only when the same evidence produces the same calm response, missing history is not treated as failure, and competing suggestions resolve predictably.

**How to apply:** Keep the engine pure and testable with an injectable current time. Do not persist derived state or ask AI to classify routine maturity. Add visible behavior only after the shared state and its priority rules are covered by tests.