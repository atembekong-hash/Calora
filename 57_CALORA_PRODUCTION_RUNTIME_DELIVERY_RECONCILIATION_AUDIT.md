# Calora — Step 57 Production Runtime Delivery Reconciliation Audit

**Date:** 2026-09-17  
**Scope:** Read-only reconciliation of current mobile source, iOS TestFlight
Build 7, Android preview lineage, development API, live production API, and
database compatibility.  
**Status:** Complete. No remediation was executed.

## 1. Executive summary

The owner-reported symptom is explained by **runtime delivery drift**, with a
separate Android package-identity ambiguity and a development-preview failure:

1. The current mobile source contains the recent mobile recovery work.
2. iOS TestFlight Build 7 was previously verified from the exact canonical
   source SHA `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` and is not a lost-source
   or wrong-build-SHA incident.
3. The live production API at both public production hosts is healthy but is
   running `dd4d130b03e6f05e52b9a275d58760849aa58590`, built on September 16.
4. The active development API is running workspace HEAD
   `0d1e02115b082f21a6df51b7db4ac2ce3c1bc5a6`, built on September 17.
5. The mobile production configuration points at
   `https://calorie-coach-pie35449.replit.app`, so Build 7 and the Android APK
   consume the stale production API rather than the current development API.
6. Production is behind in recipe nutrition validation, planner program
   ordering/starter-week fallback, diary image metadata, and capture-approval
   acknowledgement. Those are user-visible or functional server-side changes.
7. Android preview version code `24` was reused by multiple distinct APKs.
   EAS history also shows allocated/canceled version codes `25` and `26`; the
   next safe version-code floor is `27`.
8. Metro's `ENOSPC` watcher failure affects only the local/live preview. It
   does not change the source used by completed EAS builds and does not explain
   stale production API behavior.

**Final verdict:** **RUNTIME DELIVERY DRIFT CONFIRMED — CONTROLLED
REMEDIATION REQUIRED**

No API deployment, EAS build, version-code change, source edit, push, merge,
database mutation, or Coach rollout change was performed by this audit.

## 2. Owner-reported symptom

The owner reported that none of the changes made during the prior 24 hours
appeared in the current app build. The audit treats that as a real observation
and separates mobile source, native binary, embedded API configuration,
backend release, database state, and local persisted state instead of treating
them as one release identity.

## 3. Audit scope

The audit covered:

- current `origin/main` and workspace Git identities;
- product-code history from September 16 through September 17, 2026;
- recovery targets R-01 through R-05;
- Weekly Programs, Smart Scan, Food Memory, Home Today, diary/outbox/sync,
  bounded Coach, Health, Premium/RevenueCat, and account isolation;
- exact iOS Build 7 EAS and TestFlight evidence;
- iOS production runtime configuration as represented by the verified source
  and production EAS profile;
- recent Android EAS build history;
- development and live production `/api/version` and `/api/healthz`;
- file-level and capability-level API differences;
- read-only database object compatibility;
- local cache and persistence behavior;
- Metro/Expo preview failure;
- report/release-documentation commit tail.

Fitness was intentionally excluded, as required.

## 4. Read-only safeguards

The following were not performed:

- no production deployment or restart;
- no EAS iOS or Android build;
- no TestFlight submission;
- no version-code or source change;
- no Git fetch, merge, rebase, reset, commit, or push;
- no database write, migration, seed change, or schema change;
- no production secret/config mutation;
- no Coach rollout or sensitive-provider activation.

Read-only database queries selected table and column metadata only. Secret
values were not printed or accessed.

The attached audit instruction is currently an untracked attachment. Therefore
the workspace is not literally clean during this audit, but the product
checkout was clean before that attachment arrived.

## 5. Current origin/main identity

