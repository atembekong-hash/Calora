# Calora — Step 58B Canonical API Release Identity Reconciliation and Production Promotion Report

**Date:** 2026-09-17  
**Scope:** Reconcile the Step 58A attestation mismatch without restoring or
impersonating the original frozen SHA.  
**Promotion result:** No production promotion was attempted.  
**Final verdict:** **PRODUCTION PROMOTION BLOCKED — CANONICAL GIT DIVERGENCE**

## 1. Executive summary

Step 58B correctly treats the Step 58A release-control remediation as
legitimate repository state. The old Step 58 candidate was not restored,
rebased away, force-pushed, or represented through fake Git metadata.

The current clean repository state is a valid intended API candidate:

- the API runtime and shared API contracts remain byte-equivalent to the
  original Step 58 candidate;
- the Step 58A release-control changes are present;
- Coach remains disabled for ordinary production release;
- no database, mobile, Metro, or provider mutation was performed.

The current candidate is not canonical on `origin/main`. Local `main` is
ahead by 50 commits and behind by 2 commits, with merge base
`755b433240c262487a6d77472c4f7dafaba2615a`. A normal fast-forward push is
therefore impossible. Step 58B forbids force-push, force-with-lease, rebase,
reset, and wholesale historical merging. The process stops at the canonical
Git gate, before the exact-candidate release gates or deployment.

## 2. Starting identities

| Layer | SHA | Tree | Source digest | Status |
|---|---|---|---|---|
| Step 58 original candidate | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `0b4185eac78f8b42097fce0334691487df740e53` | `f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120` | Original reviewed candidate |
| Step 58A repository state | `f67ee229f9ba8052ab18f05a99edb1c1bf53da63` | `f9424f749f9d6781755965f000b9a601a22cd9f4` | `221f33115bbf3d6bf3c4e8e709336aac3df05fdaa05f74be498bb3ab16ec0099` | Remediated, not published |
| Current intended candidate | `30a56d240b5159094e1032571b10e13fb2ab7296` | `ebbe0c93b69e7cca2da7e7480055d36c97d9db3d` | `186be73e209692238425d22c531c7f89627b9dd2b17349165f735c24de68e040` | Valid locally, not canonical remotely |
| `origin/main` | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | `f4c820017b82c48052571eb432806b3185aabcfb` | Not used | Divergent remote tip |
| Old production | `dd4d130b03e6f05e52b9a275d58760849aa58590` | `ffec94339941e4270da869606de9d2627c7a7a98` | `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be` | Live rollback target |
| Live production after promotion | `dd4d130b03e6f05e52b9a275d58760849aa58590` | `ffec94339941e4270da869606de9d2627c7a7a98` | `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be` | No promotion occurred; unchanged |

The current candidate digest is the repository attestation digest:

```text
sha256("<HEAD>\n<HEAD^{tree}>\n")
= 186be73e209692238425d22c531c7f89627b9dd2b17349165f735c24de68e040
```

## 3. Step 58A mismatch explanation

Step 58A built the then-current repository state and correctly reported that
its Git identity did not equal the older Step 58 frozen identity. The mismatch
was not an API runtime mismatch. It was a repository provenance mismatch caused
by legitimate release-control and documentation commits after the old
candidate.

Step 58B does not force the current repository to claim the old SHA. Instead,
the current clean state is evaluated as a new candidate. This is the correct
provenance boundary.

## 4. Commit/path history since the Step 58 candidate

The current local branch contains 50 commits after
`5f69c31e4816abcfa5fff69389e4699fd4f1428f`. The relevant recent history is:

| Commit | Subject | Relevance |
|---|---|---|
| `2a5cbd6228edc7c4b6b518f43d4b92fba1347a03` | Repair production API release controls and preserve Coach default-deny | Release-control remediation |
| `f67ee229f9ba8052ab18f05a99edb1c1bf53da63` | Add remediation control release documentation | Documentation/attachment |
| `30a56d240b5159094e1032571b10e13fb2ab7296` | Add production release control and API promotion report | Documentation-only current tip |

