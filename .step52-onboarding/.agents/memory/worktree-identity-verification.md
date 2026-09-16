---
name: Worktree identity verification
description: Recover safely when a stale worktree path no longer has valid Git metadata.
---

Before editing or pushing from an isolated path, verify `git rev-parse --show-toplevel`, the current branch, `HEAD`, and `HEAD^{tree}` from inside that path. If the path resolves to the parent repository or reports a prunable worktree, preserve the stale copy, prune/recreate the worktree from the approved ref, and reapply only the intended files.

**Why:** A stale worktree can leave normal shell commands operating on a divergent parent branch while relative file reads still appear to target the requested directory. This can turn a narrow remediation into an accidental unrelated commit or push.

**How to apply:** Treat matching the expected root, branch/ref, commit SHA, and tree SHA as a precondition for every controlled remediation.