| Field | Value |
|---|---|
| SHA | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` |
| Tree | `0b4185eac78f8b42097fce0334691487df740e53` |
| Subject | Prepare iOS build 6 release candidate |
| Timestamp | `2026-09-17T07:28:46Z` |

All named recent product commits audited below are ancestors of this
`origin/main` ref. The origin ref is not the latest workspace commit because
the workspace contains later release/report metadata and documentation tail
commits.

## 6. Current workspace identity

| Field | Value |
|---|---|
| SHA | `0d1e02115b082f21a6df51b7db4ac2ce3c1bc5a6` |
| Tree | `7460de05a864ee43e1032ba93d22483731d69895` |
| Subject | Add Calora iOS build 7 testflight report and update asset metadata |
| Timestamp | `2026-09-17T11:16:11Z` |
| Product checkout state before attached audit | clean |
| Current audit working tree | untracked attached audit instruction only |
| Origin relationship | workspace is 142 commits ahead, 0 behind by the local ref count |

## 7. Workspace vs canonical divergence

The meaningful product source in `origin/main` and workspace is aligned. The
workspace-to-origin diff is dominated by report/release snapshots, memory
metadata, attached evidence, and release bookkeeping. The only direct
top-level product-tree difference between `origin/main` and workspace observed
in the compact path check is `artifacts/calora/app.json`; the source recovery
commits themselves are already present in `origin/main`.

This means “the APK contains workspace HEAD” is technically true for the
Android build, but it is potentially misleading as a product explanation:
the post-`origin/main` workspace tail is primarily documentation and release
metadata, not a new set of mobile screens.

## 8. Recent commit classification

The following commits were classified from changed paths and diffs, not commit
subjects alone. Every listed product commit is an ancestor of `origin/main`.
The exact Build 7 canonical clone is no longer present in this checkout, so
Build 7 inclusion is based on the immutable Step 56 report, which recorded the
exact canonical source clone and verified artifact.

| Commit | Classification | Changed product effect | Current development API | Production |
|---|---|---|---|---|
| `7b1ae6352fb2` | PRODUCT_MOBILE + PRODUCT_API | Durable capture acceptance, scan/diary/outbox flow, sync approval | included | absent |
| `e6c8d7cd8d62` | PRODUCT_MOBILE | Weekly Programs modal transition | included | n/a |
| `d31418d7fa10` | PRODUCT_MOBILE + SHARED_CONTRACT + PRODUCT_API | Program eligibility/order rules and planner behavior | included | absent |
| `b3b023694266` | PRODUCT_MOBILE | Bounded Coach request lifecycle and client bounds | included | server endpoint exists; current client behavior not in old binary |
| `8965cc6b8366` | PRODUCT_MOBILE + PRODUCT_API | Diary image provenance and sync metadata | included | absent |
| `5733add9a39d` | TEST_ONLY | Capture compatibility assertion | included as test only | absent |
| `5e39f25fdab6` | PRODUCT_MOBILE + CONFIGURATION | Swipeable tab/prebuild validation blockers | included | n/a |
| `7cce885c6b3d` | BUILD_RELEASE + CONFIGURATION | Deterministic iOS build-number/signing controls | included | n/a |
| `cd638c22a119` | PRODUCT_MOBILE | Onboarding keyboard visibility and agreement semantics | included | n/a |
| `f9148dc2070d` | PRODUCT_MOBILE | Discover/Plus freshness, remount, recipe model/nutrition handling | included | n/a |
| `755b433240c2` | PRODUCT_MOBILE + PRODUCT_API + SHARED_CONTRACT | Recipe nutrition validation, planner fallback/program rules, generated contracts | included | absent |

The subsequent workspace commits include a large release/report snapshot tail.
They do not represent a new product implementation that could explain missing
mobile UI in Build 7.

## 9. Last mobile product SHA

The last meaningful mobile product source changes in the audited period are
present through commit `755b433240c262487a6d77472c4f7dafaba2615a`
(`Remediate Calora Step 54A source gaps`), with earlier mobile commits listed
above. The current workspace HEAD contains those changes and the current
Android EAS build was recorded against HEAD.

The canonical Build 7 source identity is separately recorded as
`dec8f0d6a9531cb5a2eb73c01706dc75354e743c` in the Step 56 immutable
submission report. That exact source was used for the submitted iOS artifact.

## 10. Last API product SHA

The last meaningful API product changes in the audited period are also
represented by `755b433240c262487a6d77472c4f7dafaba2615a`, with API behavior
introduced earlier by `7b1ae6352fb2`, `d31418d7fa10`, and
`8965cc6b8366`. Current workspace API source includes these changes.

The live production API does not include them. It reports the older production
release commit `dd4d130b03e6f05e52b9a275d58760849aa58590`.

## 11. Recovery-target source matrix

| Target | In origin/main | In Build 7 | Backend required | Production compatible now | Local state can mask it | Device verification |
|---|---:|---:|---|---|---|---|
| R-01 onboarding keyboard visibility | Yes | Yes by canonical Build 7 evidence | No | n/a | onboarding draft can preserve current step | Yes |
| R-02 agreement semantics/accessibility | Yes | Yes by canonical Build 7 evidence | No | n/a | onboarding completion/draft can hide it | Yes |
| R-03 Plus remount behavior | Yes | Yes by canonical Build 7 evidence | No for remount; entitlement data still server/provider dependent | Partial | React Query/cache and entitlement state can mask it | Yes |
| R-04 Discover/Plus freshness | Yes | Yes by canonical Build 7 evidence | Yes for recipe/provider data | No/partial; old recipe server behavior remains | recipe freshness/session cache can mask it | Yes |
| R-05 nutrition truthfulness | Yes | Yes by canonical Build 7 evidence | Yes for generated/provider nutrition | No for updated server validation | old cached recipe/nutrition can mask it | Yes |
| Weekly Programs selector/detail | Yes | Verified physically on Build 7 | Detail UI is local; generation/apply can use API | Partial | viewed-week/planner state can mask it | Yes |
| Smart Scan approval | Yes | Yes by source lineage | Yes for capture and sync | Partial; old sync does not acknowledge approval as current | outbox/retry state can mask it | Yes |
| Food Memory | Yes | Yes by source lineage | Sync path required for remote persistence | Partial | local memory is account-scoped and persistent | Yes |
| Home Today | Yes | Yes by source lineage | Sync and diary data required | Partial | local diary snapshot can look unchanged | Yes |
| Diary/outbox/sync | Yes | Yes by source lineage | Yes | No for current image metadata/capture acknowledgement | outbox and durable local snapshot matter | Yes |
| Bounded Coach | Yes | Yes by source lineage | Yes for fact endpoint/provider gate | Current API endpoint exists; old binary/server combination is not current | chat history/consent state can mask it | Yes |
| Health | Yes | Yes by source lineage | Native provider, not API for core reads | n/a | native authorization/snapshot state | Yes |
| Premium/RevenueCat | Yes | Yes by source lineage | Provider/API entitlement checks | Not proven current | cached entitlement and product state | Yes |
| Account isolation | Yes | Yes by source lineage | Authenticated API predicates | Existing production route is healthy; current changes need endpoint verification | account-scoped persistence | Yes |

## 12. iOS Build 7 EAS identity

The exact Build 7 identity was directly re-verified and recorded by the Step
56 report:

| Field | Value |
|---|---|
| EAS Build ID | `45900e2d-298f-4ece-9041-0e42513266e4` |
| Status | `FINISHED` |
| Platform | iOS |
| Profile | `production` |
| Distribution | `STORE` |
| Project | `@vvault07/calora` |
| EAS Git SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` |
| EAS Git subject | Prepare iOS build 7 provenance-controlled candidate |
| Marketing version | `1.0.0` |
| Build number | `7` |
| Bundle ID | `com.etiendem.caloraapp` |
| IPA SHA-256 | `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13` |
| Apple processing | `VALID` |
| Apple beta state | `IN_BETA_TESTING` |

