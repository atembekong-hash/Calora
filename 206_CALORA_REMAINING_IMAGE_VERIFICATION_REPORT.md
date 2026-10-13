# 206 — Calora Remaining Image Verification Report

**Date:** 2026-10-13  
**Scope:** Remaining web image-integrity gaps after Reports 204 and 205  
**Native builds:** None triggered

## Executive result

The remaining reproducible defect found during this closure pass was fixed and deployed:

> Bundled Calora Discover recipes were saved by ID but restored as if they were remote API recipes. After navigation, the saved count remained visible while the recipe card could disappear because the remote detail endpoint did not recognize the bundled ID.

The fix now restores bundled Discover recipes from the in-app catalog before attempting remote retrieval. It preserves Discover grouping, keeps remote retrieval for genuinely remote recipes, and leaves Plus authentication behavior unchanged.

## 1. Live execution evidence

| Surface / workflow | Result | Evidence and limitation |
|---|---|---|
| Protected GitHub merge | **PASS** | PR #167 merged into `main`: `5f5dbd8d674ed3d39bfddb5537f3a70fd04b1931`. Required checks: Release validation and Account-deletion fence successful. |
| Railway Calora, `Calora` service | **PASS** | Deployment `d37b3210-8420-4ae2-9c48-ee65418c3ebe`, commit `5f5dbd8`, SUCCESS. |
| Railway Calora, `@workspace/api-server` | **PASS** | Deployment `1daf227d-c4b5-490c-a2df-5b25df94eb4f`, commit `5f5dbd8`, SUCCESS. |
| Railway Calora, `@workspace/calora` | **PASS** | Deployment `90faca02-2efe-4d04-a918-f7315528e9dd`, commit `5f5dbd8`, SUCCESS. |
| Railway environment | **PASS** | Production reported 3 services online, 0 issues, 0 recent failures, and no pending work. |
| Public web health | **PASS** | `https://mycaloraapp.com/health` returned HTTP 200 `{"status":"ok"}`. |
| Public API health | **PASS** | `https://mycaloraapp.com/api/healthz` returned HTTP 200 `{"status":"ok"}`. |
| Release identity | **PASS** | `/api/version` returned `gitCommit: 5f5dbd8d674ed3d39bfddb5537f3a70fd04b1931`. |
| Saved Discover fixture before fix | **FAIL — fixed** | The connected browser showed one saved recipe and the Discover shelf showed the recipe, but after navigating to the saved shelf the source could not rehydrate the bundled recipe through `/api/v1/recipes/:id`. |
| Saved Discover fixture after fix | **PASS — source and regression verified** | Bundled recipes are now included in the saved shelf’s local restoration map and excluded from remote detail queries. Focused tests pass. The browser session was refreshed after deployment; the route redirected to Today in the connected session, so a second visual card assertion could not be completed in that session. |
| Plus entitlement access | **BLOCKED** | The connected browser session redirected to sign-in and did not provide an authorized Plus entitlement. No credentials were requested, read, or exposed. |
| Real AI Create image generation | **BLOCKED** | The guest Create control could not be reached reliably through the available browser interaction surface. No fabricated generation result was recorded. The server/client contracts and prior lifecycle tests remain covered by Reports 203–205. |
| Populated Favorites / saved persistence | **PARTIAL** | A controlled Discover save was created and its saved count persisted. Full post-deployment visual reopen was limited by the connected browser redirect described above. |
| Restaurants product imagery | **NOT TESTED** | The live connected session did not expose a stable authenticated restaurant workflow during this pass. The image-integrity remediation remains fail-closed for unverified restaurant imagery. |
| Mobile-only image workflows | **NOT TESTED HERE** | This was a web certification pass. No Android or iOS build was triggered, consistent with the project rule. |

## 2. Root cause

`app/saved-recipes.tsx` previously divided saved IDs into:

- local user-created recipes, and
- all other IDs, which were treated as remote Discover or Plus records.

The bundled Calora Discover catalog is neither a user-created local recipe nor a remote API record. Its IDs therefore entered `discoverIds`, and the screen called `getRecipe(id)`. For bundled IDs such as `berry-oats`, the remote detail endpoint returned 404. The saved ID remained in state, which produced the misleading combination of a nonzero saved count and no restored card.

## 3. Remediation

The deployed change:

1. Imports the canonical `caloraOriginalRecipes` catalog into the saved shelf.
2. Builds a stable `builtInIds` set.
3. Restores saved bundled recipes directly from the catalog.
4. Excludes bundled IDs from remote Discover detail queries.
5. Keeps source grouping as Discover rather than Create.
6. Preserves remote Discover, Plus, and user-created restoration behavior.
7. Adds `savedRecipesScreen.test.ts` to prevent regression.

No production data was deleted or rewritten.

## 4. Automated validation

Focused validation completed successfully before merge:

- `savedRecipesScreen.test.ts`: **1 passed**
- `generatedRecipeImageLifecycleScreens.test.ts`: **3 passed**
- `recipesScreen.test.ts`: **35 passed**
- Total focused tests: **39 passed**
- Calora TypeScript check: **passed**
- `git diff --check`: **passed**
- Protected GitHub checks: **passed**

## 5. Remaining genuine blockers

1. **Plus image verification requires authorized Plus access.** The available connected browser session was not signed into an account with usable Plus entitlement, so Plus images were not falsely classified as tested.
2. **Real Create AI generation requires a stable browser control path and appropriate generation access.** No generation was claimed without an observable result.
3. **Restaurant product-image verification requires a stable live restaurant workflow and populated product results.** The fail-closed policy remains in force: an unverified image must not be shown as a food or restaurant match.
4. **Physical-device verification remains separate.** No native build was triggered and no mobile PASS is claimed by this report.

## Final status

**Engineering fix:** PASS  
**Protected merge:** PASS  
**Production deployment:** PASS  
**Saved bundled Discover restoration:** PASS by source-level regression and deployed release identity; post-deploy visual reopen was limited by the connected browser redirect.  
**Full remaining web image certification:** BLOCKED/PARTIAL only for Plus entitlement, Create generation controls, and Restaurants access—not because of a newly observed image-integrity defect.
