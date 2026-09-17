# Calora — Step 58A Production Release-Control Remediation and API Promotion Report

**Date:** 2026-09-17  
**Scope:** Step 58A release-control remediation and exact API promotion
preflight.  
**Promotion result:** No production promotion was attempted.  
**Final verdict:** **PRODUCTION RELEASE CONTROL BLOCKED — ATTESTATION
MISMATCH**

## 1. Executive summary

Step 58A repaired the production release-control configuration identified by
Step 58 without changing Calora product/API behavior:

- ordinary API releases now explicitly keep sensitive Coach activation off;
- production runtime Coach configuration is explicitly false;
- the release-control reviewed-commit setting is pinned to the frozen
  candidate for ordinary-release bookkeeping;
- external signing/artifact evidence is required only when sensitive
  activation is explicitly requested;
- `build.mjs` was not weakened for sensitive releases.

The full automated validation suite passed. A clean production build also
passed the ordinary-release path and emitted a valid release attestation.
However, it attested the current repository commit
`f67ee229f9ba8052ab18f05a99edb1c1bf53da63`, not the frozen Step 58 candidate
`5f69c31e4816abcfa5fff69389e4699fd4f1428f`.

The API runtime source paths are byte-equivalent to the frozen candidate, but
the repository-level release attestation is not. Step 58A requires all three
attestation identity fields to match exactly before promotion. Therefore no
production publish was attempted, no deployment release ID was created, and
both public hosts remain on the old healthy production release.

## 2. Starting identities

The Step 58A workspace state was frozen after the remediation merge and
documentation commit:

| Layer | SHA | Tree | Source digest |
|---|---|---|---|
| Workspace HEAD | `f67ee229f9ba8052ab18f05a99edb1c1bf53da63` | `f9424f749f9d6781755965f000b9a601a22cd9f4` | `221f33115bbf3d6bf3c4e8e709336aac3df05fdaa05f74be498bb3ab16ec0099` |
| `origin/main` | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `0b4185eac78f8b42097fce0334691487df740e53` | `f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120` |

Current branch: `main`. The working tree was clean at the final freeze.

The current production hosts reported:

- Replit host: old release `calora-api-dd4d130b03e6-20260916120901599`;
- custom domain: the same old release;
- both `/api/healthz` endpoints: `{"status":"ok"}`.

## 3. Step 58 blockers

Step 58 was blocked by:

1. a sensitive-release request being present;
2. a reviewed commit control pointing at unrelated older commit
   `7a1fe8e3...`;
3. absent production external-attestation configuration;
4. `COACH_FACT_CONTEXT_ENABLED=true` while sensitive-release controls were
   inconsistent.

The Step 58A remediation resolved the configuration-state problem without
activating Coach. It did not—and must not—rewrite the frozen candidate's
repository identity.

## 4. Sensitive activation root cause

The original `7a1fe8e3...` value belongs to the unrelated August 27 commit
`Add troubleshooting screenshots and logs for npmrc build profile error`.
It is not the Step 58 reviewed API candidate and is stale for this release.

The safe ordinary API-release state is therefore:

- `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false`;
- `COACH_FACT_CONTEXT_ENABLED=false` in production;
- no cohort, consent, nonce, provider, or rollout mutation;
- no sensitive external artifact attestation required for an ordinary API
  alignment.

This is the least-privilege state supported by the existing architecture.

## 5. Reviewed-commit mismatch root cause

The Step 58 frozen candidate is:

`5f69c31e4816abcfa5fff69389e4699fd4f1428f`

The prior production control value was:

`7a1fe8e3acd276570b542a05a2bd62edd3da3727`

The remediation changed the ordinary-release control configuration to record
the frozen candidate SHA while explicitly setting sensitive activation to
false. This is a control/configuration correction, not a claim that a
sensitive release is authorized.

The current Git HEAD still differs from the frozen candidate because the
remediation commit and the attached Step 58A runbook are later repository
history. The API runtime source directories remain unchanged relative to the
frozen candidate.

## 6. Attestation configuration requirements

`artifacts/api-server/build.mjs` requires the following for an explicitly
requested sensitive release:

- external provider attestation file;
- external provider signature file;
- external provider public-key file;
- trusted provider public-key fingerprint;
- provider deployment ID;
- provider target origin;
- release-attestation manifest directory;
- final artifact directory;
- signing key;
- independently pinned signing-key fingerprint.

For an ordinary API release, `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false`
now makes the separate sensitive provider and external signing evidence
inapplicable. The ordinary production boundary remains the clean Git
attestation compiled into the API bundle and verified after publish.