The Step 56 report also verified the App Store Connect target and internal
TestFlight group. Build 7 must not be altered or replaced as part of this
audit.

## 13. iOS Build 7 embedded runtime configuration

Direct Build 7 IPA extraction was not repeated during this read-only audit.
Evidence level for runtime configuration is **source/profile-derived**, backed
by the exact Step 56 EAS identity and current production profile:

- production API base URL: `https://calorie-coach-pie35449.replit.app`;
- Supabase public project endpoint is configured for the Calora Supabase
  project; no secret key value is reproduced here;
- RevenueCat iOS production configuration is present in the production EAS
  profile;
- production profile: `production`;
- no localhost API origin is configured in the production profile;
- no Railway API origin is configured;
- no mock API flag is configured in the production profile;
- the public Replit API origin is the intended production target.

The downloaded Android bundle independently contains the same production
Replit API host. That corroborates the mobile configuration path used by the
production iOS profile.

## 14. iOS Build 7 production API target

Build 7 calls the intended production Replit API host:

`https://calorie-coach-pie35449.replit.app`

The custom domain `https://mycaloraapp.com` returns the same `/api/version`
identity as the Replit host. This is an API/runtime alignment problem, not an
incorrect host selection problem.

## 15. Android build-history inventory

Recent relevant EAS Android builds:

| EAS Build ID | Created | Status | SHA | Subject/source | Version | versionCode | Profile | Distribution | Fingerprint |
|---|---|---|---|---|---:|---:|---|---|---|
| `60addbb1-d28b-4b33-8ab7-ebbf93b0b726` | 2026-09-17 11:56Z | FINISHED | `0d1e02115b08` | iOS Build 7 report/asset metadata | 1.0.0 | 24 | preview | internal | `fcf9434c56d2` |
| `c6dd7399-92b8-455a-9328-e145c93f5d62` | 2026-09-16 20:23Z | FINISHED | `5e39f25fdab6` | iOS prebuild validation blockers | 1.0.0 | 24 | preview | internal | `d50e569942e7` |
| `6ff16c0d-ea31-459c-b264-c564999ea083` | 2026-09-16 13:06Z | FINISHED | `d5b15e93a930` | earlier preview source | 1.0.0 | 24 | preview | internal | `d50e569942e7` |
| `9c6ff5d7-83b5-4786-9e21-8753f00ce733` | 2026-09-15 17:19Z | FINISHED | `d5b15e93a930` | earlier preview source | 1.0.0 | 24 | preview | internal | `d50e569942e7` |
| `c03bb902-2e6f-4e5d-b825-8f9d66850283` | 2026-09-13 08:13Z | CANCELED | `ad640cca380b` | production-apk attempt | 1.0.0 | 26 | production-apk | internal | `c7c787a47740` |
| `e75e2f25-f385-479a-b5a3-84842f47c907` | 2026-09-13 07:55Z | CANCELED | `ad640cca380b` | production-apk attempt | 1.0.0 | 25 | production-apk | internal | `5d0b2a15c8d3` |

The current APK artifact is:

`https://expo.dev/artifacts/eas/vbE-sWzEU3Jd0LhlaYXfJfdjojiOmELRNpaIzs8bvqQ.apk`

Its downloaded archive SHA-256 was
`f5f0a4fde7a6267be77b17b4e9d591e1a0fa10b77c82b4874de2e84e212936e4`.

## 16. Android versionCode forensic

Version code `24` was reused across multiple distinct APK binaries and
multiple Git SHAs. The current APK has a distinct native fingerprint from the
previous two preview builds, so it is not byte-identical to them, but Android
package identity does not communicate that distinction to the owner.

EAS history contains version codes `25` and `26` on canceled production-APK
attempts. Those values should be treated as allocated/consumed for safe
release planning even though the builds were canceled. The highest observed
floor is therefore `26`; the next safe value is `27`.

An Android package update with the same application ID and same signing
identity can technically replace an installed package without a higher
version code in some installer paths, but the same version code makes the
workflow ambiguous and does not provide a reliable upgrade signal. A user can
download the current APK and still continue launching the previously installed
package or fail to get a clear upgrade transition. A fresh version code is the
safe way to remove that ambiguity.

## 17. Current Android versionCode floor

| Item | Result |
|---|---|
| Current repository versionCode | `24` |
| Current preview APK versionCode | `24` |
| Highest EAS history value observed | `26` |
| Safe next versionCode | `27` |
| Source change required to fix API drift | No |
| Fresh APK useful after remediation | Yes, to remove package ambiguity |

No version code was modified by this audit.

## 18. Current development API identity

