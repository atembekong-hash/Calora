# Calora — Step 58 Controlled Production API Alignment and Verification Report

**Date:** 2026-09-17  
**Scope:** Controlled production API alignment preflight.  
**Execution mode:** Read-only preflight; promotion was blocked before any
deployment mutation.  
**Mobile scope:** None. No iOS or Android release action was performed.

## 1. Executive summary

Step 57 proved runtime delivery drift. Step 58 selected the reviewed
canonical API source, compared it with the old production release, inspected
production database support objects read-only, checked production
configuration presence without exposing secret values, and verified the
bounded Coach safety code path.

The API candidate itself is reviewed and contains the intended runtime
changes. Database compatibility passed the read-only preflight. However,
production promotion is **blocked** because:

1. production has `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` present;
2. production's reviewed-commit control is `7a1fe8e3...`, not the selected
   candidate SHA;
3. the production environment is missing the required release-attestation
   manifest, artifact, signing-key, and signing-key-fingerprint configuration
   entries required by `build.mjs`;
4. production has `COACH_FACT_CONTEXT_ENABLED=true`, so the candidate must not
   be promoted while its sensitive-release authorization inputs are
   inconsistent.

The API build is intentionally fail-closed for this state. No attempt was
made to bypass the mismatch, change release controls, enable Coach, publish,
restart production, or alter the database.

**Final verdict:** **PRODUCTION ALIGNMENT BLOCKED — PRODUCTION CONFIGURATION
INCOMPLETE**

## 2. Starting safeguards

The Step 58 boundaries were applied:

- no Android build;
- no Android version-code change;
- no iOS build or TestFlight submission;
- no change to iOS Build 7;
- no unrelated source change;
- no database migration, schema change, seed, backfill, or row mutation;
- no Coach cohort, consent, nonce, provider, or global rollout mutation;
- no production restart;
- no deployment to Railway or a parallel service;
- no Metro or Expo configuration change.

Only read-only Git, HTTP, source, environment-presence, and database metadata
inspection was performed. The Step 58 report itself is the only requested
workspace artifact created by this step.

## 3. Step 57 baseline

Step 57 recorded the following old production identity:

| Field | Value |
|---|---|
| Commit | `dd4d130b03e6f05e52b9a275d58760849aa58590` |
| Tree | `ffec94339941e4270da869606de9d2627c7a7a98` |
| Source digest | `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be` |
| Release | `calora-api-dd4d130b03e6-20260916120901599` |
| Build timestamp | `2026-09-16T12:09:01.599Z` |

Step 57 also established that the mobile source was not lost, iOS Build 7 was
not a wrong-source build, the database tables/columns appeared compatible,
and Android/Metro remediation belonged to later controlled steps.

## 4. Current Git identities

The repository state was frozen before preflight:

| Layer | SHA | Tree | Subject/time |
|---|---|---|---|
| Workspace HEAD | `7dc87dc2198dfab525c81c3c4d7c4101e6924c58` | `551ac1080c5e1999f958f3a26c3daef2095724d2` | Step 58 documentation, 2026-09-17 12:57Z |
| `origin/main` | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `0b4185eac78f8b42097fce0334691487df740e53` | Prepare iOS build 6 release candidate, 2026-09-17 07:28Z |
| Branch | `main` | — | workspace branch |
| Ahead/behind | 144 ahead, 0 behind | — | local ref comparison |

The current working tree contains the newly attached Step 58 runbook as an
untracked attachment. Product source was not edited by this step.

## 5. Workspace/origin divergence

Workspace HEAD contains the Step 57 audit, Step 58 runbook, release reports,
and other documentation/metadata commits after `origin/main`. The API source
paths used for the candidate have no diff between `origin/main` and HEAD.

Therefore the deployment candidate is deliberately **not** workspace HEAD.
Selecting `origin/main` avoids promoting documentation-tail noise while
retaining the reviewed API source and shared contracts.

## 6. Candidate-selection methodology

The candidate was selected by:

1. identifying the latest canonical source ref that contains the reviewed
   product API implementation;
