# 207 — Calora Final Image Test Environment & Certification Report

**Date:** 2026-10-13  
**Scope:** Final web image-integrity closure after Reports 204–206  
**Native builds:** None triggered  
**Production data:** No records created, edited, or deleted during this pass

## Executive result

The deployed Calora release was re-tested in the connected browser and through isolated API/UI regression suites.

**Engineering status: PASS.** No new reproducible source defect was found in the remaining accessible image workflows. The saved bundled Discover recipe restoration fix is now visually verified after deployment. The remaining unverified workflows are blocked by genuine account/provider access requirements, not by a newly observed image-integrity failure.

## 1. Production identity and health

| Check | Result | Evidence |
|---|---|---|
| Public web health | **PASS** | `https://mycaloraapp.com/health` returned HTTP 200 with `{"status":"ok"}`. |
| Public API health | **PASS** | `https://mycaloraapp.com/api/healthz` returned HTTP 200 with `{"status":"ok"}`. |
| Release identity | **PASS** | `https://mycaloraapp.com/api/version` returned commit `77af9bfbcd1f7f9df0e379c389a10d4b36b1d8c1`, source tree `dcc9e9d3ae88767ad1bf9abfc841ecb6b8a0398d`, and release `calora-api-77af9bfbcd1f-20261013105606404`. |
| Native build policy | **PASS** | No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was requested or triggered. |

## 2. Live connected-browser evidence

The connected browser was switched to **My Browser** and used against the deployed app at `https://app.mycaloraapp.com`.

| Surface / workflow | Result | Actual evidence |
|---|---|---|
| Recipes / Discover loaded | **PASS** | The live screen rendered 46 open recipes, category filters, saved recipes, and image-bearing recipe cards. |
| Saved bundled Discover restoration | **PASS** | The saved `Overnight oats with berries` card remained visible with its image and count after opening `https://app.mycaloraapp.com/recipes`. |
| Saved bundled recipe detail reopen | **PASS** | Opening the saved card displayed `Overnight oats with berries`, the matching fruit/oats image, ingredients, three preparation steps, nutrition context, and source label. No blank detail state or remote 404 occurred. |
| Recipe-detail suggestions | **PASS** | The opened recipe showed `40 suggestions · up to 20 per row`, with two populated horizontal rows and distinct recipe identities. |
| Refresh/navigation persistence | **PARTIAL** | The saved card was present after entering the deployed Recipes route and after closing the detail sheet. A full browser hard-refresh identity assertion was not repeated because the connected browser session was not signed in and local storage/session continuity is not reliably controllable from this route. Source-level persistence coverage remains passing. |
| Plus tab | **BLOCKED — expected access gate** | Selecting Plus showed `Sign in for Plus recipes` and `Plus sources require sign-in`; no provider request or image was shown. This is a correct fail-closed behavior for the unauthenticated session. |
| Create guest surface | **PASS — surface only** | Selecting Create rendered the AI Recipe Creator, guest presets, ingredient choices, and the `Generate 5 ideas` affordance. No recipe was saved and no image-generation result was claimed. |
| Create authenticated generation, image lifecycle, save/reopen | **BLOCKED** | The connected session was not authenticated. The backend correctly returned HTTP 401 for unauthenticated `/api/v1/recipes/concepts`; no credentials were requested, read, or exposed. |
| Restaurants | **BLOCKED** | Direct navigation to `/restaurants` returned the app to Today in the unauthenticated session. The live populated restaurant-product workflow could not be reached without authenticated access/provider results. No restaurant image was classified as verified. |
| Wrong-image fail-closed behavior | **PASS by accessible evidence / source coverage** | No unrelated image was displayed in the tested saved Discover detail. Restaurant and Plus surfaces did not display unverified images when access was unavailable. |

### Live image identity note

The saved `Overnight oats with berries` detail showed a canonical Calora bundled image consistent with the recipe’s berries/oats breakfast identity. The title, ingredients (`rolled oats`, `coconut yogurt`, `mixed berries`, `chia seeds`, `almond milk`), and method were present together. No recycled Plus/restaurant/provider photo was used.

## 3. Production access-gate probes

Unauthenticated requests were sent only to read-only/public API endpoints:

| Endpoint | Result |
|---|---|
| `GET /api/v1/premium-recipes` | HTTP 401, `Sign in to access Plus recipes.` |
| `GET /api/v1/restaurant-foods?query=burger` | HTTP 401, `Sign in to search restaurant foods.` |
| `POST /api/v1/recipes/concepts` with a benign test request | HTTP 401, `Please sign in to generate recipe ideas.` |

These responses confirm that the production system does not leak Plus, restaurant, or Create provider data to an unauthenticated browser session.

## 4. Isolated automated validation

### Calora UI/image suites

