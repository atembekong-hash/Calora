---
name: Isolated worktree cleanup
description: Workspace cleanup can strip Git metadata from isolated worktree directories.
---

For canonical branch work that must retain a verified base, use an external persistent worktree rather than a hidden or workspace-local worktree.

**Why:** Workspace cleanup removed `.git` metadata from two local isolated worktree directories while leaving plain source copies behind. Those copies resolve through the parent repository and are unsafe for baseline validation or commits.

**How to apply:** Verify `git rev-parse --show-toplevel`, branch, HEAD, and tree before editing and again before committing. Keep the branch worktree outside the workspace when it needs to survive cleanup.