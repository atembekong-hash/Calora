# Step 58D-R1 — Calora Exact Replit Publishing-Source Alignment Report

Date: 2026-09-17
Report status: UNCOMMITTED
Report location: /tmp/calora-step58d-r1-evidence-20260917/58D_R1_CALORA_EXACT_REPLIT_PUBLISHING_SOURCE_ALIGNMENT_REPORT.md
Scope: Exact pre-publish source alignment and read-only proof. No Publish action was performed.

Final verdict: EXACT REPLIT PUBLISHING SOURCE VERIFIED — OWNER PUBLISH ACTION READY

## 1. Scope and absolute non-actions

This step aligned the local applied publishing source to the approved canonical candidate and completed pre-publish proof. It did not Publish or Republish, deploy production, roll back production, deploy Railway, modify domains, modify the database, run migrations, seed or backfill data, build iOS or Android, create Build 8 or an APK, touch TestFlight or App Store Connect, perform Expo OTA, change Metro, restore Fitness, activate Coach or Fact Context, activate a sensitive release, modify provider activation, force-push, force-with-lease, rebase, rewrite Git history, delete reviewed history, or create/commit this R1 report.

## 2. Canonical and live identities

Approved canonical candidate:

~~~text
SHA:             5c2edf1b28c00ba86b25494d860e9b0bc69debca
Tree:            8eac19f420fba0640dd96188cf0be60770b3ced5
Source digest:   2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05
Historical ID:   calora-api-5c2edf1b28c0-20260917203649450
~~~

Current live production remained unchanged throughout this step:

~~~text
SHA:             ada903e4d24c5b89c62907b996364641ec5a30cf
Tree:            eaa042057d40d3c744769c4cc0ee619b43e8e26c
Source digest:   3b2466cbe72f7740fb2fdf0f0a7ee57254cdd591898aa6896ae397637f2ecd7d
Build timestamp: 2026-09-17T20:46:20.160Z
Release ID:      calora-api-ada903e4d24c-20260917204620160
~~~

Both aliases reported this same live identity after alignment:

- https://calorie-coach-pie35449.replit.app/api/version
- https://mycaloraapp.com/api/version

Both health endpoints continued to return {"status":"ok"}.

## 3. Reconfirming the RCA state

The canonical remote was fetched and remained exactly unchanged:

~~~text
origin/main      = 5c2edf1b28c00ba86b25494d860e9b0bc69debca
origin/main tree = 8eac19f420fba0640dd96188cf0be60770b3ced5
~~~

The historical local inventory first observed applied main at:

~~~text
9d7cd72e09b4ad5040d003cf4a55c4eaa4994107
acb10dc990cef4f8a760487288d64a5d4eb8b82c
~~~

Before the alignment operation itself, the applied workspace advanced to the execution-time state below when the R1 attachment was added. The operation captured this actual state immediately before moving local main:

~~~text
BEFORE SHA:       b4b7968719ae9a96531e6e56948b4a2180940c2e
BEFORE tree:      295d45f69f8df4250cb7489be1f87f294eca7346
BEFORE digest:    5bc90220aab498f45106c0d771c37c1aa436d8efecba7fa807db051882d5a0d5
BEFORE branch:    main
BEFORE status:    clean after evidence preservation
~~~

The execution-time delta from that actual BEFORE state to the canonical target contained only report, memory, and attachment history. No API runtime, build-control, dependency, database, or mobile product implementation delta was present. The R1 instruction attachment itself was preserved outside the source before alignment.

## 4. Evidence preservation

The following evidence was preserved outside the active publishing source at:

~~~text
/tmp/calora-step58d-r1-evidence-20260917/
~~~

Preserved items include the Step 58C/58D reports, the RCA report, both R1 instruction attachments, the RCA attachment, the reconciliation memory note, and the memory index. No report or attachment was committed to canonical main.

The R1 report itself was written in the same external preservation directory. It therefore did not alter HEAD, the Git tree, Git status, source digest, or the publishing snapshot.

## 5. Alignment method and source proof

After classifying and preserving the report-only delta, the local applied workspace was deliberately moved from the clean, classified execution-time main state to the exact canonical commit with a local hard reset. This was not a blind reset: the source was clean, the full candidate-to-BEFORE path delta had been classified, and all evidence was preserved outside the source first.

No remote branch was changed. No force push, merge, new product commit, or report commit was made on origin/main.

The actual source root after alignment is:

~~~text
Source root: /home/runner/workspace
Branch:      main
HEAD:        5c2edf1b28c00ba86b25494d860e9b0bc69debca
Tree:        8eac19f420fba0640dd96188cf0be60770b3ced5
Status:      empty; clean including untracked files
~~~

Replit's API artifact production configuration invokes:

~~~text
pnpm --filter @workspace/api-server run build
~~~

