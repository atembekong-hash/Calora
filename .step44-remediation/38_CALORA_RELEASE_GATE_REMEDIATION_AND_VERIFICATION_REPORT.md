# Calora Step 38 Release Gate Remediation and Verification Report

Date: 2026-09-16  
Scope: Minimum release-validation workflow remediation and automatic gate
verification

## 1. Executive summary

Step 37 identified a proven relationship mismatch: `main` required the check
`Run release validation suite`, while the canonical release-validation workflow
did not declare a `push` trigger for `main`.

Step 38 applied exactly the authorized minimum workflow change:

```yaml
on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:
```

All existing workflow names, job identifiers, permissions, actions, commands,
and validation steps were preserved. The workflow-only change passed local
validation, the scripts suite, full typecheck, formatting, and diff checks.

The remediation was committed and pushed normally. GitHub automatically
created a `push` release-validation run for the new canonical SHA, proving the
new trigger was recognized. However, GitHub again completed that run with zero
jobs, zero check runs, and no logs. The exact required check still did not
execute.

Per the Step 38 stop condition, no second speculative workflow change was made.

## 2. Step 37 root-cause basis

Step 37 established:

- `main` branch protection requires `Run release validation suite`;
- the canonical job display name is exactly `Run release validation suite`;
- the canonical workflow previously had only `pull_request` and
  `workflow_dispatch`;
- no `push` trigger for `main` existed;
- the prior failed run had zero jobs, zero check runs, no logs, and no
  annotations;
- the local release-validation test suite passed with 47 tests and 0 failures.

Step 38 reconfirmed the first four conditions before editing.

## 3. Starting origin/main SHA/tree

Immediately before the authorized edit:

```text
origin/main SHA:  8d93248db69e985ba490a957575bde2b7b38cbf3
origin/main TREE: 0a0ac2b83abce082bbc870c58029376cc4541a4a
```

The remote had not advanced from the Step 37 canonical identity.

## 4. Starting local main SHA/tree

Immediately before the authorized edit:

```text
local main SHA:   2d507655499f8d05cd8bf155f942c1dcab30430b
local main TREE:  3c02726ea74664efa808047bc69ef6b106790408
ahead/behind:     6 / 0
working tree:     clean
```

## 5. Local-only commit classification

The six local-only commits before the remediation were documentation or
attached-evidence commits only:

```text
45496e1  Document final canonical main GitHub push
c5f2ccf  Add Calora step 36 canonical release testflight documentation
465d6b8  Add Calora canonical testflight build report
fc26b31  Document Calora step 37 release gate failure root cause
3eb3cbc  Add Calora GitHub release gate failure root cause report
2d50765  Add remediation and verification documentation for CALORA step 38
```

They were not runtime, application, database, native, deployment, or
branch-protection changes. They were preserved and classified rather than
reset or rewritten.

## 6. Branch-protection required-context verification

The GitHub branch-protection API returned HTTP 200 immediately before editing:

```text
Required context: Run release validation suite
Required app ID:  null
Strict policy:    false
```

The required context was unchanged and matched the existing job display name
exactly. No branch-protection setting was edited.

## 7. Original workflow trigger verification

Immediately before editing, the canonical workflow contained:

```yaml
on:
  pull_request:
  workflow_dispatch:
```

It did not contain:

```yaml
push:
  branches:
    - main
```

The workflow still contained:

```text
name: Release validation
job ID: release-validation
job display name: Run release validation suite
runner: ubuntu-latest
timeout: 15 minutes
permissions: contents: read; administration: read
```

## 8. Exact workflow remediation

Only `.github/workflows/release-validation.yml` was modified.

The exact change was three inserted lines:

```diff
 on:
+  push:
+    branches:
+      - main
   pull_request:
   workflow_dispatch:
```

No existing line was removed or reformatted. The required check name was not
renamed.

## 9. Complete workflow diff

The complete remediation diff was:

```diff
diff --git a/.github/workflows/release-validation.yml b/.github/workflows/release-validation.yml
index 6f9c5e3..20aaf7e 100644
--- a/.github/workflows/release-validation.yml
+++ b/.github/workflows/release-validation.yml
@@ -1,6 +1,9 @@
 name: Release validation

 on:
+  push:
+    branches:
+      - main
   pull_request:
   workflow_dispatch:
```

The pre-commit changed-path audit reported only:

```text
M .github/workflows/release-validation.yml
```

No unexpected runtime, API, database, native, Expo, EAS, or production
configuration path changed.

