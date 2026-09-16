---
name: Protected release check drift
description: GitHub branch protection can require a status context that no longer matches an active workflow.
---

When verifying a protected release gate, inspect both the default branch's required status contexts and the active workflow that publishes them; a failing or pending required context can block a PR even when the expected workflow did not run.

**Why:** The remote repository can lag the workspace or retain a required context after a workflow rename/removal, so a PR may report `blocked` without producing the expected workflow run.

**How to apply:** Treat the live GitHub branch-protection response and workflow inventory as authoritative for the merge test. Use a disposable PR and an exact-context failure only when the workflow cannot be safely triggered, then preserve the evidence and clean up the branch.