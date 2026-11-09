# Mission 429 — Recipe Photo Stability and Catalogue-Count Forensic

**Date:** 2026-11-09  
**Scope:** Generated recipe photo persistence, lifecycle reconciliation, and native Explore count semantics.  
**Baseline:** Protected `main` at `a69c0612b07b3dcf5815d4564ee9427f0c511a72` before this correction.  
**Production:** Not modified. No migration, deployment, entitlement mutation, or native build was performed.

## Executive verdict

The generated-photo instability had two confirmed client/server causes. First, the server content hash included `clientRecipeId`, so the same semantic recipe could receive a different media identity after local recreation or cross-device restoration. Second, the client lifecycle key included signed image URLs and expiry timestamps, causing ordinary locator renewal to look like a new media lifecycle and retrigger reconciliation.

Both defects are corrected. Semantic photo identity now excludes the transient local recipe identifier while retaining it for ownership and persistence. The prompt payload also excludes that identifier, and the prompt version was advanced to `recipe-photo-semantic-v5-identity-stable-ingredient-fidelity`. Signed locator rotation no longer changes the client lifecycle key; durable media identity, review state, status, error state, provenance, and media/image identifiers remain relevant.

The native count discrepancy was also classified. The native endpoint exposes `browsePoolSize` for the finite provider pool used by the continuous browse feed; it is not a global catalogue total. The native label previously rendered this as “recipes available to explore,” which was misleading. It now states “recipes in the curated browse cycle” and uses “recipes currently loaded” when no pool size is available. The reported web value of 3,664 could not be reconciled from this repository because no web Recipes client implementation or matching live web artifact is present in the inspected source baseline. It remains **UNVERIFIED / external to this source tree**, not proof that native data is missing.

## Root-cause findings

| Finding | Classification | Evidence | Correction |
|---|---|---|---|
| Generated photo semantic hash depended on `clientRecipeId` | **CONFIRMED DEFECT** | `recipePhotoContentHash` hashed the canonical payload including the local ID; the ID is not recipe content | Exclude `clientRecipeId` from semantic hash input and prompt JSON; retain it in the durable `recipe_payload` and owner/client lookup path |
| Signed URL renewal changed the generated-photo lifecycle key | **CONFIRMED DEFECT** | `generatedRecipeImageLifecycleKey` included `image` and `imageUrlExpiresAt` | Key now uses durable media identity and state fields, not expiring locators |
| Photo completion could use a stale account closure in Create | **CONFIRMED DEFECT** | Create’s completion path compared against the render-time `session.user.id` closure | Added a live account ref updated on each render and a mounted guard before applying provider results |
| Native “available to explore” wording represented a finite provider pool | **CONFIRMED DEFECT — semantics/UX** | API contract documents `continuousBrowse` and finite `browsePoolSize`; native caption treated pool cardinality as total availability | Caption now explicitly identifies the curated browse cycle |
| Web showing 3,664 versus native showing 28 | **UNVERIFIED cross-client discrepancy** | Current repository contains native Recipes code and API contracts but no matching web Recipes implementation or live web build evidence | Do not fabricate a global total; native now reports truthful scope. A separate authorized web-source/live-artifact investigation is required to change the web surface |

## Implementation

- `artifacts/api-server/src/lib/recipe-media.ts`
  - Bumped the semantic prompt version.
  - Removed the local recipe ID from the semantic hash input.
  - Removed the local recipe ID from the structured prompt JSON while preserving all recipe content and ingredient-fidelity rules.
- `artifacts/calora/lib/generatedRecipeImageLifecycle.ts`
  - Removed expiring image URL and expiry fields from the lifecycle key.
  - Added review state and explicit error state to preserve meaningful transitions.
- `artifacts/calora/app/(tabs)/recipes.tsx`
  - Added a live account reference and mounted guard for generated-photo completion.
  - Corrected Explore count wording to distinguish a curated browse cycle from a total catalogue.
- Regression coverage added for cross-device semantic identity, signed-locator rotation, lifecycle persistence, and the updated screen contract.

## Validation evidence

| Check | Result |
|---|---:|
| Recipe-media semantic unit suite | **15/15 passed** |
| Client TypeScript (`pnpm exec tsc --noEmit`) | **Passed** |
| Client lifecycle, reopen, and Recipes screen suites | **77/77 passed** |
| Mission 417 security contract suite | **3/3 passed** |
| API typecheck | **Passed** |
| Database package typecheck | **Passed** |
| Complete API offline suite | **570/570 tests passed across 48 files** |
| Disposable recipe-media persistence lifecycle under restricted non-BYPASSRLS staged identity | **1/1 passed** |

The disposable rehearsal exercised owner-scoped claim, retry, review, render acknowledgement, signed URL state, supersession, and cross-owner isolation using the synthetic restricted runtime. No production database was contacted.

## Release boundary

This correction is source-validated but not yet merged or deployed in this report. The protected workflow must run before merge. No native build is needed for the server semantic-hash change; the Recipes wording and account-guard correction are native source changes and require the ordinary authorized native release process if they are to reach installed binaries. No Android/iOS build is authorized by this report.

The web 3,664 count remains an evidence gap. The correct next step is to identify the deployed web client and its API/data source, then compare its claimed total with the API’s explicit finite-pool metadata. Until that evidence exists, launch certification must not treat either number as a global catalogue truth.

**Verdict:** **PASS for the investigated recipe-photo defects and native count semantics; CONDITIONAL for cross-client catalogue reconciliation because the web implementation/live artifact is not present in this source baseline.**
