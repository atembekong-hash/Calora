# Calora Step 39 GitHub Actions Controller Forensic Report

Date: 2026-09-16  
Scope: Read-only GitHub Actions controller investigation

## 1. Executive summary

Step 39 was diagnostic only. No workflow, GitHub setting, branch protection,
ruleset, secret, variable, runner, environment, application file, database, or
native configuration was changed. No commit, push, workflow rerun, workflow
dispatch, EAS operation, build, TestFlight submission, API deployment command,
Replit publish, or database operation was performed during Step 39.

The Step 38 release-validation run was reconfirmed:

```text
Run ID:       35120305466
Workflow:     .github/workflows/release-validation.yml
Workflow ID:  359784386
Run number:   2
Event:        push
Branch:       main
Head SHA:     11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Status:       completed
Conclusion:   failure
```

The controller evidence remains:

```text
Jobs:                 0
Attempt jobs:         0
Check runs:           0
Billable runners:     none
Logs:                 unavailable
Annotations:          unavailable
```

The repository Actions service is enabled, all actions are allowed, the
workflow is registered as active, and same-push GitHub-hosted workflows
successfully created and completed jobs. This rules out a broad repository
Actions outage, a global allowed-actions restriction, and general
`ubuntu-latest` unavailability.

The strongest workflow-specific finding is:

```text
release-validation.yml declares permissions.administration: read
```

GitHub’s current workflow syntax documentation lists the available
`GITHUB_TOKEN` workflow permission keys and does not include `administration`.
The GitHub branch-protection REST endpoint separately documents
`Administration: read` as a fine-grained token permission. These are different
permission systems. The workflow declaration therefore has a strong
schema/permission-invalidity signal.

However, GitHub’s public API does not expose an exact invalid-workflow or
controller error for run `35120305466`. The workflow remains registered as
`active`, and the failed run exposes no job, check run, log, or annotation from
which to prove that `administration: read` is the exact sole rejection cause.
The two native zero-job workflows do not declare that permission, so they also
demonstrate that the repository has more than one pre-job failure pattern or a
separate event/controller issue.

## 2. Canonical SHA/tree

The expected canonical GitHub main identity was reconfirmed:

```text
SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
TREE: d3c230005c043874b9e245b70cd4b23f70af8105
```

No newer remote commit was used to reinterpret historical run
`35120305466`.

## 3. Current local/origin state

The Step 39 read-only freeze was:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105

local main SHA:   463d0091fec7ffc88604b58403f087b5158c2b58
local main TREE:  de26441843ef1e5503a7af67d81a96c2df3c54e9

ahead/behind:     2 / 0
working tree:     clean before this report
```

The two local-only commits were documentation/evidence commits and were not
workflow remediation commits:

```text
37d31b5  Add Calora release gate remediation report
463d009  Add forensic investigation documentation for GitHub Actions controller
```

Their paths were documentation and the attached Step 39 evidence only. They
were not pushed in Step 39. The Step 39 report itself is local documentation
only.

## 4. Step 38 run reconfirmation

### 4.1 Workflow run metadata

The run endpoint returned HTTP 200:

```text
GET /repos/atembekong-hash/Calora/actions/runs/35120305466
```

Returned metadata:

```text
Workflow name:  .github/workflows/release-validation.yml
Workflow ID:    359784386
Run number:     2
Run attempt:    1
Event:          push
Branch:         main
Head SHA:       11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Status:         completed
Conclusion:     failure
Created:        2026-09-16T16:11:36Z
Started:        2026-09-16T16:11:36Z
Updated:        2026-09-16T16:11:36Z
Check suite ID: 95111026936
```

### 4.2 Jobs and attempts

```text
GET /repos/atembekong-hash/Calora/actions/runs/35120305466/jobs
HTTP 200
total_count: 0

GET /repos/atembekong-hash/Calora/actions/runs/35120305466/attempts/1/jobs
HTTP 200
total_count: 0
```

No job ID, runner name, job name, or step result exists for this run.

### 4.3 Check suite and check runs

```text
GET /repos/atembekong-hash/Calora/check-suites/95111026936
HTTP 200
status: completed
conclusion: failure
latest_check_runs_count: 0