The active development API reports:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "0d1e02115b082f21a6df51b7db4ac2ce3c1bc5a6",
  "sourceTree": "7460de05a864ee43e1032ba93d22483731d69895",
  "sourceDigest": "4c854eeaf13c9696979db85f93d7d03afce061660b26d7072f3b0c32603a8719",
  "buildTimestamp": "2026-09-17T11:46:22.850Z",
  "releaseId": "calora-api-0d1e02115b08-20260917114622850"
}
```

This is the source represented by the active development API workflow.

## 19. Live production API identity

Both public production hosts returned healthy responses:

- `https://calorie-coach-pie35449.replit.app/api/healthz` → `{"status":"ok"}`
- `https://mycaloraapp.com/api/healthz` → `{"status":"ok"}`

Both returned the same release attestation:

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

The deployment metadata previously resolved the production deployment to
`https://mycaloraapp.com`, with
`https://calorie-coach-pie35449.replit.app` as an additional public URL.
The deployment is serving a successful, healthy release, but not the current
development release. A precise deployment publish timestamp for this older
release was not exposed by the version endpoint.

## 20. Development-vs-production release delta

Development and production are both healthy, but they are different releases:

| Runtime | Commit | Tree | Build time |
|---|---|---|---|
| Development | `0d1e02115b08` | `7460de05a864` | 2026-09-17 11:46Z |
| Production | `dd4d130b03e6` | `ffec94339941` | 2026-09-16 12:09Z |

The production release predates the current API product commits. The delta is
not just a report timestamp: it contains changed runtime handlers in planner,
recipes, and sync.

## 21. File-level API delta

Compared with the production source commit, the current workspace API changes
are:

| Path | Classification | Runtime change |
|---|---|---|
| `artifacts/api-server/src/routes/recipes.ts` | P2_USER_VISIBLE | Nutrition estimates now require finite, non-negative macro values and a positive calorie value; malformed/zero estimates are rejected instead of normalized into misleading zeros. |
| `artifacts/api-server/src/routes/planner.ts` | P1_FUNCTIONAL / P2_USER_VISIBLE | Program meal ordering is centralized; starter-week fallback now creates seven days with role-aware fallback meals rather than a single role map reused across days. |
| `artifacts/api-server/src/routes/sync.ts` | P1_FUNCTIONAL / P2_USER_VISIBLE | Sync accepts `imageAssetKey`; capture approval is acknowledged atomically and owner-scoped after diary application. |

The production-to-current diff also contains test-only changes. No current
product database migration or schema path is required by these three runtime
diffs.

## 22. Capability-level API delta

| Capability | Current behavior | Production behavior | Expected stale symptom | Risk |
|---|---|---|---|---|
| Recipe nutrition | Rejects malformed/zero macro estimates | Older permissive normalization | Nutrition may appear as old or less truthful values | Low deployment risk; response semantics change |
| Premium/Discover recipe freshness | Current mobile freshness/remount policy is present; current recipe handler validates output | Older handler/provider path | Discover/Plus content appears unchanged or stale | Provider/config dependent |
| Planner Programs | Shared program ordering and role-aware seven-day fallback | Older ad hoc filters/fallback | Selected Program does not shape generated/fallback week as expected | Requires API smoke verification |
| Smart Scan approval | Sync transaction acknowledges owner-scoped review→approved | Older sync does not perform this acknowledgement | Approval can remain in review or retry path; Home may not reflect it | Needs capture/sync regression check |
| Food Memory/diary images | Sync carries image metadata and preserves provenance | Older sync lacks current metadata path | Image/provenance changes appear absent after sync | Backward compatible at table level |
| Home Today | Current mobile derives from local state plus synced diary | Production may return older sync results | Home remains stale after remote sync | Account/state dependent |
| Coach Fact Context | Current mobile bounds requests; server endpoint remains gated | Production release is older | New bounded request behavior may not be visible; exact provider state unproven | Safety gate must remain default-deny |
| Account/auth/isolation | No relevant API route delta found in this period | Existing production route is healthy | Not the primary stale symptom | Must retain auth checks during deployment |

No changed endpoint was shown to be removed, so the primary compatibility issue
is stale semantics/fields rather than guaranteed 404s. Exact live authenticated
responses were not exercised because that would require account test data and
could create writes; response-shape compatibility is therefore marked partial
where applicable.

## 23. Mobile/API contract compatibility

| Area | Mobile expectation | Development | Production | Result |
|---|---|---|---|---|
| Recipes | Valid nutrition/provenance and freshness semantics | Current | Older implementation | PARTIAL |
| Premium recipes | Entitlement-aware current recipe list | Current client/server source | Older handler/provider path | PARTIAL |
| Planner | Program-shaped generated or fallback week | Current | Older fallback/program logic | PARTIAL |
| Weekly Programs | Selector/detail local transition plus API apply/generation | Current | Existing route, older supporting behavior | PARTIAL |
| Capture | Review then explicit approval and durable sync | Current | Older sync acknowledgement | PARTIAL |
| Diary | Image/provenance metadata retained | Current | Older sync payload handling | PARTIAL |
| Sync | Account-scoped idempotent mutation processing | Current | Older route behavior | PARTIAL |
| Coach Fact Context | Bounded client request and gated server response | Current | Older runtime release | UNPROVEN/PARTIAL |
| Account/auth | Bearer-authenticated scoped routes | Current | Healthy old release | YES for known routes |
| Referrals | Referral and qualification routes | Current source | No delta in this period | UNPROVEN live behavior |
| Account deletion | Fenced deletion state and recovery behavior | Current source | No delta in this period | UNPROVEN live behavior |

No evidence indicates the mobile binary is calling localhost, a Railway host,
or a development-only host. The major mismatch is the age of the selected
production release.

## 24. Database compatibility preflight