## 10. Static workflow validation

The modified workflow passed:

```text
YAML parsing:       passed
Prettier check:     passed
GitHub structure:   locally parseable and structurally preserved
Workflow name:      unchanged
Job ID:             unchanged
Job display name:   unchanged
Push scope:         main only
Pull request:       preserved
Manual dispatch:    preserved
Permissions:        preserved
Validation steps:   preserved
New secrets/vars:   none
Unrelated workflow: none
```

## 11. Local scripts-test result

```text
Command:
  pnpm --filter @workspace/scripts test

Result:
  47 tests passed
  0 failed
  0 skipped
```

## 12. Typecheck result

```text
Command:
  pnpm run typecheck

Result:
  passed
```

The workspace libraries, API server, Calora, FatSecret gateway, mockup
sandbox, and scripts typechecks completed successfully.

## 13. `git diff --check` result

```text
Result: passed
```

Prettier and `git diff --check` were both clean before commit.

## 14. Remediation commit SHA/tree

The workflow remediation commit was:

```text
Subject: Fix main release validation trigger
SHA:     11eb7d0038f2d60b8540cc2f027d2b50c2117b91
TREE:    d3c230005c043874b9e245b70cd4b23f70af8105
```

The commit changed only:

```text
.github/workflows/release-validation.yml
```

## 15. Pre-push origin/main verification

Immediately before the normal push:

```text
origin/main SHA:  8d93248db69e985ba490a957575bde2b7b38cbf3
origin/main TREE: 0a0ac2b83abce082bbc870c58029376cc4541a4a

candidate SHA:    11eb7d0038f2d60b8540cc2f027d2b50c2117b91
candidate TREE:   d3c230005c043874b9e245b70cd4b23f70af8105

origin advanced:  no
origin ancestor:  yes
ahead:            7
behind:           0
working tree:     clean
```

The seven commits included in the push were the six pre-existing
documentation/evidence commits plus the one workflow-remediation commit. No
runtime or application changes were included.

## 16. Exact push command/method

The push used the authorized normal command:

```text
git push origin main
```

No force option, rebase, reset, history rewrite, historical branch push, or
manual workflow dispatch was used.

## 17. Push result

GitHub accepted the normal push:

```text
8d93248..11eb7d0  main -> main
```

The remote push response still reported the required check as expected at push
time. The automatic workflow observation, not the push response, was used for
the final gate result.

## 18. New canonical GitHub SHA/tree

After the push and a fresh fetch:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
```

This new SHA supersedes `8d93248db69e985ba490a957575bde2b7b38cbf3` as the
current canonical main tip, but it is not a successful release candidate.

## 19. Automatically created release-validation run ID

GitHub automatically created:

```text
Workflow:       .github/workflows/release-validation.yml
Workflow ID:    359784386
Run ID:         35120305466
Run number:     2
Run attempt:    1
Run URL:        https://github.com/atembekong-hash/Calora/actions/runs/35120305466
```

## 20. Workflow event/branch/head-SHA verification

The automatic run metadata was:

```text
Event:       push
Branch:      main
Head SHA:    11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Created:     2026-09-16T16:11:36Z
Run started: 2026-09-16T16:11:36Z
Updated:     2026-09-16T16:11:36Z
Status:      completed
Conclusion:  failure
Check suite: 95111026936
```

This proves the new `push` trigger was recognized and the run was associated
with the exact new canonical SHA.

## 21. Job count

For run `35120305466`:

```text
Jobs endpoint:          HTTP 200
Job count:              0
Attempt job count:      0
Billable runner data:   none
```

The workflow still failed before a runner job was created.

## 22. Required check-run identity

The commit check-run query returned four unrelated check runs, but none named:

```text
Run release validation suite
```

The release-validation check suite was:

```text
Check suite ID:       95111026936
App:                  GitHub Actions
Head SHA:             11eb7d0038f2d60b8540cc2f027d2b50c2117b91
Status:               completed
Conclusion:           failure
Latest check count:   0
```

The required check-run identity therefore does not exist for the new SHA.

## 23. Required check execution result

Required check:

```text
Run release validation suite
```

Result:

```text
NOT EXECUTED
```

The workflow was automatically created for `push` on `main`, but it still
failed before creating a job or check run.

## 24. Per-step GitHub Actions results

No GitHub job was created, so no step reached execution:

```text
Check out source:                  not executed
Audit required branch checks:      not executed
Set up pnpm:                       not executed
Set up Node.js:                    not executed
Install dependencies:              not executed
Run release validation suite:      not executed
```

The workflow-run logs endpoint returned HTTP 404 `Not Found`. No runner log,
step log, annotation, or first failing shell command was available.

## 25. Required-check audit result

The GitHub Actions audit step:

```text
node scripts/audit-required-checks.mjs
```

was not reached because the job did not initialize. Consequently, the
`administration: read` token permission was not exercised and cannot be
classified as the cause of this failure.

The local equivalent release-validation test suite passed, but local success
does not substitute for the missing GitHub check run.

## 26. Other automatically triggered workflow observations

The same push also produced these separate observations:

```text
Native auth preflight:
  Run ID: 35120303752
  Result: completed/failure
  Jobs/checks: same zero-job pre-run pattern observed

