# STEP 58E — CALORA USER-VISIBLE CHANGE DELIVERY FORENSIC AUDIT

**Date:** 2026-09-17  
**Scope:** Read-only end-to-end audit of why expected Calora changes were not visibly observed in physical iOS TestFlight Build 7.  
**Report status:** Accessible project report; no product source, build, deployment, database, mobile artifact, TestFlight, Metro, RevenueCat, or Coach state was changed by this audit.  
**Fitness:** Intentionally excluded.

## Final verdict

# USER-VISIBLE DISCREPANCY UNRESOLVED — DO NOT REBUILD OR REPUBLISH

The exact iOS Build 7 source membership is proven for every enumerated mobile capability. Current canonical `origin/main` contains no meaningful mobile product code newer than Build 7. The live API is healthy and remains runtime-equivalent under Step 58D-R4.

The physical observation that the expected changes were not visible cannot be attributed to a missing Build 7 mobile source change. The available evidence does not contain a device trace showing the account, onboarding state, Premium entitlement, navigation path, cache state, API session, or exact screen flow used during the physical test. Those state and flow conditions are sufficient to make implemented behavior appear unchanged.

No remediation is authorized by Step 58E. Do not rebuild iOS, begin Android versionCode 27 work, or Republish the API until a targeted physical flow/state trace resolves the discrepancy.

## 1. Frozen identities

### A. Canonical `origin/main`

| Field | Value |
|---|---|
| SHA | `5c2edf1b28c00ba86b25494d860e9b0bc69debca` |
| Tree | `8eac19f420fba0640dd96188cf0be60770b3ced5` |
| Relationship to Build 7 | Build 7 is an ancestor |

### B. Workspace at audit freeze

| Field | Value |
|---|---|
| Branch | `main` |
| HEAD | `e34b2ca270dc4a3a9fa8ea00fcb025de85b92bb7` |
| Tree | `73730cd014f99b2a7adb39c41b3f094cd588c14c` |
| Git status | Clean at the audit freeze |

The workspace HEAD is a report/attachment-history descendant of canonical main. The product/mobile path comparison remained unchanged; no source mutation was performed by Step 58E.

### C. Exact iOS TestFlight Build 7

The previously preserved EAS/TestFlight evidence records:

| Field | Value |
|---|---|
| EAS Build ID | `45900e2d-298f-4ece-9041-0e42513266e4` |
| Status | `FINISHED` |
| Platform/profile | iOS production / `STORE` |
| Version | `1.0.0 (7)` |
| Bundle ID | `com.etiendem.caloraapp` |
| EAS-recorded Git SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` |
| Build 7 tree | `f4c820017b82c48052571eb432806b3185aabcfb` |
| IPA SHA-256 | `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13` |
| Apple processing | `VALID` |
| Apple beta state | `IN_BETA_TESTING` |

The Build 7 commit is:

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
tree f4c820017b82c48052571eb432806b3185aabcfb
parent 5f69c31e4816abcfa5fff69389e4699fd4f1428f
subject Prepare iOS build 7 provenance-controlled candidate
```

Its direct commit diff contains only:

```text
M artifacts/calora/app.json
```

The Build 7 app configuration contains iOS version `1.0.0`, iOS `buildNumber: "7"`, and Android `versionCode: 24`.

### D. Current production API

Both production aliases returned the same current identity:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "80e49abe39153d2b867fec14b393e7a7fdecaa7f",
  "sourceTree": "1a9d2adbe2a33d8c21677f1b0766fd38e13980ed",
  "sourceDigest": "570b6baadb9a77675ed671df2a56f7f3f4ed8a4be89782781626bec4ef62089f",
  "buildTimestamp": "2026-09-17T21:40:29.464Z",
  "releaseId": "calora-api-80e49abe3915-20260917214029464"
}
```

Both:

- `https://calorie-coach-pie35449.replit.app/api/version`
- `https://mycaloraapp.com/api/version`

returned that exact release identity. Step 58D-R4's runtime-equivalence conclusion remains intact.

## 2. Build 7 source-membership proof

