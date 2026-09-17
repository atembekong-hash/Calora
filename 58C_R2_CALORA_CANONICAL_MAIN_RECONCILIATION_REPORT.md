# Calora — Step 58C-R2 Canonical Main Reconciliation Report

**Date:** 2026-09-17  
**Scope:** Owner-approved Git reconciliation refreeze.  
**Production deployment:** Not attempted.  
**Mobile/database/Metro changes:** None.  
**Final verdict:** **CANONICAL RECONCILIATION BLOCKED — BRANCH TIPS CHANGED**

## 1. Executive summary

Step 58C-R2 authorized the previously observed local tip
`b872cbf83ba4b35abef63475e300ba15c710d13e` as the new local freeze and kept
`origin/main` at `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`.

Before any R2 reconciliation branch or merge operation could begin, the local
tip moved again to:

```text
80fcb479c13fb1aae59fdf545338075d4c025d3a
```

The movement contains the Step 58C runbook and Step 58C report history:

- `dfa659c99fffb05c06a5bd7606e367ed0faced8` added the Step 58C runbook;
- `80fcb479c13fb1aae59fdf545338075d4c025d3a` added the Step 58C report.

These are documentation/attachment changes, not product changes, but R2
explicitly requires the approved branch tips to remain fixed and prohibits a
report/runbook commit from silently moving the freeze. The process therefore
stopped before branch creation, merge, conflict resolution, validation, or
push.

## 2. Owner-approved re-freeze

The approved R2 freeze was:

| Branch/state | SHA | Tree |
|---|---|---|
| Approved local `main` | `b872cbf83ba4b35abef63475e300ba15c710d13e` | `ed2cea0a53b227318dbb806972f04aee24b16534` |
| Approved `origin/main` | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | `f4c820017b82c48052571eb432806b3185aabcfb` |
| Required merge base | `755b433240c262487a6d77472c4f7dafaba2615a` | — |

The owner explicitly approved the local `b872cbf8…` state because its added
history was limited to Step 58B documentation and attachment changes.

## 3. Starting identities

The observed state at the R2 freeze attempt was:

| Branch/state | SHA | Tree | Source digest |
|---|---|---|---|
| Current local `main` | `80fcb479c13fb1aae59fdf545338075d4c025d3a` | `ed4be0dd52e888bdac1b49c9af54b369616bb1f2` | `d610b2b411fddc2de33c75cd78bd4224b9af7404364c42edc4e1ce781d860cb6` |
| Current `origin/main` | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | `f4c820017b82c48052571eb432806b3185aabcfb` | Not needed for the stop |

The current branch was 54 commits ahead and 2 commits behind
`origin/main`. The merge base remained
`755b433240c262487a6d77472c4f7dafaba2615a`.

## 4. Three-way delta audit

The complete three-way audit was not started because the required R2 freeze
failed first. The delta after the owner-approved local tip is known:

```text
A  attached_assets/Pasted-STEP-58C-CALORA-CONTROLLED-CANONICAL-MAIN-DIVERGENCE-RE_1789673970628.txt
A  58C_CALORA_CONTROLLED_CANONICAL_MAIN_DIVERGENCE_RECONCILIATION_REPORT.md
```

Both paths are documentation/attachment paths. No API, shared-contract,
database, mobile-product, authentication, or runtime release-control path was
changed by this observed movement.

## 5. Remote Build 6/7 audit

The remote-only commits remain preserved on `origin/main`:

| Commit | Subject | R2 action |
|---|---|---|
| `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | Prepare iOS build 6 release candidate | Not changed |
| `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | Prepare iOS build 7 provenance-controlled candidate | Not changed |

No iOS build, EAS operation, TestFlight action, App Store action, or mobile
configuration mutation occurred.

## 6. Local-history audit

The approved local history contains the reviewed Calora/API recovery history,
Step 58A release-control remediation, and Step 58B documentation. The two
post-approval commits observed before R2 work were documentation/attachment
only:

| Commit | Classification |
|---|---|
| `dfa659c99fffb05c06a5bd7606e367ed0faced8` | Step 58C runbook attachment |
| `80fcb479c13fb1aae59fdf545338075d4c025d3a` | Step 58C report documentation |