GET /repos/atembekong-hash/Calora/check-suites/95111026936/check-runs
HTTP 200
total_count: 0
check_runs: []
```

The commit-wide check-run endpoint returned HTTP 200 and seven unrelated
check runs at the time of the final query. None was named
`Run release validation suite`.

### 4.4 Logs and annotations

```text
GET /repos/atembekong-hash/Calora/actions/runs/35120305466/logs
HTTP 404
message: Not Found

GET /repos/atembekong-hash/Calora/actions/runs/35120305466/annotations
HTTP 404
message: Not Found
```

No runner log, step log, annotation, or first failing shell command was
available.

### 4.5 Timing and billable data

```text
GET /repos/atembekong-hash/Calora/actions/runs/35120305466/timing
HTTP 200
billable: {}
```

This is consistent with no runner job being allocated.

### 4.6 Attempt and commit status

```text
GET /repos/atembekong-hash/Calora/actions/runs/35120305466/attempts/1
HTTP 200
status: completed
conclusion: failure

GET /repos/atembekong-hash/Calora/commits/11eb7d0038f2d60b8540cc2f027d2b50c2117b91/status
HTTP 200
state: success
```

The commit-wide combined status is not the required release check. It contains
provider deployment contexts and does not establish that
`Run release validation suite` executed.

## 5. Repository Actions settings

### 5.1 Repository and Actions enabled state

```text
GET /repos/atembekong-hash/Calora
HTTP 200

Repository:       atembekong-hash/Calora
Visibility:       public
Default branch:   main
Archived:         false
Disabled:         false
```

```text
GET /repos/atembekong-hash/Calora/actions/permissions
HTTP 200
enabled:               true
allowed_actions:       all
sha_pinning_required:  false
```

The repository Actions service is enabled and does not use an allowlist that
could reject the referenced actions.

### 5.2 Default workflow permissions

```text
GET /repos/atembekong-hash/Calora/actions/permissions/workflow
HTTP 200
default_workflow_permissions:       read
can_approve_pull_request_reviews:   false
```

The repository default is read-only. The release workflow explicitly requests
`contents: read` and the unsupported-looking `administration: read` key.

### 5.3 Selected actions policy

```text
GET /repos/atembekong-hash/Calora/actions/permissions/selected-actions
HTTP 409
message: Conflict
errors: All actions and workflows are allowed on this repository
```

The 409 is not a restriction failure. It confirms that selected-action policy
is not active because all actions and reusable workflows are allowed.

### 5.4 Fork pull-request policy

```text
GET /repos/atembekong-hash/Calora/actions/permissions/fork-pr-contributor-approval
HTTP 200
approval_policy: first_time_contributors
```

This setting concerns fork pull-request approvals and cannot explain a direct
push run on `main`.

### 5.5 Organization-level policy

The repository owner is a user account rather than an observable organization
administrative context. These read-only organization endpoints returned 404:

```text
GET /orgs/atembekong-hash/actions/permissions
GET /orgs/atembekong-hash/actions/permissions/workflow
GET /orgs/atembekong-hash/actions/permissions/selected-actions
GET /orgs/atembekong-hash/actions/runner-groups
```

The 404 responses mean organization-level policy was not observable through the
available GitHub connection. They do not prove that no higher-level policy
exists.

## 6. Workflow registration state

### 6.1 Registered release workflow

```text
GET /repos/atembekong-hash/Calora/actions/workflows/359784386
HTTP 200

Workflow ID:   359784386
API name:      .github/workflows/release-validation.yml
Path:          .github/workflows/release-validation.yml
State:         active
Created at:    2026-09-16T11:45:36.000-04:00
Updated at:    2026-09-16T12:11:36.000-04:00
```

The registered workflow URL points to:

```text
.github/workflows/release-validation.yml
```

The workflow metadata is active, not `disabled`, `disabled_inactivity`, or an
invalid-state value.

### 6.2 Historical workflow records

The workflow listing returned HTTP 200 and eight total workflows. There was one
registered workflow record for the release-validation path:

```text
ID:     359784386
Path:   .github/workflows/release-validation.yml
State:  active
```

No duplicate historical workflow record for the same path was exposed.

The release workflow history endpoint returned HTTP 200 with two runs:

```text
Run 1: 35117499286
SHA:   8d93248db69e985ba490a957575bde2b7b38cbf3
Event: push
Result: failure
Jobs:  0