The complete semantic comparison of Build 7 against current canonical shows zero changes under:

- `artifacts/calora/**`
- `lib/**`
- `shared/**` (the repository has no `shared/` directory)
- `artifacts/api-server/src/**`
- `artifacts/api-server/package.json`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

Build 7 is an ancestor of canonical `origin/main`. Every implementation commit listed below is also an ancestor of Build 7. The selected implementation paths exist at the exact Build 7 SHA, and the primary mobile files are byte-identical between Build 7 and current canonical.

| Feature | Implementation commit | Implementation paths | Ancestor of Build 7? | Exact Build 7 code present? | Server dependency? | Runtime gate/state dependency | Expected physical UI effect |
|---|---|---|---|---|---|---|---|
| R-01 keyboard-aware onboarding | `cd638c22a1195a4969087d1cd9717e91c0be2506` | `artifacts/calora/app/index.tsx`, `components/KeyboardAwareScrollViewCompat.tsx`, onboarding tests | YES | YES | NO | Hydration, onboarding step/draft, first-run or review route | Fields remain scroll-visible above the keyboard |
| R-02 final agreement/consent | `cd638c22a1195a4969087d1cd9717e91c0be2506` | `artifacts/calora/app/index.tsx`, onboarding tests, `CaloraContext.tsx` | YES | YES | NO | `consent`, persisted completion/review state | Agreement is prominent/accessibility-labeled; final CTA is disabled until agreement |
| R-03 Plus remount behavior | `f9148dc2070debf7ce944b229caa83b6d8f906f6` | `app/(tabs)/recipes.tsx`, `lib/premiumRecipeAccess.ts`, `lib/recipeFreshness.ts`, query/cache helpers | YES | YES | YES | User scope, Premium entitlement, React Query client/cache, remount lifecycle | Reopening Plus does not unnecessarily reload the same catalogue |
| R-04 Discover/Plus freshness and pagination | `f9148dc2070debf7ce944b229caa83b6d8f906f6` | `app/(tabs)/recipes.tsx`, freshness and Premium pagination helpers | YES | YES | YES | `nextOffset`, page merge, freshness memory, provider alternatives, Premium access | Bounded rotation and pagination rather than an identical top sequence |
| R-05 nutrition truthfulness | `755b433240c262487a6d77472c4f7dafaba2615a` | `lib/recipeNutrition.ts`, recipes/planner screens, API recipe route and generated contracts | YES | YES | YES | Nullable nutrition response, provenance, provider/data state | Unknown nutrition stays unknown; legitimate numeric zero remains zero |
| Weekly Programs modal | `e6c8d7cd8d629252734da599cd16e5f7183f93a1` | `app/(tabs)/planner.tsx`, `lib/programModalState.ts` | YES | YES | NO for modal | Navigation/modal state and iOS interaction path | Detail/selector transitions work; this previously passed physical iOS testing |
| Weekly Programs Apply/generation and planner ordering/fallback | `d31418d7fa10226195782720768f2650788f5264` | `data/planner.ts`, `app/(tabs)/planner.tsx`, API planner contracts/routes | YES | YES | YES for generation | Selected program, eligibility, persisted planner state, API response/revision guards | Apply and generated week use the selected program and deterministic fallback |
| Smart Scan approval | `7b1ae6352fb2924099a3becf04306ceae91b4f52` | `app/(tabs)/scan.tsx`, `CaloraContext.tsx`, capture acceptance coordinator, sync route | YES | YES | YES for remote approval/sync | Review approval, local Food Memory draft, outbox, auth, background approval | Accepted scan becomes a Food Memory/diary entry; approval does not block local logging |
| Home Today and sync | `8965cc6b8366743096e31bfd0a350930603b4915` | Home tab, `useDiarySync.ts`, `diarySync.ts`, `CaloraContext.tsx` | YES | YES | YES for sync | Date selection, hydrated account scope, token, initialized sync, outbox | Today view and sync state reflect the account/date/outbox state |
| Diary image provenance | `8965cc6b8366743096e31bfd0a350930603b4915` | `foodImageMetadata.ts`, `diarySync.ts`, Food Memory/diary context | YES | YES | YES for sync | Trusted HTTPS source, account merge, image cache/source metadata | Diary preserves source/provenance instead of displaying an untrusted URI |
| Bounded/default-deny Coach | `b3b023694266f66397ae2c9b9099f820afa13e1c` | `app/coach.tsx`, consent panel, Coach fact-context client/lifecycle | YES | YES | YES, intentionally disabled in production | Account consent, request lifecycle, runtime release gate, cohort/nonce controls | Safe unavailable/default-deny behavior; activated Coach is not expected |
| Account isolation/auth | Exact feature commit not uniquely isolated; attribution **UNKNOWN** | `app/_layout.tsx`, `AuthContext.tsx`, `lib/auth.ts`, account storage, sync/context scope | UNKNOWN | YES; paths and source are present at Build 7 | YES for authenticated requests | Supabase session/token, account-scoped storage, query client, scope epoch | Switching accounts does not reuse another account's local/server state |

