# Calora — Step 58C Controlled Canonical Main Divergence Reconciliation Report

**Date:** 2026-09-17  
**Scope:** Git-only canonical-main reconciliation.  
**Production deployment:** Not attempted.  
**Mobile/database/Metro changes:** None.  
**Final verdict:** **CANONICAL RECONCILIATION BLOCKED — BRANCH TIPS CHANGED**

## 1. Executive summary

Step 58C was required to reconcile local `main` with the verified remote
Build 7 lineage without force-pushing, rewriting history, or discarding either
legitimate history.

The runbook's branch-tip freeze did not pass. The authoritative local tip from
Step 58B was:

```text
30a56d240b5159094e1032571b10e13fb2ab7296
```

Before any Step 58C branch or merge operation, the workspace local tip was:

```text
b872cbf83ba4b35abef63475e300ba15c710d13e
```

The remote tip remained the expected:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

The local movement consists of report/attachment history:

- `20adb4f227e28609a0e87c71c9a516e37be4c99c` added the attached Step 58B
  runbook;
- `b872cbf83ba4b35abef63475e300ba15c710d13e` added the Step 58B report.

Those commits were not created by a Step 58C merge, but the runbook explicitly
requires stopping whenever either frozen branch tip changes unexpectedly.
Therefore no reconciliation branch was created, no merge was started, no
conflict was resolved, and no push was attempted.

## 2. Starting branch identities

The Step 58C-authoritative identities were:

| Branch/state | SHA | Tree | Status |
|---|---|---|---|
| Step 58B local `main` | `30a56d240b5159094e1032571b10e13fb2ab7296` | `ebbe0c93b69e7cca2da7e7480055d36c97d9db3d` | Required frozen local tip |
| Step 58B `origin/main` | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | `f4c820017b82c48052571eb432806b3185aabcfb` | Required frozen remote tip |

The observed identities at the Step 58C freeze were:

| Branch/state | SHA | Tree | Source digest |
|---|---|---|---|
| Current local `main` | `b872cbf83ba4b35abef63475e300ba15c710d13e` | `ed2cea0a53b227318dbb806972f04aee24b16534` | `54d63cbf37839cbab576114a8b852e59646070a5b9b4c02445bb27cb586c3916` |
| Current `origin/main` | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | `f4c820017b82c48052571eb432806b3185aabcfb` | Not needed for the stop |

## 3. Divergence proof

The current branch remains divergent:

```text
merge base:       755b433240c262487a6d77472c4f7dafaba2615a
local-only:       51 commits
remote-only:      2 commits
```

The remote-only commits remain:

```text
5f69c31e4816abcfa5fff69389e4699fd4f1428f  Prepare iOS build 6 release candidate
dec8f0d6a9531cb5a2eb73c01706dc75354e743c  Prepare iOS build 7 provenance-controlled candidate
```

Neither side is an ancestor of the other. This proof was not used to justify a
merge because the required branch-tip freeze had already failed.

## 4. Merge-base analysis

The authoritative and current comparisons share merge base:

```text
755b433240c262487a6d77472c4f7dafaba2615a
```

The remote Build 6/7 lineage remains reachable from `origin/main`. The local
Step 58A/API history remains reachable from the current local tip. No reset,
rebase, force operation, or branch replacement was performed.

## 5. Remote-only commit audit

The two remote-only commits were identified but not changed:

| Commit | Subject | Required preservation |
|---|---|---|
| `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | Prepare iOS build 6 release candidate | Preserve its reviewed release lineage |
| `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | Prepare iOS build 7 provenance-controlled candidate | Preserve the distributed Build 7 provenance lineage |

No Build 7 rebuild, TestFlight action, `app.json` edit, EAS action, or mobile
release action was performed.

## 6. Local-only commit classification

At the authoritative Step 58B freeze, local `main` had 50 local-only commits.
The observed local tip now has 51 local-only commits because the two report/
attachment commits were added after that freeze.

The relevant history is:

| Commit/group | Classification |
|---|---|
| Earlier Calora onboarding, recipe, nutrition, Planner, capture, sync, auth, and release work | Reviewed product/API and release history |
| `2a5cbd6228edc7c4b6b518f43d4b92fba1347a03` | Step 58A RELEASE_CONTROL remediation |
| `f67ee229f9ba8052ab18f05a99edb1c1bf53da63` | Documentation/attachment |
| `30a56d240b5159094e1032571b10e13fb2ab7296` | Step 58A report documentation |
| `20adb4f227e28609a0e87c71c9a516e37be4c99c` | Attached Step 58B runbook |
| `b872cbf83ba4b35abef63475e300ba15c710d13e` | Step 58B report documentation |
| `.step55-release/**` | HISTORICAL_SNAPSHOT |

No local-only commit was merged or discarded during Step 58C.