2. excluding later report-only and release-documentation changes;
3. proving that the candidate contains the current planner, recipe, and sync
   runtime changes;
4. confirming that candidate API source equals the API source represented by
   the active development API;
5. comparing the candidate directly with old production commit `dd4d130b...`.

This avoids deploying workspace HEAD merely because it has a later timestamp
or larger commit count.

## 7. Exact candidate SHA/tree/digest

| Field | Candidate |
|---|---|
| Candidate SHA | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` |
| Candidate tree | `0b4185eac78f8b42097fce0334691487df740e53` |
| Candidate source digest | `f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120` |
| Candidate runtime API source vs HEAD | identical for API source paths |
| Candidate runtime source vs old production | reviewed delta listed below |

The source digest is the SHA-256 of the canonical `gitCommit` and
`sourceTree` pair using the same newline-delimited construction used by the
release attestation build.

## 8. Candidate path classification

| Path/group | Classification | Included in candidate |
|---|---|---:|
| `artifacts/api-server/src/routes/recipes.ts` | PRODUCT_API | Yes |
| `artifacts/api-server/src/routes/planner.ts` | PRODUCT_API | Yes |
| `artifacts/api-server/src/routes/sync.ts` | PRODUCT_API | Yes |
| `lib/api-zod/src/planner-program-eligibility.ts` | SHARED_CONTRACT | Yes |
| `lib/api-zod/src/planner-program-pools.ts` | SHARED_CONTRACT | Yes |
| generated API client/contract files | SHARED_CONTRACT | Yes |
| API tests | TEST_ONLY | Yes, not a runtime behavior |
| Step reports, pasted runbooks, release logs | REPORT_ONLY | Excluded from candidate rationale |
| Android/iOS app source | UNRELATED_PRODUCT for Step 58 | Not changed |
| build/release metadata | BUILD_RELEASE/METADATA_ONLY | Not used to justify API behavior |

No unrelated runtime API delta was identified in the candidate-vs-production
review.

## 9. Old-production identity

Both public production API hosts still reported the same old release:

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

Rollback identity is therefore available and unchanged:

- old SHA: `dd4d130b03e6f05e52b9a275d58760849aa58590`;
- old tree: `ffec94339941e4270da869606de9d2627c7a7a98`;
- old source digest:
  `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be`;
- old release:
  `calora-api-dd4d130b03e6-20260916120901599`.

## 10. Production-vs-candidate API delta

The reviewed runtime delta is limited to three API route files and shared
planner contracts:

| Capability | Old production | Candidate | Classification |
|---|---|---|---|
| Recipe nutrition validation | Coerces invalid values with `Number(...) || 0` and rejects only zero calories | Requires finite, non-negative macro values and positive calories | P2 user-visible |
| Planner program ordering | Local ad hoc filters for plant-based and quick-and-easy | Shared `orderProgramMeals` rules | P1/P2 functional |
| Planner fallback | Role map/single fallback behavior | Role-aware seven-day starter/fallback week | P1/P2 functional |
| Diary image metadata | Sync route lacks current image metadata path | Accepts and retains `imageAssetKey`/provenance metadata | P2 user-visible |
| Capture approval | Diary application does not acknowledge matching review session | Owner-scoped, transactional review→approved acknowledgement | P1 functional |

No changed route was deleted. No new database table or column is required by
these route deltas.

## 11. Build 7 compatibility analysis

Build 7 remains unchanged:

| Field | Value |
|---|---|
| EAS Build ID | `45900e2d-298f-4ece-9041-0e42513266e4` |
| EAS Git SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` |
| Version/build | `1.0.0 (7)` |
| Bundle | `com.etiendem.caloraapp` |
| IPA SHA-256 | `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13` |

The candidate retains the established authenticated route contracts and adds
backward-compatible server behavior:

- recipes continue to use the existing authenticated/provider paths;
- planner generation continues to accept the existing request shape;
- sync adds optional image metadata and owner-scoped acknowledgement;
- existing diary mutation idempotency remains;
- Coach remains gated by consent, account, rollout, expiry, rate limit, nonce,
  and compile-time release authorization;