Direct Build 7 content checks found the relevant source symbols for keyboard-aware onboarding, consent gating, recipe pagination/access, planner ordering and modal state, capture approval, diary sync, trusted image metadata, and Coach consent/default-deny handling. The selected mobile files are unchanged between Build 7 and current canonical.

No expected feature was found to be absent from Build 7. Therefore no feature receives the classification:

```text
NOT PRESENT IN IOS BUILD 7 — NEW MOBILE BUILD REQUIRED
```

## 3. Current canonical versus Build 7

The meaningful non-mobile diff from Build 7 to current canonical is:

```text
M .replit
M artifacts/api-server/.replit-artifact/artifact.toml
M artifacts/api-server/build.mjs
```

Classification:

| Difference | Classification | User-visible mobile impact |
|---|---|---|
| `.replit` production values changed to `COACH_FACT_CONTEXT_ENABLED=false`, `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false`, and the reviewed commit pin | Release-control | None to mobile product code; preserves Coach default-deny |
| API `artifact.toml` production build/runtime controls | Release-control/build configuration | None to mobile product code |
| `build.mjs` conditional external sensitive-release manifest behavior | Release-control/build behavior | None to API route implementation or mobile bundle |
| Reports, attachments, and metadata outside the product path | Metadata/report-only | None |

There are zero changes under `artifacts/calora`, `lib`, `shared`, API runtime source, package manifests, or lockfiles. Therefore:

```text
USER-VISIBLE MOBILE PRODUCT CHANGES ON CURRENT CANONICAL MAIN NOT IN BUILD 7 = NO
```

Rebuilding iOS from current canonical would not materially change the installed mobile application because the mobile source/configuration path is unchanged from Build 7. A new build would create a new artifact identity, but no evidence shows it would add the missing user-visible behavior.

## 4. End-to-end feature tracing and visibility categories

### R-01 — onboarding keyboard-aware input

**Trace:** `app/index.tsx` renders `KeyboardAwareScrollViewCompat` and the onboarding fields. `CaloraContext` owns hydrated onboarding progress and draft state. No API is required. The visible behavior requires entering the onboarding route with a keyboard-open field.

**Category:** D — only visible after logout/new onboarding or an incomplete onboarding state. A completed account can bypass this screen entirely. Existing persisted onboarding-complete state can make the fix appear absent.

### R-02 — final agreement/consent

**Trace:** `app/index.tsx` owns the local `consent` state, passes it to `completeOnboarding`, exposes accessibility disabled state, and uses `disabled={isFinalStep && !consent}`. Review/completed-user routing and persisted profile state determine whether the final step is shown.

**Category:** B/D — requires the final onboarding/review flow. An already completed account will not see the first-run CTA unless the supported review path reaches it.

### R-03 — Plus remount behavior

**Trace:** `recipes.tsx` uses account-scoped query keys and Premium access checks. The Plus catalogue is loaded through the generated API client, with query-cache/remount handling and exact removal on access denial. The visible result depends on a current authenticated account and Premium entitlement.

**Category:** B/E — requires entering Plus and having current Premium access. A non-Premium or stale entitlement path will not exercise the catalogue. A remount test alone does not prove new recipes are available.