Read-only metadata queries were run against development and production.
Both exposed the required current table set, including:

- `calora_diary_entries`;
- `calora_ai_capture_sessions`;
- `calora_ai_capture_candidates`;
- `calora_recipe_nutrition`;
- `calora_server_config`;
- `calora_coach_fact_context_consents`;
- `calora_coach_fact_context_idempotency`;
- `calora_account_deletion_states`;
- `calora_referral_codes`;
- `calora_referral_redemptions`;
- `calora_sync_mutations`;
- `calora_profiles`;
- `calora_subscriptions`.

The current and production metadata both include the relevant diary columns:
`capture_session_id`, `image_url`, `image_source`, and `sync_metadata`, as well
as the capture session `status` column and Coach consent fields.

| Dependency | Classification | Evidence |
|---|---|---|
| Tables required by current runtime delta | PRESENT_COMPATIBLE | Same named tables in development and production |
| Diary image/capture columns | PRESENT_COMPATIBLE | Same columns in both metadata results |
| Coach consent tables | PRESENT_COMPATIBLE | Same table and columns |
| Referral/account tables | PRESENT_COMPATIBLE | Same table set |
| PostgreSQL functions/triggers/support objects | UNKNOWN | Not inferred from table metadata; requires separate controlled inspection |
| Data backfill/seed requirement | UNKNOWN | Runtime delta did not introduce a required data migration |
| Destructive schema operation | NOT INDICATED | No active product migration changed these paths |

**Conclusion:** API alignment appears to be an API deployment-only
preflight, subject to the production configuration and support-object
verification that must precede an actual deployment. This audit did not mutate
the database.

## 25. Production configuration/secrets preflight

The current API source references configuration categories for Supabase auth,
database connectivity, OpenAI, recipe providers, object storage, RevenueCat,
Coach rollout, CORS, and account-deletion controls.

| Category | Required by current source | Presence result | Risk |
|---|---:|---|---|
| Database connection | Yes | Operationally present; health/version are live | Deployment startup failure if changed |
| Supabase public/auth configuration | Yes | Operationally inferred; exact secret presence not inspected | Auth failure if missing/mismatched |
| OpenAI integration | Planner/recipe generation | Unknown from secret-presence-only audit | Generation may fall back or fail |
| TheMealDB/premium recipe provider | Recipe flows | Unknown | Provider-backed discovery may remain unavailable |
| FatSecret/gateway provider | Premium recipe path | Unknown | Premium data may remain stale/unavailable |
| Object storage | Recipe/image metadata paths | Unknown | Image asset resolution risk |
| RevenueCat verification | Premium/account flows | Unknown | Entitlement display risk |
| Coach feature gate | Bounded Coach | Present as source control; runtime rollout value not exposed | Must remain default-deny |
| CORS/release controls | API startup/release identity | Health/version prove runtime starts | Misconfiguration could block mobile calls |

No secret value was displayed. Presence of provider credentials cannot be
proven from the read-only public endpoints alone.

## 26. Coach activation safety

The current source retains the bounded Coach/Fact Context boundary:

- explicit consent remains a prerequisite;
- requests remain bounded;
- history/context limits remain enforced;
- allowlisted navigation and response handling remain client constraints;
- provider activation remains separate from ordinary release identity;
- current build controls require explicit sensitive-release activation inputs.

No audit operation enabled Coach globally or changed cohort, nonce, consent,
expiry, default-deny, or provider activation state. A future production API
deployment must independently verify these controls before enabling any
sensitive path.

## 27. Recipes/Plus/Discover runtime trace

Build 7 and the current Android source use the production API origin for
server-backed recipe discovery, premium recipe access, and nutrition
enrichment. Mobile freshness/remount policy is present in the current source.
The server-side current delta is in `routes/recipes.ts`:

- current code rejects non-finite, negative, empty, and zero-calorie nutrition
  estimates;
- the old production code coerces values with `Number(...) || 0` and only
  rejects zero calories.

Purely mobile remount/freshness behavior can be present in Build 7 but still
appear ineffective when the old production handler/provider returns the same
old data. Provider availability and user entitlement state remain additional
runtime dependencies. Clearing local data is not the primary remedy.

## 28. Smart Scan/Home runtime trace

The current flow is:

camera → capture session/candidate → review → approval → local diary
snapshot/Food Memory → durable outbox → authenticated sync → Home Today.

The mobile pieces are present in the recent source lineage. The current sync
handler:

- accepts image metadata needed for provenance;
- writes the diary row with the owner scope;
- conditionally acknowledges the matching owner-scoped capture session from
  `review` to `approved` in the same transaction.

The old production sync handler lacks that current acknowledgement behavior.
This can leave approval or Home Today appearing stale even when the scan UI is
current. Local outbox retries and account-scoped snapshots can also delay the
visible result.

## 29. Planner runtime trace

Weekly Programs selector/detail is a mobile state transition and was
physically observed working on iOS Build 7. Planner generation, fallback
construction, program ordering, recipe data, and shopping-list inputs use
server/current-source behavior.

The current API:

- uses shared program eligibility/order rules;
- creates a seven-day role-aware starter week;
- uses a day-specific fallback when generated choices are missing.

The production API retains the older filter and fallback behavior. Therefore
selector/detail can work physically while Apply or a generated/fallback week
still looks unchanged. Viewed-week context and persisted planner state also
need explicit device verification.

## 30. Diary/sync runtime trace

Diary and Food Memory have meaningful local behavior and durable persistence.
Authenticated sync is server dependent. The current sync code preserves
provenance/image metadata and capture approval, while production is behind.