- auth, account deletion, referral, and ownership predicates are preserved.

No Build 7 request/response break was found in the source comparison. Physical
authenticated testing remains pending because this blocked preflight did not
create production test data.

## 12. Database table/column preflight

Production read-only metadata inspection confirmed the tables and columns
needed by the candidate, including:

- `calora_diary_entries`;
- `calora_ai_capture_sessions`;
- `calora_ai_capture_candidates`;
- `calora_sync_mutations`;
- `calora_recipe_nutrition`;
- `calora_server_config`;
- `calora_coach_fact_context_consents`;
- `calora_coach_fact_context_idempotency`;
- `calora_cohort_memberships`;
- `calora_account_deletion_states`;
- `calora_referral_codes`;
- `calora_referral_redemptions`.

The current production metadata includes diary `capture_session_id`,
`image_url`, `image_source`, and `sync_metadata`, and capture-session
`status`.

**Result:** `PRESENT_COMPATIBLE`.

## 13. Database support-object preflight

Production read-only inspection also found:

- primary-key and foreign-key constraints for the audited tables;
- uniqueness/idempotency support for the relevant identity and nonce paths;
- deletion-fence functions:
  `calora_account_deletion_write_fence` and
  `calora_assert_deletion_writable`;
- deletion-fence triggers on user, capture-rate-limit, referral-code,
  referral-qualification, and referral-redemption writes;
- `pgcrypto` and `plpgsql` extensions;
- no public RLS policies on the audited `calora_*` tables, consistent with the
  API-owned tenant predicates documented by the project.

The sync route uses a transaction, owner-scoped predicates, mutation claims,
and the existing foreign-key/uniqueness structure. No missing required
support object was found.

**Result:** `PRESENT_COMPATIBLE` for the audited candidate dependencies.

No database write, migration, DDL statement, seed, backfill, or destructive
operation was performed.

## 14. Production configuration presence

Presence-only inspection was performed with secret values withheld:

| Category | Result | Evidence/impact |
|---|---|---|
| Production database connectivity | PRESENT | Live health/version endpoints respond |
| Supabase public/auth configuration | PRESENT | Public endpoint/secret presence available |
| OpenAI configuration | UNVERIFIED | Presence was not sufficient to authorize this promotion |
| Recipe provider configuration | PARTIAL/UNVERIFIED | Relevant provider presence exists, but complete candidate runtime configuration was not proven |
| TheMealDB configuration | PRESENT | Secret presence recorded without value |
| FatSecret/gateway configuration | PRESENT/PARTIAL | Gateway configuration presence recorded; full provider path not proven |
| Object/image storage | PRESENT | Default object-storage bucket setting exists |
| RevenueCat verification | PRESENT | Secret presence recorded without value |
| CORS configuration | UNVERIFIED | No safe mutation performed to infer missing fallback |
| Account-deletion controls | PRESENT | Source, database functions, and triggers present |
| Referral controls | PRESENT | Source and required tables/constraints present |
| Release-attestation configuration | **ABSENT** | Required manifest/artifact/signing configuration entries are not present |
| Coach/Fact Context release controls | **INCOMPLETE** | Sensitive activation request is present but reviewed commit does not match candidate |

The release-attestation absence is independently sufficient to block a
production build under `artifacts/api-server/build.mjs`.

## 15. Provider configuration presence

No provider call or provider mutation was performed. Presence-only evidence
was recorded for configured categories, but this step did not treat a secret's
existence as proof of provider authorization, quota, static-egress policy, or
response compatibility.

Recipe/provider and AI smoke verification therefore remains pending. No fake
production user data was created.

## 16. Coach safety preflight

The candidate source preserves the required safety boundaries:

- strict allowlisted fact keys and exact value keys;
- bounded body size, nesting, string, and message-turn limits;
- TTL and future-skew checks;
- account-scoped bearer authentication;
- explicit current consent;
- server-owned rollout decision;
- nonce/idempotency claim;
- expiry fencing;
- rate limiting;
- default-deny on database/configuration errors;
- provider execution reauthorization;
- compile-time sensitive-release authorization.