No fallback was added. No fake evidence was generated. No signing material
was reused or exposed.

## 7. Configuration remediation performed

The merged remediation commit changed only release/build controls and report
metadata:

| File | Change type | Product/API behavior changed? |
|---|---|---:|
| `.replit` | Production environment control | No |
| `artifacts/api-server/.replit-artifact/artifact.toml` | Production build/run control | No |
| `artifacts/api-server/build.mjs` | Sensitive attestation conditionality | No ordinary API route behavior |
| Step 58 report | Documentation addendum | No |
| Step 58A attachment | Runbook documentation | No |

The production control values are now:

| Name | Status |
|---|---|
| `COACH_FACT_CONTEXT_ENABLED` | PRESENT / `false` |
| `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` | PRESENT / `false` |
| `RELEASE_SENSITIVE_ACTIVATION_COMMIT` | PRESENT / frozen candidate SHA |
| Sensitive external attestation material | NOT_REQUIRED for ordinary API release |

Only names and non-secret status were recorded. No secret values were printed.

## 8. Secret-handling audit

No API key, password, private key, token, signed artifact, connection string,
or secret value was printed, written to source, placed in the report, or
included in shell output.

Presence checks were limited to environment-control names and booleans. The
production release build was run with sensitive activation explicitly false,
so it did not read or require sensitive signing material.

## 9. Coach safety preflight

The candidate and remediation preserve:

- explicit consent;
- bounded request body, message, string, and context limits;
- account scoping;
- nonce/idempotency protection;
- expiry fencing;
- allowlisted facts/actions;
- rate limiting;
- database-backed fail-closed rollout checks;
- compile-time sensitive-release authorization;
- separate provider activation from ordinary API release.

The remediation explicitly sets the production Coach runtime gate to false.
No global rollout was enabled. No cohort membership, consent record, nonce, or
provider configuration was changed.

**Result:** `SAFE / DEFAULT-DENY PRESERVED`.

## 10. Frozen candidate identity

The authoritative frozen candidate remains:

| Field | Value |
|---|---|
| SHA | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` |
| Tree | `0b4185eac78f8b42097fce0334691487df740e53` |
| Source digest | `f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120` |

The candidate was not promoted.

## 11. Proof product source did not change

The following comparison was empty:

```text
git diff --name-status \
  5f69c31e4816abcfa5fff69389e4699fd4f1428f..HEAD \
  -- artifacts/api-server/src lib/api-*