The current branch also contains earlier reviewed Calora release history and
the `.step55-release` historical worktree snapshot. Those paths are not
production API runtime inputs. The remote has two commits not present locally:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c  Prepare iOS build 7 provenance-controlled candidate
5f69c31e4816abcfa5fff69389e4699fd4f1428f  Prepare iOS build 6 release candidate
```

## 5. Changed-path classification

The complete comparison from the original Step 58 candidate to the current
local tip contains 1,108 paths. The production-relevant classification is:

| Path/group | Classification | Result |
|---|---|---|
| `artifacts/api-server/src` | PRODUCT_API | No diff |
| `lib/api-zod` | SHARED_CONTRACT | No diff |
| `lib/api-client-react` | SHARED_CONTRACT | No diff |
| `lib/api-spec` | SHARED_CONTRACT | No diff |
| `artifacts/api-server/package.json` | BUILD_CONTROL/input | No diff |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `shared` | BUILD/runtime inputs | No diff |
| `.replit` | RELEASE_CONTROL | Expected Coach/release-control correction |
| `artifacts/api-server/.replit-artifact/artifact.toml` | BUILD_CONTROL | Expected ordinary-release and Coach-default-deny correction |
| `artifacts/api-server/build.mjs` | BUILD_CONTROL | Expected sensitive-attestation conditionality; fail-closed checks retained |
| Release reports and attached runbooks | REPORT_ONLY / DOCUMENTATION_ONLY | No API behavior |
| `.step55-release/**` | OTHER historical snapshot | Not an API runtime input |
| `artifacts/calora/app.json` | MOBILE_PRODUCT, pre-existing history | Not changed by Step 58B; no mobile build or release action performed |

No new `PRODUCT_API`, `SHARED_CONTRACT`, or `DATABASE` delta was introduced by
Step 58B.

## 6. Runtime equivalence analysis

The following comparisons from the original Step 58 candidate to the current
intended candidate were empty:

```text
artifacts/api-server/src
artifacts/api-server/package.json
lib/api-zod
lib/api-client-react
lib/api-spec
shared
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
```

Therefore no unexpected API business/runtime behavior change was found.
Reviewed recipe/nutrition, Planner ordering, seven-day fallback, capture
approval, diary image provenance, sync, auth/account fences, and bounded Coach
source remain unchanged from the original reviewed API candidate.

**Result:** `PASS — NO UNREVIEWED RUNTIME DELTA`.

## 7. Release-control delta analysis

The expected Step 58A release-control changes are present:

- production `COACH_FACT_CONTEXT_ENABLED=false`;
- production `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false`;
- the reviewed-commit bookkeeping value records the original reviewed SHA;
- ordinary API builds do not require sensitive external artifact evidence;
- explicitly requested sensitive builds still require their separate evidence;
- sensitive activation still requires a clean production Git checkout and an
  exact reviewed commit.

These are release/build controls, not API route behavior. `build.mjs` was not
weakened to permit a sensitive release without evidence.

## 8. New canonical candidate identity

The intended new candidate is the actual current clean repository commit:

| Field | Value |
|---|---|
| `NEW_CANDIDATE_SHA` | `30a56d240b5159094e1032571b10e13fb2ab7296` |
| `NEW_CANDIDATE_TREE` | `ebbe0c93b69e7cca2da7e7480055d36c97d9db3d` |
| `NEW_CANDIDATE_SOURCE_DIGEST` | `186be73e209692238425d22c531c7f89627b9dd2b17349165f735c24de68e040` |

It is not yet a canonical remote candidate because it is not on
`origin/main`.

## 9. Canonical Git status

After fetching `origin`:

```text
Branch:              main
Workspace HEAD:      30a56d240b5159094e1032571b10e13fb2ab7296
origin/main:         dec8f0d6a9531cb5a2eb73c01706dc75354e743c
Merge base:          755b433240c262487a6d77472c4f7dafaba2615a
Local-only commits:  50
Remote-only commits: 2
```

Neither side is an ancestor of the other. The working tree was clean except
for the newly attached, untracked Step 58B runbook, which is not part of the
candidate checkout. The current candidate therefore cannot be established on
`origin/main` by a normal fast-forward.

## 10. Push/canonicalization result

No push or canonicalization was attempted.

Step 58B forbids force-push, force-with-lease, rebase, reset, and wholesale
historical branch merging. Because remote divergence prevents a normal
fast-forward push, the required action is to stop and obtain owner-approved
Git reconciliation through the canonical repository workflow.

**Gate result:** `BLOCKED — CANONICAL GIT DIVERGENCE`.

## 11. Full validation results

The full validation suite passed for the Step 58A remediation state before this
Step 58B canonical-Git stop:

| Validation | Result |
|---|---|
| Frozen dependency installation | PASS; lockfile unchanged |
| Workspace/API/mobile typechecks | PASS |
| API tests | 438 passed, 4 skipped |
| Calora tests | 1,185 passed |
| Calora server checks | 6 passed |
| Scripts tests | 47 passed |
| Release-attestation tests | 13 passed |
| Account-isolation, deletion-fence, recipe, Planner, capture/sync, Coach, and compatibility checks | PASS within the reported suites |
| `git diff --check` on the working tree | PASS |

Step 58B did not claim these inherited results as a fresh full gate for
`30a56d24…`, because the runbook requires canonical Git reconciliation first
and the candidate checkout gate stopped at Section 6. No test was removed,
weakened, or skipped.

## 12. Coach safety gate

The intended ordinary-release state remains:

```text
COACH_FACT_CONTEXT_ENABLED=false
RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false
```

No global rollout, cohort, consent, nonce, provider, or database configuration
mutation occurred. Coach remains default-deny and the sensitive-release build
checks remain fail-closed by source inspection and the prior release-attestation
test results.

**Result:** `SAFE / DEFAULT-DENY PRESERVED`.

## 13. Database no-change gate

The API runtime and shared contracts remain byte-equivalent to the candidate
whose Step 58 database compatibility evidence was already read-only verified.
No new database requirement was introduced.

No migration, schema change, seed, backfill, row mutation, support-object
mutation, or destructive query was performed.

**Result:** `PASS — NO DATABASE CHANGE REQUIRED`.

## 14. Clean candidate checkout

No clean checkout of the new candidate was promoted to the release-gate stage.
The canonical Git gate stopped the procedure before the clean candidate build.

The candidate identity was derived from the clean tracked `HEAD`; the only
workspace untracked file was the attached Step 58B runbook and it was not
included in the candidate.

## 15. Ordinary production build

The ordinary production build against the new candidate was not run after the
canonical-Git stop. This avoids treating a local-only, noncanonical commit as
an authorized production candidate.

## 16. Exact attestation result

No Step 58B release attestation was emitted for the new candidate. Therefore
there is no Step 58B release ID and no claim that the new candidate passed the
exact build identity gate.

The expected identity, once canonical Git reconciliation is complete, is:

```text
gitCommit   = 30a56d240b5159094e1032571b10e13fb2ab7296
sourceTree  = ebbe0c93b69e7cca2da7e7480055d36c97d9db3d
sourceDigest= 186be73e209692238425d22c531c7f89627b9dd2b17349165f735c24de68e040
```

## 17. Negative sensitive-release test

The Step 58B negative sensitive-release test was not rerun after the
canonical-Git stop. Source inspection confirms that the existing sensitive
path still requires the production evidence fields, signing key, independent
fingerprint, and exact clean reviewed commit. The Step 58A release-attestation
tests passed.

No real provider was activated and no production Coach state was changed.

## 18. Rollback identity

The old production rollback target remains:

| Field | Value |
|---|---|
| SHA | `dd4d130b03e6f05e52b9a275d58760849aa58590` |
| Tree | `ffec94339941e4270da869606de9d2627c7a7a98` |
| Source digest | `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be` |
| Release | `calora-api-dd4d130b03e6-20260916120901599` |

## 19. Deployment action

**Not attempted.**

The canonical Git gate failed before the exact candidate build and before any
deployment action. No Railway deployment, parallel service, domain change,
mobile API-origin change, or production restart was attempted.

## 20. Exact deployment/release ID

No Step 58B deployment or release ID was created.

The live release remains:

`calora-api-dd4d130b03e6-20260916120901599`

## 21. Replit-host `/api/version`

`https://calorie-coach-pie35449.replit.app/api/version` reports:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "dd4d130b03e6f05e52b9a275d58760849aa58590",
  "sourceTree": "ffec94339941e4270da869606de9d2627c7a7a98",
  "sourceDigest": "2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be",
  "buildTimestamp": "2026-09-16T12:09:01.599Z",
  "releaseId": "calora-api-dd4d130b03e6-20260916120901599"
}
```

## 22. Custom-domain `/api/version`

`https://mycaloraapp.com/api/version` reports the same old SHA, tree, digest,
timestamp, and release ID as the Replit host.

## 23. Health verification

Both live hosts are healthy:

- Replit host `/api/healthz`: `{"status":"ok"}`;
- custom domain `/api/healthz`: `{"status":"ok"}`.

These are health results for the old release, not post-promotion verification.

## 24. Runtime delta closure

No new candidate was deployed, so runtime drift remains open:

| Capability | Status |
|---|---|
| Recipe/nutrition truthfulness | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Planner shared ordering | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Role-aware seven-day fallback | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Capture approval acknowledgement | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Diary image provenance | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Current idempotent/account-scoped sync | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Auth/account fences | `DEPLOYED SOURCE VERIFIED — DEVICE/AUTH RETEST REQUIRED`; live host remains old |
| Bounded Coach/default-deny | Source and configuration verified; no postdeploy state change |

## 25. Auth/account preservation

The current intended candidate has no diff in API runtime, shared contracts, or
workspace dependency inputs relative to the original reviewed candidate.
Existing bearer authentication, owner-scoped predicates, deletion fences,
referral ownership, sync idempotency, and account boundaries therefore remain
preserved by source equivalence.

No authenticated production mutation or account impersonation was performed.

## 26. Coach postdeploy safety

No postdeploy check was applicable because no deployment occurred. Predeploy
source/configuration evidence confirms:

- Coach runtime is disabled for ordinary production release;
- sensitive activation is false;
- no provider was activated;
- no cohort, consent, nonce, or rollout mutation occurred;
- sensitive-release build checks remain fail-closed.

**Status:** `DEFAULT-DENY VERIFIED; POSTDEPLOY CHECK NOT APPLICABLE`.

## 27. Database mutation audit

Step 58B performed no migration, schema alteration, seed, backfill, insert,
update, delete, manual support-object mutation, or destructive query.

## 28. Mobile mutation audit

Step 58B performed none of the following:

- iOS build;
- Build 8 creation;
- TestFlight or App Store action;
- Android build;
- Android versionCode change;
- APK creation;
- Expo OTA update;
- mobile API-origin change.

iOS Build 7 was not rebuilt or modified by this step.

## 29. Metro status

`METRO ENOSPC — DEFERRED`

No Metro, Expo, watcher, host-limit, or unrelated development-tooling change
was made.

## 30. Remaining device/provider verification

After canonical Git reconciliation, exact candidate gates, authorized
publication, and both-host identity verification:

- retest unchanged iOS Build 7 against both production aliases;
- verify recipe freshness and nutrition truthfulness;
- verify Planner Apply, ordering, and fallback behavior;
- verify Smart Scan approval, Home Today, Food Memory, and diary image
  provenance;
- run authenticated account-isolation and deletion-fence smoke checks;
- verify provider-backed recipe, OpenAI, object storage, and RevenueCat paths.

No production test data should be fabricated for these checks.

## 31. Recommendation for next step

Do not publish this local-only candidate and do not start Android Step 59.

An authorized repository owner must first reconcile the divergence between local
`main` and `origin/main` through the approved canonical Git workflow. The
reconciliation must preserve the Step 58A release-control remediation and may
not use force-push, force-with-lease, rebase, reset, fake metadata, or a
wholesale historical merge.

After a canonical candidate exists on `origin/main`:

1. rerun the complete validation suite against that exact SHA;
2. perform the negative sensitive-release fail-closed test;
3. build from a clean checkout with ordinary Coach-disabled controls;
4. require the emitted SHA/tree/digest to match exactly;
5. freeze the old production rollback identity;
6. publish one API release through the approved Publishing control plane;
7. verify both `/api/version` endpoints, both health endpoints, and the
   authenticated runtime deltas.

## 32. Final verdict

**PRODUCTION PROMOTION BLOCKED — CANONICAL GIT DIVERGENCE**

### Final questions

| Question | Answer |
|---|---|
| A. Why did Step 58A's exact attestation fail? | It attested the legitimate current repository state rather than the older frozen SHA. |
| B. Was API business/runtime behavior changed by Step 58A? | No; API runtime and shared API inputs remain byte-equivalent to the original candidate. |
| C. What legitimate release-control changes were introduced? | Ordinary releases disable sensitive activation and Coach; sensitive evidence remains conditional and fail-closed. |
| D. Was the old candidate SHA restored or impersonated? | No. |
| E. What exact SHA is the new intended candidate? | `30a56d240b5159094e1032571b10e13fb2ab7296` |
| F. What exact tree? | `ebbe0c93b69e7cca2da7e7480055d36c97d9db3d` |
| G. What exact source digest? | `186be73e209692238425d22c531c7f89627b9dd2b17349165f735c24de68e040` |
| H. Is that candidate canonical on `origin/main`? | No; local `main` is 50 commits ahead and 2 behind. |
| I. Did all validation pass? | Step 58A validation passed; Step 58B exact-candidate gates stopped before rerun at canonical Git divergence. |
| J. Does the clean production build attest the exact new candidate? | Not run after the canonical-Git stop. |
| K. Does a sensitive release without evidence still fail closed? | Yes by current source and prior release-attestation tests; the Step 58B rerun was not reached. |
| L. Is Coach disabled/default-deny? | Yes. |
| M. Was any provider activated? | No. |
| N. Was the database mutated? | No. |
| O. What exact production deployment/release ID was created? | None; live release remains `calora-api-dd4d130b03e6-20260916120901599`. |
| P. What does the Replit production `/api/version` report? | Old `dd4d130b...` identity. |
| Q. What does `mycaloraapp.com/api/version` report? | The same old `dd4d130b...` identity. |
| R. Do both exactly equal the new candidate? | No. |
| S. Are both healthy? | Yes, for the old release. |
| T. Are the Step 57 API deltas deployed? | No; live production remains on the old release. |
| U. Was iOS Build 7 changed? | No. |
| V. Was Android changed/built? | No. |
| W. Was TestFlight/App Store touched? | No. |
| X. Was Metro changed? | No; it remains deferred. |
| Y. Was rollback required? | No deployment occurred. |
| Z. Is production runtime drift now closed? | No. |
| AA. Is it safe to retest unchanged Build 7? | Not against the new API candidate until canonicalization and publication are complete. |
| AB. Is it safe to proceed to Android versionCode 27? | No. |