# Calora Step 37 GitHub Release Gate Failure Root-Cause Report

Date: 2026-09-16  
Scope: Diagnostic investigation only; no remediation applied

## 1. Executive summary

Step 36 correctly stopped before native publishing because the required GitHub
release gate was not successful for the canonical SHA.

This investigation proves a required-check trigger mismatch:

- `main` branch protection requires the exact context
  `Run release validation suite`;
- the canonical `.github/workflows/release-validation.yml` declares only
  `pull_request` and `workflow_dispatch` triggers, not `push`;
- the only recorded release-validation run for the canonical SHA is reported
  by GitHub as a `push` run that completed with `failure`;
- that run created zero jobs, zero check runs, no logs, and no annotations.

The workflow source is syntactically parseable, Prettier-clean, and its local
validation test suite passes. No application-test failure was observed locally.

The available GitHub API evidence does not expose the controller-level reason
why a push run was created for a workflow that does not declare `push`, nor why
that zero-job run was marked failed. Therefore the required-check orphaning is
identified with medium confidence, but the exact immediate GitHub failure
mechanism remains unproven.

## 2. Canonical SHA/tree investigated

```text
Repository: atembekong-hash/Calora
Branch:     main
SHA:        8d93248db69e985ba490a957575bde2b7b38cbf3
TREE:       0a0ac2b83abce082bbc870c58029376cc4541a4a
```

This is the exact SHA from Step 36. No newer remote commit was used as evidence
for the historical failure.

## 3. Current local/origin state

After a read-only `git fetch origin --prune`:

```text
origin/main SHA:  8d93248db69e985ba490a957575bde2b7b38cbf3
origin/main TREE: 0a0ac2b83abce082bbc870c58029376cc4541a4a

local main SHA:   fc26b311c223a57aeab6e3fe91c59fb07c59eb8b
local main TREE:  b3f22cea53aa1ef44ed90b92cbb0871c5cdbd2ce

ahead/behind:     4 / 0
working tree:     clean before this report
```

The four local commits are documentation or attached-investigation evidence
only:

```text
45496e1 Document final canonical main GitHub push
c5f2ccf Add Calora step 36 canonical release testflight documentation
465d6b8 Add Calora canonical testflight build report
fc26b31 Document Calora step 37 release gate failure root cause
```

The local commits were not pushed, reset, rebased, or used as evidence for the
failed GitHub run. `git diff origin/main..main` contains only report and
attached-evidence paths; no workflow, source, configuration, or database file
diff was introduced.

## 4. Exact failed workflow identity

```text
Workflow file: .github/workflows/release-validation.yml
Workflow API ID: 359784386
Workflow API name: .github/workflows/release-validation.yml
Configured name: Release validation
Run ID: 35117499286
Run URL: https://github.com/atembekong-hash/Calora/actions/runs/35117499286
```

The GitHub workflow history endpoint returned exactly one run for workflow ID
`359784386`, and that run failed. No prior successful run exists for this
workflow ID.

## 5. Workflow run metadata

```text
Run number:       1
Run attempt:      1
Event:            push
Branch:           main
Head SHA:         8d93248db69e985ba490a957575bde2b7b38cbf3
Status:           completed
Conclusion:       failure
Actor:            atembekong-hash
Triggering actor: atembekong-hash
Created:          2026-09-16T15:45:39Z
Run started:     2026-09-16T15:45:39Z
Updated:          2026-09-16T15:45:39Z
Check suite ID:   95102992121
```

GitHub returned no separate completion timestamp. The run began and was marked
completed at the same second.

The run exposed these API links:

```text
Jobs: https://api.github.com/repos/atembekong-hash/Calora/actions/runs/35117499286/jobs
Logs: https://api.github.com/repos/atembekong-hash/Calora/actions/runs/35117499286/logs
```

The run timing endpoint returned an empty `billable` object, consistent with no
runner job starting.

## 6. Jobs, check-suite, and check-run evidence

For run `35117499286`:

```text
Jobs response:       HTTP 200
Job count:           0
Attempt job count:   0
Billable runners:    none returned
```

For check suite `95102992121`:

