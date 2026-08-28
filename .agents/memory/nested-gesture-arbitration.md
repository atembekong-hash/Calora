---
name: Nested gesture arbitration
description: Cross-platform rule for combining parent swipe navigation with nested horizontal controls.
---

**Rule:** A parent horizontal pager must explicitly yield the whole pointer sequence when it begins inside a nested horizontal control; responder bubbling alone is not a reliable arbitration strategy.

**Why:** React Native Web did not consistently let nested horizontal scrolling win before a parent responder, so dragging a rail could unexpectedly navigate the parent section.

**How to apply:** Mark nested rails and carousels with a passive per-gesture exclusion boundary. Do not capture the gesture or disable vertical scrolling, and reset exclusion at the start of every new pointer sequence.