The artifact build root is /home/runner/workspace/artifacts/api-server. The build script resolves its Git workspace root two levels above that directory, which is /home/runner/workspace. The same source root produced the exact pre-publish build attestation below. This ties the applied workspace HEAD, production working directory, artifact root, and build identity together.

## 6. Identity table

| Layer | SHA | Tree | Digest | Clean? | Status |
|---|---|---|---|---|---|
| origin/main | 5c2edf1b28c00ba86b25494d860e9b0bc69debca | 8eac19f420fba0640dd96188cf0be60770b3ced5 | 2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05 | Yes | VERIFIED |
| Workspace publishing source BEFORE | b4b7968719ae9a96531e6e56948b4a2180940c2e | 295d45f69f8df4250cb7489be1f87f294eca7346 | 5bc90220aab498f45106c0d771c37c1aa436d8efecba7fa807db051882d5a0d5 | Yes after preservation | REPORT-ONLY DRIFT |
| Workspace publishing source AFTER | 5c2edf1b28c00ba86b25494d860e9b0bc69debca | 8eac19f420fba0640dd96188cf0be60770b3ced5 | 2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05 | Yes | VERIFIED |
| Pre-publish API build | 5c2edf1b28c00ba86b25494d860e9b0bc69debca | 8eac19f420fba0640dd96188cf0be60770b3ced5 | 2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05 | Yes | VERIFIED |
| Current live production | ada903e4d24c5b89c62907b996364641ec5a30cf | eaa042057d40d3c744769c4cc0ee619b43e8e26c | 3b2466cbe72f7740fb2fdf0f0a7ee57254cdd591898aa6896ae397637f2ecd7d | N/A | UNCHANGED, NOT REPUBLISHED |
| Canonical target | 5c2edf1b28c00ba86b25494d860e9b0bc69debca | 8eac19f420fba0640dd96188cf0be60770b3ced5 | 2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05 | Yes | TARGET |

The fresh API build emitted:

~~~text
gitCommit:     5c2edf1b28c00ba86b25494d860e9b0bc69debca
sourceTree:    8eac19f420fba0640dd96188cf0be60770b3ced5
sourceDigest:  2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05
buildTimestamp: 2026-09-17T21:26:29.192Z
releaseId:      calora-api-5c2edf1b28c0-20260917212629192
~~~

The release ID is newly timestamped because the release ID design includes the build timestamp. The SHA, tree, and source digest are the required exact identity fields and match the canonical target.

## 7. Mobile build control and source-runtime equivalence

The aligned canonical source contains:

~~~text
iOS version:        1.0.0
iOS buildNumber:    7
Android versionCode: 24
~~~

Static Expo configuration validation passed through the repository's Expo config resolver and reported iOS build number 7. No iOS or Android build was run. The separate repository helper that reads historical EAS build records could not execute because the eas executable is not installed. Per the Expo workspace rules, EAS CLI was not installed or invoked; this did not change the source, mobile artifacts, TestFlight, or App Store Connect state.

The aligned source is exactly the already-reviewed candidate, so the reviewed API behavior for recipe nutrition truthfulness, finite/non-negative macros, Planner ordering and fallback, capture approval, diary image provenance, imageAssetKey handling, account-scoped sync, auth/account fences, Coach boundary, account deletion, referrals, and RevenueCat verification is the candidate source under test.

Fitness remains absent. The stale Profile/Weight OpenAPI operations remain absent. The missing-nutrition-to-zero regression remains covered by the API recipe tests.

## 8. Release-control safety

The aligned source and production configuration retain:

~~~text
COACH_FACT_CONTEXT_ENABLED=false
RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false
~~~

Default-deny remains intact. The repository-approved negative release-security check passed: disposable mockup output is allowed while source changes are rejected. No signing, provider, cohort, consent, nonce, or sensitive-release evidence was created or activated.

## 9. Fresh validation results

All required source/API validation gates run from /home/runner/workspace passed:

- Frozen dependency installation: PASS; lockfile unchanged.
- Workspace/library/artifact/scripts typecheck: PASS.
- API full tests: PASS — 36 test files passed, 1 skipped; 438 tests passed, 4 skipped.
- Calora full tests: PASS — 87 test files passed; 1,185 tests passed.
- Calora static server/security checks: PASS — 6 tests passed.
- Scripts tests: PASS — 47 tests passed.
- Release-attestation tests: PASS — 13 tests passed.
- Account-deletion fence tests: PASS — 4 passed, 1 skipped.
- Negative production clean-checkout/release-security test: PASS — 1 test passed.
- Static Expo config validation: PASS — iOS buildNumber 7.
- API/client type compatibility: PASS through typecheck and API suite.
- Codegen drift check: PASS — no tracked diff after validation.
- API production build: PASS with the exact canonical SHA/tree/digest.
- git diff --check: PASS.