Native encrypted recovery:
  Run ID: 35120304682
  Result: completed/failure
  Jobs/checks: same zero-job pre-run pattern observed

Account-deletion fence validation:
  Run ID: 35120306501
  Observation: in progress during the first post-push query

Native association monitoring:
  Run ID: 35120313283
  Observation: in progress during the first post-push query
```

The native workflows were not modified or investigated further. They are not
required to complete the release-validation check.

The commit status also showed an automatic Railway deployment status as
pending. No deployment command or Replit production publish was run by this
task, and no production deployment result is claimed.

## 27. Application/runtime invariants

The remediation diff was limited to the GitHub workflow. It did not alter:

- durable capture acceptance;
- Weekly Programs deterministic modal state;
- shared Planner Program pools or eligibility;
- bounded Coach lifecycle;
- Coach Fact Context two-key restriction;
- diary image provenance or `imageAssetKey` synchronization;
- capture compatibility;
- recipe `nextOffset`;
- recipe `terminalReason`;
- authentication or PKCE;
- account isolation;
- deletion fences;
- sync ownership;
- API contracts;
- Expo Router;
- EAS configuration;
- Apple Health privacy strings;
- TestFlight configuration.

No application/runtime source diff was present.

## 28. Database/migration confirmation

```text
Database changes: none
Migrations:       none
Schema changes:   none
drizzle-kit push: not run
```

## 29. Confirmation no EAS/mobile build/TestFlight/deployment occurred

The following were not initiated:

```text
EAS build:                    no
iOS build:                    no
Android build:                no
TestFlight submission:        no
App Store submission:          no
API deployment command:       no
Replit production publish:    no
Database mutation:            no
Migration:                    no
```

GitHub did report a pending automatic Railway deployment status after the
normal main push. That status was not initiated through a deployment command by
Step 38 and was not treated as a successful production deployment.

## 30. Post-push local/origin ahead-behind verification

After the final fetch:

```text
local main SHA:   11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91

local tree:       d3c230005c043874b9e245b70cd4b23f70af8105
origin tree:      d3c230005c043874b9e245b70cd4b23f70af8105

ahead:            0
behind:           0
```

## 31. Working-tree cleanliness

```text
Status: clean
git diff --check: passed
```

Local `main` and `origin/main` are synchronized at the new canonical SHA.

## 32. Remaining uncertainties

The workflow trigger remediation is proven effective because GitHub created an
automatic push run on `main` for the exact new SHA.

The remaining unresolved issue is the GitHub controller behavior that marks
the run failed before job initialization:

- no job was created;
- no check run was created;
- no log archive exists;
- no annotation exists;
- no step or token error is exposed.

The `administration: read` permission was not exercised, so it cannot be
identified as the cause. No second speculative workflow change is authorized
or recommended in this step.

## 33. Exact recommendation for Step 39

Do not build, submit TestFlight, modify application code, or make another
workflow change based on this result.

Step 39 should obtain owner authorization for a separate GitHub Actions
controller investigation. That investigation should use GitHub’s repository
workflow validation, Actions configuration, ruleset/required-workflow, and
repository-level diagnostics to determine why a valid push-triggered workflow
still terminates with zero jobs.

The next release attempt must require all of the following before any native
build authorization is considered:

1. a non-zero release-validation job count;
2. a check run named exactly `Run release validation suite`;
3. the check run’s head SHA equal to the canonical main SHA;
4. completed status and `success` conclusion;
5. evidence that checkout, required-check audit, pnpm setup, Node setup,
   dependency installation, and the final test step all executed.

## Final verdict

RELEASE GATE REMEDIATION INCOMPLETE — CONTROLLER FAILURE PERSISTS