## 7. Three-way path inventory

The complete three-way path audit was not authorized because Section 3 failed.
The known tip movement after Step 58B is limited to:

```text
A 58B_CALORA_CANONICAL_API_RELEASE_IDENTITY_RECONCILIATION_AND_PRODUCTION_PROMOTION_REPORT.md
A attached_assets/Pasted-STEP-58B-CALORA-CANONICAL-API-RELEASE-IDENTITY-RECONCIL_1789673425966.txt
```

These are REPORT/DOCUMENTATION and ATTACHMENT paths. They are not API product,
shared-contract, database, mobile product, or release-control runtime paths.

## 8. Semantic conflict inventory

No merge was started, so no Git conflict or semantic conflict was resolved.
The following potential conflict classes remain unreviewed:

- remote Build 7 mobile/release metadata versus local mobile history;
- report and attachment path overlap;
- historical snapshot paths;
- any path modified on both sides outside the known tip movement.

No global `ours`/`theirs` resolution was used.

## 9. Reconciliation strategy

The intended safe strategy remains:

1. freeze unchanged branch tips;
2. audit the merge-base-to-local and merge-base-to-remote deltas;
3. create an isolated branch from current `origin/main`;
4. merge local reviewed history with `--no-ff`, without an automatic commit;
5. inspect and resolve conflicts by path and provenance;
6. run the semantic preservation audit;
7. create one normal merge commit;
8. validate it;
9. recheck `origin/main`;
10. push normally, without force.

This strategy was not started because the initial freeze failed.

## 10. Isolated branch creation

No `step58c-canonical-reconciliation` branch was created.

The current `main` branch was not reset, rebased, merged, or otherwise altered
by Step 58C.

## 11. Conflict resolutions

None. No conflict-resolution edit was performed.

## 12. Preservation matrix

Because no reconciled tree exists, the matrix records the pre-reconciliation
state and the required future result:

| Capability | Remote before | Local before | Reconciled | Result |
|---|---|---|---|---|
| Build 7 release lineage | Present | Not at remote tip | Not created | Must preserve |
| R-01 onboarding keyboard | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| R-02 agreement semantics | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| R-03 Plus remount | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| R-04 recipe freshness | Older remote lineage | Reviewed local history present | Not created | Not evaluated |
| R-05 nutrition truthfulness | Older remote lineage | Reviewed local API history present | Not created | Not evaluated |
| Weekly Programs | Present in reviewed local history | Present | Not created | Not evaluated |
| Smart Scan approval | Present in reviewed local history | Present | Not created | Not evaluated |
| Food Memory/Home Today | Present in reviewed local history | Present | Not created | Not evaluated |
| Diary/outbox/sync/image provenance | Older remote lineage | Reviewed local API history present | Not created | Not evaluated |
| Planner ordering/fallback | Older remote lineage | Reviewed local API history present | Not created | Not evaluated |
| Bounded Coach | Remote state not promoted | Step 58A default-deny controls present | Not created | Must preserve |
| Health | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| Premium/RevenueCat | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| Account isolation/auth/PKCE | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| Referrals/account deletion | Remote lineage present by history | Reviewed local history present | Not created | Not evaluated |
| Release attestation | Older remote control state | Step 58A corrections present | Not created | Must preserve local correction |
| Step 58A release controls | Absent at remote tip | Present locally | Not created | Must preserve |

## 13. Reconciled SHA/tree

No reconciled SHA or tree exists.

The current local tip is not a reconciled result:

```text
SHA:   b872cbf83ba4b35abef63475e300ba15c710d13e
Tree: ed2cea0a53b227318dbb806972f04aee24b16534
```

## 14. Parent/ancestry proof

No reconciliation merge commit exists. Therefore there are no reconciliation
parents and no proof that both divergent tips are ancestors of a result.

## 15. Full validation results

Step 58C did not run the full validation suite because the branch-tip freeze
failed before reconciliation. No Step 58C validation result is claimed.

The prior Step 58A validation results remain historical evidence only:

- API tests: 438 passed, 4 skipped;
- Calora tests: 1,185 passed;
- server checks: 6 passed;
- scripts tests: 47 passed;
- release-attestation tests: 13 passed;
- typechecks and prior working-tree diff checks: passed.

No test was removed, weakened, or skipped by Step 58C.

## 16. Release-control verification

No reconciled tree was produced for verification. The current local history
still contains the Step 58A controls:

```text
COACH_FACT_CONTEXT_ENABLED=false
RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false
```

No Coach rollout, provider, cohort, consent, or nonce mutation occurred.

## 17. Build 7 preservation

No reconciliation was performed. The remote Build 7 SHA remains:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

No Build 7 rebuild, EAS action, TestFlight action, or App Store action
occurred. An ancestry proof against a reconciled SHA is not yet available.