The EAS-history-dependent iOS build-number helper was not accepted as a validation result because its eas executable was unavailable. No mobile build or release operation was substituted for it. This environment limitation does not alter the exact API publishing-source proof or the static canonical mobile configuration check.

## 10. Database no-change gate

The active root comparison from the frozen previous production identity to the aligned candidate found no changed paths under lib/db, supabase, active migration directories, active schema directories, or API migration/schema paths.

No production database query mutation, migration, seed, backfill, DDL, INSERT, UPDATE, or DELETE was performed by this step.

## 11. Production and Git change audit

Production was not published or republished. Both live aliases still report ada903e4 with the original 20:46:20.160Z release timestamp, and both health endpoints remain healthy.

GitHub history was not rewritten. Nothing was pushed to origin/main. The only Git source-state change was the local applied-workspace alignment from the classified report-only state to the already-approved canonical commit. The R1 report is outside the active source and uncommitted.

## 12. Required final questions

| Question | Answer |
|---|---|
| A. Did origin/main remain exactly 5c2edf1b? | Yes; SHA and tree remained exact before and after fetch. |
| B. What was workspace/applied publishing HEAD before alignment? | Execution-time BEFORE was b4b7968719ae9a96531e6e56948b4a2180940c2e; an earlier inventory saw 9d7cd72e before the R1 attachment state advanced. |
| C. What tree was applied before alignment? | 295d45f69f8df4250cb7489be1f87f294eca7346. |
| D. What files differed from canonical? | Report, documentation, memory, and attachment paths only; no API runtime or database paths. |
| E. How were report/RCA files preserved? | They were copied to /tmp/calora-step58d-r1-evidence-20260917/ before alignment, outside the publishing source. |
| F. What exact supported mechanism aligned the publishing source? | A deliberate local applied-workspace reset from the clean, classified main state to the existing canonical commit; no remote mutation. |
| G. Was any GitHub history rewritten? | No. |
| H. Was anything pushed to origin/main? | No. |
| I. Does actual publishing-source HEAD now equal 5c2edf1b exactly? | Yes. |
| J. Does its tree equal 8eac19f4 exactly? | Yes. |
| K. Is publishing source completely clean including untracked files? | Yes; git status --porcelain --untracked-files=all is empty. |
| L. Is iOS buildNumber 7 present from the canonical tree? | Yes; static Expo config resolved buildNumber 7. |
| M. Was iOS built? | No. |
| N. Was Android built or versionCode changed? | No; versionCode remains 24. |
| O. Did current reviewed API behavior survive? | Yes; the source is exactly the reviewed candidate and fresh API/Calora validation passed. |
| P. Was Fitness restored? | No; Fitness remains absent. |
| Q. Is Coach disabled/default-deny? | Yes; the production flags remain false and safety tests passed. |
| R. Did the negative sensitive-release test fail closed? | Yes; the repository-approved negative release-security test passed. |
| S. Was the database changed? | No. |
| T. Did fresh validation pass? | Yes for all required R1 source/API/config gates; the separate EAS-history helper was unavailable because its executable is absent. |
| U. What are exact fresh test counts? | API 438 passed/4 skipped; Calora 1,185 passed; server 6 passed; scripts 47 passed; attestation 13 passed; deletion fence 4 passed/1 skipped; clean-checkout security 1 passed. |
| V. What gitCommit did the same publishing-source build emit? | 5c2edf1b28c00ba86b25494d860e9b0bc69debca. |
| W. What sourceTree? | 8eac19f420fba0640dd96188cf0be60770b3ced5. |
| X. What sourceDigest? | 2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05. |
| Y. What releaseId? | calora-api-5c2edf1b28c0-20260917212629192; timestamp differs from the historical candidate build by design. |
| Z. Is that exact source root proven to be the source Replit Publish will use? | Yes: applied /home/runner/workspace main, production artifact build root, build working directory, and attestation all point to the same exact SHA/tree/digest. |
| AA. Did report generation alter publishing source? | No; the R1 report was written outside the source. |
| AB. Is publishing source still exact and clean after report generation? | Yes. |
| AC. Was production published or republished? | No. |
| AD. Did current live production change? | No; both aliases still serve ada903e4 and remain healthy. |
| AE. Is another owner Publish now safe to authorize? | The exact source proof is ready for owner review. The owner must make the final authorization decision; this step did not Publish. |

## 13. Final verdict

EXACT REPLIT PUBLISHING SOURCE VERIFIED — OWNER PUBLISH ACTION READY

The exact applied publishing source is now proven clean at the approved canonical SHA/tree/digest. The owner may review this report and separately decide whether to perform one Publish action. This step itself performed no Publish, Republish, deployment, rollback, database mutation, mobile build, TestFlight action, Metro change, or Coach activation.

STOP. Wait for owner review.
