# Calora Recipe-Image Ingredient Accuracy Remediation

**Report number:** 01
**Scope:** Offline forensic investigation and source remediation only
**Production mutation:** None in this mission
**Billable provider requests:** None in this mission

## 1. Executive summary

The rejected owner-controlled QA image was a genuine ingredient-fidelity failure, not a cache, storage, delivery, or client-display substitution. The single QA request carried exactly three ingredients—chicken breast, lemon, and dried herbs—yet the deployed prompt instructed the image model to render a “complete bowl” with a “base, protein, vegetables, and sauces.” That wording, combined with the familiar bowl title, encouraged the model to invent rice, broccoli, and carrots.

The remediation makes the structured ingredient list the sole authority for edible image content. It rejects incomplete/title-only photo-generation payloads rather than inventing a recipe manifest, explicitly forbids unlisted food components, clarifies that “bowl” is only a vessel, and advances the prompt cache version so no media generated under the weaker prompt is reused. It also removes confirmed unrelated-food display fallbacks across shared Recipes and Plan surfaces and prevents malformed restaurant records from showing an unverified provider image.

## 2. Confirmed root cause

### Confirmed

The owner-supplied, sanitized lifecycle evidence establishes that the QA request used:

- Title: `QA verification lemon herb chicken bowl`
- Ingredients: `1 chicken breast`, `1 lemon`, `1 teaspoon dried herbs`
- One generation request
- Private preview and owner review
- Owner rejection, terminal account cleanup, and post-delete preview denial

The owner-visible image contained the three supplied foods **plus rice, broccoli, and carrots**.

`windows/owner-qa/executor/calora/production-recipe-image-qa.mjs` constructs that exact structured payload. The former production prompt in `artifacts/api-server/src/lib/recipe-media.ts` simultaneously told the model to render a “complete” bowl with a “base, protein, vegetables, and sauces.” The image-model request received no QA recipe source that contained rice, broccoli, or carrots. The observed additional foods therefore originated in model generation, encouraged by the former generic bowl-composition directive.

### Not the cause

No evidence supports a cached image, stored object, signed-preview swap, or client fallback as the source of this QA image:

- The run generated one new private media record before preview.
- The source media flow is owner-scoped and review-gated.
- The owner rejected the image; the prior lifecycle evidence records terminal cleanup and post-delete preview denial.
- The displayed preview was the newly generated private preview, not a Discover, Plus, Planner, or Restaurant image.

## 3. Generation data-flow review

1. **Source request:** `/v1/recipes/photo` receives `clientRecipeId`, title, description, ingredients, instructions, optional category/cuisine/meal type, and dietary context.
2. **Validation:** `parseRecipePhotoInput()` now requires a non-empty client recipe ID, ingredient list, and instructions. A title/description can no longer be converted into a fake ingredient list.
3. **Canonicalization and cache identity:** `canonicalRecipePhotoContent()` preserves normalized structured data. `recipePhotoContentHash()` includes `RECIPE_MEDIA_PROMPT_VERSION` and all canonical recipe fields.
4. **Prompt construction:** `buildRecipePhotoPrompt()` serializes recipe fields only as inert JSON and supplies a separately named `INGREDIENT_MANIFEST_JSON`.
5. **Provider call:** the existing route retains one request, `gpt-image-2.5-flare`, `1024x1024`, low quality, PNG, and base64 handling.
6. **Private media:** object keys remain owner-scoped under `private/recipe-photos/<owner>/<image>.png`; generated media begins as `needs_review`.
7. **Human review:** private preview remains required. Acceptance and rejection remain distinct server states; no automated semantic claim can accept an image.
8. **Delivery and cleanup:** only accepted media receives an owner-scoped signed delivery URL; rejected or account-deleted media remains unavailable and cleanup is still fail-closed.

## 4. Implemented changes

### Backend ingredient-fidelity contract

- Advanced `RECIPE_MEDIA_PROMPT_VERSION` from `recipe-photo-semantic-v3-composition` to `recipe-photo-semantic-v4-ingredient-fidelity`.
- Removed title-only/legacy photo-request synthesis. Incomplete structured metadata is an HTTP 400 input failure before image-provider work.
- Added `recipePhotoIngredientManifest()` and a fixed prompt contract stating that only manifest-supported foods may be depicted.
- Explicitly forbade invented rice, grains, pasta, potatoes, vegetables, fruit, sauces, toppings, herbs, garnishes, side dishes, drinks, and substitutions.
- Explicitly states that title, description, cuisine, category, meal type, vessel, and common food conventions cannot authorize another edible component.
- Rewrote bowl, soup, and salad composition wording so a vessel or category cannot imply food. A chicken-lemon-herb bowl is therefore still a bowl, but it cannot become a grain-and-vegetable bowl.
- Cache invalidation is automatic because the prompt version participates in each content hash and each stored media row records the new prompt version.

