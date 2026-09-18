# Calora Release Branch Protection — Final Verification Report

**Date:** 2026-09-09  
**Repository:** `atembekong-hash/Calora`  
**Release branch:** `release/calora-onboarding-and-plus`  
**Verified branch commit:** `5d926972a89fbe4f8769887176bca439d2e88e5a`

## Final verdict

**FAIL**

The branch exists at the expected commit and the active ruleset restricts deletion and force pushes. The workflow itself is valid, executes successfully in GitHub Actions, and produces a successful `Verify workspace release foundation` check.

However, the active ruleset requires the misspelled status-check context:

`Verify workpace release foundation`

The workflow produces:

`Verify workspace release foundation`

Because the required context does not exactly match the produced check, the release protection and required CI gate are not demonstrably operational together. This is the blocking gap. No ruleset, workflow, application code, branch, or merge was changed during this verification.

## 1. Branch existence and exact commit

Evidence source:

`GET /repos/atembekong-hash/Calora/branches/release%2Fcalora-onboarding-and-plus`

Result:

- HTTP status: `200`
- Branch name: `release/calora-onboarding-and-plus`
- Remote branch commit: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Branch API `protected`: `true`
- Local `HEAD`: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- `git ls-remote` branch SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Local and remote SHAs match.
- Working tree was clean.

The legacy branch-protection endpoint returned HTTP `404` with `Branch not protected`. This repository uses repository rulesets rather than legacy branch-protection settings; the ruleset API and applied-rules API are the relevant evidence.

## 2. Ruleset verification

Evidence sources:

- `GET /repos/atembekong-hash/Calora/rulesets/22675187`
- `GET /repos/atembekong-hash/Calora/rules/branches/release%2Fcalora-onboarding-and-plus`

Ruleset:

- Name: `Calora Release Protection`
- ID: `22675187`
- Source: `atembekong-hash/Calora`
- Target: `branch`
- Enforcement: **active**
- Current user bypass: `never`
- Bypass actors: **empty list**
- Ref include: `refs/heads/release/calora-onboarding-and-plus`
- Ref exclude: empty

Applied rules:

- `deletion` — present; branch deletion is restricted.
- `non_fast_forward` — present; force pushes/non-fast-forward updates are blocked.
- `required_status_checks` — present.

Required-status-check parameters:

```json
{
  "do_not_enforce_on_create": false,
  "required_status_checks": [
    { "context": "Verify workpace release foundation" }
  ],
  "strict_required_status_checks_policy": true
}
```

The ruleset applies to the exact target branch and is active. No unexpected bypass actor was returned.

## 3. Required-check verification

Required by the ruleset:

`Verify workpace release foundation`

Produced by the workflow/job:

`Verify workspace release foundation`

The difference is the missing `s` in `workspace` within the ruleset context. GitHub’s check-runs for the verified commit show:

- `Verify workspace release foundation` — completed, success
- `Verify fresh-schema deletion fences (PostgreSQL 16)` — completed, success

No check-run named `Verify workpace release foundation` exists for the verified commit.

Therefore:

- Required checks rule exists: **yes**
- Strict up-to-date policy: **yes**
- Exact required check `Verify workspace release foundation`: **no**
- Required CI gate operationally satisfies the ruleset: **no**

This mismatch is the reason the final verdict is **FAIL**.

## 4. Workflow trigger and source verification

Workflow:

- Path: `.github/workflows/mandatory-ci-release-gate.yml`
- Workflow ID: `354218758`
- Workflow state: **active**
- Workflow name: `Mandatory CI release gate`

Remote workflow source was retrieved from the branch commit’s Git blob. It contains:

```yaml
on:
  push:
  pull_request:
  workflow_dispatch:
```

The workflow’s verification job is:

```yaml
jobs:
  verify:
    name: Verify workspace release foundation
```

Trigger evidence:

- A `push` run exists for the exact release branch.
- The run head SHA is `5d926972a89fbe4f8769887176bca439d2e88e5a`.
- The workflow ID is `354218758`.
- The workflow completed successfully.