**11 test files, 67 tests passed**:

- `savedRecipesScreen.test.ts`
- `premiumRecipeImages.test.ts`
- `premiumRecipeDetailImage.test.ts`
- `premiumRecipeReliability.test.ts`
- `premiumSavedRecipes.test.ts`
- `restaurantFoodImages.test.ts`
- `restaurantFoodReview.test.ts`
- `restaurantFoodScreen.test.ts`
- `recipeCreateReopenImages.e2e.test.ts`
- `generatedRecipeImageLifecycleScreens.test.ts`
- `recipesScreen.test.ts`

Calora TypeScript check and `git diff --check` also passed.

### API suites

The first offline invocation was intentionally run without a database URL and failed at module initialization with the explicit guard:

> `DATABASE_URL must be set. Did you forget to provision a database?`

This was an environment/setup failure, not a test assertion failure and not a production database mutation. The same suites were then run with a loopback-only, non-production PostgreSQL URL:

**3 test files, 61 tests passed**:

- `premiumRecipes.test.ts`
- `restaurantFoods.test.ts`
- `recipe-generation.test.ts`

No network connection to the loopback port was needed by these mocked route tests. API TypeScript check passed.

## 5. Root-cause and blocker determination

### Plus

- **Root cause of non-execution:** the connected My Browser session is on the sign-in route and has no authenticated Plus entitlement.
- **Security behavior:** correct. The route requires a verified signed-in account and active Premium entitlement before provider work.
- **Required external prerequisite:** owner-provided authorized Calora account with an active Plus entitlement, or an approved isolated QA account provisioned through the existing Supabase/RevenueCat workflow.
- **No bypass used:** entitlement checks were not weakened, mocked in production, or bypassed in the browser.

### Create AI generation

- **Guest surface:** reachable and rendered correctly.
- **Authenticated backend workflow:** blocked by the same missing sign-in state; production returned 401.
- **Required external prerequisite:** authorized signed-in QA account and a permitted generation path. A service-role/test-password setup is already documented in `recipe-generation.integration.test.ts`, but those secrets were not present in this sandbox and no account was created.
- **Image integrity status:** no fabricated generation result was recorded. Existing lifecycle tests cover generation, URL refresh, render acknowledgement, retry, rejection, and persistence behavior.

### Restaurants

- **Root cause of non-execution:** direct unauthenticated navigation did not expose a stable restaurant search/detail surface, and the authenticated provider workflow requires account access plus populated FatSecret results.
- **Required external prerequisite:** authorized signed-in browser session and a live populated restaurant-provider response.
- **Image integrity status:** the fail-closed restaurant representative-image policy remains enforced; no unverified product image was shown or certified.

## 6. Fixes made in this pass

No new application defect was reproduced, so no application source fix was necessary.

The previously deployed saved-recipe fix remains confirmed:

1. Bundled Discover IDs are restored from the canonical in-app catalog.
2. Bundled IDs are excluded from remote detail queries.
3. Saved source grouping remains Discover.
4. Remote Discover, Plus, and user-created restoration paths remain intact.
5. The image lifecycle remains fail-closed for missing, rejected, expired, or unverified images.

This report is documentation only; it does not change application behavior or production data.

## 7. Final certification matrix

| Area | Status |
|---|---|
| Discover bundled recipe image display | **PASS** |
| Saved bundled recipe restoration after deployed navigation | **PASS** |
| Saved recipe detail image/title/ingredients/method alignment | **PASS** |
| Recipe detail suggestions, two rows, max 20 per row | **PASS** |
| Plus entitlement gate | **PASS — gate verified; image workflow BLOCKED by access** |
| Authenticated Plus image identity | **BLOCKED — authorized entitlement required** |
| Create guest UI | **PASS — UI only** |
| Authenticated AI generation/image lifecycle | **BLOCKED — authorized sign-in required** |
| Restaurant provider search/detail | **BLOCKED — authorized account and populated provider context required** |
| Restaurant image provenance | **NOT TESTED — no live populated context** |
| Automated UI image/lifecycle regression | **PASS — 67 tests** |
| Automated API Plus/restaurant/Create regression | **PASS — 61 tests in isolated environment** |
| Public health and release identity | **PASS** |
| Native/mobile image workflows | **NOT TESTED — no native build authorized** |

## 8. Final conclusion

**Report 207 outcome: PASS for all technically executable web/image checks; BLOCKED only for genuine external access prerequisites.**

No remaining browser-accessible defect was found in saved Discover restoration, recipe-detail image identity, or suggestion rendering. Complete closure of Plus, authenticated Create image generation/persistence, and populated Restaurants imagery requires a legitimate authenticated QA account/entitlement and live provider context. The correct next step is to provide that authorized access through the existing account/entitlement workflow—not to bypass gates or weaken image validation.