### Display fail-closed changes

- Removed `calora-recipes-header.jpg` as a photographic `expo-image` placeholder in shared `RecipeImage`; Recipes, Discover, Plus, and Create no longer show that unrelated food/header image while a source is loading.
- Replaced Planner’s category-photo fallback and loading placeholder with a neutral, explicit **Photo unavailable** surface.
- Preserved exact source-bound restaurant images, but prevents a malformed/legacy restaurant record with only an unverified remote URL from rendering another food photo. Such records now resolve to **No photo**.

## 5. Ingredient-fidelity architecture

The server now applies a strict practical contract before provider generation:

| Concern | Enforcement |
| --- | --- |
| Complete recipe metadata | Missing recipe ID, ingredients, or method is rejected before provider work. |
| Allowed food | The canonical ingredient list is emitted as `INGREDIENT_MANIFEST_JSON`. |
| Forbidden food | The fixed prompt prohibits unlisted staple foods, vegetables, sauces, toppings, garnishes, sides, and substitutions. |
| Title contradictions | The manifest wins; title/category/vessel cannot add ingredients. |
| Cooking and serving format | Instructions and composition guidance direct preparation and vessel, not extra food. |
| Cache safety | Prompt version is part of the media identity and content hash. |
| Acceptance | Human review remains mandatory; no code marks semantic accuracy based on an API response. |
| Delivery | Private previews and accepted delivery remain owner-scoped. |

### Automated visual validation decision

No automatic vision-based acceptance gate was added. A secondary model could at best provide probabilistic labels, can miss hidden ingredients or mistake visually similar foods, would add cost/latency/privacy handling, and must not override a human owner’s review. It would be unsafe to represent such a classifier as evidence that no unauthorized ingredient is present.

The current safe design is: strict structured prompt + cache invalidation + owner review + explicit rejection/cleanup. A future optional advisory visual check may be considered only if it is clearly non-authoritative, bounded, private, and independently calibrated against known false-positive and false-negative rates.

## 6. Test matrix

### Newly added or strengthened deterministic coverage

| Area | Evidence |
| --- | --- |
| Exact manifest fidelity | Prompt contains a separately named manifest and says only manifest-supported foods may be edible. |
| Incomplete metadata | Direct parser and API route tests reject title-only/missing fields before provider work. |
| Contradictory title/description | “Chicken Rice Broccoli Bowl” with a chicken/lemon/herb manifest preserves the contradiction as data but states the manifest wins. |
| Bowls with/without a grain base | Explicit fixtures distinguish a grain bowl from a no-grain bowl. |
| Soup, salad, sandwich, wrap, beverage | Parameterized structured-manifest fixtures. |
| Dietary exclusions | Existing dietary-context prompt assertions remain covered. |
| Prompt cache invalidation | Test proves the v4 content hash differs from the v3 identity. |
| Provider failure, timeout, upload, transition, reconciliation | Existing recipe-media-generation regression suite remains green. |
| Review, authorization, cleanup | Existing route/lifecycle coverage remains green; no production execution was performed. |
| No wrong-image fallback | Recipes/Plan source contracts and restaurant metadata regression cover neutral unavailable behavior. |

### Commands and results

- `pnpm --filter @workspace/api-server run typecheck` — **PASS**.
- API focused media/semantic/route regression — **49/49 PASS**.
- `pnpm --filter @workspace/api-server run test:offline` with synthetic non-secret endpoint configuration — **43 files, 545 tests PASS**.
- Calora targeted image-source suites through the app Vitest configuration — **5 files, 179 tests PASS**.
- `pnpm --dir artifacts/calora run typecheck` — **PASS**.
- Full mobile suite attempted in documented single-worker CI mode: **1,634 tests passed**, but 18 unrelated worker suites could not start because the sandbox’s Node 24 / Undici combination throws in the Vitest fork worker before test execution. This is a harness/runtime limitation, not a test assertion failure and does not affect the passing targeted image suites. It is retained as a CI-environment follow-up, not hidden as a pass.

