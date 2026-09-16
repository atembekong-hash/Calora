# Calora Step 36 Canonical Main TestFlight Build Report

Date: 2026-09-16  
Scope: Step 36 release-gate verification only

## 1. Executive summary

Step 36 stopped before any native build because the required GitHub release
validation gate was not verified as successful for the exact canonical SHA.

The canonical GitHub commit was confirmed as:

```text
SHA:  8d93248db69e985ba490a957575bde2b7b38cbf3
TREE: 0a0ac2b83abce082bbc870c58029376cc4541a4a
```

GitHub reported a completed failure for the push-triggered
`.github/workflows/release-validation.yml` run on that SHA. The required check
`Run release validation suite` was not present in the commit check-run response,
so its required successful result could not be proven.

Per the Step 36 authorization, no iOS build, Android build, TestFlight
submission, API deployment, Replit production publish, database change,
migration, branch reconciliation, source-code change, force push, or history
rewrite was performed.

## 2. Final verdict

**CANONICAL RELEASE GATE NOT VERIFIED — TESTFLIGHT BUILD NOT STARTED**

## 3. Canonical GitHub main SHA/tree

The exact authorized canonical GitHub `main` identity is:

```text
Repository: atembekong-hash/Calora
Branch:     main
SHA:        8d93248db69e985ba490a957575bde2b7b38cbf3
TREE:       0a0ac2b83abce082bbc870c58029376cc4541a4a
```

`origin/main` was verified locally at that exact SHA and tree.

## 4. Local/origin synchronization verification

The canonical remote remained at the authorized SHA. The local branch was not
identical to `origin/main` at the time of Step 36 verification because it
contained two local documentation-only commits:

```text
origin/main SHA:  8d93248db69e985ba490a957575bde2b7b38cbf3
origin/main TREE: 0a0ac2b83abce082bbc870c58029376cc4541a4a

local main SHA:   c5f2ccf67e5c5330b286ac6611977e2b7c2ae448
local main TREE:  858558b315ba7dc8ce016509fd9f9de38cb2dab3

ahead/behind:     2 / 0
```

The two local commits were documentation-only:

```text
45496e1 Document final canonical main GitHub push
c5f2ccf Add Calora step 36 canonical release testflight documentation
```

The unpushed local commits did not change the canonical remote source tree.
The working tree was clean before this report was created. No branch
reconciliation or reset was performed.

Because the release gate failed before the build stage, the local documentation
commits did not become a build source and no native build was attempted.

## 5. GitHub release-validation workflow result

The configured workflow is:

```text
Workflow file: .github/workflows/release-validation.yml
Workflow name: Release validation
Run ID:        35117499286
Event:         push
Branch:        main
Commit SHA:    8d93248db69e985ba490a957575bde2b7b38cbf3
Run URL:       https://github.com/atembekong-hash/Calora/actions/runs/35117499286
Started:       2026-09-16T15:45:39Z
Updated:       2026-09-16T15:45:39Z
Status:        completed
Conclusion:    failure
```

GitHub returned no completed-time field for this failed workflow run; the
record was already `completed` when queried.

The workflow declares the job and required check name:

```text
Job name: Run release validation suite
Step name: Run release validation suite
```

However, the GitHub commit check-run response for the exact SHA contained no
check run named `Run release validation suite`. The workflow-run jobs response
also returned no jobs or steps for run `35117499286`. Therefore, no successful
required check result can be asserted.

Other exact-SHA workflow activity observed during the gate query included:

```text
Account-deletion fence validation: success
Native encrypted recovery workflow: failure
Native auth preflight workflow: failure
Monitor native association files: completed; its observed jobs were success
  or skipped
```

The commit’s combined GitHub status was `failure`. The observed failing
deployment contexts were separate Railway deployment statuses; they do not
convert the release-validation result into a success.

## 6. Required status-check result

Required check:

```text
Run release validation suite
```

Result:

```text
NOT VERIFIED
```

Reason:

1. The exact required check was absent from the commit check-run response.
2. The exact push-triggered release-validation workflow run
   `35117499286` concluded `failure`.
3. The workflow jobs endpoint returned no successful job or step that could
   prove the required check passed.

This satisfies the Step 36 stop condition. The check was not bypassed and no
build was started.

## 7. Pre-build validation results

The Step 36 pre-build validation mission was not entered because the required
GitHub gate failed. No new Step 36 validation suite was run.

The earlier Step 35 report recorded passing validation for the same canonical
runtime tree, including typecheck, API tests, Calora tests, release-attestation,
Expo/EAS configuration, Apple Health privacy configuration, generated contract
compatibility, `git diff --check`, and lockfile checks. Those earlier results do
not replace the required GitHub status check for Step 36.

## 8. Exact build source identity