The production environment currently has:

- `COACH_FACT_CONTEXT_ENABLED=true`;
- a sensitive activation request present;
- reviewed commit control set to `7a1fe8e3...`, which does not match candidate
  `5f69c31e...`.

Because the release-control inputs are inconsistent, the candidate cannot be
promoted. No Coach provider was activated, no cohort was changed, no consent
was changed, and no activation nonce was created.

## 17. Auth/account-isolation preflight

The candidate continues to call `verifyBearerToken` on the changed planner,
recipe, and sync paths. The candidate preserves:

- account-scoped diary mutation claims;
- owner-scoped capture-session lookup;
- owner-scoped review→approved update;
- deletion-fence checks;
- referral/account ownership logic;
- active-account and authenticated route boundaries.

Unauthenticated live mutation tests were not used to create or alter data.
Physical/authenticated verification remains pending.

## 18. Predeploy test results

The required production configuration gate failed before the predeploy
validation suite was authorized to run. No attempt was made to bypass that
gate by running a production build with mismatched release controls.

Read-only validation completed:

- candidate path comparison: PASS;
- candidate-vs-production runtime diff review: PASS;
- `git diff --check` on candidate API paths: PASS;
- development/production `/api/version` comparison: PASS, mismatch correctly
  observed;
- production `/api/healthz`: PASS;
- database table/column metadata: PASS;
- database support-object metadata: PASS;
- Coach source safety review: PASS, but production configuration gate still
  blocks promotion.

Not run because promotion was blocked before mutation:

- frozen production dependency installation;
- full API test suite;
- full mobile/shared-contract typecheck;
- generated-code drift gate;
- release-attestation production build;
- authenticated production route smoke tests.

**Predeploy validation result:** `BLOCKED BEFORE SUITE — PRODUCTION
CONFIGURATION INCOMPLETE`.

## 19. Codegen/contract verification

The candidate includes the reviewed generated API/client contract state and
shared planner eligibility/pool modules. The candidate-vs-HEAD API source diff
is empty, and the candidate-vs-old-production diff was limited to the reviewed
runtime and contract changes listed in Section 10.

No unreviewed API contract delta was found.

## 20. Release-gate result

The release gate did not pass. `build.mjs` requires:

- production sensitive activation request to be intentional;
- reviewed commit to exactly match the clean candidate commit;
- production release-attestation manifest directory;
- production final artifact directory;
- independently pinned signing-key fingerprint;
- signing key and manifest evidence.

The current production environment does not satisfy those requirements for
candidate `5f69c31e...`.

## 21. Frozen candidate identity

The frozen reviewed candidate remains:

- SHA: `5f69c31e4816abcfa5fff69389e4699fd4f1428f`;
- tree: `0b4185eac78f8b42097fce0334691487df740e53`;
- source digest:
  `f48c9972458e02a92e153ac7b2d4b4d4474520923d85c41e12f637bb49a72120`.

It was not deployed.

## 22. Rollback identity

The exact rollback identity remains the live old production release:

- SHA: `dd4d130b03e6f05e52b9a275d58760849aa58590`;
- tree: `ffec94339941e4270da869606de9d2627c7a7a98`;
- source digest:
  `2ee23adc3869deb60b89535c30bdae911f8a2f4b7f7951e92f86e936c9a857be`;
- release:
  `calora-api-dd4d130b03e6-20260916120901599`.

No rollback was required because no deployment occurred.

## 23. Deployment action

**Not attempted.**

The runbook requires all gates to pass first. Promotion was blocked by missing
release-attestation configuration and an inconsistent sensitive-release
reviewed-commit control. No production publish, restart, or promotion action
was taken.

## 24. Deployment provider/release ID

No new deployment provider/build/release ID exists for Step 58.

The old production release remains:

`calora-api-dd4d130b03e6-20260916120901599`

## 25. Production Replit-host `/api/version`

Unchanged old identity:

`https://calorie-coach-pie35449.replit.app/api/version`

reports commit `dd4d130b03e6f05e52b9a275d58760849aa58590`.