No product/API history was merged, removed, squashed, or rewritten.

## 7. Conflict inventory

No reconciliation branch was created, so no Git or semantic conflicts were
generated. Potential conflicts between remote Build 7 release metadata and
local reviewed history remain unaudited.

No global `ours`/`theirs` resolution was used.

## 8. Conflict-resolution decisions

None. R2 stopped before the first merge operation.

The required future policy remains:

- preserve remote Build 7 provenance;
- preserve local reviewed API behavior;
- preserve Step 58A release controls;
- do not restore Fitness, stale OpenAPI operations, unknown-to-zero nutrition
  coercion, or stale backend behavior;
- resolve product conflicts semantically rather than merely making Git clean.

## 9. Preservation matrix

No reconciled tree exists, so the result column is intentionally not claimed:

| Capability | Remote before | Local before | Reconciled | Result |
|---|---|---|---|---|
| Build 7 lineage | Present | Preserved in history | None | Not evaluated |
| R-01 onboarding keyboard | Historical lineage | Reviewed local history | None | Not evaluated |
| R-02 agreement semantics | Historical lineage | Reviewed local history | None | Not evaluated |
| R-03 Plus remount | Historical lineage | Reviewed local history | None | Not evaluated |
| R-04 recipe freshness | Older lineage | Reviewed local history | None | Not evaluated |
| R-05 nutrition truthfulness | Older lineage | Reviewed local API history | None | Not evaluated |
| Weekly Programs | Older lineage | Reviewed local history | None | Not evaluated |
| Smart Scan approval | Older lineage | Reviewed local history | None | Not evaluated |
| Food Memory/Home Today | Older lineage | Reviewed local history | None | Not evaluated |
| Diary/outbox/sync/image provenance | Older lineage | Reviewed local API history | None | Not evaluated |
| Planner ordering/fallback | Older lineage | Reviewed local API history | None | Not evaluated |
| Bounded Coach | Not promoted | Step 58A default-deny controls | None | Must preserve |
| Health | Historical lineage | Reviewed local history | None | Not evaluated |
| Premium/RevenueCat | Historical lineage | Reviewed local history | None | Not evaluated |
| Account isolation/auth/PKCE | Historical lineage | Reviewed local history | None | Not evaluated |
| Referrals/account deletion | Historical lineage | Reviewed local history | None | Not evaluated |
| Release attestation | Older remote controls | Step 58A correction present | None | Must preserve |
| Step 58A release controls | Not present at remote tip | Present locally | None | Must preserve |

## 10. Reconciled SHA/tree

No `RECONCILED_SHA` or `RECONCILED_TREE` exists. The observed current local tip
is not a reconciliation result:

```text
SHA:  80fcb479c13fb1aae59fdf545338075d4c025d3a
Tree: ed4be0dd52e888bdac1b49c9af54b369616bb1f2
```

## 11. Merge parents

No merge commit exists. There are no reconciliation parents to record.

## 12. Ancestry proof

No reconciled SHA exists, so ancestry of `dec8f0d6…`, `b872cbf8…`, and
`5f69c31e…` into a reconciliation result cannot be claimed.

## 13. Fresh validation results

R2 did not run fresh validation. The process stopped before isolated branch
creation. Prior Step 58A validation results are not counted as fresh R2
results.

No test was removed, weakened, or skipped.

## 14. Release-control verification

No reconciled tree was available for the R2 gate. The approved local history
continues to contain:

```text
COACH_FACT_CONTEXT_ENABLED=false
RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false
```

No Coach rollout, provider, cohort, consent, nonce, or release-control
mutation occurred.

## 15. Negative sensitive-release test

Not run in R2 because the branch-tip freeze failed first. No real provider was
activated and no production Coach state was changed.

## 16. API runtime comparison

No merge result exists to compare. R2 made no API source edit. The previous
Step 58B analysis remains historical evidence that the approved local API
runtime and shared contracts were equivalent to the original reviewed Step 58
candidate.

## 17. Database audit

No database operation occurred:

- no migration;
- no schema or support-object change;
- no seed or backfill;
- no row mutation;
- no destructive query.

## 18. Pre-push remote lock

No push was authorized or attempted. The remote tip observed at the freeze
attempt was still:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

## 19. Push result