### R-04 — Discover/Plus freshness and pagination

**Trace:** recipe screens request bounded pages, merge `nextOffset`, prefetch the next page, and use freshness memory to avoid repeated top sequences. API/provider availability, page alternatives, account/category/search keys, and cache state all affect the visible result.

**Category:** B/C/E/F — requires the relevant Discover or Plus surface, fresh or alternative server data, and correct entitlement/API response state. If the provider returns the same limited result or `nextOffset: null`, no visible rotation can occur even when the client freshness logic is present.

### R-05 — nutrition truthfulness

**Trace:** recipe/planner/scan models preserve nullable nutrition and provenance. The API response supplies the values; the client must distinguish `null`/unknown from numeric zero. The fresh production discovery probe returned nullable nutrition fields rather than fabricated zero values.

**Category:** B/C/F — requires a recipe or scan record with unknown or numeric nutrition and the relevant screen/response. A record with no numeric nutrition will not visibly demonstrate the legitimate-zero case.

### Weekly Programs modal and Apply

**Trace:** `programModalState.ts` controls selector/detail/closed states; `planner.tsx` renders the modal and invokes generation for the selected program. Ordering/fallback is shared by `data/planner.ts` and planner API contracts. Modal interaction is local; Apply/generation additionally requires the authenticated API transition and planner state.

**Category:** B/F — requires opening the Programs flow, selecting a program, and pressing Apply. The modal itself already passed physical iOS testing and must not be generalized as proof of every other feature.

### Smart Scan approval

**Trace:** `scan.tsx` analyzes input, renders a review draft, calls `acceptFoodMemory` on explicit approval, then best-effort calls `approveCapture`. Local acceptance and outbox navigation do not wait for the approval request; authenticated sync later reconciles remote state.

**Category:** B/F — requires a scan, review, explicit approval, and a suitable authenticated sync state. The unauthenticated production boundary correctly returns 401, but this audit did not fabricate an authenticated production record.

### Home Today and sync

**Trace:** Home selects a date and renders Today/log/sync state. `useDiarySync` requires a hydrated, initialized, authenticated account and token, then reconciles local outbox state with `/v1/sync`. Date selection and local-first state can make a server change invisible on a different day or account.

**Category:** A/B/F — requires the Today route/date and the account's hydrated sync/outbox state. No unauthenticated production write was attempted.

### Diary image provenance

**Trace:** `foodImageMetadata.ts` accepts trusted HTTPS image sources and rejects file/data/blob/temp URIs. Diary/Food Memory context and sync preserve the source metadata through account-scoped merge and restore.

**Category:** B/F — requires a diary entry carrying image metadata and a sync/restore path. Old entries without metadata cannot demonstrate a newly preserved provenance field.

### Coach

**Trace:** Coach UI and consent/lifecycle code exist in Build 7. The production release controls and live API intentionally keep Coach and Coach Fact Context unavailable/default-deny. Consent, cohort, nonce, and rollout state are required before any future activation.

**Category:** G only if the expectation is an activated Coach feature. Safe default-deny behavior is present in Build 7; activated Coach is intentionally not expected and must not be used as evidence of a mobile build gap.

### Plus/Discover pagination and account isolation

**Trace:** Pagination uses generated API hooks and `nextOffset`; account isolation uses session/token injection, account-scoped storage, a scope-keyed query client, and sync/user predicates.

**Category:** B/E/F for pagination and D/F for account isolation. These behaviors require the correct surface, session, entitlement, cache, and account transition.

## 5. Production API check

Both production aliases were checked without credentials or fabricated records.

| Check | Both aliases |
|---|---|
| `/api/version` | Same release ID `calora-api-80e49abe3915-20260917214029464` |
| `/api/healthz` | HTTP 200, `{"status":"ok"}` |
| Recipe discovery `query=chicken&limit=1` | HTTP 200; TheMealDB source; one recipe |
| Nutrition fields | `calories`, `proteinG`, `carbsG`, and `fatG` were `null`; no invalid or negative numeric value |
| Planner without auth | HTTP 401 |
| Sync without auth | HTTP 401 |
| Capture approval without auth | HTTP 401 |
| Account deletion without auth | HTTP 401 |
| Legacy Coach | HTTP 404 default-deny |
| Coach Fact Context | HTTP 404 default-deny |