## 26. Custom-domain `/api/version`

Unchanged old identity:

`https://mycaloraapp.com/api/version`

reports the same commit, tree, digest, build timestamp, and release ID as the
Replit host.

## 27. Production health verification

Before the blocked promotion:

- Replit production `/api/healthz`: `{"status":"ok"}`;
- custom-domain `/api/healthz`: `{"status":"ok"}`.

These are health results for the old release, not post-deployment parity
results.

## 28. Recipe/nutrition smoke verification

No post-deployment smoke test exists because no deployment occurred.

Source-level candidate verification confirms the stricter nutrition path is
present. Live production remains unaligned, so the current nutrition behavior
is not proven live.

**Status:** `PENDING PRODUCTION ALIGNMENT`.

## 29. Planner smoke verification

No post-deployment planner smoke test exists because no deployment occurred.

Source-level candidate verification confirms shared program ordering and
role-aware seven-day fallback behavior. Live production remains on the old
planner implementation.

**Status:** `PENDING PRODUCTION ALIGNMENT`.

## 30. Capture/sync/diary verification

No production rows were created or modified. Source-level candidate review
confirms:

- image metadata/provenance fields are accepted;
- capture-session lookup is owner scoped;
- review→approved acknowledgement occurs after diary application;
- sync mutation claims remain idempotent and account scoped.

Live behavior remains unverified because the candidate was not deployed.

**Status:** `PENDING PRODUCTION ALIGNMENT` and authenticated device testing.

## 31. Auth/account verification

Candidate source review confirms existing bearer authentication, account
predicates, deletion fencing, referral ownership, and sync ownership were not
weakened by the reviewed API delta.

No account was impersonated and no production account was mutated.

**Status:** source preflight PASS; live authenticated smoke test pending.

## 32. Coach postdeploy safety verification

No postdeploy verification was possible because deployment was blocked.

Predeploy source review PASS:

- bounded request and history;
- allowlisted facts/actions;
- consent;
- account scoping;
- nonce/idempotency;
- expiry;
- fail-closed rollout;
- provider reauthorization.

Configuration gate BLOCKED:

- sensitive release request present;
- reviewed commit control does not match candidate;
- required release-attestation controls absent.

No Coach provider was activated.

## 33. Database mutation audit

Step 58 performed no:

- migration;
- schema alteration;
- seed;
- backfill;
- insert/update/delete;
- manual row mutation;
- destructive query.

Only metadata `SELECT` queries were used. No startup deployment occurred, so
there are no Step 58 deployment-startup writes to account for.

## 34. Mobile-release mutation audit

Step 58 performed none of the following:

- iOS EAS build;
- Android EAS build;
- APK or IPA creation;
- TestFlight or App Store submission;
- Android version-code change;
- mobile API-origin change;
- Expo OTA/mobile update;
- change to iOS Build 7.

## 35. Metro status

Metro remains a separate deferred issue:

`METRO ENOSPC — DEFERRED TO SEPARATE CONTROLLED REMEDIATION`

No watcher limit, Expo configuration, or development tooling was changed.

## 36. Preservation matrix

| Area | Candidate source review | Step 58 live result |
|---|---|---|
| R-01 onboarding keyboard | Unchanged | Physical retest pending |
| R-02 agreement semantics | Unchanged | Physical retest pending |
| R-03 Plus remount | Unchanged | Provider/device retest pending |
| R-04 Discover/Plus freshness | Candidate API/mobile contract retained | Deployment blocked |
| R-05 nutrition truthfulness | Candidate route present | Deployment blocked |
| Weekly Programs modal | Unchanged | Build 7 remains unchanged |
| Smart Scan approval | Candidate sync path present | Deployment blocked |
| Food Memory/Home Today | Candidate sync fields present | Deployment blocked |
| Diary/outbox/sync | Owner-scoped/idempotent source retained | Deployment blocked |
| Bounded Coach | Safety source retained | Activation not changed |
| Health | Unchanged | Device retest pending |
| Premium/RevenueCat | Existing source retained | Provider retest pending |
| Account isolation/auth/PKCE | Existing fences retained | Authenticated retest pending |
| Referrals/account deletion | Existing source/DB support retained | Authenticated retest pending |
| Release attestation | Candidate build would fail current config gate | Blocked |

