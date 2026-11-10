# CAL-QA Discovery — recipes-planning

**Inspection date:** 2026-11-10
**Repository:** `/tmp/calora-m417-main`
**Inspected source SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8` (clean detached checkout)
**Framework:** `/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt`
**Cluster:** recipes-planning
**Scope:** CAL-QA-11 (Discover/recipes) and CAL-QA-12 (meal planning/weekly programs)

## Executive verdict

| Mission | Status | Certification interpretation |
|---|---|---|
| CAL-QA-11 — Discover, recipes, search/filter, pagination, detail, images, nutrition, saving and related navigation | **BLOCKED** | Current source and controlled tests provide substantial partial verification, but the framework requires genuine relevant-platform execution. Authenticated Plus/provider, database-backed media, browser/native runtime, and physical-device evidence are absent. Several current recipe behavior defects remain documented below. |
| CAL-QA-12 — Meal planning and weekly programs, schedules, previews, recipes, modifications, saves and planned-meal journeys | **BLOCKED** | Planner source contracts and deterministic/provider-mocked tests cover many paths, but no current Android/iOS/web user journey, cross-device persistence, or production/provider execution was performed. Full acceptance is therefore not certified. |

No build, test command, deployment, provider call, database access, native execution, mutation, or source edit was performed during this inspection. The report is based on source, checked-in tests, existing reports, and local evidence only.

## Mission mapping and acceptance criteria

The framework defines CAL-QA-11 at `CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt:80-82`: Discover/recipes, search/filter, pagination/endless scroll, detail, images, nutrition, saving and related navigation; feeds must paginate to a legitimate end without stalls or unintended repeats, with filtering/randomization, images, save behavior, loading/error/retry/network recovery.

CAL-QA-12 is defined at `CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt:84-86`: meal planning and weekly programs, schedules, previews, recipes, modifications, saves and planned-meal journeys; every program card/action/navigation, image, persistence and downstream nutrition behavior must work on relevant platforms.

Under the framework evidence rule (`:32-33`), source tests and mocks are supplementary and cannot replace genuine native/provider execution. A mission with required unexecuted evidence is blocked; compilation, mocked responses, a healthy endpoint, or a queued/deployed artifact is not proof of user success.

## Current implementation evidence

### CAL-QA-11 — Discover and recipes

The primary shared implementation is `artifacts/calora/app/(tabs)/recipes.tsx`. It covers Discover, Plus, Create, recipe detail, image rendering, pagination, nutrition, saved recipe/meal actions, shopping-list insertion, planner insertion, and related suggestions. Current HEAD includes ancestor commit `8d5bd5aa2b8e028ee60f90c58346954123994450` (`fix recipe catalogue contracts and progressive suggestions`), which reduced related suggestions to two rows of six (`RECIPE_SUGGESTION_ROW_COUNT = 2`, `RECIPE_SUGGESTIONS_PER_ROW = 6`) and updated the screen contract.

Relevant current source/state contracts include:

- `artifacts/calora/lib/discoverCatalogueState.ts`: generation/offset ledger, same-offset replacement rather than duplicate append, stable-ID reconciliation, stale-generation rejection, circular/non-advancing cursor termination, and explicit continuation guards.
- `artifacts/calora/lib/recipePagination.ts`, `premiumRecipeReliability.ts`, `premiumCatalogueState.ts`, and `premiumRecipeRequest.ts`: bounded cursor claims, loading/error/retry and 401/403 account-boundary handling.
- `artifacts/calora/lib/discoverRecipeImage.ts`, `foodImageMetadata.ts`, `generatedRecipeImageLifecycle.ts`, and `generatedRecipeImagePersistence.ts`: fail-closed image provenance, review/accepted generated-media states, account scoping, and exclusion of expiring signed URLs from durable identity.
- `artifacts/calora/lib/recipeNutrition.ts`, `recipeModel.ts`, `recipeServing.ts`, and `recipeDiaryServing.ts`: explicit nutrition availability/provenance and serving scaling contracts.
- `artifacts/calora/app/saved-recipes.tsx` and `saved-meals.tsx`: restoration of local, bundled, remote and Plus saved content with explicit unavailable/sign-in paths.
- `artifacts/api-server/src/routes/recipes.ts`, `routes/premiumRecipes.ts`, and `routes/planner.ts`: recipe/Plus/planner route behavior, authentication/rate limits, provider fallback, and response contracts.

Checked-in mobile tests relevant to this mission include `recipeCataloguePagination.test.ts`, `recipePagination.test.ts`, `recipesScreen.test.ts`, `discoverRecipeMix.test.ts`, `discoverRecipeImage.test.ts`, `premiumRecipeReliability.test.ts`, `premiumRecipeImages.test.ts`, `premiumSavedRecipes.test.ts`, `savedRecipesScreen.test.ts`, `savedRecipesPremiumReliability.test.ts`, `recipeNutrition.test.ts`, `recipeModel.test.ts`, `recipeServing.test.ts`, `recipePlanTargetWeek.test.ts`, `recipeShoppingPersistence.integration.test.tsx`, `recipeRotation.e2e.test.ts`, and generated-media lifecycle/security suites. The existing 2026-11-07 area report records a focused mobile run of 15 files/143 tests passed, but that is controlled test evidence, not current native-runtime evidence.

### CAL-QA-12 — Planning and weekly programs

The planner implementation is `artifacts/calora/app/(tabs)/planner.tsx`, supported by `artifacts/calora/data/planner.ts`, `artifacts/calora/lib/planType.ts`, `plannerAck.ts`, `plannerImageRendering.ts`, and `artifacts/calora/context/CaloraContext.tsx`. Evidence inspected shows:

- Seven-day Monday–Sunday week calculation, selected-day navigation, program selection/detail previews, diet-aware eligibility and unavailable-program states.
- Local starter fallback and authenticated `/v1/planner/generate` generation, with explicit generic 401/429/400/timeout/provider-error recovery that leaves the current plan unchanged.
- Fill/rebuild merge modes that preserve user-authored, edited, manually added, and logged meals; protected IDs prevent replacing already logged meals.
- Recipe-to-planner insertion using the selected target week/day (`recipePlanTargetWeek.test.ts`), slot replacement, copy/move/undo behavior, shopping-list derivation, diary logging, nutrition validation, and persistence-error retry UI.
- Planner images use `PlannerMealImage` and provenance labels; program previews use stable test IDs and disclose that representative examples are not guaranteed generated meals.

Relevant tests include `artifacts/calora/lib/__tests__/planner.test.ts`, `plannerAck.test.ts`, `plannerCopyRetention.integration.test.tsx`, `plannerDiaryLogging.test.ts`, `plannerIntegrityEvidence.test.ts`, `plannerNutrition.test.ts`, `plannerProgramEligibility.test.ts`, `plannerReplace.test.ts`, `programModalState.test.ts`, `recipePlanTargetWeek.test.ts`, and `recipeShoppingPersistence.integration.test.tsx`. API coverage is in `artifacts/api-server/src/__tests__/planner.test.ts` and includes canonical 28-meal catalog identity, authentication rejection, rate limiting, deletion-fence behavior, provider fallback to a complete 28-meal starter week, program/diet eligibility, unknown-program rejection, and quick-and-easy prep-time constraints.

`artifacts/calora/PLANNER_INTEGRITY_VALIDATION.md` is deterministic catalog evidence for a fixed week and 12 programs. It reports zero adjacent repeats and complete role coverage under its stated catalog assumptions, but it is not a native or provider execution record.

## Defects and material gaps observed

These are not promoted to a mission-level FAIL without a genuine failing acceptance run, but they materially prevent VERIFIED status:

1. **Recipe portion consistency defect (current forensic evidence).** `docs/research/2026-11-09/recipe-page-forensic-report.md:47-50,95-97` identifies that nutrition, diary, planner, and displayed ingredients use different scaling semantics for some ingredients; unparseable text remains supplied text. Current source at `recipes.tsx:1691`, `1777-1785`, `1832`, and `2244-2266` shows the scaled ingredient path, but no native/runtime evidence demonstrates end-to-end consistency. Treat as a confirmed contract risk requiring disposition, not as a verified mission pass.
2. **Signed-in saved recipe/meal synchronization is incomplete for an account-level expectation.** The forensic report (`:50-52,99-101`) records local persistence in `CaloraContext` and diary-only server sync (`artifacts/api-server/src/routes/sync.ts`). No cross-device save/remove/reinstall/reconciliation journey was executed. This directly affects CAL-QA-11 saving and CAL-QA-12 persistence if account-level persistence is required.
3. **Planner save feedback inconsistency remains in one path.** `artifacts/calora/app/(tabs)/planner.tsx:1421-1422` shows an unconditional “Meal saved” alert for a planner-detail save call, unlike recipe detail paths that branch on the boolean (`recipes.tsx:1912-1913`, `2913-2922`). No runtime assertion was run. This should be corrected or explicitly accepted as local-only behavior.
4. **Planner state is device-local in the inspected implementation.** Planner mutations use `CaloraContext` (`setPlannerMeals`/`updatePlannerMeals`) and the planner integration tests use mocked AsyncStorage. No server planner persistence or cross-device conflict/recovery evidence was found in the inspected material. This prevents CAL-QA-12 persistence from being VERIFIED.
5. **Discover successful zero-result/recovery semantics require review.** The current forensic report (`docs/research/2026-11-09/recipe-page-forensic-report.md:61-65`) records a missing dedicated successful zero-result recovery state in the earlier baseline. Current `recipes.tsx:3513` contains “No recipes yet,” but no execution established that a successful zero-result query is distinguished from outage/loading and offers the required retry/filter recovery.
6. **Saved Discover rail/count semantics require runtime verification.** The current forensic report records prior saved-rail cap/count discrepancies. The current HEAD has changed related-suggestion limits, but no current browser/native execution was performed to prove saved-card/count reconciliation.
7. **Media/database integration is not fully executable from the local evidence set.** The authoritative recipes area (`docs/certification/2026-11-07/areas/07-recipes.md:42-46,101-120`) records API route tests blocked by missing `DATABASE_URL`, database-backed generated-media persistence skip-gated, and live generated-media provider execution not run. These remain relevant limits unless a newer report explicitly ties complete disposable evidence to SHA `7a56ffb7`.
8. **Stale/historical artifact claims must not certify HEAD.** The 2026-11-09 forensic report (`docs/research/2026-11-09/recipe-page-forensic-report.md:39-45`) identified `artifacts/api-server/dist/index.mjs` containing the v4 recipe-media marker while current source uses v5. The 2026-11-10 implementation plan (`docs/research/2026-11-10/65_CAL_RECIPES_001_IMPLEMENTATION_PLAN.md:31-39`) repeats this as a source/artifact drift blocker. This inspection did not rebuild or independently verify the artifact; treat the claim as an unresolved release-integrity evidence item, not as proof that current production serves stale code.

## Existing reports and their evidentiary weight

- `docs/certification/2026-11-07/areas/07-recipes.md` is the strongest bounded recipes audit: 15 mobile files/143 tests passed; API, database, authenticated Plus, provider media, browser/native runtime, and physical-device boundaries are explicitly blocked or not run.
- `235_CALORA_RECIPES_DISCOVER_PLUS_SCROLL_RELIABILITY_REPORT.md` is historical remediation evidence. It explicitly states implementation/controlled regression only and says deployment, authenticated Plus, and physical-device verification were pending. It must not be treated as a current full pass.
- `docs/certification/2026-11-09/64_MISSION_430_RELEASE_COMPLETION.md` records a prior production release for recipe-photo/catalogue semantics, with API/client/full validation and public HTTP checks. Its serving SHA is `1f32f51f...`, not the inspected SHA `7a56ffb7`; it therefore provides historical context only unless separately reconciled to the current source and serving artifact.
- `docs/research/2026-11-09/recipe-page-forensic-report.md` uses baseline `ff02b43e`, not current HEAD, and explicitly labels its claims as source/read-only findings. It is useful for defect leads, not a current production certification.
- `docs/research/2026-11-10/65_CAL_RECIPES_001_IMPLEMENTATION_PLAN.md` is an uncommitted/read-only planning artifact with implementation not authorized; it is not execution evidence.
- `artifacts/calora/PLANNER_INTEGRITY_VALIDATION.md` is deterministic catalog evidence, not user-journey or provider evidence.

## Missing evidence required to close the missions

1. Execute the current source/build artifact on an authorized current web session and Samsung Galaxy S20 Android candidate, plus iOS internal candidate where authorized; capture SHA/build IDs and exact flow logs/screenshots.
2. Run CAL-QA-11 Discover long-scroll, filter/search, same-page refetch, circular/finite terminal, retry/offline/background-resume, image failure/retry, detail, nutrition, save, saved-route restoration, planner insertion, and related navigation journeys.
3. Run CAL-QA-12 every program card/action/detail/preview, apply/rebuild/fill, modify/replace/copy/move/undo, week navigation, future/prior target week, logging, shopping list, restart, background/resume, persistence failure/retry, and downstream nutrition journeys.
4. Use an authorized isolated Plus/provider session to verify authenticated catalogue content, long continuation, terminal behavior, image delivery, saved Plus restoration, provider errors, 401/403 boundaries, and account switching. No authentication bypass is acceptable.
5. Run protected disposable PostgreSQL/real-handler tests for recipe-media/planner persistence and tenant isolation where applicable, with synthetic identities only; record exact test identity and database/runtime provenance.
6. Perform cross-device/account persistence and conflict tests for planner meals, saved recipes/meals, edits/deletes, and reinstall/recovery. Current local AsyncStorage integration tests cannot substitute for this.
7. Reconcile source, generated `dist`, release branch, Railway serving SHA, and current web/native artifact/build provenance. Do not use the 2026-11-09 production report as evidence for this SHA without that reconciliation.

## Final classification

**CAL-QA-11: BLOCKED** — source and controlled tests are substantially implemented and provide partial verification; full Discover/recipes acceptance is not certified because native/browser runtime, authenticated provider/Plus, database/media, cross-device, and current serving-provenance evidence are missing. Current forensic reports also identify unresolved recipe contract risks/defects.

**CAL-QA-12: BLOCKED** — planner/program source and deterministic tests cover meaningful eligibility, merge, target-week, logging, shopping, nutrition, and persistence-error behavior; full acceptance is not certified because no genuine relevant-platform journey, cross-device persistence, production/provider, or current artifact evidence exists. The unconditional planner “Meal saved” feedback path and device-local persistence boundary require disposition.

Overall recipes-planning cluster status: **BLOCKED (with PARTIAL source/test verification and documented DEFECT risks; no current native/provider production PASS).**