No push occurred. No force-push, force-with-lease, reset, rebase, squash, or
remote replacement occurred.

## 20. Canonical `origin/main` proof

`origin/main` remains at:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

It does not equal a reconciliation SHA because no reconciliation SHA exists.

## 21. Exact release-validation result

No canonical release-validation workflow was run. Step 58C-R2 is Git-only and
stopped before producing a candidate merge commit.

## 22. Report-commit handling

The owner-approved R2 runbook explicitly required that report/runbook commits
not silently move the frozen local tip. The observed local movement occurred
before R2 reconciliation:

- `dfa659c…` added the Step 58C runbook;
- `80fcb47…` added the Step 58C report.

The R2 report is intentionally left uncommitted at this point to avoid
creating another tip movement while documenting the stop.

## 23. Mobile no-change audit

No iOS build, Build 8, TestFlight/App Store action, Android build, Android
versionCode change, APK, or Expo OTA occurred.

## 24. Deployment no-change audit

No Replit publish, production API deployment, Railway deployment, parallel
service, domain change, production restart, or mobile API-origin change
occurred.

## 25. Remaining Step 58D work

Step 58D is not authorized. Before it can begin:

1. owner review must accept the current post-R2 tip or establish another
   explicit freeze;
2. the approved local and remote tips must remain unchanged;
3. the isolated reconciliation branch must be created from the approved
   `origin/main`;
4. the semantic merge audit and preservation matrix must pass;
5. one normal merge commit must be created;
6. fresh validation must pass against that exact merge SHA;
7. a normal force-free push must establish canonical `origin/main`.

Only after those gates pass may the exact API attestation and promotion work
resume.

## 26. Final verdict

**CANONICAL RECONCILIATION BLOCKED — BRANCH TIPS CHANGED**

### Final questions

| Question | Answer |
|---|---|
| A. Did the approved local freeze remain `b872cbf8…` until reconciliation? | No; it moved to `80fcb479…` before reconciliation. |
| B. Did `origin/main` remain `dec8f0d6…`? | Yes at the observed freeze; no push occurred. |
| C. What paths differed on both sides? | The complete audit was not reached; observed post-approval paths were report/attachment only. |
| D. What semantic conflicts existed? | None generated; no merge started. |
| E. How was each product/release conflict resolved? | No conflict was resolved. |
| F. Did Build 7 lineage survive? | It remains on `origin/main`; no reconciliation result exists. |
| G. Did all meaningful local recovery/API history survive? | The local history was not changed by R2. |
| H. Did Step 58A release controls survive? | They remain in local history; no reconciled tree exists. |
| I. Was Fitness restored? | No. |
| J. Was any historical branch blindly merged? | No. |
| K. Was force push used? | No. |
| L. Was rebase/reset used? | No. |
| M. What is `RECONCILED_SHA`? | None. |
| N. What is `RECONCILED_TREE`? | None. |
| O. What are the two merge parents? | None; no merge commit exists. |
| P. Is `dec8f0d6…` an ancestor of a reconciled result? | No reconciled result exists. |
| Q. Is `b872cbf8…` an ancestor of a reconciled result? | No reconciled result exists. |
| R. Did fresh full validation pass? | Not run; freeze failed first. |
| S. What were the exact test counts? | No fresh R2 counts. |
| T. Did sensitive release without evidence fail closed? | Not rerun in R2; no release was built. |
| U. Is Coach ordinary-production state disabled/default-deny? | Existing Step 58A local controls remain disabled/default-deny. |
| V. Did reconciled API runtime preserve reviewed behavior? | No reconciled runtime exists to verify. |
| W. Was any DB delta introduced? | No. |
| X. Did `origin/main` remain locked immediately before push? | No push stage was reached. |
| Y. Was the push normal and force-free? | No push occurred. |
| Z. Does `origin/main` equal `RECONCILED_SHA`? | No reconciliation SHA exists. |
| AA. Did exact release validation pass? | Not run. |
| AB. Was production API deployed? | No. |
| AC. Was iOS/Android built? | No. |
| AD. Was TestFlight touched? | No. |
| AE. Was Metro changed? | No. |
| AF. Is canonical Git divergence closed? | No. |
| AG. Is Step 58D authorized? | No. |