Run 2: 35120305466
SHA:   11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Event: push
Result: failure
Jobs:  0
```

The workflow has never produced a non-zero-job run in the observable history.

### 6.3 File history

The lightweight Git history shows:

```text
613540b  Add required release validation CI workflow
5555eeb  Run release validation on every pull request
3113883  Detect orphaned required checks before release blocks
11eb7d0  Fix main release validation trigger
```

The earlier `613540b` and `5555eeb` versions used `contents: read` without
`administration: read`. The `administration: read` declaration appeared in the
later required-check-audit revision before the Step 38 push-trigger fix.

This history makes the permission declaration a concrete workflow-specific
change, but the API still does not expose the exact controller error.

## 7. GitHub-side workflow validity evidence

The canonical workflow file at `origin/main` is registered under the exact
expected path and has the expected active state. GitHub therefore recognizes
the file and creates a workflow-run object for the direct push.

That registration does not prove executable semantic validity. GitHub exposed
no public validation endpoint result, no invalid-workflow message, and no
controller annotation for run `35120305466`.

The local file is structurally:

```yaml
name: Release validation

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  administration: read
```

The GitHub workflow syntax documentation lists the available workflow
`GITHUB_TOKEN` permission keys. The documented list includes keys such as
`actions`, `checks`, `contents`, `deployments`, `issues`, `packages`,
`pages`, `pull-requests`, `security-events`, `statuses`, and
`vulnerability-alerts`. It does not include `administration`.

Authoritative reference:

```text
https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
```

The absence of `administration` from the documented workflow permission set is
strong evidence that this declaration is not a valid workflow
`GITHUB_TOKEN` permission key. It is not, by itself, a GitHub-run error string.

## 8. Workflow permissions analysis

The workflow requests:

```yaml
permissions:
  contents: read
  administration: read
```

`contents: read` is a documented valid workflow permission and is sufficient
for checkout access.

`administration: read` is not listed as a valid workflow `permissions` key in
the GitHub Actions workflow syntax reference. `Administration` is instead a
repository permission used by fine-grained GitHub App, user access, and
personal access tokens for certain REST endpoints.

This distinction matters:

```text
Workflow permissions:
  scopes that can be requested from the Actions-provided GITHUB_TOKEN

Fine-grained REST token permissions:
  repository permissions granted to a GitHub App/PAT/user token
```

The evidence supports a likely pre-job schema/permission rejection for the
release workflow, but GitHub did not expose the exact parser message.

## 9. `administration: read` validity analysis

The branch-protection REST documentation states that the `Get branch
protection` endpoint requires fine-grained `Administration` repository
permissions with read access.

Authoritative reference:

```text
https://docs.github.com/en/rest/branches/branch-protection
```

That does not make `administration: read` valid in an Actions workflow
`permissions` block. The Actions workflow syntax reference is the applicable
authority for the YAML declaration, and its available key list omits
`administration`.

The exact required-check audit script needs to inspect branch protection. Its
runtime API requirement and the workflow-token syntax are separate questions:

```text
A. Is administration a valid workflow permissions key?
   Evidence: not listed by GitHub’s workflow syntax reference.

B. Can the runtime token read branch protection?
   Evidence: branch-protection REST documentation requires Administration read
   for fine-grained tokens; the failed workflow never reached runtime.
```

No GitHub Actions job started, so the available evidence cannot determine
whether a corrected workflow would fail later with a 403 from the branch
protection API. The permission declaration must not be changed speculatively in
Step 39.

## 10. Required branch-protection context

```text
GET /repos/atembekong-hash/Calora/branches/main/protection
HTTP 200

Required context: Run release validation suite
App ID:          null
Strict checks:   false
Enforce admins:  false
```

The classic `main` branch-protection requirement remains distinct from the
workflow registration state. No branch-protection setting was changed.

## 11. Repository rulesets

The ruleset collection endpoint returned HTTP 200. The only observable ruleset
was:

```text
Name:        Calora Release Protection
ID:          22675187
Target:      branch
Enforcement: active
Source:      atembekong-hash/Calora
```

The detailed ruleset endpoint returned HTTP 200:

```text
GET /repos/atembekong-hash/Calora/rulesets/22675187
```

Its branch condition is:

```text
include: refs/heads/release/calora-onboarding-and-plus
```

Its required status check is:

```text
Verify workspace release foundation
Integration ID: 15368
Strict policy: true
```

It does not target `main`. The required `main` context comes from classic
branch protection, not this ruleset.

No required-workflow rule targeting `main` was exposed. The ruleset contains a
required-status-check rule for a different release branch, which is not a
required workflow and does not explain the release-validation zero-job run.

## 12. Required-workflow analysis

The observable protections are:

```text
Classic branch protection on main:
  required status check: Run release validation suite

