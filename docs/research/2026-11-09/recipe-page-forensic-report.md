# Calora Recipe Page Forensic Report

**Audit date:** 2026-11-09/10 UTC evidence window
**Repository state:** clean checkout, `ff02b43e` HEAD (merge of PR #435; Today header fixes)
**Scope:** Explore/Discover, recipe cards and media, detail and downstream actions, Create, personalization, web/native parity, and non-functional quality.
**Method:** Read-only source, test, history, documentation, and unauthenticated public API inspection. **No files, application code, builds, deployments, commits, databases, providers, accounts, or production configuration were changed.**

## Executive verdict

Calora’s recipe experience is substantially implemented, and the core seams are coherent: one shared Expo/React Native recipe implementation serves web and native; Discover pagination distinguishes finite filtered results from server-declared continuous browsing; generated-photo identity is separated from expiring signed URLs; media routes are owner-scoped; and focused source-level tests cover many reliability and lifecycle contracts.

It is not launch-ready as a fully certified recipe product. The highest release-integrity concern is a checked-in generated artifact mismatch: `artifacts/api-server/dist/index.mjs:97440` still contains `recipe-photo-semantic-v4-ingredient-fidelity`, while current source uses v5. The highest user-facing functional concerns are inconsistent portion scaling, incomplete signed-in cross-device synchronization for saved recipes/meals, and misleading duplicate-save success feedback. Personalization is materially overstated: the planner has limited profile/program inputs, while Discover/For You is a curated provider browse surface rather than an account-personalized recommender. Device, browser-runtime, live-storage, authenticated, and telemetry evidence is incomplete.

**Launch/readiness verdict: CONDITIONAL NO-GO for a broad release.** A narrow source/test-based release may proceed only after the stale `dist` blocker is eliminated and the P1 behavior contracts below are resolved or explicitly de-scoped. Physical iOS/Android and browser-runtime validation remains a required release gate, not a substitute for source tests.

## Evidence classification legend

- **VERIFIED WORKING:** supported by current source and focused passing tests, or by direct public probe where stated.
- **CONFIRMED DEFECT:** directly demonstrated source/runtime behavior that violates the intended contract.
- **PARTIAL:** some implementation or tests exist, but material paths or environments remain unverified.
- **UNVERIFIED:** no adequate current proof; absence of proof is not treated as a defect.
- **OUTDATED RESEARCH CLAIM:** historical/documentation assertion contradicted by current HEAD or not tied to the current build.
- **INTENTIONALLY EXCLUDED:** outside the read-only scope; no mutation or live privileged action was attempted.

## 1. Scope map and current-state classification

| Area | Current implementation and evidence | Classification |
|---|---|---|
| **Explore / Discover route** | The only Explore route is `artifacts/calora/app/(tabs)/recipes.tsx`; `artifacts/calora/app/(tabs)/_layout.tsx:88-90` maps it to the Recipes tab. Web and native share this Expo/React Native implementation. Query/category requests are built at `artifacts/calora/app/(tabs)/recipes.tsx:3089-3125`. | **VERIFIED WORKING** at source/contract level |
| **Cards and media** | Strict Discover image provenance, generated-image lifecycle states, owner-scoped signed URLs, review gating, and semantic photo hashing are implemented. Relevant tests include `artifacts/calora/lib/__tests__/discoverRecipeImage.test.ts`, `generatedRecipeImagePreviewSecurity.test.ts`, `generatedRecipeImageLifecycleScreens.test.ts`, and `artifacts/api-server/src/__tests__/recipe-photo-storage.test.ts`. | **VERIFIED WORKING** for stated source/unit contracts; **PARTIAL** for rendered/device/provider behavior |
| **Detail and downstream actions** | Detail supports save recipe, save as meal, diary, weekly plan, shopping list, attribution, and related recipes. Serving scales nutrition, diary, and planner quantities, but not ingredient strings. | Core flow **VERIFIED WORKING**; portion consistency **CONFIRMED DEFECT** |
| **Create** | Authenticated full creation saves locally, opens detail, and starts generated-photo work. Stable durable media identity and review lifecycle are substantially implemented. | **PARTIAL**; server idempotency, offline intent, restoration, cleanup, and individual generated-recipe deletion remain gaps |
| **Personalization** | Profile stores diet/calorie/optional macro fields, but no allergy/intolerance/excluded-ingredient flow exists. Discover’s “For You” is a fixed-category TheMealDB pool with process-wide cache and local anti-repetition rotation. | **PARTIAL / NOT PERSONALIZED AS CLAIMED** |
| **Web/native parity** | Shared routes and API contracts align. Intentional divergence: `artifacts/calora/components/SwipeableTabList.tsx:305-310` uses translated direct manipulation on web and native paging on native. No current device/browser runtime proof. | Structural parity **VERIFIED**; runtime parity **PARTIAL/UNVERIFIED** |
| **Non-functional quality** | Rate limits, no-store behavior, owner predicates, RLS migration, sanitized pino errors, and many client retry contracts are present. Recipe-media tenant integration, telemetry export, physical-device, accessibility, and live-provider evidence are incomplete. | **PARTIAL** |

## 2. Material findings by priority

### P0 — Release-blocking integrity

**No P0 production/runtime defect was demonstrated.** The read-only evidence does identify a release-integrity blocker that should be treated as P0 operationally until resolved:

1. **Stale checked-in generated runtime artifact — CONFIRMED DEFECT, P1/high release blocker.** `artifacts/api-server/dist/index.mjs:97440` contains `recipe-photo-semantic-v4-ingredient-fidelity`, while `artifacts/api-server/src/lib/recipe-media.ts:6-7` and commit `62a5a282` use `recipe-photo-semantic-v5-identity-stable-ingredient-fidelity`. A deployment path that runs `dist` without rebuilding can use stale photo identity semantics. This is directly evidenced by source/artifact comparison, not merely an unrun test.

**Required disposition:** rebuild through the approved pipeline or remove/enforce generated-artifact parity; add CI that compares source/runtime prompt version and rejects stale `dist`.

### P1 — Must resolve before broad launch

1. **Portion adjustment mismatch — CONFIRMED DEFECT.** The detail UI scales nutrition and diary/planner quantities, but ingredient strings remain as supplied and explicitly tell the user to adjust portions manually. Evidence: `artifacts/calora/app/(tabs)/recipes.tsx:1675-1693, 1803-1835, 2019, 2244-2266, 2644-2677`. This can produce a two-portion diary/plan alongside one-portion shopping-list ingredients.

2. **Signed-in save flow is not cross-device complete — CONFIRMED DEFECT relative to a cross-device expectation.** `savedRecipeIds`, `savedMeals`, and `localRecipes` are locally persisted, while `artifacts/calora/hooks/useDiarySync.ts:1-18` and `artifacts/api-server/src/routes/sync.ts:1-7, 497-505` show server sync for diaryEntry mutations only. If saves are intended to be device-local, the product must say so; if account-level, server sync is missing.

3. **Create/media server idempotency is incomplete — CONFIRMED DEFECT for the stated idempotency contract.** `artifacts/calora/lib/recipeGeneration.ts:126-207` sends `Idempotency-Key`, but the server photo route does not read or persist it. Database uniqueness protects some duplicate claims, not same-key/different-payload behavior. There is also no durable offline generation intent after a pre-claim failure.

4. **Discover saved rail silently caps at six — CONFIRMED DEFECT.** `artifacts/calora/app/(tabs)/recipes.tsx:3093-3192` uses `savedDiscoverRecipes.slice(0, 6)`, while `artifacts/calora/app/saved-recipes.tsx:167-251` supports the full collection. Add “Recent 6” plus “View all,” or remove the cap.

5. **Saved route counts can disagree with visible cards — CONFIRMED DEFECT.** `/saved-recipes` counts local saved IDs while rendered cards depend on restoration, network, and Plus authentication. A non-zero count can coexist with no cards. Reconcile saved/restored/unavailable counts and preserve retry/sign-in actions.

### P2 — Resolve before or immediately after launch

1. **Browse count semantic mismatch — CONFIRMED DEFECT.** At `artifacts/calora/app/(tabs)/recipes.tsx:3488-3489`, unfiltered Discover displays `<browsePoolSize> recipes in the curated browse cycle`. The API’s `browsePoolSize` (704 in public evidence) is a provider pool cardinality, not rendered-card count, unique complete catalogue size, or count including bundled Calora-original entries. Historical evidence reports 46 open web recipes versus an API sample with 704 pool size and 360 unique IDs across 20 pages; these are different quantities and not proven simultaneous snapshots.

2. **Discover successful zero-result state is missing — CONFIRMED DEFECT.** Nonsense search can return HTTP 200 with zero recipes, but Discover has no dedicated “No recipes found” recovery state. Existing outage and `My recipes` states are clearer; Plus has a `No Plus recipes found` precedent.

3. **Save-as-meal duplicate feedback is wrong — CONFIRMED DEFECT.** `saveMeal` returns false for an equivalent existing template, but callers at `artifacts/calora/app/(tabs)/recipes.tsx:1507-1512, 1911-1915` and `artifacts/calora/app/saved-recipes.tsx:179-185` always show “Meal saved.” Branch on the boolean and report “Already saved.”

4. **Unavailable-nutrition CTA is ambiguous — CONFIRMED DEFECT.** `artifacts/calora/app/(tabs)/recipes.tsx:2218-2222, 2315-2332` can silently save/toggle and close detail without explicit confirmation or visible saved state.

5. **Responsive and save-menu interaction coverage is incomplete — PARTIAL.** Card dimensions are fixed at 224px with 140px image (`artifacts/calora/app/(tabs)/recipes.tsx:71-72, 320-343`); header actions are 38x38 and compact `RecipeSaveMenu` trigger is 36px high (`artifacts/calora/components/RecipeSaveMenu.tsx:110-113`). Static tests do not prove no clipping, keyboard reachability, focus order, or persistence after remount.

6. **Media restoration/cleanup risks — PARTIAL.** `listOwnerRecipeMedia` is capped at 200 rows without cursor metadata; post-upload transition failure can leave an orphan object; accepted review and URL issuance are separate requests; generated recipes have no individual delete path.

7. **Recipe-media tenant isolation and live telemetry are not evidenced — PARTIAL/UNVERIFIED.** `tenant-isolation.integration.test.ts` has three skipped tests under `skipIf(!RUN_DB_INTEGRATION_TESTS)`. Pino logs are verified, but recipe-specific remote error telemetry/alerting was not found.

8. **Premium test environment portability — PARTIAL.** `premiumRecipes.test.ts` cannot load without `DATABASE_URL` because account-deletion-state initializes the DB module. This is an infrastructure gap, not proof of a production route defect.

### P3 — Cleanup, documentation, and evidence debt

- **Documentation/test contract drift — OUTDATED RESEARCH CLAIM.** `CALORA_MISSION_APPROVAL_REPORT.md` says the user-facing wording should be `recipes available to explore`; current source and `artifacts/calora/lib/__tests__/recipesScreen.test.ts:10-14` require `recipes in the curated browse cycle` and reject the former.
- **Historical v3/v4 media claims — OUTDATED RESEARCH CLAIM.** Current source is v5 and review-gated; old reports citing v3/v4 or pre-review behavior must not certify HEAD.
- **API test execution evidence gap — UNVERIFIED.** The API command was not successfully rerun because the workspace wrapper rejected the initial working-directory context. Source/tests were inspected; this is not itself a source defect.
- **Unicode normalization edge cases — PARTIAL.** Current NFKC/trim/whitespace folding and en-US lowercasing are coherent, but confusables, combining forms, Turkish-I, empty optional fields, and array-order vectors are not comprehensively tested.
- **Physical-device runtime evidence — UNVERIFIED.** No Android/iOS gesture, keyboard, URL-expiry, app-kill, TalkBack/VoiceOver, or native cache run was performed.

### Intentionally excluded

**INTENTIONALLY EXCLUDED:** No edits, migrations, deployments, builds, commits, production mutations, live Supabase queries, provider calls, credential use, or account changes were performed. Historical reports were treated as leads only, not as current certification.

## 3. Root-cause evidence

### Count and Explore semantics

`artifacts/api-server/src/routes/recipes.ts:1266-1351` implements circular unfiltered browsing and finite category/search paging. Only unfiltered `For you` sets `continuousBrowse=true` and emits `browseCycle`, `browsePoolSize`, and `nextOffset`; filtered pages terminate with `nextOffset=null`. The client combines remote and bundled Calora-original entries in `artifacts/calora/app/(tabs)/recipes.tsx:3257-3290`, then labels the API pool as the curated browse cycle. The root cause is metric naming and mixed-feed presentation, not proven divergent web/native filtering.

### Portion mismatch

Serving state is applied to nutrition, diary, and planner paths (`artifacts/calora/app/(tabs)/recipes.tsx:1675-1694, 1755-1835`), while ingredient rendering and shopping-list insertion use supplied ingredient strings (`2244-2266, 2644-2677`). There is no structured quantity/unit transformation contract. The UI disclosure confirms the behavior rather than resolving it.

### Save synchronization and feedback

`artifacts/calora/context/CaloraContext.tsx:2510-2619` persists recipes/meals locally and returns a boolean for duplicate meal detection. The server sync contract in `artifacts/api-server/src/routes/sync.ts:1-7, 497-505` is diary-only. Callers ignore the duplicate boolean, creating false success feedback. This is a coherent local-device implementation but not a complete signed-in account synchronization contract.

### Media identity and stale artifact

The current source correctly separates semantic content hash, durable media/image IDs, and expiring signed URLs (`artifacts/api-server/src/lib/recipe-media.ts:108-145, 206-289`; `artifacts/calora/lib/generatedRecipeImagePersistence.ts:17-49`). The stale `dist` file bypasses this source-level confidence if deployed without a fresh build. The root cause is release artifact synchronization, not the current TypeScript implementation.

### Personalization gap

`artifacts/api-server/src/routes/profile.ts:22-38,40-68,123-203` has no allergy or meal-time fields. `artifacts/api-server/src/routes/recipes.ts:1122-1178,1208-1251,1261-1347` uses fixed provider categories, a one-hour process cache, and local rotation; it does not read account profile, saved items, diary, or Coach context. `artifacts/calora/app/(tabs)/planner.tsx:807-849` omits saved macro targets from the planner request. The root cause is product scope and data-flow absence, not merely ranking quality.

## 4. Affected routes, files, and tests

### Routes and source

- `artifacts/calora/app/(tabs)/recipes.tsx` — shared Explore/Discover, Plus, Create, detail, cards, pagination, states, save actions, serving, shopping list, planner insertion, and media rendering.
- `artifacts/calora/app/saved-recipes.tsx` and `artifacts/calora/app/saved-meals.tsx` — saved routes.
- `artifacts/calora/app/(tabs)/_layout.tsx:88-90` and `artifacts/calora/app/_layout.tsx:375-383` — route registration.
- `artifacts/calora/components/SwipeableTabList.tsx:279-310,357-383` — web/native pager branch.
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx:11-41` — platform keyboard behavior.
- `artifacts/calora/components/RecipeSaveMenu.tsx:44-105,110-123` — save actions and control size.
- `artifacts/calora/context/CaloraContext.tsx:2510-2619` — local save/meal persistence.
- `artifacts/calora/hooks/useDiarySync.ts:1-137` — diary-only authenticated reconciliation.
- `artifacts/api-server/src/routes/recipes.ts:515-710,1266-1407` — media and recipe list/detail routes.
- `artifacts/api-server/src/routes/sync.ts:1-7,497-505` — sync scope.
- `artifacts/api-server/src/routes/profile.ts`, `planner.ts`, `premiumRecipes.ts` — profile/planner/premium contracts.
- `artifacts/api-server/src/lib/recipe-media.ts`, `recipe-media-generation.ts`, `recipe-photo-storage.ts` — media identity, generation, storage.
- `artifacts/api-server/dist/index.mjs:97440` — stale generated artifact.
- `supabase/migrations/20260923220000_create_recipe_media.sql:3-43` and `lib/db/migrations/0005_recipe_media.sql:7-39` — media RLS/constraints.

### Tests and execution evidence

- Passed focused client command: `pnpm --filter @workspace/calora exec vitest run lib/__tests__/recipesScreen.test.ts lib/__tests__/recipeCataloguePagination.test.ts lib/__tests__/recipePagination.test.ts --reporter=dot` — **3 files, 74 tests passed**.
- Another focused native set passed **8 files, 83 tests**, including `recipeServing.test.ts`, `recipeDiaryServing.test.ts`, `recipeInstructions.test.ts`, `recipeNutrition.test.ts`, `recipeSaveMenu.test.ts`, `savedRecipesScreen.test.ts`, `savedMealsScreen.test.ts`, and `recipesScreen.test.ts`.
- Focused premium/media client suites passed **33 assertions** across `premiumPaginationGuard.test.ts`, `premiumRecipeReliability.test.ts`, `premiumRecipeRefreshPolicy.test.ts`, `recipeCataloguePagination.test.ts`, and `discoverRecipeImage.test.ts`.
- API recipes and diary suites passed **31** and **32** tests respectively; `recipes-rate-limit.test.ts` passed **8** tests; `recipe-photo-storage.test.ts` passed **8** tests.
- `artifacts/api-server/src/__tests__/recipes.test.ts:103-196` covers query/category bounds, continuous browse, decimal limit normalization, and finite category behavior.
- `artifacts/api-server/src/__tests__/recipe-media-semantics.test.ts:24-139` could not load because `DATABASE_URL` was absent; not a product failure.
- `tenant-isolation.integration.test.ts` has **3 skipped** tests because the integration gate was disabled.
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts:10-14,432-511` covers current count wording, reconciliation, retry, and error states.

## 5. Reproducible validation steps

1. **Clean/source state:** run `git status --short; git branch --show-current; git log --oneline --decorate -15`; verify clean checkout and HEAD `ff02b43e`.
2. **Client contracts:** run the passed focused client command above and record exact file/test totals.
3. **API contracts:** from a correctly recognized workspace context run `pnpm --filter @workspace/api-server exec vitest run src/__tests__/recipes.test.ts --reporter=dot`; separately run premium/media suites with a documented ephemeral `DATABASE_URL` or mocks.
4. **Stale artifact gate:** grep source and dist for `RECIPE_MEDIA_PROMPT_VERSION`; fail if source v5 and checked-in runtime v4 differ. Rebuild using the approved pipeline and repeat the comparison.
5. **Public read-only probes:** `curl` unauthenticated GET `https://app.mycaloraapp.com/api/v1/recipes?limit=1&offset=0`, `limit=18&offset=0`, nonsense `query`, and `category=Seafood&limit=1`; confirm HTTP 200, browse metadata for unfiltered results, finite termination for filters, and zero-result behavior. Do not mutate production.
6. **Portion acceptance:** use a recipe with parseable quantities and known yield; change servings to 2+, verify displayed ingredients, shopping list, nutrition, diary, and planner all use the same basis; verify unparseable items are explicitly unchanged.
7. **Save acceptance:** save on device A, restore on device B, remove on B, verify A; test offline retry and duplicate save feedback. If device-local is intended, verify UX/documentation states that explicitly.
8. **Media security acceptance:** with disposable accounts A/B and staging storage, test GET/URL/retry/review/rendered cross-owner denial, signed URL expiry/renewal, preview no-store, account deletion, and post-upload transition failure cleanup.
9. **Responsive/device matrix:** validate browser and native at 320/360/393/430 widths, large font scale, safe areas, keyboard open, orientation, diagonal/fast swipes, nested rails, account switch, app restart, and TalkBack/VoiceOver.
10. **Telemetry:** induce provider timeout, media-storage failure, and rate-limit responses in staging; verify sanitized structured events and alert thresholds in the configured backend.

## 6. UX redesign recommendations

1. Replace the ambiguous count with two explicit metrics: **“704 recipes in the browse pool”** and **“N currently loaded”**; optionally show bundled Calora originals separately. Never call provider pool size a complete catalogue or imply it equals visible cards.
2. Add a first-class Discover zero-result state: **“No recipes found”**, with **Clear search** and **Reset category** actions. Keep it distinct from outage/retry and from initial loading.
3. Make the saved rail say **“Recent 6”** and add **View all**; expose restored, unavailable, and retry states rather than silently omitting cards.
4. Make portion basis visible and consistent. Prefer structured ingredient quantity/unit fields; conservatively mark text that cannot be parsed as unchanged.
5. Make save feedback truthful: “Saved,” “Already saved,” “Removed,” and “Nutrition unavailable—saved locally; retry nutrition” should be distinct states with persistent visual confirmation.
6. Increase actual compact/header hit areas to at least 44dp or add equivalent hitSlop and test semantics; retain visual compactness if desired.
7. Label Discover as **Curated browse** unless a real explainable profile-aware rank is implemented. Document planner personalization separately from recommendation personalization.
8. Add explicit allergy/restriction controls and fail-closed unknown-allergen behavior before marketing recommendations as safe for restricted diets.
9. Preserve current privacy-positive media behavior: no generic image fallback, review gating, owner-qualified URLs, no signed locator persistence, durable media keys, and account-switch invalidation.

## 7. Bounded implementation phases

### Phase 0 — Release integrity and truthfulness

- Regenerate/remove stale `artifacts/api-server/dist`; enforce source-to-dist prompt-version CI.
- Reconcile `CALORA_MISSION_APPROVAL_REPORT.md`, release notes, and `artifacts/calora/lib/__tests__/recipesScreen.test.ts` wording.
- Add Discover zero-result state, truthful duplicate-save feedback, and unavailable-nutrition CTA confirmation.
- Add “Recent 6 / View all” and saved/restored/unavailable counts.

### Phase 1 — P1 behavior correctness

- Define one canonical serving basis and structured ingredient scaling or explicit unchanged-item disclosure.
- Decide whether saved recipes/meals are device-only or account-synchronized. If account-synchronized, add ownership, conflict resolution, deletion, offline outbox, and account-bound restoration.
- Implement server-side photo idempotency keyed by owner plus validated request key/payload hash, and durable offline generation intent.
- Add rendered RecipeDetailModal/RecipeSaveMenu interaction tests and responsive keyboard coverage.

### Phase 2 — Media and assurance hardening

- Add cursor pagination/terminal metadata for media restoration, object cleanup after transition failure, atomic acceptance/URL issuance or explicit accepted-without-URL state, and individual generated-recipe deletion policy.
- Enable disposable-DB tenant isolation and media persistence suites in CI; make pure semantic tests independent of undeclared `DATABASE_URL`.
- Add recipe-route telemetry assertions and a current physical iOS/Android/browser release matrix.

### Phase 3 — Personalization only after contract definition

- Add versioned account-scoped allergy/intolerance/exclusion fields and fail-closed enforcement across Discover, Plus, planner, generated recipes, and saved surfaces.
- Thread saved macro targets and meal timing only after defining nutrition and safety semantics.
- Choose between curated-browse naming and an explainable account-aware rank. Use opt-in save/dismiss/log feedback, reset controls, retention/deletion semantics, and account-safe caches.
- Converge legacy Coach on bounded server-owned snapshots before any Coach-derived recommendation use.

## 8. Acceptance criteria

A release candidate should meet all of the following:

- Source and runtime artifacts agree on `recipe-photo-semantic-v5-identity-stable-ingredient-fidelity`; stale `dist` is impossible to ship.
- Discover count labels identify provider pool size, loaded count, and bundled originals separately; no “catalogue total” implication remains.
- Search/category zero results have clear recovery actions; outage and empty states remain distinct.
- Portion changes produce consistent ingredient, shopping-list, nutrition, diary, and planner quantities, or explicitly identify unparseable unchanged items.
- Duplicate meal saves never report a false success; unavailable-nutrition saves show an explicit durable state.
- Saved recipe/meal behavior is either demonstrably cross-device/account synchronized or clearly labeled device-local; no contradictory signed-in UX remains.
- Media idempotency, offline retry intent, restoration pagination, transition cleanup, owner isolation, signed URL expiry/renewal, account deletion, and individual deletion policy are tested in disposable staging.
- Cards and controls pass rendered tests at 320/360/393/430 widths, large text, keyboard-open, safe-area, orientation, browser resize, and native iOS/Android gesture conditions; actionable hit areas are at least 44dp or have tested hitSlop.
- API semantic, premium, media, tenant, and generated-contract/typecheck gates run in CI with deterministic test configuration.
- Recipe-specific failures produce sanitized structured telemetry with tested alert thresholds.
- Product copy distinguishes curated browse, related-content similarity, planner profile/program personalization, and any future recommendation engine.
- Allergy/restriction safety claims are withheld until fail-closed data flow and cross-surface tests exist.

## 9. Unresolved evidence gaps

- No physical Android/iOS or browser-runtime validation was available; native gesture arbitration, keyboard avoidance, layout clipping, focus order, cache eviction, and signed URL expiry remain unverified.
- No authenticated Plus/account session was available; Plus inventory, cross-device restoration, and account-specific save behavior are not production-certified.
- No live S3-compatible storage, Supabase database, provider, or telemetry backend was exercised.
- `DATABASE_URL`-dependent media/premium tests were not fully runnable; tenant integration was skipped by gate.
- Historical 46-card web and 704-pool API evidence came from different prior reports/release windows and must not be interpreted as a simultaneous snapshot.
- No direct cross-tenant leak was demonstrated; static owner predicates and RLS are strong but cannot replace live integration proof.
- External provider allergen completeness and AI nutrition/allergen accuracy were not evaluated.
- The supplied evidence does not prove that current production runs the checked-in source rather than stale `dist`; this is why the artifact mismatch is a release blocker.

## References

### Repository paths

- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/(tabs)/_layout.tsx`
- `artifacts/calora/app/saved-recipes.tsx`
- `artifacts/calora/app/saved-meals.tsx`
- `artifacts/calora/components/SwipeableTabList.tsx`
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx`
- `artifacts/calora/components/RecipeSaveMenu.tsx`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/hooks/useDiarySync.ts`
- `artifacts/calora/lib/discoverCatalogueState.ts`
- `artifacts/calora/lib/recipePagination.ts`
- `artifacts/calora/lib/generatedRecipeImageLifecycle.ts`
- `artifacts/calora/lib/generatedRecipeImagePersistence.ts`
- `artifacts/calora/lib/coachContext.ts`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`
- `artifacts/calora/lib/__tests__/recipeCataloguePagination.test.ts`
- `artifacts/calora/lib/__tests__/recipePagination.test.ts`
- `artifacts/calora/lib/__tests__/recipeServing.test.ts`
- `artifacts/calora/lib/__tests__/recipeDiaryServing.test.ts`
- `artifacts/calora/lib/__tests__/recipeSaveMenu.test.ts`
- `artifacts/calora/lib/__tests__/savedRecipesScreen.test.ts`
- `artifacts/calora/lib/__tests__/savedMealsScreen.test.ts`
- `artifacts/calora/lib/__tests__/generatedRecipeImageLifecycle.test.ts`
- `artifacts/api-server/src/routes/recipes.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/routes/planner.ts`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `artifacts/api-server/src/lib/recipe-media.ts`
- `artifacts/api-server/src/lib/recipe-media-generation.ts`
- `artifacts/api-server/src/lib/recipe-photo-storage.ts`
- `artifacts/api-server/src/__tests__/recipes.test.ts`
- `artifacts/api-server/src/__tests__/diary.test.ts`
- `artifacts/api-server/src/__tests__/recipe-media-semantics.test.ts`
- `artifacts/api-server/src/__tests__/recipe-photo-storage.test.ts`
- `artifacts/api-server/src/__tests__/recipe-generation.test.ts`
- `artifacts/api-server/dist/index.mjs`
- `artifacts/api-server/src/app.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/recipe-generation.ts`
- `lib/db/migrations/0005_recipe_media.sql`
- `supabase/migrations/20260923220000_create_recipe_media.sql`
- `docs/CALORA_COACH_EXISTING_CONTEXT_FORENSIC_AUDIT.md`
- `docs/certification/2026-11-07/areas/07-recipes.md`
- `CALORA_MISSION_APPROVAL_REPORT.md`
- `CALORA_UX_03_FASTING_AND_PERSONALIZATION.md`
- `208_CALORA_72_HOUR_REAL_USER_VALIDATION_AND_RECOVERY_REPORT.md`
- `239_CALORA_DISCOVER_COMPOSITION_AND_IMAGE_DELIVERY_REMEDIATION_REPORT.md`
- `responsive-audit/03-recipes.md`

### Public URL

- `https://app.mycaloraapp.com/api/v1/recipes` — unauthenticated read-only probes performed 2026-11-10 UTC (HTTP 200; unfiltered `browsePoolSize=704`, advancing offsets, finite category behavior, and zero-result nonsense search).

### Commit/history references

- `ff02b43e` — current clean HEAD, merge of PR #435.
- `62a5a282` — `fix recipe catalogue scope and photo identity on release`.
- `bb690141` — `fix recipe photo identity and catalog count semantics`.
- `bd67e675` — semantic normalization/hash separation.
- `36812445` — unified save actions.
- `0cefbf7a` — Create image lifecycle.
- `2dde5b4f` — review preview response.
- `dc19f237` — release fixture alignment.

**Final statement:** This report is an evidence synthesis from a read-only audit. No code, build, deployment, database, account, provider, or production changes were made.