This is a functional server delta, not just a visual issue. The current
database has the columns needed for the newer sync payload, so the evidence
does not require a schema migration before API alignment.

## 31. Account/auth runtime trace

Supabase-backed authentication and account-scoped API predicates are present in
the current source. Production `/api/healthz` and `/api/version` are healthy,
but those public probes do not prove an authenticated mutation or deletion
flow. No account/auth product commit in this period was found to be missing
from the current production database object set.

Account isolation remains a required physical-device check with two accounts.
It is not the strongest explanation for the broad “nothing changed” symptom.

## 32. Cache/persistence analysis

The current mobile architecture persists account-scoped local state including
onboarding drafts/completion, diary logs, Food Memory, planner week/meals,
profile data, health snapshots, notification preferences, auth/session data,
and outbox state. React Query and recipe freshness/session state can retain
remote data during a normal app session.

| Layer | App update preserves it | Reinstall usually clears it | Logout/account switch fences it | Can mask change |
|---|---|---|---|---|
| React Query/cache | Usually in memory; invalidation is flow-dependent | Yes | Should be account-scoped | Yes |
| Async/local persistence | Yes | Usually yes | Account-scoped keys/fences | Yes |
| Onboarding draft | Yes | Usually yes | Not inherently remote | Yes for R-01/R-02 |
| Food Memory/diary | Yes | Usually yes | Account-scoped | Yes |
| Planner state | Yes | Usually yes | Account/week scoped | Yes |
| Profile/entitlement state | Yes | Usually yes | Auth/account scoped | Yes |
| Health snapshot | Yes | Usually yes | Device/account dependent | Yes |
| Auth session | May survive update | Usually cleared | Logout clears/fences | Yes |
| Sync outbox | Yes and intentionally durable | Usually cleared | Must be account fenced | Yes |

This is a contributing explanation for individual observations, but it cannot
explain the proven development/production release mismatch.

## 33. Metro ENOSPC analysis

The Expo workflow is currently failed with:

`ENOSPC: System limit for number of file watchers reached`

Classification:

- reproducible/observed in the current workflow state;
- affects local Metro/live preview;
- does not affect completed EAS builds, which ran remotely from recorded Git
  sources;
- cannot remove source from an already completed native binary;
- can make the Replit/Expo development preview appear unchanged or unavailable;
- is independent of production API drift.

Host watcher limits were not changed during this audit.

## 34. Report/documentation-tail analysis

The current workspace contains a large release/report snapshot tail, including
`.step44-remediation` and `.step55-release` trees, reports, logs, memory
metadata, and asset metadata. These files explain why workspace HEAD is far
ahead by commit count and why a raw HEAD comparison is noisy.

The actual current product source is not absent: source commits are ancestors
of `origin/main`, and the recent mobile/API paths are present in the checkout.
The report tail should not be interpreted as 24 hours of additional runtime
features.

## 35. Build 7 visual-staleness matrix

| Target/change | Build 7 status | Why it can look unchanged |
|---|---|---|
| R-01 keyboard | PRESENT_BUT_REQUIRES_SPECIFIC_FLOW | Must be tested on onboarding input with keyboard open |
| R-02 agreement semantics | PRESENT_BUT_REQUIRES_SPECIFIC_FLOW | Existing onboarding draft/completion can skip the path |
| R-03 Plus remount | PRESENT_BUT_CACHE_OR_STATE_DEPENDENT | Requires entitlement/list remount transition |
| R-04 Discover/Plus freshness | PRESENT_BUT_BACKEND_BLOCKED | Production recipe handler/provider is old |
| R-05 nutrition truthfulness | PRESENT_BUT_BACKEND_BLOCKED | Production nutrition normalization is old |
| Weekly Programs selector/detail | VISIBLE_IN_BUILD_7_NOW | Physically worked; Apply/generation remains backend-sensitive |
| Smart Scan approval | PRESENT_BUT_BACKEND_BLOCKED | Old production sync lacks current acknowledgement |
| Food Memory | PRESENT_BUT_CACHE_OR_STATE_DEPENDENT | Local memory may be current while remote sync is old |
| Home Today | PRESENT_BUT_BACKEND_BLOCKED | Remote diary/sync result can remain stale |
| Planner fallback/program shaping | PRESENT_BUT_BACKEND_BLOCKED | Production planner fallback is old |
| Diary image provenance | PRESENT_BUT_BACKEND_BLOCKED | Current sync metadata path is absent in production |
| Bounded Coach client behavior | PRESENT_BUT_REQUIRES_SPECIFIC_FLOW | Consent/history/request bounds must be exercised |
| Health | PRESENT_BUT_REQUIRES_SPECIFIC_FLOW | Native permission and current-day snapshot required |
| Premium/RevenueCat | UNPROVEN | Provider entitlement state not exercised |
| Account isolation | UNPROVEN | Requires two-account device test |

This matrix explains how a user can see no meaningful change: local-only
changes require a targeted flow, while several high-visibility flows are fed
by the old production API.

## 36. Confirmed root causes

| Candidate | Classification | Evidence | Consequence |
|---|---|---|---|
| Stale production API | CONFIRMED | Production `/api/version` is `dd4d130b`; development is `0d1e021`; both hosts match | Server-backed changes do not reach Build 7/Android |
| Android versionCode collision | CONFIRMED | Distinct preview SHAs/fingerprints all use versionCode 24; EAS history reaches 26 | Installed package can remain ambiguous/older |
| Live preview/Metro failure | CONFIRMED | Expo workflow failed with watcher-limit ENOSPC | Development preview cannot reliably show current source |