Release-branch ruleset:
  required status check: Verify workspace release foundation
  target: refs/heads/release/calora-onboarding-and-plus
```

No required-workflow rule was returned. A required status check does not itself
execute a workflow and cannot substitute for a valid workflow controller
configuration.

There is no evidence that required-workflow or ruleset enforcement terminated
the release-validation workflow before job creation.

## 13. Zero-job workflow comparison

The three exact same-push zero-job runs were:

| Workflow | Run ID | Path | Event | SHA | Result |
|---|---:|---|---|---|---|
| Release validation | 35120305466 | `.github/workflows/release-validation.yml` | `push` | `11eb7d0...` | failure |
| Native auth preflight | 35120303752 | `.github/workflows/native-auth-preflight.yml` | `push` | `11eb7d0...` | failure |
| Native encrypted recovery | 35120304682 | `.github/workflows/native-encrypted-recovery.yml` | `push` | `11eb7d0...` | failure |

### 13.1 Release validation

```text
State:       active
Trigger:     push main, pull_request, workflow_dispatch
Permissions: contents: read; administration: read
Runner:      ubuntu-latest
Environment: none
Secrets:     no user-defined secret references
Jobs:        0
Check runs:  0
Logs:        HTTP 404
Timing:      HTTP 200, billable {}
```

### 13.2 Native auth preflight

```text
State:       active
Trigger:     workflow_dispatch only
Permissions: contents: read
Runner:      [self-hosted, calora-native]
Environment: none
Inputs:      required iOS binary, Android binary, iOS device, Android device
Jobs:        0
Check runs:  0
Logs:        HTTP 404
Timing:      HTTP 200, billable {}
```

### 13.3 Native encrypted recovery

```text
State:       active
Trigger:     workflow_dispatch only
Permissions: contents: read
Runner:      [self-hosted, calora-native]
Environment: none
Inputs:      required signed_build_identifier; optional device identifiers
Jobs:        0
Check runs:  0
Logs:        HTTP 404
Timing:      HTTP 200, billable {}
```

### 13.4 Structural intersection

All three are GitHub Actions workflows registered as active and all three
received a reported `push` run on the same SHA, despite the native workflows
not declaring a `push` trigger. All three then terminated before job
initialization.

There is no shared invalid permission key:

```text
Release validation: administration: read present
Native auth:        contents: read only
Native recovery:    contents: read only
```

There is no shared runner:

```text
Release validation: ubuntu-latest
Native workflows:   self-hosted, calora-native
```

There is no shared environment or user-defined secret reference in the
top-level workflow definitions that could be identified as the common
pre-job blocker.

The evidence therefore does not support one universal cause for all three
zero-job runs. It supports a release-specific permission/schema concern plus a
separate native workflow/controller or event concern.

## 14. Successful same-push workflow comparison

### 14.1 Account-deletion fence validation

Run `35120306501` successfully initialized and completed:

```text
Workflow:     Account-deletion fence validation
Workflow ID:  351146994
Path:         .github/workflows/account-deletion-fence.yml
Event:        push
Branch:       main
Head SHA:     11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Status:       completed
Conclusion:   success
Job count:    1
Check suite: 95111030224
Check runs:  1
Runner:       GitHub Actions 1000001867
```

The job executed checkout, pnpm setup, Node setup, dependency installation,
schema, migration, support-object, and deletion-fence steps successfully.

Its controller-facing differences from release validation include:

```text
Trigger:     push, pull_request, workflow_dispatch
Permissions: contents: read only
Runner:      ubuntu-latest
Services:    PostgreSQL service
Environment: job-local database variables
```

### 14.2 Native association monitoring

Run `35120313283` successfully initialized on a `deployment_status` event:

```text
Workflow:     Monitor native association files
Workflow ID:  350809899
Path:         .github/workflows/monitor-native-associations.yml
Event:        deployment_status
Branch:       main
Head SHA:     11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Status:       completed
Conclusion:   success
Job count:    3
Check suite: 95111050853
Check runs:  3
Hosted runner: GitHub Actions 1000001868
```

The executed warning job completed successfully. Two conditional verification
jobs were skipped as expected for that deployment-status state. This workflow
uses `contents: read` and successfully handles environment/secret references,
conditional jobs, and third-party actions.

### 14.3 Hosted-runner evidence

Both successful examples used GitHub-hosted runners. This proves that
`ubuntu-latest` jobs generally initialize in this repository. It does not prove
that the native self-hosted label is available, but that label cannot explain
the release workflow’s `ubuntu-latest` zero-job failure.

## 15. Structural comparison matrix

| Property | Zero-job workflows | Working workflows | Difference | Root-cause relevance |
|---|---|---|---|---|
| Registration | Active | Active | None | Rules out disabled workflow |
| Actions enabled | Repository-wide enabled | Same | None | Rules out global Actions disablement |
| Allowed actions | All allowed | Same | None | Rules out action allowlist rejection |
| Runner | Release: `ubuntu-latest`; native: self-hosted | `ubuntu-latest` | Native runner differs | Not relevant to release |
| Permissions | Release has `administration: read`; native has contents only | Contents only | Release-specific unsupported-looking key | Strong release-specific lead |
| Trigger | Release has push; native is dispatch-only | Account has push; monitor has deployment_status | Event declarations differ | Shows event/controller anomaly for native runs |
| Environment | None | Job-local env/services or monitor env/secrets | Job configuration differs | No common blocking environment |
| Required inputs | Native workflows require dispatch inputs | Successful push workflow has none | Native-only | Possible native controller/event issue |
| Jobs | 0 | 1 or 3 | Pre-job vs initialized | Confirms controller boundary |
| Check runs | 0 | 1 or 3 | Pre-check vs emitted checks | Confirms controller boundary |
| Logs | 404 | Jobs exist; log endpoint access varies | No release evidence | Owner UI/error evidence needed |
| Workflow state | Active | Active | None | Rules out disabled state |

The matrix identifies a plausible release-specific invalid permission
declaration but does not prove the entire three-workflow pattern has one cause.

## 16. Environment/deployment policy

The repository environment endpoint returned HTTP 200:

```text
GET /repos/atembekong-hash/Calora/environments

