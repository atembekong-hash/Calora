---
name: Spatial surface contrast
description: Preserve semantic background and foreground pairs when migrating cards to shared depth primitives.
---

When wrapping an existing card in a shared spatial surface, preserve any explicit semantic background that its foreground colors depend on. A default card background must not replace a hero, warning, success, or destructive surface while leaving the original foreground tokens intact.

**Why:** Shared surface defaults can silently create severe contrast regressions even when typechecking and unit tests pass. The problem appears only when the affected state renders.

**How to apply:** During every Surface migration, review the old background together with all foreground tokens. If the card uses semantic foregrounds such as on-hero or hero-muted, pass the matching semantic background explicitly and include that state in visual QA.