The affected baseline files have existing formatting deviations; the change set passes `git diff --check` and avoids formatting unrelated source.

## 7. Security and privacy regression review

This change does not alter credentials, provider secrets, signed authorizations, release checks, owner key material, or production configuration. It preserves:

- one-request QA limits and no automatic QA retry;
- owner-only private previews and human accept/reject review;
- Ed25519 authorization and RunId binding in the separate Owner QA executor;
- anonymous and cross-account media denial;
- accepted/rejected state handling, including the previously repaired accepted `url_ready` assertion;
- account-deletion media erasure and post-delete preview denial;
- sanitization: no signed URL, image bytes, customer data, or credential was added to source or reports.

## 8. Image-source coverage across Calora

| Surface | Source model | Result of this remediation |
| --- | --- | --- |
| Recipes | Canonical bundled asset, trusted remote provider URL, or accepted generated media | Removed shared photographic loading placeholder; missing/rejected media remains unavailable. |
| Discover | Canonical Calora assets or host-allowlisted provider URL | Shares neutral loading behavior; no generic recipe substitute. Provider semantic identity remains provider-owned. |
| Plus | Authenticated provider image URL | Shares neutral loading behavior; duplicates/untrusted URLs remain unavailable. Provider semantic identity remains provider-owned. |
| Create | Owner-scoped generated media with preview/acceptance gate | Shares neutral loading behavior; pending/rejected/failed media is not replaced by food imagery. |
| Plan/programs | Canonical Planner assets or verified accepted recipe media | Replaced generic category food fallback with **Photo unavailable**. |
| Restaurant meals | Explicit representative illustration or no photo; exact bound evidence may render | Unverified remote locator cannot override the restaurant no-photo policy. |

## 9. Remaining limitations

- Prompt instructions reduce the demonstrated failure mode but do **not** prove that a generative model will never render an unauthorized ingredient. Human visual review remains necessary.
- Discover and Plus source URLs are syntactically/trust-policy validated, not visually verified to match their provider’s recipe label. The app now avoids silent local substitution, but it cannot prove third-party image semantics.
- The required strict structured photo contract may cause outdated clients that submit title-only requests to receive a clear 400 response instead of generating a potentially inaccurate image. Current Calora clients and the Owner QA executor send complete structured data.
- The sandbox cannot complete all mobile fork-worker suites under Node 24 because of the documented Undici worker initialization issue. Run the normal GitHub release validation on the protected PR for the authoritative CI result.

## 10. Protected PR status

This report is committed with the source remediation on a dedicated feature branch. The companion pull request must remain unmerged and undeployed until its required protected checks pass and the owner authorizes a production API deployment.

## 11. Deployment readiness

**Source readiness:** Ready for protected review after passing backend typecheck, complete backend offline regression, targeted app suites, app typecheck, and static diff checks.

**Production deployment:** Not performed and not authorized by this report. No Railway action, recipe generation, customer-data access, or native build occurred.

## 12. Recommended final production verification

After a protected merge and separately authorized API-only deployment:

1. Verify both production domains serve the exact merged commit and pass canonical health/version checks.
2. Update the Owner QA package release pin through its protected private-repository process; do not alter owner-held DPAPI credentials or signing keys.
3. Request a fresh, separately authorized **single** owner-controlled generation using a fully structured recipe with a documented manifest.
4. The owner must visually inspect the private preview and explicitly reject any image that adds or substitutes foods. Do not infer success from a provider response.
5. Validate acceptance/rejection, authorization, private delivery, and terminal cleanup according to the existing bounded lifecycle.

## Final verdicts

| Verdict | Result |
| --- | --- |
| Root-cause investigation | **CONFIRMED** — generic former bowl prompt encouraged model-invented foods; QA metadata did not contain them. |
| Ingredient-fidelity remediation | **PASS (offline/source)** — strict manifest contract, contradiction handling, and v4 cache invalidation implemented. |
| Offline regression readiness | **PASS for backend and affected app suites** — complete API suite and targeted app suites/typechecks pass; unrelated app worker harness limitation is documented. |
| Production security lifecycle | **Previously PASS for the cited owner QA lifecycle; unchanged by this source-only work.** |
| Live visual ingredient accuracy | **NOT YET VERIFIED after this remediation** — no billable image was generated in this mission. |
| Deployment readiness | **READY FOR PROTECTED REVIEW ONLY** — merge/deployment and a separately authorized human-reviewed live verification remain required. |