Fitness remains intentionally excluded.

## 37. Before/after runtime table

| Layer | Before Step 58 | After Step 58 | Expected | Verified? |
|---|---|---|---|---|
| Production Replit host | Old `dd4d130b...` | Old `dd4d130b...` | Candidate identity | No; promotion blocked |
| Custom-domain host | Same old release | Same old release | Candidate identity | No; promotion blocked |
| Development API | Current `0d1e021...` runtime | Unchanged | Candidate API source | Yes |
| Candidate source | `5f69c31...` reviewed | Frozen, not deployed | Reviewed candidate | Yes |
| Database schema/support objects | Compatible | Unchanged | Compatible | Yes, read-only |
| Coach activation | Existing config inconsistent with candidate | Unchanged; no activation | Default-deny/safe controls | Source yes; production promotion blocked |
| iOS Build 7 | Unchanged | Unchanged | No mobile mutation | Yes |
| Android versionCode | 24 | 24 | No Step 58 change | Yes |
| Metro preview | ENOSPC failure | Unchanged | Deferred | Yes |

## 38. API delta closure table

| Capability | Old production behavior | Candidate behavior | Live postdeploy behavior | Build 7 compatibility | Verification |
|---|---|---|---|---|---|
| Recipes/nutrition | Permissive coercion | Strict finite/positive validation | Old behavior remains | Compatible | Candidate source PASS; live pending |
| Planner/program ordering | Older ad hoc filters | Shared program ordering | Old behavior remains | Compatible | Candidate source PASS; live pending |
| Seven-day fallback | Older role map | Role-aware seven-day fallback | Old behavior remains | Compatible | Candidate source PASS; live pending |
| Capture approval | No current acknowledgement | Transactional owner-scoped acknowledgement | Old behavior remains | Compatible | Candidate source PASS; live pending |
| Diary image provenance | Older sync payload | Current metadata/provenance handling | Old behavior remains | Compatible | Candidate source PASS; live pending |
| Sync | Older route | Current idempotent scoped path | Old behavior remains | Compatible | Candidate source PASS; live pending |
| Coach Fact Context | Old deployed release | Bounded current candidate | Old release remains | Safety source compatible | Config gate blocks |
| Auth/account isolation | Existing fences | Existing fences retained | Old release remains | Compatible by source review | Authenticated live pending |

## 39. Release provenance chain

The chain is complete through candidate freeze but stops before deployment:

`reviewed candidate SHA`
→ `candidate tree`
→ `candidate source digest`
→ `read-only delta review`
→ `database support-object preflight`
→ `production configuration gate FAILED`
→ **no deployment build/release ID**
→ **no postdeploy `/api/version`**
→ **no postdeploy health/route smoke**

Because this chain is broken at the production configuration gate, Step 58
cannot claim runtime drift closure.

## 40. Remaining physical-device checks

After a successful authorized production alignment:

- retest unchanged iOS Build 7;
- verify recipe/Discover freshness;
- verify nutrition truthfulness;
- verify Weekly Programs Apply/fallback;
- verify Smart Scan approval → Home Today;
- verify Food Memory and diary image provenance;
- verify Coach only through its bounded consented flow;
- verify two-account isolation;
- separately handle Android version code 27 in Step 59.

## 41. Remaining provider-dependent checks

After configuration is repaired and the candidate is promoted:

- provider-backed recipe discovery and premium freshness;
- nutrition provider response handling;
- OpenAI planner/recipe generation;
- object/image storage resolution;
- RevenueCat entitlement verification;
- static-egress/provider gateway behavior.

No provider was called or enabled as part of this blocked preflight.

## 42. Rollback status

**No rollback required.**

No new release was created and the old production release remains healthy at
both public hosts.

## 43. Exact recommendation for Step 59

Step 59 must not build Android yet. First, an authorized operator must repair
the production release-control configuration through the approved control
plane:

