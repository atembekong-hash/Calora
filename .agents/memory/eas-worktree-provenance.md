---
name: EAS worktree provenance
description: Environment-specific risk when running EAS from a temporary nested Git worktree inside the workspace
---

Never rely on a temporary Git worktree nested inside the main workspace for
EAS source provenance unless its Git metadata is rechecked immediately before
the EAS invocation. A workspace checkpoint can preserve the worktree files
while pruning its `.git` metadata; EAS then resolves the outer repository and
records the outer local commit even when the nested files contain the intended
source.

**Why:** A controlled iOS build was queued from files containing the intended
build number, but EAS recorded a different outer-workspace commit because the
nested worktree had become `prunable`. The finished IPA had the expected
identity but could not be accepted as a canonical-source release candidate.

**How to apply:** Prefer a Git-stable checkout outside the checkpointed
workspace, or verify `git rev-parse --show-toplevel`, `git rev-parse HEAD`,
the tree, and worktree metadata immediately before invoking EAS. Compare the
EAS-reported commit before treating any IPA as releasable.