No build source was selected or submitted to Expo Launch.

The only authorized source identity remains:

```text
SHA:   8d93248db69e985ba490a957575bde2b7b38cbf3
TREE:  0a0ac2b83abce082bbc870c58029376cc4541a4a
Branch: main
```

The local documentation-only commits were not used as a native build source.

## 9. Expo/EAS project identity

The canonical source configuration records:

```text
Project:       Calora
Directory:     artifacts/calora
Expo owner:    vvault07
Expo project:  1f202325-5b9a-4260-978f-abbd3252b9ee
```

No second Expo project was created.

## 10. iOS bundle identifier

```text
com.etiendem.caloraapp
```

## 11. Marketing version

The canonical app configuration records marketing version:

```text
1.0.0
```

No versioning change was made.

## 12. iOS build number

No Step 36 iOS build number was allocated because the release gate did not
pass.

The previous known TestFlight build was `1.0.0 (2)`. Build number `2` was not
reused.

## 13. EAS build ID

```text
Not created — build not started.
```

## 14. EAS build result

```text
Not applicable — Expo Launch was not triggered.
```

No EAS CLI command was run.

## 15. EAS Git SHA verification

```text
Not applicable — no EAS build record exists.
```

No binary was accepted as a canonical build because no binary was produced.

## 16. TestFlight submission ID

```text
None — submission not started.
```

## 17. Submitted EAS build ID

```text
None.
```

There is no submitted build to identify.

## 18. App Store Connect submission result

```text
Not performed — release gate not verified.
```

App Store Connect/TestFlight was not contacted by Step 36.

## 19. TestFlight processing/testing state

No new build was uploaded. There is no Step 36 processing or testing state to
report, and no physical-device success is claimed.

## 20. Weekly Programs fix presence in source

No new source verification was run after the gate failure, as required by the
conditional Step 36 mission order.

The earlier Step 35 verification at the exact canonical SHA recorded that the
deterministic Weekly Programs modal-state transition was present. The canonical
remote tree was not changed during Step 36.

## 21. Coach/capture/planner/diary reconciliation verification

No new source verification was run after the gate failure. The earlier Step 35
report recorded the following functionality at the same canonical runtime tree:

- durable capture acceptance sequencing and persistence;
- shared Planner Program pools and typed eligibility;
- bounded Coach timeout, cancellation, malformed-response, and stale-request
  handling;
- Coach Fact Context limited to `daily.calorie_status` and
  `daily.protein_status`;
- diary image provenance and `imageAssetKey` synchronization;
- capture compatibility assertion;
- capture approval security;
- recipe `nextOffset` and `terminalReason`;
- PKCE/authentication;
- account isolation;
- deletion fences;
- sync ownership;
- release validation and attestation behavior.

These prior source results do not authorize bypassing the missing/failed
current release gate.

## 22. Production API confirmation

The production API was not deployed or published by Step 36.

```text
Production API: untouched
Replit production publish: not performed
```

## 23. Database and migration confirmation

```text
Database changes: none
Migrations:       none
Schema changes:   none
```

No database or migration command was run.

## 24. Android confirmation

```text
Android build: not performed
```

No APK or AAB was created.

## 25. Remaining device-verification requirements

No Step 36 binary is available for device verification. If a later authorized
release reaches TestFlight, the owner must still verify behavior on a physical
iOS device. Submission success and device behavior are separate claims.

## 26. Exact instructions for owner physical iOS test

After a later authorized build becomes available in TestFlight:

1. Update or install the new Calora TestFlight build.
2. Confirm the displayed build number is the newly submitted build.
3. Open Calora.
4. Open **Plan**.
5. Tap the gear icon.
6. Open **Weekly Programs**.
7. Tap one of the programs.
8. Confirm the selected Program detail opens immediately.
9. Close or go back and confirm there is no stuck overlay.
10. Select another Program and confirm its detail opens.
11. Tap **Apply** and confirm the Program applies and the modal closes normally.
12. Repeat the selection and apply flow once more to check for intermittent
    touch failure.
13. Smoke test Home, Recipes, Smart Scan, Coach, Diary/Profile, and
    authentication/session persistence.

## 27. Exact recommendation for next step

Investigate GitHub Actions run `35117499286` and the missing required check
`Run release validation suite` for SHA
`8d93248db69e985ba490a957575bde2b7b38cbf3`. Do not start the iOS build based
on the failed workflow or on the earlier local validation results.

Only after GitHub shows a completed successful required check for that exact
SHA should an owner-authorized Step 36 continuation re-evaluate the canonical
source synchronization and use the supported Expo Launch iOS publishing flow.

## Final verdict

CANONICAL RELEASE GATE NOT VERIFIED — TESTFLIGHT BUILD NOT STARTED