1. reconcile the sensitive-release reviewed-commit control with the exact
   reviewed candidate, or explicitly disable sensitive activation for this
   ordinary API release;
2. provision and independently pin the required production release-attestation
   manifest/artifact/signing configuration;
3. verify provider/configuration presence without exposing values;
4. rerun the full release validation suite;
5. deploy exactly the frozen candidate;
6. verify both production `/api/version` identities, health, and route smoke
   results;
7. only after production alignment is proven, proceed to the separately
   authorized Android version-code 27/APK step.

Do not change Android, iOS, Metro, database schema, or Coach rollout while
repairing this Step 58 block.

## 44. Final verdict

**PRODUCTION ALIGNMENT BLOCKED — PRODUCTION CONFIGURATION INCOMPLETE**

### Mandatory final questions

| Question | Answer |
|---|---|
| A. Exact API SHA deployed? | None; deployment was blocked |
| B. Exact tree deployed? | None; deployment was blocked |
| C. Exact source digest deployed? | None; deployment was blocked |
| D. Why candidate selected over workspace HEAD? | `origin/main` contains the reviewed API source without documentation-tail noise |
| E. Did every runtime API delta receive review? | Yes, the changed runtime paths were reviewed |
| F. Did production require a DB migration? | No migration identified; metadata/support-object preflight passed |
| G. Were PostgreSQL support objects verified? | Yes, read-only tables, constraints, functions, triggers, and extensions were inspected |
| H. Were production configuration categories verified? | Partially; required release-attestation configuration was absent, so the gate failed |
| I. Did Coach remain default-deny? | No mutation or provider activation occurred; source remains fail-closed, but promotion was blocked because production controls are inconsistent |
| J. Was any Coach provider activated? | No |
| K. Does Build 7 remain API-compatible? | Yes by source review; live retest remains pending |
| L. Production deployment/release ID created? | None |
| M. Replit production `/api/version` now reports? | Unchanged old `dd4d130b...` release |
| N. `mycaloraapp.com` `/api/version` now reports? | Same unchanged old release |
| O. Do both identities match the frozen candidate? | No; both match the old release |
| P. Are both health endpoints healthy? | Yes, for the old release |
| Q. Are recipe/nutrition changes live? | No; promotion blocked |
| R. Are planner/program/fallback changes live? | No; promotion blocked |
| S. Is capture approval/sync acknowledgement live? | No; promotion blocked |
| T. Is diary image provenance live? | No; promotion blocked |
| U. Were auth/account fences preserved? | Yes by candidate source review |
| V. Was the database mutated? | No |
| W. Was iOS Build 7 changed/rebuilt? | No |
| X. Was Android versionCode changed? | No |
| Y. Was an Android APK built? | No |
| Z. Was TestFlight/App Store touched? | No |
| AA. Was Metro ENOSPC modified? | No |
| AB. Was rollback required? | No |
| AC. What remains for physical verification? | Build 7 flow retest after API alignment; authenticated/device matrix |
| AD. Is production runtime drift closed? | No; configuration gate blocked alignment |

## Task 823 control-repair addendum

The release-control repair applied after this preflight keeps ordinary API
alignment independent from the sensitive Coach activation path:

- production build configuration explicitly pins the reviewed candidate
  `5f69c31e4816abcfa5fff69389e4699fd4f1428f` while leaving sensitive
  activation requested as `false`;
- external final-artifact signing evidence is required only when a sensitive
  release is explicitly requested, so unavailable provider-retained evidence
  cannot block an ordinary API release;
- production runtime and source configuration keep `COACH_FACT_CONTEXT_ENABLED`
  false, and no provider, cohort, consent, or rollout mutation was performed;
- the full API and release validation suites pass, and the API workflow starts
  healthy after the validated configuration replacement.

The reviewed candidate was not published during this task. Both public hosts
continue to report the unchanged old release
`dd4d130b03e6f05e52b9a275d58760849aa58590`; the remaining publish and
post-publish identity/health verification must be completed through the
approved Publishing control plane once an authorized operator initiates it.