## 18. API runtime preservation

No merge result exists to audit. The Step 58B preflight established that the
API runtime and shared API inputs had no unexpected delta from the original
Step 58 candidate. Step 58C made no API source edit.

The required post-reconciliation API comparison was not run because the
branch-tip freeze stopped the process.

## 19. Database no-change audit

Step 58C performed no database operation:

- no migration;
- no schema change;
- no seed;
- no backfill;
- no support-object change;
- no manual row mutation;
- no destructive query.

## 20. Pre-push remote recheck

No push was authorized or attempted. A pre-push recheck against the
Step 58C-authoritative remote tip was therefore not applicable.

The observed remote tip remained:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

## 21. Push result

No push occurred. No force flag, force-with-lease, reset, rebase, or remote
replacement occurred.

## 22. Canonical `origin/main` verification

`origin/main` remains:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

It does not contain the local Step 58A/API history and no claim of canonical
reconciliation is made.

## 23. Release-validation workflow

No exact release-validation workflow was run by Step 58C. This step is
Git-only, and the required reconciliation did not reach a validated merge
commit.

## 24. Mobile no-change audit

Step 58C performed none of the following:

- iOS build;
- Build 8 creation;
- TestFlight/App Store action;
- Android build;
- Android versionCode change;
- APK creation;
- Expo OTA update.

## 25. Deployment no-change audit

Step 58C performed no:

- Replit publish;
- production API deployment;
- Railway deployment;
- parallel service deployment;
- domain change;
- production restart;
- mobile API-origin change.

## 26. Remaining API-promotion work

After owner review and an unchanged branch-tip freeze:

1. perform the complete three-way path and semantic audit;
2. create the isolated reconciliation branch;
3. preserve the remote Build 7 lineage;
4. preserve local reviewed API behavior and Step 58A controls;
5. create one normal reconciliation merge commit;
6. run the full validation and release-control gates;
7. push only through a normal force-free update;
8. verify canonical `origin/main`;
9. proceed to the separate Step 58D exact API attestation/promotion work.

## 27. Recommendation for Step 58D

Do not start Step 58D, deploy the API, build mobile artifacts, touch
TestFlight, change Android versioning, modify the database, or fix Metro.

First obtain owner review of the changed local tip and establish a fresh,
explicitly approved Step 58C freeze. If the owner confirms the two
report/attachment commits are the intended history, rerun Step 58C from those
new authoritative tips rather than silently assuming the old freeze.

## 28. Final verdict

**CANONICAL RECONCILIATION BLOCKED — BRANCH TIPS CHANGED**

### Final questions

| Question | Answer |
|---|---|
| A. What caused the divergence? | Local reviewed Calora/API history and remote Build 6/7 release lineage diverged after merge base `755b4332…`. |
| B. What were the two remote-only commits? | `5f69c31e…` Build 6 and `dec8f0d6…` Build 7 provenance-controlled candidate. |
| C. Did Build 7 lineage survive? | It remains intact on `origin/main`; no reconciliation result exists yet. |
| D. Were all meaningful local product/API changes preserved? | No merge was performed; local history remains untouched. |
| E. Were Step 58A release controls preserved? | Yes in the current local history; no reconciliation result exists. |
| F. Was any historical branch blindly merged? | No. |
| G. Was Fitness restored? | No. |
| H. Was force push used? | No. |
| I. Was rebase/reset used? | No. |
| J. What is `RECONCILED_SHA`? | None. |
| K. What is `RECONCILED_TREE`? | None. |
| L. What are its two merge parents? | None; no merge commit exists. |
| M. Is `dec8f0d6…` an ancestor of a reconciled result? | No reconciled result exists. |
| N. Is `30a56d24…` an ancestor of a reconciled result? | No reconciled result exists. |
| O. Did full validation pass? | Step 58C validation was not run; the freeze gate stopped first. |
| P. Did sensitive release remain fail-closed? | The existing Step 58A controls remain present; no Step 58C merge verification was reached. |
| Q. Did API runtime remain equivalent except reviewed release controls? | No Step 58C API edit occurred; the prior Step 58B equivalence evidence remains. |
| R. Was any DB change introduced? | No. |
| S. Was `origin/main` unchanged immediately before push? | No push was attempted. |
| T. Was the push normal and force-free? | No push was attempted. |
| U. Does `origin/main` equal a reconciliation SHA? | No reconciliation SHA exists. |
| V. Did exact release validation pass? | Not run. |
| W. Was production API deployed? | No. |
| X. Was iOS/Android built? | No. |
| Y. Was TestFlight touched? | No. |
| Z. Is canonical Git divergence closed? | No. |
| AA. Is it safe to proceed to Step 58D? | No; owner review and successful Step 58C reconciliation are required first. |