Environment:
  attractive-harmony / production
  protection rules: none
  deployment branch policy: null
```

The release-validation workflow does not declare `environment:` at workflow or
job level. Environment protection therefore cannot explain this specific
pre-job failure.

A separate GitHub deployment record exists for the same SHA:

```text
GET /repos/atembekong-hash/Calora/deployments?sha=11eb7d0038f2d60b8540cc2f027d2b50c2117b91
HTTP 200

Deployment ID: 6485271969
Creator:      railway-app[bot]
Environment:  attractive-harmony / production
```

This is a Railway deployment status and is separate from the release-validation
workflow’s job controller. It must not be mistaken for a successful
`Run release validation suite` check.

## 17. Runner/billing/Actions availability

The repository self-hosted runner endpoint returned HTTP 200 with no registered
repository runners:

```text
GET /repos/atembekong-hash/Calora/actions/runners
HTTP 200
total_count: 0
```

That is not evidence that GitHub-hosted runners are unavailable. The same-push
account-deletion and native-association workflows successfully ran on
GitHub-hosted runners.

For the release-validation run:

```text
timing: HTTP 200
billable: {}
jobs: 0
```

For the successful account-deletion run:

```text
timing: HTTP 200
billable.jobs: 1
runner: GitHub Actions 1000001867
```

For the successful native-association monitor:

```text
timing: HTTP 200
billable.jobs: 3
runner: GitHub Actions 1000001868 for the executed job
```

No repository-level suspended Actions state, hosted-runner outage, or billing
restriction was observable. No organization runner-group information was
available because the organization endpoints returned 404.

## 18. Allowed-actions policy

The repository Actions policy returned:

```text
enabled:              true
allowed_actions:      all
sha_pinning_required: false
```

The selected-actions endpoint explicitly returned:

```text
All actions and workflows are allowed on this repository
```

The release workflow references:

```text
actions/checkout@v4
pnpm/action-setup@v4
actions/setup-node@v4
```

There is no evidence that any of these actions is blocked by repository or
organization allowed-actions policy. The successful same-push workflows also
use the same actions and initialize jobs.

## 19. Workflow history/registration

### 19.1 Release workflow

The registered release workflow was created at `2026-09-16T11:45:36.000-04:00`
and updated at `2026-09-16T12:11:36.000-04:00`, corresponding to the
workflow-trigger remediation period. It is active and has one registered record
for its path.

The observable run history contains only two runs, both zero-job failures:

```text
Run 1: historical SHA 8d93248db69e985ba490a957575bde2b7b38cbf3
Run 2: remediation SHA 11eb7d0038f2d60b8540cc2f027d2b50c2117b91
```

No prior non-zero-job success exists for comparison.

### 19.2 Native workflow history

The native auth workflow is active with workflow ID `351187995`. Its relevant
history includes the evidence-upload revision:

```text
77b9ddc  Attach sanitized native auth preflight evidence to release runs
```

The native encrypted-recovery workflow is active with workflow ID `350852594`.
Its history includes multiple runner-preflight and evidence revisions,
including:

```text
8f292e5  Preflight native recovery runner prerequisites before Maestro
3d06add  Tie encrypted recovery evidence to signed build identifier
```

The two native workflows have required `workflow_dispatch` inputs and
self-hosted runner labels. Their zero-job push records therefore cannot be
treated as proof that the release workflow’s `ubuntu-latest` controller path
has the same cause.

### 19.3 Stale metadata assessment

The release workflow’s registered path, active state, updated timestamp, and
run head SHA align with the canonical file at `origin/main`. No duplicate
workflow record or stale path mapping was observed.

Stale workflow registration is not supported by the available evidence.

## 20. API diagnostic response matrix

| Diagnostic surface | Endpoint/result | Evidence |
|---|---|---|
| Workflow run | `GET /actions/runs/35120305466` → 200 | Completed failure, exact new SHA |
| Attempt | `GET /actions/runs/35120305466/attempts/1` → 200 | Completed failure |
| Jobs | `GET /actions/runs/35120305466/jobs` → 200 | `total_count: 0` |
| Attempt jobs | `GET /actions/runs/35120305466/attempts/1/jobs` → 200 | `total_count: 0` |
| Check suite | `GET /check-suites/95111026936` → 200 | Completed failure |
| Check runs | `GET /check-suites/95111026936/check-runs` → 200 | `total_count: 0` |
| Run annotations | `GET /actions/runs/35120305466/annotations` → 404 | Not found |
| Logs | `GET /actions/runs/35120305466/logs` → 404 | Not found |
| Timing | `GET /actions/runs/35120305466/timing` → 200 | `billable: {}` |
| Workflow metadata | `GET /actions/workflows/359784386` → 200 | Active, exact path |
| Workflow history | `GET /actions/workflows/359784386/runs` → 200 | Two zero-job failures |
| Repository Actions policy | `GET /actions/permissions` → 200 | Enabled, all actions |
| Workflow defaults | `GET /actions/permissions/workflow` → 200 | Default read |
| Selected actions | `GET /actions/permissions/selected-actions` → 409 | All actions allowed |
| Fork approval | `GET /actions/permissions/fork-pr-contributor-approval` → 200 | First-time contributors |
| Branch protection | `GET /branches/main/protection` → 200 | Required context exact |
| Ruleset list | `GET /rulesets?includes_parents=true` → 200 | One release-branch ruleset |
| Ruleset detail | `GET /rulesets/22675187` → 200 | Targets release branch |
| Environments | `GET /environments` → 200 | One unprotected production env |
| Repository runners | `GET /actions/runners` → 200 | Zero self-hosted runners |
| Organization Actions policy | `/orgs/atembekong-hash/actions/...` → 404 | Not observable |
| Commit check runs | `GET /commits/{sha}/check-runs` → 200 | No required check run |
| Commit statuses | `GET /commits/{sha}/status` → 200 | Provider contexts only |
| Deployments | `GET /deployments?sha={sha}` → 200 | Railway bot deployment record |

No read-only API surface returned the exact pre-job controller error.

## 21. Exact first observable controller failure

The first observable failure remains:

```text
workflow run object created
→ completed/failure
→ zero jobs
→ zero check runs
→ no logs
→ no annotations
→ no billable runner allocation
```

The first observable failure is therefore a GitHub Actions controller/pre-job
failure. No test, dependency, checkout, runner, permission API call, or
application command ran.

## 22. Whether workflow is proven valid/invalid/unknown

Required answer:

```text
UNKNOWN — REGISTERED BUT EXECUTION VALIDITY NOT PROVEN
```

Reason:

- GitHub registers the workflow and reports it as active;
- GitHub creates a run for the exact push and SHA;
- the workflow file contains a permission key absent from the documented
  workflow permission set;
- GitHub exposes no direct validation error or parser message;
- the run has no job, check run, log, or annotation.

The permission evidence is strong enough to require owner-side confirmation,
but not strong enough to claim that the public API has proven the exact sole
controller rejection.

## 23. Primary root-cause classification

Primary classification for the release-validation workflow:

```text
B. INVALID WORKFLOW PERMISSION DECLARATION
```

Supporting evidence:

1. `administration: read` is present in the workflow `permissions` block.
2. GitHub’s documented workflow permission list does not include
   `administration`.
3. The workflow fails before any job, check run, or token API call exists.
4. Same-push workflows with `contents: read` only successfully initialize.

This is a primary evidence-backed lead, not a fully proven sole cause. The
native zero-job workflows have different permission blocks and indicate that
the repository also has a separate controller/event anomaly or independent
pre-job failure pattern.

## 24. Root-cause confidence

```text
Invalid workflow permission declaration:  MEDIUM
Exact sole cause of run 35120305466:     MEDIUM-LOW
Shared cause for all three zero-job runs: LOW
```

Confidence is limited because GitHub provides no parser error, no controller
annotation, and no owner-visible diagnostic message through the available API.

## 25. Secondary findings

1. The Step 38 push-trigger remediation itself worked: GitHub created a new
   `push` run on `main` for the exact canonical SHA.
2. The release workflow has never produced a non-zero-job run in its observable
   history.
3. Repository Actions are enabled and all actions are allowed.
4. GitHub-hosted `ubuntu-latest` jobs successfully run in the same repository
   and on the same push.
5. The branch-protection context exactly matches the job display name.
6. The active ruleset targets a different release branch and is not a
   required workflow for `main`.
7. The release workflow does not reference a GitHub Environment.
8. The native zero-job workflows use self-hosted runner labels and required
   manual inputs, which are not properties of release validation.
9. A separate Railway production deployment record exists for the Step 38
   commit; it is unrelated to release-validation job execution.
10. The workflow-level `administration` declaration should not be assumed to
    grant the runtime branch-protection API access required by the audit script.

## 26. Minimum remediation design

No remediation was applied.

The smallest workflow-specific candidate, only after owner confirmation of the
GitHub validation error, is:

```text
File:
  .github/workflows/release-validation.yml