The trigger configuration is valid and executes. It is not restricted to only this branch; it runs for push, pull request, and manual-dispatch events generally. The exact release branch execution was nevertheless proven by the successful push run.

## 5. Workflow file and command dependency checks

The remote branch tree contains:

- `.github/workflows/mandatory-ci-release-gate.yml`
- `scripts/ci/validate-expo-config.mjs`
- `scripts/ci/sanitize-failure-artifacts.mjs`

The workflow-referenced package scripts were confirmed to exist:

- Root: `typecheck`
- Database: `push-force`, `migrate`, `provision-support-objects`
- API specification: `codegen`
- API server: `typecheck`, `test:account-deletion-fence`, `test:built-deletion-fence-release`, `test`, `build`, `start`
- Calora: `typecheck`, `test`

No missing repository file was found among the workflow’s referenced helper scripts or package commands.

## 6. Safe local validation evidence

Completed without modifying application code, workflow configuration, rulesets, branches, or remote state:

- Workflow YAML parsed successfully.
- Trigger keys `push`, `pull_request`, and `workflow_dispatch` were present.
- Verify job name matched the workflow’s declared job name.
- Referenced helper scripts existed.
- Referenced package scripts existed.
- `node --check scripts/ci/validate-expo-config.mjs`: passed.
- `node --check scripts/ci/sanitize-failure-artifacts.mjs`: passed.
- Prettier checks for workflow and helper scripts: passed.
- `git diff --check`: passed.
- Workspace typecheck: passed.
- API server typecheck: passed.
- API production build: passed.
- Calora typecheck: passed.

Database provisioning and full test execution were not rerun against a local persistent database during this verification. The latest GitHub Actions run executed those CI stages on a disposable PostgreSQL service and passed them.

## 7. Latest GitHub Actions evidence

Latest mandatory release-branch run:

- Run ID: `34384424735`
- URL: https://github.com/atembekong-hash/Calora/actions/runs/34384424735
- Workflow ID: `354218758`
- Event: `push`
- Branch: `release/calora-onboarding-and-plus`
- Head SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Status: `completed`
- Conclusion: **success**

Verification job:

- Job ID: `102577021218`
- Name: `Verify workspace release foundation`
- URL: https://github.com/atembekong-hash/Calora/actions/runs/34384424735/job/102577021218
- Status: `completed`
- Conclusion: **success**

All primary workflow stages passed, including:

- PostgreSQL 16 initialization
- Dependency installation
- Database provisioning
- Workspace/API/Calora typechecks
- OpenAPI generation and drift check
- Database integration verification
- Full API tests
- Full Calora tests and static-server security tests
- Expo configuration validation
- Production API build
- API startup and health/readiness smoke tests
- Sanitized evidence collection and artifact upload

This proves the workflow can execute successfully in CI. It does not cure the ruleset’s exact required-check naming mismatch.

## 8. Operational gap and blocker

### Blocker: ruleset required-check typo

The ruleset requires `Verify workpace release foundation`, but the workflow produces `Verify workspace release foundation`.

This creates a false-positive protection appearance:

- The UI/API can show an active ruleset with a required status-check rule.
- The intended CI workflow can pass successfully.
- The exact required status check configured in the ruleset can still remain unsatisfied because its context name differs.

This verification did not change the typo. A repository administrator must correct the ruleset’s required-check context to the exact produced name, then rerun this verification.

### Other limitations

- No merge or test pull request was created.
- No deletion or force-push attempt was made.
- No EAS/Expo build was triggered.
- No branch, ruleset, workflow, application code, or production resource was changed.
- No claim is made that an actual merge is currently possible until the required-check context is corrected and reverified.

## Conclusion

The branch and active ruleset configuration are substantially present and the CI workflow is healthy in isolation. The exact required status check does not match the successful workflow job, so release protection is not operationally proven.

**Final verdict: FAIL**