## 37. Contributing causes

| Candidate | Classification | Evidence |
|---|---|---|
| Local cache/persistence | CONTRIBUTING | Onboarding, planner, diary, Food Memory, auth, and outbox state persist |
| Provider/cache behavior | CONTRIBUTING/UNPROVEN | Recipe and entitlement flows depend on provider responses and freshness policy |
| Report-tail confusion | CONTRIBUTING | Workspace HEAD contains large report/snapshot trees that obscure product history |

## 38. Ruled-out causes

| Candidate | Classification | Evidence |
|---|---|---|
| Lost mobile source | RULED_OUT | Recent mobile commits are in `origin/main` and workspace; current APK records workspace HEAD |
| Wrong iOS Build 7 SHA | RULED_OUT | Step 56 exact EAS/TestFlight report verifies Build 7 SHA and IPA hash |
| Incorrect production API host | RULED_OUT | Build 7 target is the intended production host; both public hosts resolve to same release |
| Required current database columns missing | RULED_OUT for audited delta | Read-only metadata matches current required tables/columns |

## 39. Unproven causes

These were not safe or necessary to prove with writes:

- exact authenticated production response bodies for every route;
- production provider credential presence and provider freshness;
- PostgreSQL functions, triggers, policies, and support-object parity;
- whether the owner is currently testing Build 7, the new Android APK, the old
  Android installation, or the failed Expo preview;
- whether a particular local account/session has stale React Query data;
- exact physical-device package-manager behavior for the owner's device and
  installer.

## 40. iOS Build 7 decision

**PARTIAL — SOME FIXES REQUIRE BACKEND, OTHERS REQUIRE NEW MOBILE BUILD**

Build 7 does not need a new native build to receive the identified
server-backed recipe, planner, sync, and capture-approval behavior after a
verified production API alignment, because its embedded API host is already
the intended production host. Build 7 contains the mobile recovery source by
the exact Step 56 canonical-source and artifact evidence.

A new iOS build would only be needed for mobile source or embedded-config
changes not already in Build 7. This audit found no such missing source/config
change for the named recovery work. Build 7 must remain unchanged until
production alignment and physical retest are complete.

## 41. Android APK decision

**YES — a fresh APK is recommended after remediation, but not because the
current source is missing.**

The current APK was built from workspace HEAD and has a distinct fingerprint,
but it uses versionCode `24`, which is shared by earlier preview builds. The
next safe version code based on EAS evidence is `27`. A new APK is needed to
remove the installed-binary ambiguity. API deployment alone can fix
server-driven behavior in an already-current APK, but it cannot prove which
same-version package the owner is launching.

No version code was changed and no APK was built by this audit.

## 42. Proposed remediation sequence

This sequence is proposed only; it was not executed:

1. **Production API preflight:** verify deployment source, provider config,
   database support objects, release controls, and Coach default-deny state.
2. **Controlled API deployment:** publish the reviewed current API source
   without enabling sensitive Coach activation.
3. **Runtime verification:** require production `/api/version` to report the
   reviewed commit/tree, then smoke-test health, recipes, planner, sync, and
   auth-scoped routes.
4. **Android identity remediation:** change Android version code to `27` in a
   separately authorized change.
5. **Provenance-controlled Android APK:** build from the reviewed source and
   record the EAS SHA, version code, fingerprint, and artifact hash.
6. **Metro remediation:** address the local watcher-limit failure without
   confusing it with production release state.
7. **Device verification:** test Build 7 unchanged after API alignment,
   install the new Android package, and exercise the named flows with fresh
   account/week/cache conditions only where the specific flow requires it.

Do not clear user data as the primary fix. Use targeted state reset only if a
specific test case proves a persisted state dependency.

## 43. Deployment risk assessment

The API changes are concentrated in planner, recipes, and sync. Database
metadata supports the current fields, but deployment still carries these
risks:

- provider/configuration absence can make recipe/premium behavior fall back;
- planner output shape and fallback behavior should be smoke-tested;
- sync approval must remain owner-scoped and idempotent;
- account predicates must remain unchanged;
- release attestation must match the actual deployed artifact;
- Coach rollout must remain default-deny unless separately authorized.

The production health endpoint being green does not prove feature parity.

## 44. Build risk assessment

The Android build risk is primarily release identity, not source compilation:

- versionCode `24` is ambiguous;
- EAS history already includes `25` and `26`;
- version code `27` is the conservative next floor;
- the current APK artifact is large but successfully downloaded and hashed;
- the Expo workflow watcher failure is independent of EAS remote build success.

iOS Build 7 has already passed Apple processing and should not be rebuilt as
part of this finding.

## 45. Remaining unknowns

1. Whether the owner is opening the new Android artifact, an older installed
   Android package, iOS Build 7, or Expo preview.
2. Whether production provider credentials/configuration are complete for all
   current recipe and AI paths.
3. Whether production PostgreSQL support functions/triggers/policies match the
   current release.
4. Whether the owner's local account has stale planner, recipe, auth, or
   outbox state.
5. Whether any remote provider cache independently serves old recipe data after
   API alignment.
6. Whether an authenticated endpoint has a subtle response-shape difference
   not observable from public health/version probes.

## 46. Exact recommendation for Step 58

Step 58 should be an explicitly authorized controlled remediation, not another
blind build:

1. preflight and publish the reviewed API release;
2. verify the live release identity and bounded Coach safety;
3. retest unchanged iOS Build 7 against the aligned production API;
4. bump Android to versionCode `27` and build a provenance-recorded APK;
5. restore Metro preview separately;
6. run the recovery matrix on a physical iOS device and Android device,
   recording whether each result is mobile-visible, backend-blocked,
   state-dependent, or provider-dependent.

## Mandatory release identity table

| Layer | SHA/release | Timestamp | Runtime target | Current? | Evidence |
|---|---|---|---|---|---|
| `origin/main` | `5f69c31e4816` / tree `0b4185eac78f` | 2026-09-17 07:28Z | canonical source ref | Yes for product source | Git ref |
| Workspace HEAD | `0d1e02115b08` / tree `7460de05a864` | 2026-09-17 11:16Z | development source and Android build | Yes | Git + EAS Android record |
| Last mobile product | `755b433240c2` | 2026-09-17 06:00Z | mobile source | Yes in origin/workspace | Git history/path diff |
| Last API product | `755b433240c2` plus API commits listed above | 2026-09-17 06:00Z | development API source | Yes in development | Git diff + `/api/version` |
| iOS Build 7 | `dec8f0d6a953` / IPA hash recorded above | Step 56 verified | TestFlight | Yes/unchanged | Exact Step 56 report |
| Latest Android APK | `0d1e02115b08` / artifact hash recorded above | 2026-09-17 12:19Z | internal preview APK | Yes, but version ambiguous | EAS history + downloaded APK |
| Development API | `calora-api-0d1e02115b08-20260917114622850` | 2026-09-17 11:46Z | dev API | Yes | `/api/version` |
| Production API | `calora-api-dd4d130b03e6-20260916120901599` | 2026-09-16 12:09Z | both public production hosts | No, behind development | `/api/version` |

## Mandatory recovery matrix

| Capability | Current main | Build 7 | Backend required? | Production compatible? | Cache/state dependent? | Status |
|---|---:|---:|---:|---:|---:|---|
| R-01 onboarding keyboard | Yes | Yes | No | n/a | Yes | present, targeted test |
| R-02 agreement semantics | Yes | Yes | No | n/a | Yes | present, targeted test |
| R-03 Plus remount | Yes | Yes | Partial | Partial | Yes | present, entitlement flow |
| R-04 Discover/Plus freshness | Yes | Yes | Yes | No/partial | Yes | backend drift |
| R-05 nutrition truthfulness | Yes | Yes | Yes | No | Yes | backend drift |
| Weekly Programs | Yes | Yes | Partial | Partial | Yes | selector proven, apply pending |
| Smart Scan approval | Yes | Yes | Yes | Partial | Yes | backend drift |
| Food Memory | Yes | Yes | Sync | Partial | Yes | state and sync dependent |
| Home Today | Yes | Yes | Sync | Partial | Yes | state and sync dependent |
| Diary/outbox/sync | Yes | Yes | Yes | Partial | Yes | backend drift |
| Bounded Coach | Yes | Yes | Yes | Unproven/partial | Yes | safety-preserving retest |
| Health | Yes | Yes | Native provider | n/a | Yes | device authorization |
| Premium/RevenueCat | Yes | Yes | Provider/API | Unproven | Yes | provider retest |
| Account isolation | Yes | Yes | Auth API | Partial | Yes | two-account retest |

## Mandatory API delta table

| Capability | Development source | Production source | Difference | User-visible effect | DB dependency | Risk |
|---|---|---|---|---|---|---|
| Recipes/nutrition | Strict finite positive nutrition parser | Older permissive parser | Invalid values are rejected differently | More truthful nutrition in current path | Existing recipe nutrition tables | P2 |
| Planner | Shared ordering and role-aware seven-day fallback | Older filters and fallback map | Program/fallback meals differ | Program choice may appear ignored | Existing planner/catalog data | P1/P2 |
| Capture approval/sync | Owner-scoped transactional approval acknowledgement | No current acknowledgement | Review state can remain old | Scan/Home may appear stale | Existing capture/diary columns | P1 |
| Diary image provenance | Current image metadata accepted and retained | Older sync payload | Image/provenance fields may be absent | Diary image history appears old | Existing columns present | P2 |

## Mandatory root-cause table

| Candidate | Classification | Evidence | User-visible consequence |
|---|---|---|---|
| Lost mobile source | RULED_OUT | Source commits present in canonical refs | Not the cause |
| Wrong iOS build SHA | RULED_OUT | Exact Build 7 EAS/IPA verification | Not the cause |
| Stale production API | CONFIRMED | Production and development attestations differ | Server-backed changes absent |
| API contract drift | CONTRIBUTING/PARTIAL | Current route semantics differ; no removed endpoint proven | Old shapes/behavior possible |
| Database drift | RULED_OUT for audited tables/columns; support objects unknown | Read-only metadata parity | Not currently evidenced |
| Android versionCode collision | CONFIRMED | Reused 24; EAS floor 26 | Older package can remain ambiguous |
| Local cache/persistence | CONTRIBUTING | Multiple durable local layers | Specific flows can look unchanged |
| Metro/live preview failure | CONFIRMED | ENOSPC watcher failure | Expo preview unavailable/stale |
| Provider/cache behavior | UNPROVEN | Provider credentials/live authenticated results not inspected | May affect recipe/entitlement freshness |
| Other | UNPROVEN | Owner’s exact tested artifact/device unknown | Requires device-level retest |

## Final verdict

**RUNTIME DELIVERY DRIFT CONFIRMED — CONTROLLED REMEDIATION REQUIRED**

The audit is complete and stops here as required. No remediation stage was
executed.