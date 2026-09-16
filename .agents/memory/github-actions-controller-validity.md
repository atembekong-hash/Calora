---
name: GitHub Actions controller validity
description: Diagnostic boundary for workflows that register and run but fail before job or check-run creation
---

An active GitHub Actions workflow record and an automatically created workflow-run object do not prove that GitHub accepted the workflow as executable. A controller failure can complete before job creation, leaving zero jobs, zero check runs, no runner timing, and no downloadable logs.

**Why:** The release-validation workflow remained active and its direct-push run was created, but the run still completed with no job or check run. Same-push `ubuntu-latest` workflows successfully initialized, so repository-wide Actions availability was not sufficient evidence of release-workflow validity.

**How to apply:** For a zero-job run, inspect registered workflow state, repository Actions policy, allowed actions, workflow permission semantics, branch protection/rulesets, runner evidence, and same-push successful workflows. Treat an active registration as inconclusive; do not patch or rerun without an exposed controller error or owner UI evidence.