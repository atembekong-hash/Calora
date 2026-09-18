---
name: Recovery promotion boundary
description: How to reconcile a large historical recovery branch with a newer protected main without regressing current safeguards.
---

Compare the recovery tree with current main before promoting anything. If current main already contains an equivalent or stronger implementation under different commits, treat the historical recovery commit as superseded and do not replay it.

**Why:** Historical release branches can contain valid product work mixed with later reports, restores, generated snapshots, and older security behavior. Blind cherry-picking caused conflicts and risked replacing newer deletion, contract, and release gates.

**How to apply:** Use an isolated worktree for recovery validation, validate the recovery source independently, then perform a gap-only comparison against current main. Preserve current main's compatibility and security boundaries; commit only confirmed missing behavior and repairs.