Current property:
  permissions.administration: read

Candidate action:
  remove the unsupported workflow permission key
```

That candidate is not by itself a complete approved fix. The
`audit-required-checks.mjs` step reads branch-protection data, and GitHub’s
branch-protection REST documentation requires Administration read for
fine-grained tokens. Removing the invalid key could make the workflow
schema-valid but expose a later runtime authorization failure.

Therefore the safe remediation design has two gates:

1. Owner UI evidence must confirm the exact invalid-workflow/controller error.
2. A separately authorized design must provide a supported read-capable audit
   mechanism or change the audit boundary without weakening the required check.

No branch-protection, ruleset, Actions policy, secret, runner, or organization
setting should be changed based only on this report.

## 27. Exact files/settings implicated

The only application-controlled configuration implicated by the evidence is:

```text
.github/workflows/release-validation.yml
  top-level permissions.administration: read
```

The GitHub-side settings inspected but not implicated as proven causes are:

```text
Repository Actions enabled state: enabled
Allowed actions: all
Default workflow permissions: read
Main branch required status check: Run release validation suite
Release-branch ruleset: targets a different branch
Repository environments: no protection rules on the listed environment
```

No setting was changed.

## 28. Whether canonical SHA must change

If a future owner-authorized workflow correction is applied, it will create a
new canonical commit and require a new exact-SHA workflow verification.

Step 39 does not authorize or create that commit. The current canonical SHA
remains:

```text
11eb7d0038f2d60b8540cc2f027d2b50c2117b91
```

It remains blocked as a release candidate because the required check did not
execute.

## 29. Whether owner GitHub UI evidence is required

Yes. Owner UI evidence is required because the available API does not expose:

- the workflow parser error, if one exists;
- the controller rejection reason;
- the reason the native dispatch-only workflows received reported push runs;
- an explanation for the zero-job failed check suites.

The UI evidence should confirm whether GitHub displays an invalid workflow
message for the `administration` permission declaration or a separate
repository/controller restriction.

## 30. Exact owner UI inspection instructions

Do not change any setting while collecting evidence.

### 30.1 Exact failed release run

Navigate to:

```text
GitHub repository
→ Actions
→ Release validation
→ Run #2
→ commit 11eb7d0038f2d60b8540cc2f027d2b50c2117b91
```

Also open:

```text
https://github.com/atembekong-hash/Calora/actions/runs/35120305466
```

Capture the exact text from:

- any red banner above the job list;
- the run summary area;
- the workflow-file validation/error panel;
- any “View workflow file” or “Invalid workflow file” message;
- the run event, branch, and commit summary.

The owner should record the full error text, not a paraphrase.

### 30.2 Repository Actions policy

Navigate to:

```text
Repository
→ Settings
→ Actions
→ General
```

Capture, without changing:

- Actions enabled state;
- allowed actions selection;
- reusable workflow policy;
- workflow permissions default;
- pull-request approval policy;
- artifact and log retention values if shown;
- any banner stating organization policy is inherited;
- any warning about invalid workflow files or disabled workflows.

### 30.3 Workflow file and registration

Navigate to:

```text
Repository
→ Actions
→ Release validation
→ View workflow file
```

Confirm that the displayed file is:

```text
.github/workflows/release-validation.yml
```

Capture any syntax or validation warning associated with:

```yaml
permissions:
  administration: read