```text
App:                 GitHub Actions
Head branch:         main
Head SHA:            8d93248db69e985ba490a957575bde2b7b38cbf3
Status:              completed
Conclusion:          failure
Latest check count:  0
Check-runs endpoint: HTTP 200, total_count 0
```

The commit-wide check-run response contained other unrelated workflow checks,
but no check named `Run release validation suite`.

This proves the failure happened before the release-validation job exposed a
normal check run. It does not prove which internal GitHub controller validation
rejected or failed the run.

## 7. Failure logs and annotations

The workflow-run log endpoints returned:

```text
GET /actions/runs/35117499286/logs
GET /actions/runs/35117499286/attempts/1/logs
```

Both returned HTTP `404` with GitHub’s `Not Found` response. No log archive was
available.

The release check suite had zero check runs, so there was no check-run ID from
which to retrieve annotations. The attempted suite-annotation endpoint also
returned HTTP `404`.

Therefore:

- no runner log exists;
- no step log exists;
- no annotation exists;
- no first failing shell command can be identified;
- no missing-secret, dependency, test, or attestation error is present in the
  available run evidence.

## 8. First real failure

The first observable failure is the GitHub Actions controller state:

```text
workflow run created -> completed/failure
jobs created:        no
check runs created:  no
logs available:      no
```

The exact internal controller message is unavailable through the connected
GitHub API. Treating a test, dependency install, runner, or release-attestation
step as the first failure would be speculation.

## 9. `release-validation.yml` forensic map

The exact canonical workflow contains:

```yaml
name: Release validation

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  administration: read

jobs:
  release-validation:
    name: Run release validation suite
    runs-on: ubuntu-latest
    timeout-minutes: 15
```

The job steps are:

1. `actions/checkout@v4`;
2. `node scripts/audit-required-checks.mjs` with
   `GITHUB_TOKEN: ${{ github.token }}`;
3. `pnpm/action-setup@v4` with pnpm `10.26.1`;
4. `actions/setup-node@v4` with Node `24` and pnpm cache;
5. `pnpm install --frozen-lockfile`;
6. `pnpm --filter @workspace/scripts test`.

There are:

- no `if:` conditions;
- no `needs:` dependencies;
- no matrix;
- no environment block;
- no repository variable references;
- no user-defined secrets;
- no artifact upload;
- no cleanup step;
- no concurrency group.

The workflow’s only GitHub API operation is performed by
`scripts/audit-required-checks.mjs` through the Actions-provided token.

## 10. Workflow syntax and structure audit

The canonical workflow was checked without modifying it:

```text
YAML parser (yq):       passed
Prettier check:         passed
Workflow source diff:   none between origin/main and local source
```

The workflow has a valid top-level name, trigger block, permissions block, one
job, valid-looking runner and timeout fields, and the expected action references.

This local audit does not substitute for GitHub’s proprietary workflow
validation. In particular, it cannot prove the semantic validity of every
GitHub-specific permission or event behavior.

The most important structural fact is unambiguous: `push` is absent from the
canonical trigger block.

## 11. Required-check and ruleset analysis

GitHub’s branch-protection endpoint for `main` returned HTTP 200 and reported:

```text
Required context: Run release validation suite
Required app ID:  null
Strict checks:    false
Enforce admins:   false
```

The required context exactly matches the workflow job display name. This is not
a job-name mismatch.

The active repository ruleset returned:

```text
Name:       Calora Release Protection
ID:         22675187
Target:     branch
Enforcement: active
Ref include: refs/heads/release/calora-onboarding-and-plus
Required context: Verify workspace release foundation
Integration ID: 15368
Strict policy: true
```

That ruleset does not target `main`. The `main` requirement comes from classic
branch protection, not this release-branch ruleset.

The repository’s own `audit-required-checks.mjs` recognizes the job display
name `Run release validation suite` as an active workflow check name. Thus the
name is present in workflow source, but the workflow is not configured to run
on the direct `push` event that produced the historical gate observation.

Proven finding: the main branch has an orphan-prone required check because the
required context is expected on `main` while the canonical workflow does not
declare `push`.

Unproven finding: why GitHub created a failed push workflow run with zero jobs
instead of simply leaving the required context pending.

## 12. Last known successful run comparison

The workflow-specific history endpoint for workflow ID `359784386` returned:

```text
total_count: 1
successful runs: none
failed runs:     1
```

The only run is `35117499286` on the canonical SHA. There is no last known
successful release-validation run to compare against.

The Git history shows earlier commits that introduced and later refined the
workflow, but no corresponding successful GitHub run exists in the accessible
workflow history. Therefore no runtime regression can be established by
comparing a successful and failed execution.

## 13. Other failing workflow comparison

Two other workflows failed for the same SHA and in the same pre-job window:

```text
Native auth preflight:
  Run ID: 35117497278
  SHA:    8d93248db69e985ba490a957575bde2b7b38cbf3
  Event:  push
  Result: completed/failure

Native encrypted recovery:
  Run ID: 35117498287
  SHA:    8d93248db69e985ba490a957575bde2b7b38cbf3
  Event:  push
  Result: completed/failure
```

Their canonical workflow definitions declare `workflow_dispatch` only, not
`push`, and both use the `self-hosted, calora-native` runner label. Their
associated GitHub Actions check suites also completed with failure and zero
check runs.

The shared evidence is:

- same commit;
- push event reported despite no push trigger in the canonical files;
- completion within roughly one second;
- zero jobs/check runs;
- no runner logs.

This demonstrates a common pre-job workflow/controller pattern. It does not
prove whether the shared cause is event scheduling, workflow registration,
GitHub validation, or another controller-level failure.

## 14. Local reproduction results

The exact release-validation test command was run locally:

```text
Command:
  pnpm --filter @workspace/scripts test

Result:
  passed
  47 tests
  0 failures
  0 skipped
```

The exact audit script was also attempted:

```text
Command:
  node scripts/audit-required-checks.mjs

Result:
  stopped before the GitHub API request
  error: GITHUB_REPOSITORY is required
```

No local GitHub token was supplied, and no credential was printed or created.
The connected GitHub read-only API evidence independently confirmed the
repository protection state and workflow check-name mapping.

Local YAML parsing and formatting both passed. No local command reproduced an
application, typecheck, dependency, release-attestation, or test failure.

## 15. Secret and variable dependency audit

The workflow references:

| Dependency | Location | Availability | Relevance |
|---|---|---|---|
| `github.token` / `GITHUB_TOKEN` | audit step | Provided by GitHub at job runtime; local value not available | Required for branch-protection API read |
| `contents: read` | workflow permissions | Declared | Needed by checkout |
| `administration: read` | workflow permissions | Declared; runtime grant could not be observed because no job started | Potentially relevant to the audit API call, but not proven |

No repository secret, environment secret, repository variable, or user-supplied
credential is referenced by `release-validation.yml`.

No secret value was accessed, printed, rotated, or changed.

## 16. Action and runner audit

The workflow uses:

```text
Runner:             ubuntu-latest
Node:               24
pnpm action:        pnpm/action-setup@v4
pnpm version:       10.26.1
Checkout:           actions/checkout@v4
Node action:        actions/setup-node@v4
Dependency mode:    pnpm install --frozen-lockfile
```

No action deprecation warning, runner allocation error, or dependency setup
error was available because no job initialized.

The two native workflows use `self-hosted, calora-native`, but their runner
requirements were not reached in the failed zero-job runs.

## 17. Root cause

Primary classification:

```text
B. REQUIRED-CHECK / RULESET MISCONFIGURATION
```

Proven root-cause component:

```text
main requires Run release validation suite,
but release-validation.yml does not trigger on push.
```

This leaves the required context without a declared direct-push producer on the
canonical `main` path. The job name itself matches the required context, so the
problem is the event/gating relationship, not the display-name spelling.

The exact GitHub controller reason for the zero-job failed push run cannot be
proven from the available API response because GitHub exposed no logs,
annotations, jobs, or check runs.

## 18. Secondary consequences

- The required release gate cannot be treated as successful.
- The canonical SHA cannot be used for the authorized TestFlight build.
- No runner reached checkout, dependency installation, or validation tests.
- The native workflows also produced no device evidence.
- The workflow history has no successful baseline.
- The repository remains blocked from the Step 36 TestFlight action.

The failures do not prove that Calora application code is broken.

## 19. Root-cause confidence

```text
Required-check trigger mismatch: MEDIUM-HIGH
Exact GitHub zero-job failure mechanism: LOW
Overall exact root cause: MEDIUM
```

