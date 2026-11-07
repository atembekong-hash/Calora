# Area 07 — Recipes Discover Plus and Media Reliability Audit

**Mission:** Calora Autonomous Production Certification Mission  
**Domain:** Recipes Discover Plus and media reliability  
**Audit mode:** bounded, read-only source/test/report inspection  
**Protected-main baseline:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161`  
**Checkout observed:** clean; `HEAD` exactly equals the protected-main baseline.  
**Audit date:** 2026-11-07

## Executive result

The protected-main source contains substantial reliability controls for Discover and Plus pagination, request cancellation, cache boundaries, duplicate suppression, image identity, generated-media review gating, nutrition disclosure, and saved-content restoration. The focused mobile regression matrix passed: **15 test files / 143 tests**. This is current source evidence, not historical carry-forward.

The API matrix could not be treated as a complete PASS because this sandbox has no `DATABASE_URL`. The direct focused run produced **5 passing test files / 99 passing tests**, while **2 files / 24 tests** were blocked by module initialization or dependency paths that require the database environment. The database-backed recipe-media persistence suite is explicitly skip-gated when database integration is disabled; no database was contacted or modified. No production deployment, authenticated Plus session, native device, browser web/native parity run, provider-backed media generation, or physical image-decoder run was performed in this audit.

### Classification counts for requirements assessed

| Status | Count |
|---|---:|
| PASS | 10 |
| FAIL | 0 |
| BLOCKED | 3 |
| NOT RUN | 2 |
| NOT APPLICABLE | 0 |

These counts cover only the 15 bounded requirements listed in the assessment table below. They do not certify the whole product or full US commercial launch readiness.

## Assessment table

| # | Requirement assessed | Status | Current evidence and boundary |
|---:|---|---|---|
| 1 | Discover pagination/cursor advancement is bounded and rejects invalid/non-advancing cursors | **PASS** | `discoverCatalogueState.ts` exposes `nextDiscoverPaginationOffset`; `recipeCataloguePagination.test.ts`, `recipePagination.test.ts`, and `recipesScreen.test.ts` cover cursor claims, stale generations, circular/invalid cursors, terminal handling, and continuation. Current mobile run passed. |
| 2 | Discover same-page refetches and overlapping pages do not duplicate cards | **PASS** | `applyDiscoverCataloguePage` reconciles by generation/offset/stable provider identity; `discoverCatalogueEntries` produces stable feed keys. Current `recipeCataloguePagination.test.ts` and `recipeFreshness.test.ts` coverage passed. |
| 3 | Plus pagination is serialized, deduplicated, and retains loaded cards through loading/error recovery | **PASS** | `nextPremiumPaginationOffset`, `premiumRecipeReliability.ts`, and screen contracts preserve the existing grid, expose loading/error/retry nodes, and prevent repeated cursor claims. Current `premiumRecipeReliability.test.ts`, `premiumSavedRecipes.test.ts`, and `recipesScreen.test.ts` passed. |
| 4 | Request cancellation and stale-result suppression exist for recipe/concept/media flows | **PASS** | `recipes.tsx` aborts the prior concept request and passes `AbortSignal`; TanStack query functions receive `signal`; generated-media lifecycle accepts signals and account-activity checks. `recipesScreen.test.ts`, `recipeGeneration.test.ts`, and generated lifecycle tests passed. |
| 5 | Cache policy does not persist signed generated-media capabilities and uses bounded freshness | **PASS** | Discover/saved queries use explicit `staleTime`; generated recipe images use `cachePolicy='memory'` while ordinary trusted images use `memory-disk`; persistence strips temporary signed URL capabilities while retaining durable media identity. `recipesScreen.test.ts`, generated lifecycle/persistence/security tests passed. |
| 6 | Recipe/image identity is strict and fail-closed; prior image-hash/duplicate fixes remain present | **PASS** | `discoverRecipeImage.ts`, `foodImageMetadata.ts`, and image policy tests reject missing/untrusted/expired evidence rather than substituting unrelated imagery. `recipe-media.ts` computes a SHA-256 content hash over canonical recipe semantics plus prompt version; uniqueness is owner/client-recipe/content-hash scoped with `ON CONFLICT DO NOTHING`. Current image metadata, Discover-image, recipe-media semantics (where importable), and recipe screen tests were inspected; mobile image coverage passed. |
| 7 | Generated-media lifecycle has explicit generating/stored/retryable/review/accepted/superseded states | **PASS** | `recipe-media.ts` and `recipe-media-generation.ts` bind transitions to owner/media/attempt, enforce accepted-only ordinary signed locators, expose a short-lived review preview for `stored + needs_review`, rotate image IDs on retry, and classify provider/storage/database failures. Generated lifecycle screen/security tests passed; API route behavior is covered where environment permits. |
| 8 | Generated media has timeout/cancellation and stale-attempt protection | **PASS** | Provider and upload operations use `AbortController` with a 30-second total deadline; completion/error updates require the claimed attempt. `generatedRecipeImageLifecycle.test.ts`, `recipe-media-generation.test.ts` source inspection, and related screen tests passed/confirmed. |
| 9 | Nutrition availability is honest and does not fabricate complete values | **PASS** | `recipeNutrition.ts` distinguishes unavailable/partial/available states; recipe detail renders “Some nutrition values are unavailable from this recipe source.” AI-generated nutrition includes an explicit estimate disclosure. `recipeNutrition.test.ts`, `recipeModel.test.ts`, and screen contracts passed. |
| 10 | Saved content restores correct identity across bundled Discover, remote Discover, Plus, and local Create | **PASS** | `saved-recipes.tsx` restores `caloraOriginalRecipes` locally, queries only non-bundled remote IDs, uses account-scoped Plus query keys/signals, and preserves explicit unavailable/sign-in states. `savedRecipesScreen.test.ts`, `savedRecipesPremiumReliability.test.ts`, and relevant screen tests passed. |
| 11 | API recipe/Plus/media route matrix executes completely in the audit environment | **BLOCKED** | The current direct run passed 5 files/99 tests but blocked `premiumRecipes.test.ts` and `recipe-media-semantics.test.ts` at import/dependency initialization with `DATABASE_URL must be set`; the sandbox policy also prevented sourcing/modifying env files. This is an environment evidence blocker, not a classified product FAIL. |
| 12 | Real database-backed generated-media persistence, owner isolation, retry/review/supersession | **BLOCKED** | `recipe-media.persistence.integration.test.ts` is correctly skip-gated unless `isDatabaseIntegrationTestEnabled()` is true. No `DATABASE_URL` was available; no database was contacted. Required next evidence is protected CI or an authorized disposable PostgreSQL environment. |
| 13 | Authenticated Plus provider content, entitlement, image identity, and long-scroll behavior | **BLOCKED** | Source and controlled tests cover access boundaries, cursor logic, image fallback, and retries, but no authorized Plus QA account/provider session was available. Existing Maestro flow `tests/device/plus-recipes-rapid-scroll.yaml` requires a signed-in Plus QA account. No auth bypass was attempted. |
| 14 | Web/native count consistency and actual native image/cache/decoder behavior | **NOT RUN** | No browser or physical Android/iOS run was performed. Source tests assert contracts, but they cannot establish rendered card counts, native decoder behavior, cache eviction, or web-vs-native parity. |
| 15 | Live generated-media provider lifecycle (generate, review, accept, regenerate, reopen) | **NOT RUN** | No provider generation was triggered and no account/local recipe fixture was created. Automated lifecycle tests cover the state machine, but live provider/storage behavior remains unobserved. |

## Evidence details

### Current source paths inspected

- `artifacts/calora/app/(tabs)/recipes.tsx` — Discover/Plus/Create composition, abort handling, TanStack query signals, image rendering, retry UI, nutrition disclosure, pagination integration.
- `artifacts/calora/app/saved-recipes.tsx` — bundled/local/remote/Plus saved identity partitioning, signal-aware restoration, stale times and explicit unavailable states.
- `artifacts/calora/lib/discoverCatalogueState.ts` — generation/offset ledger, stable-ID reconciliation, cursor/terminal guards.
- `artifacts/calora/lib/discoverRecipeImage.ts` and `artifacts/calora/lib/foodImageMetadata.ts` — strict canonical/remote image resolution and fail-closed policy.
- `artifacts/calora/lib/generatedRecipeImageLifecycle.ts` and `generatedRecipeImagePersistence.ts` — review preview, retries, account scoping, signed-capability persistence exclusion.
- `artifacts/calora/lib/premiumRecipeReliability.ts`, `premiumCatalogueState.ts`, and `premiumRecipeRequest.ts` — Plus loading/error/access/cursor behavior.
- `artifacts/calora/lib/recipeNutrition.ts` and `recipeModel.ts` — nutrition state and provenance labels.
- `artifacts/api-server/src/routes/recipes.ts` — recipe list/detail, nutrition, generation, media preview/review routes, rate limits and abort signals.
- `artifacts/api-server/src/lib/recipe-media.ts` — canonical content hashing, owner-scoped uniqueness, lifecycle transitions, retry image identity rotation.
- `artifacts/api-server/src/lib/recipe-media-generation.ts` — provider/upload timeouts, review-only completion, signed URL issuance, failure categories.

### Current tests run

Command (mobile, executed without source/env mutation):

```text
pnpm --filter @workspace/calora exec vitest run --reporter=dot \
  lib/__tests__/recipeCataloguePagination.test.ts \
  lib/__tests__/recipePagination.test.ts \
  lib/__tests__/recipesScreen.test.ts \
  lib/__tests__/discoverRecipeMix.test.ts \
  lib/__tests__/discoverRecipeImage.test.ts \
  lib/__tests__/generatedRecipeImageLifecycle.test.ts \
  lib/__tests__/generatedRecipeImageLifecycleScreens.test.ts \
  lib/__tests__/generatedRecipeImagePreviewSecurity.test.ts \
  lib/__tests__/premiumRecipeReliability.test.ts \
  lib/__tests__/premiumRecipeImages.test.ts \
  lib/__tests__/premiumSavedRecipes.test.ts \
  lib/__tests__/savedRecipesScreen.test.ts \
  lib/__tests__/savedRecipesPremiumReliability.test.ts \
  lib/__tests__/recipeNutrition.test.ts \
  lib/__tests__/recipeModel.test.ts
