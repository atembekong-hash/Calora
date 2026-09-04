---
name: Progress motion
description: Motion and content rules for Calora’s Progress tab.
---

Calora’s Progress tab uses restrained motion: staggered card entrances, animated progress fills, animated weekly bars, and a very subtle adaptive-signal pulse. Daily hydration and mood appear as context, not a score.

**Why:** Progress should feel responsive and encouraging without making nutrition data feel gamified or overstated.

**How to apply:** Keep animations short, low-amplitude, and tied to meaningful data changes. Preserve readable static content if motion is unavailable, and avoid adding celebratory effects to weight or health measurements.

Progress Overview and Trends line graphs should plot only observed daily values; days without entries remain gaps and use an explicit empty state instead of fabricated zeroes. Trends may include a target reference line only when calorie data exists.

**Why:** A zero-height point for an unlogged day implies measured behavior and can distort a user’s interpretation of calorie or meal trends.

**How to apply:** Derive graph points from the existing weekly signal model, keep the chart local-first, and preserve the restrained entrance animation used by the rest of Progress.