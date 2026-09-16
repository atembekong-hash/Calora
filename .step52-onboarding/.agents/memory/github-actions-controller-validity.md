---
name: GitHub Actions controller validity
description: Diagnostic boundary for workflows that register and run but fail before job or check-run creation
---

An active GitHub Actions workflow record and an automatically created workflow-run object do not prove that GitHub accepted the workflow as executable. A controller failure can complete before job creation, leaving zero jobs, zero check runs, no runner timing, and no downloadable logs.

**Why:** The release-validation workflow remained active and its direct-push run was created, but the run still completed with no job or check run. Same-push `ubuntu-latest` workflows successfully initialized, so repository-wide Actions availability was not sufficient evidence of release-workflow validity.

**How to apply:** For a zero-job run, inspect registered workflow state, repository Actions policy, allowed actions, workflow permission semantics, branch protection/rulesets, runner evidence, and same-push successful workflows. Treat an active registration as inconclusive; do not patch or rerun without an exposed controller error or owner UI evidence.

The Actions `GITHUB_TOKEN` permission vocabulary does not include `administration`, while the protected-branch REST API documents Administration read for fine-grained credentials. A read-only audit that calls that API cannot safely be pushed after removing an invalid permission key unless a supported credential path is already configured.

**Why:** Removing the invalid key fixes workflow parsing but can move the failure into the audit step as an authorization error; bypassing or weakening that audit would make the release gate misleading.

**How to apply:** Separate syntax validity from runtime API authorization. If no least-privilege PAT/App credential or proven zero-secret equivalent exists, stop before commit/push and request owner authorization rather than inventing a secret or hard-coding success.