The trigger and required-context facts are directly observed. The missing
controller diagnostic prevents a high-confidence claim about the immediate
failure mechanism.

## 20. Whether Calora application code is implicated

No application-code failure was observed.

The exact `@workspace/scripts` release-validation test command passed locally
with 47 tests. GitHub did not reach any test step. The evidence therefore
implicates release infrastructure/gating, not native-device behavior or an
application regression.

This does not certify the application for release; it only describes what this
failed gate proves.

## 21. Minimum remediation design

Do not apply this remediation in Step 37.

The smallest candidate remediation is to make the required context run on the
event used to validate `main`, while preserving the existing pull-request and
manual paths. The likely workflow-only change is to add an explicit `push`
trigger scoped to `main` in `.github/workflows/release-validation.yml`.

Before applying it, the owner should confirm:

1. direct pushes to `main` are intended to produce the required check;
2. the Actions token has the minimum permission needed by
   `audit-required-checks.mjs`;
3. the branch-protection context remains exactly
   `Run release validation suite`;
4. the zero-job behavior is not caused by a separate GitHub workflow
   registration or repository configuration issue.

Changing branch protection instead of the workflow is a separate option and
was not applied or authorized.

## 22. Exact files/settings that would change

No changes were made.

Potential owner-authorized remediation surface:

```text
Workflow file:
  .github/workflows/release-validation.yml

Possible GitHub setting:
  main branch-protection required status context,
  only if the owner intentionally chooses a different producer.
```

No application source, database, migration, secret, environment variable, or
native configuration needs to change based on the evidence currently available.

## 23. Validation required after remediation

After explicit authorization and a remediation commit, validation should prove
all of the following on the new canonical SHA:

1. GitHub creates a non-zero-job release-validation run for the intended event.
2. A check run named exactly `Run release validation suite` is present.
3. Its `head_sha` equals the new canonical SHA.
4. Its status is `completed` and conclusion is `success`.
5. The workflow log contains checkout, audit, install, and test steps.
6. `pnpm --filter @workspace/scripts test` passes in GitHub.
7. The required main-branch context is no longer orphaned.
8. No unrelated native or deployment gate is being mistaken for the required
   release-validation result.

Only then may a separately authorized native release step be reconsidered.

## 24. Whether canonical main SHA must change

If the proposed workflow-only remediation is applied, it creates a new commit
and therefore a new canonical SHA. The historical SHA
`8d93248db69e985ba490a957575bde2b7b38cbf3` must remain classified as the
failed, unverified release candidate.

No new SHA was created or pushed by Step 37.

## 25. TestFlight impact

The release gate failure blocks TestFlight work. It does not establish:

- a failed iOS binary;
- a failed App Store submission;
- a native-device defect;
- an application-code regression.

No iOS build, Android build, EAS operation, TestFlight upload, or App Store
submission occurred.

## 26. Confirmation no remediation/push/build/deploy/database mutation occurred

Step 37 was diagnostic only:

```text
Workflow files edited:       no
GitHub settings edited:      no
Branch protection edited:    no
Rulesets edited:             no
Secrets changed:             no
Environment variables changed: no
Workflow rerun/dispatch:     no
Git push:                    no
Merge/rebase/reset:          no
iOS build:                   no
Android build:               no
EAS trigger:                 no
TestFlight/App Store submit: no
API deployment:              no
Replit production publish:   no
Database mutation:           no
Migration:                   no
```

Only this numbered diagnostic report was created for Step 37. The attached
authorization text was preserved as local evidence and was not pushed.

## 27. Exact recommendation for Step 38

Do not build or submit the canonical SHA yet.

First obtain explicit owner authorization for the minimum release-gate
remediation. Reconcile the workflow trigger and required-check relationship,
then create a new canonical commit and verify a real successful
`Run release validation suite` check on that exact new SHA. The verification
must include a non-zero job count and a successful check-run identity, not only
an overall workflow object.

After that new gate succeeds, a separate owner authorization is required before
any iOS production build or TestFlight submission.

## Final verdict

ROOT CAUSE PARTIALLY IDENTIFIED — ADDITIONAL EVIDENCE REQUIRED