```

### 30.4 Branch protection

Navigate to:

```text
Repository
→ Settings
→ Branches
→ main branch protection
```

Capture the required status-check text and any required-workflow section
separately. Do not change the check name or protection settings.

### 30.5 Organization policy, if shown

If GitHub identifies an inherited organization policy in the repository Actions
page, capture the organization name and the displayed policy text. Do not
request or make a policy change.

## 31. Application/TestFlight impact

The evidence does not implicate:

```text
Calora application code: no
Production API code:     no
Database schema/data:    no
iOS binary:              no evidence
TestFlight:              no
Expo/EAS:                no
```

The release workflow failed before checkout, dependency installation, tests,
or any application command. The native zero-job observations likewise do not
prove an iOS or Android defect.

The Step 38 push did result in a separate Railway production deployment record
created by `railway-app[bot]`; that provider deployment is not evidence of a
successful release-validation check and was not initiated during Step 39.

## 32. Confirmation no mutations occurred

During Step 39:

```text
Workflow edits:             none
GitHub settings edits:      none
Branch protection edits:    none
Ruleset edits:              none
Secret changes:             none
Variable changes:           none
Runner changes:             none
Remediation commit:         none
Push:                       none
Workflow rerun:             none
Workflow dispatch:          none
EAS:                        none
iOS build:                  none
Android build:              none
TestFlight:                 none
API deployment command:     none
Replit publish:             none
Database mutation:          none
Migration:                  none
```

The only Step 39 workspace output is this local diagnostic report. Existing
local documentation commits and the attached authorization evidence were not
pushed.

## 33. Exact recommendation for Step 40

Do not remediate CI, change the `permissions` block, change branch protection,
change Actions policy, rerun, dispatch, build, or submit anything yet.

Step 40 should begin only after owner-provided GitHub UI evidence is available.
The evidence must identify whether the controller rejected
`administration: read`, whether a different workflow validation error exists,
or whether GitHub reports a repository-level controller restriction.

If the owner UI confirms the unsupported workflow permission key, Step 40 may
request authorization for a narrowly scoped correction plus a supported audit
authentication design. If the UI does not confirm that cause, Step 40 should
not modify the workflow based on this report; it should continue with the
GitHub-side controller investigation.

Before any later native release authorization, the release gate must produce:

1. a non-zero release-validation job count;
2. a check run named exactly `Run release validation suite`;
3. a check-run head SHA equal to the canonical main SHA;
4. completed status with `success` conclusion;
5. executed checkout, required-check audit, pnpm setup, Node setup, dependency
   installation, and release-test steps.

## Final verdict

CONTROLLER ROOT CAUSE PARTIALLY IDENTIFIED — OWNER GITHUB EVIDENCE REQUIRED