```

The current API runtime source is byte-equivalent to the frozen candidate.
The repository tree nevertheless differs because of release-control and
documentation commits. Since `build.mjs` attests the repository's actual
Git HEAD/tree, this difference is material to the exact provenance gate.

## 12. Database no-change verification

No database operation was performed by Step 58A:

- no migration;
- no schema alteration;
- no seed;
- no backfill;
- no insert/update/delete;
- no destructive query;
- no support-object mutation.

The Step 58 read-only support-object results remain valid. No deployment
startup occurred, so no Step 58A deployment-startup writes exist.

## 13. Full validation results

The required validation suite completed successfully:

| Validation | Result |
|---|---|
| Frozen dependency installation | PASS; lockfile unchanged |
| Workspace typecheck and project references | PASS |
| API typecheck | PASS |
| Calora/mobile typecheck | PASS |
| API tests | 438 passed, 4 skipped; 36 files passed, 1 skipped |
| Calora tests | 1,185 passed; 87 files passed |
| Calora server checks | 6 passed |
| Scripts tests | 47 passed |
| Release-attestation tests | 13 passed |
| Account-isolation tests | Included in API suite; PASS |
| Deletion-fence tests | Included in API suite/release checks; PASS |
| Recipe tests | Included in API suite; PASS |
| Planner/program tests | Included in API suite; PASS |
| Capture/sync tests | Included in API suite; PASS |
| Coach safety tests | Included in API suite/release checks; PASS |
| API/client compatibility tests | Included in API/release suites; PASS |
| Codegen/type contract check | PASS through workspace typecheck |
| `git diff --check` | PASS |

No failing test was deleted, skipped, weakened, or rewritten.

## 14. Release-attestation verification

A clean Git clone of the current repository was used to rehearse the ordinary
production build with:

- `NODE_ENV=production`;
- `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false`;
- the frozen candidate recorded as the control value.

The build passed and emitted:

```text
gitCommit=f67ee229f9ba8052ab18f05a99edb1c1bf53da63
sourceTree=f9424f749f9d6781755965f000b9a601a22cd9f4
sourceDigest=221f33115bbf3d6bf3c4e8e709336aac3df05fdaa05f74be498bb3ab16ec0099
releaseId=calora-api-f67ee229f9ba-20260917131539297
```

The build passed the ordinary-release control path, but the identity does not
match the frozen candidate:

| Field | Expected frozen candidate | Clean-build result |
|---|---|---|
| `gitCommit` | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `f67ee229f9ba8052ab18f05a99edb1c1bf53da63` |
| `sourceTree` | `0b4185eac78f8b42097fce0334691487df740e53` | `f9424f749f9d6781755965f000b9a601a22cd9f4` |
| `sourceDigest` | `f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120` | `221f33115bbf3d6bf3c4e8e709336aac3df05fdaa05f74be498bb3ab16ec0099` |

**Result:** `ATTESTATION MISMATCH`. Promotion stopped before publish.

## 15. Rollback identity

The exact old production rollback target remains:

| Field | Value |
|---|---|
| SHA | `dd4d130b03e6f05e52b9a275d58760849aa58590` |
| Tree | `ffec94339941e4270da869606de9d2627c7a7a98` |
| Source digest | `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be` |
| Release | `calora-api-dd4d130b03e6-20260916120901599` |

No rollback was required because no new release was created.

## 16. Deployment action

**Not attempted.**

The exact candidate attestation gate failed before the deployment step. In
addition, the current agent runtime exposes deployment status/read operations
but no callable publish mutation. An approved operator or Publishing control
plane must perform promotion only after the candidate identity is reconciled.

No Railway deployment, parallel service, domain change, API-origin change, or
database change was attempted.

## 17. Exact deployment/release ID

No Step 58A deployment or release ID was created.

The clean-build rehearsal produced the non-live release ID:

`calora-api-f67ee229f9ba-20260917131539297`

It must not be treated as a published production release.

## 18. Replit-host `/api/version`

The Replit production host remains on the old release:

`https://calorie-coach-pie35449.replit.app/api/version`

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

## 19. Custom-domain `/api/version`

`https://mycaloraapp.com/api/version` reports the same old identity as the
Replit host. It does not report the frozen candidate or the clean-build
rehearsal identity.

## 20. Health verification

Both current production hosts are healthy:

- Replit host `/api/healthz`: `{"status":"ok"}`;
- custom domain `/api/healthz`: `{"status":"ok"}`.

These health results belong to the old release and are not post-promotion
verification.

## 21. Recipe/nutrition verification

Source and automated tests verify that the frozen API source contains strict
truthful nutrition validation. No production recipe smoke was run against an
aligned release because the exact candidate was not promoted.

**Status:** `SOURCE/TEST VERIFIED; LIVE RETEST REQUIRED`.

## 22. Planner verification

Source and automated tests verify shared Planner ordering and role-aware
seven-day fallback behavior. No production planner smoke was run against an
aligned release.

**Status:** `SOURCE/TEST VERIFIED; LIVE RETEST REQUIRED`.

## 23. Capture/sync/diary verification

Source and automated tests verify:

- image metadata/provenance handling;
- owner-scoped capture-session lookup;
- transactional review→approved acknowledgement;
- idempotent account-scoped sync.

No production rows were created or modified, and no aligned live release
exists to verify.

**Status:** `SOURCE/TEST VERIFIED; AUTHENTICATED LIVE RETEST REQUIRED`.

## 24. Auth/account verification

The full API suite passed tenant-isolation, deletion-fence, referral, capture,
sync, and account-scoped checks. No account impersonation or production
mutation was performed.

**Status:** `SOURCE/TEST VERIFIED; LIVE AUTHENTICATED RETEST REQUIRED`.

## 25. Coach postdeploy verification

No postdeploy check was possible. Predeploy/remediation verification confirms:

- production Coach runtime gate is false;
- sensitive activation is false;
- no provider was activated;
- no cohort, consent, nonce, or rollout mutation occurred;
- source safety tests passed.

**Status:** `DEFAULT-DENY VERIFIED; POSTDEPLOY CHECK NOT APPLICABLE YET`.

## 26. Step 57 delta closure matrix

| Delta | Source/test result | Live result |
|---|---|---|
| Strict recipe nutrition validation | PASS | Not live; old production remains |
| Shared Planner program ordering | PASS | Not live; old production remains |
| Role-aware seven-day fallback | PASS | Not live; old production remains |
| Diary image metadata/provenance | PASS | Not live; old production remains |
| Capture approval acknowledgement | PASS | Not live; old production remains |
| Current idempotent/account-scoped sync | PASS | Not live; old production remains |
| Coach bounded safety | PASS; default-deny preserved | No postdeploy state change |