The API is healthy and the R4 runtime-equivalence conclusion remains intact. No authenticated request, production write, database operation, or provider request was made.

## 6. Root-cause classification

### Not proven

- **A. Mobile build source gap:** not supported; Build 7 contains the expected mobile implementations.
- **G. Expected change was never implemented:** not supported for the enumerated capabilities.
- **Stale API as the complete cause:** not supported; the live API is now healthy/equivalent, while the physical discrepancy remains unexplained.

### Evidence-supported contributors

- **F. Test-path misunderstanding:** the visible behavior often requires a specific screen, action sequence, entitlement, or date.
- **C. Feature-gate/entitlement condition:** Premium catalogue behavior and Coach behavior are gated.
- **D. Persisted local state/cache:** completed onboarding, query cache, freshness memory, account scope, and local outbox state can bypass or mask changes.
- **E. Server response/data state:** recipe alternatives, nutrition availability, sync state, and authenticated planner/capture responses determine what can be rendered.

### Unresolved evidence

No physical-device trace was available containing the exact account, state reset status, Premium entitlement, route sequence, API session, cache state, or server response observed during the failed test. Therefore the exact cause of the reported physical observation remains **UNKNOWN** within this audit.

## 7. Decision-gate answers

1. **Does Build 7 contain every expected mobile change from Steps 52–54B?**  
   **YES for the enumerated source implementations and reviewed paths.** This does not prove every state/flow was exercised on the physical device.

2. **Which expected changes are impossible to observe in Build 7?**  
   None of the enumerated mobile implementations are absent. Activated Coach is intentionally impossible under the default-deny production controls; only the safe unavailable state should be expected.

3. **Which expected changes require a specific state/flow?**  
   R-01/R-02 require onboarding/review; R-03/R-04 require Plus/Discover and Premium/cache/provider state; R-05 requires a relevant nutrition record; Programs requires selection and Apply; Smart Scan requires capture/review/approval; Home/sync requires Today/date/account/outbox state; diary provenance requires an image-bearing entry and sync/restore; account isolation requires an account transition.

4. **Does current canonical main contain meaningful mobile product code newer than Build 7?**  
   **NO.** The product/mobile/shared paths are unchanged. The meaningful differences are API release-control/build-control files and report/metadata history.

5. **Would rebuilding iOS from current canonical main materially change the installed application?**  
   **NO, not based on the source diff.** It would produce a new binary identity, but no meaningful mobile product code is newer than Build 7.

6. **Is another API Republish required?**  
   **NO.** R4 established runtime equivalence and current production is healthy. Another Republish would not address the unresolved physical state/flow evidence.

7. **Is Android versionCode 27 work safe to begin now?**  
   **NO.** Resolve the user-visible discrepancy with a targeted physical state/flow trace first. This audit does not authorize Android work.

## 8. Non-actions and report handling

This audit did not:

- edit application/API/mobile source;
- commit, push, reset, rebase, merge, checkout, or cherry-pick;
- deploy or Republish;
- trigger EAS or create an iOS/Android build;
- submit or modify TestFlight;
- modify database data/schema;
- modify secrets/configuration;
- clear user data;
- activate Coach, RevenueCat, providers, cohorts, consent, nonces, or rollout controls;
- change Metro or restore Fitness;
- perform speculative remediation.

The report is stored at the normal project-root report location:

```text
58E_CALORA_USER_VISIBLE_CHANGE_DELIVERY_FORENSIC_AUDIT_REPORT.md
```

Any attachment registration created to make the report accessible is report/attachment bookkeeping only. It must not be interpreted as a product/runtime implementation change.

## 9. Final stop condition

Stop after this report. Do not rebuild iOS, start Android versionCode 27 work, Republish the API, or remediate the physical discrepancy until targeted device state/flow evidence is captured and reviewed.