---
name: Living state engine
description: Durable principles for Calora’s shared adaptive interface state.
---

Calora’s adaptive UI should derive from existing local data through a deterministic shared state model. Classify time of day, routine maturity, recent gaps, daily meal context, hydration, protein, wellness signals, and real upcoming planner assignments before choosing copy or a next action. Higher-context states such as returning users and evening reflection must take precedence over lower-priority nudges; hydration and protein needs must take precedence over plan readiness.

**Why:** A stateful companion feels trustworthy only when the same evidence produces the same calm response, missing history is not treated as failure, and competing suggestions resolve predictably. Planning should never mask an immediate incomplete-day or wellness need.

**How to apply:** Keep the engine pure and testable with an injectable current time. Do not persist derived state or ask AI to classify routine maturity. Home may expose a compact current-rhythm summary; keep detailed weekly pattern analysis on Progress so the surfaces do not compete.