## 27. Mobile no-change audit

Step 58A performed none of the following:

- Android build;
- Android version-code change;
- APK creation;
- iOS build;
- Build 8 creation;
- TestFlight/App Store action;
- Expo OTA update;
- mobile API-origin change.

iOS Build 7 remains unchanged.

## 28. Database no-change audit

Step 58A performed no database migration, schema mutation, seed, backfill,
manual row mutation, or destructive query. The database remains at the
Step 58-compatible state.

## 29. Metro deferred status

`METRO ENOSPC — DEFERRED TO SEPARATE CONTROLLED REMEDIATION`

No Metro, host watcher, Expo, or unrelated development-tooling change was
made. The failed Expo workflow is outside this API release-control scope.

## 30. Remaining device/provider checks

After an exact candidate promotion:

- retest unchanged iOS Build 7 against both production host aliases;
- verify recipe/Discover freshness and nutrition truthfulness;
- verify Planner Apply and fallback behavior;
- verify Smart Scan approval, Home Today, Food Memory, and diary image
  provenance;
- run authenticated account-isolation and deletion-fence smoke checks;
- verify provider-backed recipe, OpenAI, object storage, and RevenueCat paths.

No production test data should be fabricated for these checks.

## 31. Recommendation for next step

Do not proceed to Android versionCode 27.

First reconcile the deployment artifact/source identity so that the
production build's Git attestation exactly equals:

```text
gitCommit   = 5f69c31e4816abcfa5fff69389e4699fd4f1428f
sourceTree  = 0b4185eac78f8b42097fce0334691487df740e53
sourceDigest= f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120
```

The reconciliation must not alter API runtime source, weaken
`build.mjs`, enable Coach, mutate the database, or change mobile artifacts.
After that exact identity is independently proven, an authorized Publishing
control-plane operator may publish one API release and verify both production
hosts before any Step 59 work.

## 32. Final verdict

**PRODUCTION RELEASE CONTROL BLOCKED — ATTESTATION MISMATCH**

### Final questions

| Question | Answer |
|---|---|
| A. Why was Step 58 blocked? | Sensitive-release controls and required attestation configuration were inconsistent or absent |
| B. Was sensitive activation required for this release? | No; ordinary API alignment is now explicitly independent of sensitive Coach activation |
| C. What did reviewed commit `7a1fe8e3` represent? | An unrelated August 27 troubleshooting/documentation commit |
| D. Was the reviewed-commit control safely reconciled? | Yes, the ordinary-release control now records the frozen candidate with sensitive activation false |
| E. Were attestation requirements provisioned without weakening `build.mjs`? | Ordinary-release conditionality was added; sensitive-release checks remain fail-closed |
| F. Was signing identity independently verified? | Not required for the ordinary release; no sensitive signing identity was used |
| G. Were secret values exposed? | No |
| H. Did product/API runtime source change? | No; API runtime source is byte-equivalent to frozen candidate |
| I. What exact SHA/tree/digest was promoted? | None; promotion was blocked |
| J. Did the full validation suite pass? | Yes: all listed checks passed |
| K. Did release attestation pass? | The ordinary build passed, but exact frozen-candidate identity matching failed |
| L. Was Coach globally enabled? | No |
| M. Was any Coach provider activated? | No |
| N. Was the database mutated? | No |
| O. What deployment/release ID was created? | None; the clean-build rehearsal ID was not published |
| P. What does the Replit production host report? | Old `dd4d130b...` release |
| Q. What does `mycaloraapp.com` report? | The same old `dd4d130b...` release |
| R. Do both match the frozen candidate? | No |
| S. Are both health endpoints healthy? | Yes, for the old release |
| T. Are recipe/nutrition changes live? | No |
| U. Are Planner/program/fallback changes live? | No |
| V. Are capture approval/sync/image-provenance changes live? | No |
| W. Were auth/account fences preserved? | Yes by source and automated tests |
| X. Was iOS Build 7 changed? | No |
| Y. Was Android changed or built? | No |
| Z. Was TestFlight/App Store touched? | No |
| AA. Was Metro changed? | No |
| AB. Was rollback required? | No |
| AC. Is runtime delivery drift closed? | No; production still serves the old release |
| AD. Is it safe to proceed to Android versionCode 27? | No; API promotion and live provenance verification remain incomplete |