```

Result: **15 passed test files; 143 passed tests; exit 0.**

Command (API, direct focused run):

```text
pnpm --filter @workspace/api-server exec vitest run --reporter=dot \
  src/__tests__/recipes.test.ts \
  src/__tests__/premiumRecipes.test.ts \
  src/__tests__/recipe-generation.test.ts \
  src/__tests__/recipe-media-generation.test.ts \
  src/__tests__/recipe-media-semantics.test.ts \
  src/__tests__/image-evidence-contract.test.ts \
  src/__tests__/image-metadata.test.ts
```

Result: **5 test files passed / 99 tests passed; 2 files were blocked by `DATABASE_URL must be set`; 24 tests failed to execute because the route/test modules could not initialize.** The result is classified BLOCKED, not FAIL, because the failure is deterministic environment setup and no assertion-level product failure was established.

### Historical reports used only as context, not PASS evidence

- `235_CALORA_RECIPES_DISCOVER_PLUS_SCROLL_RELIABILITY_REPORT.md` — prior duplicate/refetch and retained-pane remediation; explicitly said protected deployment, authenticated Plus, and device verification were pending.
- `238_CALORA_DISCOVER_CONTINUOUS_BROWSE_AND_RECIPE_IMAGE_LIFECYCLE_REPORT.md` — prior cycle metadata, canonical image resolution, review-preview and persistence remediation; explicitly separated controlled tests from production/native evidence.
- `239_CALORA_DISCOVER_COMPOSITION_AND_IMAGE_DELIVERY_REMEDIATION_REPORT.md` — prior visit composition, remote image retry, and native-image delivery boundaries.
- `203_CALORA_COMPLETE_IMAGE_INTEGRITY_REMEDIATION_REPORT.md` — prior accepted-only generated media, attempt binding and fail-closed food imagery; database integration was not locally run.
- `204_CALORA_LIVE_WEB_IMAGE_INTEGRITY_CERTIFICATION_REPORT.md`, `205_CALORA_FINAL_WEB_IMAGE_CERTIFICATION_CLOSURE_REPORT.md`, `206_CALORA_REMAINING_IMAGE_VERIFICATION_REPORT.md`, and `207_CALORA_FINAL_IMAGE_TEST_ENVIRONMENT_CERTIFICATION_REPORT.md` — historical live-web observations, with Plus/Create/native boundaries explicitly blocked or not tested at the time. They are not substituted for this baseline audit.

## Exact blockers and next evidence

1. **Database environment:** provide a protected disposable PostgreSQL/CI environment with `DATABASE_URL` and run the API route and `recipe-media.persistence.integration.test.ts` suites. Do not use production data.
2. **Authorized Plus session:** run the existing Maestro Plus flow on a corrected signed build with a legitimate Plus QA account and provider configuration; verify long continuation, repeated terminal events, loading/error retry, saved Plus restoration, and card/image identity.
3. **Web/native parity:** obtain a current web session and current Android/iOS build from this exact protected commit; compare rendered counts and stable IDs after the same pagination sequence. Include native image decoder/cache behavior and background/foreground recovery.
4. **Live generated media:** use an isolated account/fixture to exercise generate → stored review preview → accept → signed locator renewal → render acknowledgement → regenerate/retry → reopen. No such mutation was authorized or performed here.

## Verdict for this domain

**Source and controlled mobile reliability: PASS. Complete commercial-launch certification for Recipes Discover Plus and media: BLOCKED/NOT RUN at the explicit boundaries above.** There is no current evidence supporting a FAIL classification for the implementation itself, but historical reports and controlled tests must not be promoted to live authenticated, database, provider, web/native, or physical-device PASS claims.
