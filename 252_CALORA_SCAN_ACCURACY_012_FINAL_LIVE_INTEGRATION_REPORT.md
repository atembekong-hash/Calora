# CAL-SCAN-ACCURACY-012 â€” Final Live Integration and Native Validation Preparation

## Verdict

**CONDITIONAL PASS for source-level Scan integration; live provider and native validation remain BLOCKED.** The Scan â†’ reconciliation â†’ review â†’ save path is deterministic, type-safe, and covered by authenticated-route/provider-contract tests. No genuine FatSecret network response, upstream latency, rate-limit behavior, or Android/iOS runtime evidence was obtained in this mission because no isolated provider credentials or non-production API endpoint were available locally. Production resources and credentials were not accessed.

No paid AI calls, production database access, production provider calls, deployments, merges, native builds, installations, or store submissions occurred.

## 1. Provider integration findings

### What is proven

The authenticated restaurant-food route is implemented at `/v1/restaurant-foods` and `/v1/restaurant-foods/:sourceId`. It:

- requires a verified bearer session before calling FatSecret;
- applies a fail-closed per-user rate limit of 80 requests per hour;
- rejects malformed source identifiers before provider access;
- supports either the configured FatSecret gateway or direct FatSecret transport;
- normalizes documented `foods_search`/v5 responses, serving metadata, metric gram amounts, and nutrient values;
- converts provider failures into generic safe responses without exposing upstream messages or credentials;
- preserves the account-deletion fence and returns a generic temporary-unavailable response when the fence is active.

The client integration uses one bounded search per eligible visual component, requests five results, disables retries, and relies on a stable five-minute React Query key. Barcode/provider-backed components do not trigger redundant visual-food searches.

### Test evidence

With a disposable localhost-only database URL and mocked upstream transport:

- `restaurantFoods.test.ts`: **8 passed**;
- `capture.test.ts`: **68 passed**;
- `premiumRecipes.test.ts`: **33 passed**;
- API/provider-contract total: **109 passed**.

These tests prove request construction, authentication gating, gateway routing, FatSecret response normalization, serving metadata propagation, provider-error redaction, malformed-ID rejection, rate-limit behavior, and deletion-fence behavior. They are not evidence of live FatSecret availability or live latency.

### Live-provider blocker

The current Windows environment has none of the following variables populated: `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`, `FATSECRET_GATEWAY_URL`, `FATSECRET_GATEWAY_SECRET`, or a non-production Calora API base URL. The repository has no safe local provider credential fallback. No live call was attempted.

The minimum owner action is to provide, through the existing secure secret mechanism, either:

1. a dedicated non-production FatSecret client ID/secret with a documented provider quota, or
2. a dedicated Calora FatSecret gateway URL and gateway secret connected to an isolated test provider account,

plus a non-production authenticated test session if the route is exercised through the API. The credential must be scoped to testing, must not be a production secret, and must have a separately enforceable request/spend limit. Once supplied, one bounded provider run can measure actual response shape, latency, caching, rate-limit handling, and failure recovery.

## 2. Entitlement boundary

The restaurant-food route currently enforces authenticated access and rate limiting, but it does not call RevenueCat entitlement verification. The source therefore proves **authenticated-core access**, not Plus-only access. This is not changed or classified as a defect here because the current Scan flow appears to use provider matching as part of the core meal-capture experience, while premium recipe access is governed separately. If the product requirement is that FatSecret matching must be Plus-only, that is an unresolved product-contract decision requiring an explicit entitlement rule and dedicated tests; it should not be introduced implicitly during provider validation.

## 3. Nutrition correctness and failure handling

The deterministic Scan-to-Save suite confirms:

- complete provider serving records reconcile to a selected gram or serving quantity;
- partial consumption scales calories and macros once;
- reconciled values are stored as one logical serving to prevent double scaling;
- incomplete provider nutrition fails closed and preserves the original estimate;
- ambiguous matches remain visible with an explicit â€œUse top matchâ€ action;
- visual identity remains distinct from provider nutrition provenance;
- users can retain, edit, include, remove, or reject review components without being forced through an extra screen for straightforward matches.

The current run repeated the relevant source suites successfully:

- `scanToSave.test.ts`: 4 passed;
- `scanScreen.test.ts`: 16 passed;
- `nutritionReconciliation.test.ts`: 3 passed;
- `captureReview.test.ts`: 76 passed;
- `foodMemory.test.ts`: 74 passed;
- mobile total: **173 passed**.

API and mobile TypeScript project validation also passed using the repository-local compilers.

## 4. Performance and request efficiency

Only source-level request-efficiency evidence is available. The stable query key and disabled retries prevent repeated identical searches within the review window. Real provider latency, upstream timeout frequency, quota behavior, and gateway availability are **UNVERIFIED** until the isolated credentialed run is authorized and available.

No confirmed integration defect was found in this mission, so no source correction was made.

## 5. Native validation readiness

Native execution is not authorized by this mission and was not started. The repository currently contains a `production-apk` EAS profile, but the checked-out isolated accuracy branch reports Android `versionCode: 29`; that metadata must not be assumed to match the newest installed candidate or prior versionCode 36 artifact. A future native candidate must be built only from a verified protected-main descendant containing the Scan integration, with a newly confirmed version code and signing provenance.

Required future evidence, separately on Android and iOS:

- exact protected-main source SHA and native build provenance;
- Android signed APK using the existing `production-apk` profile and a verified next version code, or the authorized iOS internal/TestFlight profile;
- authenticated test account and, if applicable, active sandbox entitlement;
- Scan capture â†’ review â†’ provider match â†’ serving adjustment â†’ save â†’ dashboard verification;
- ambiguous-match correction, incomplete-provider fallback, network delay/error, background/resume, restart, and offline recovery;
- screenshots, logs, and persisted diary state.

No native build should be triggered from this report alone.

## 6. Release recommendation

**Do not claim final Scan certification yet.** The source and deterministic integration path are ready for protected review, but two gates remain:

1. **Live-provider gate:** execute one bounded isolated FatSecret/gateway run with a dedicated non-production credential and enforceable quota; record actual latency and upstream outcomes.
2. **Native gate:** after the source is merged through the protected workflow and a specifically authorized build is created, execute the Scan-to-Save journey separately on Android and iOS.

The next engineering action is to obtain the dedicated isolated provider access described above, run the bounded live integration check, and preserve the raw response metadata without exposing credentials or customer data.
