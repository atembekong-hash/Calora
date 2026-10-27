# Calora Final Recipe-Image Accuracy Remediation

## Verdict summary

| Area | Verdict | Evidence |
|---|---|---|
| Owner-controlled QA lifecycle | **PASS** | Owner-supplied sanitized evidence reports one generation request, private preview, anonymous and cross-account denial, terminal rejection, terminal cleanup for both bounded identities, and post-delete preview unavailability. |
| Image accuracy for the reviewed case | **FAIL / REJECTED** | The owner visually reviewed the generated `QA verification lemon herb chicken bowl` image and rejected it because it showed lemon-herb chicken breast but not a complete bowl. |
| Accuracy root-cause remediation | **READY FOR REVIEW** | The patch adds explicit complete-dish composition rules and makes the prompt version part of the media content hash so old weak-prompt images are not reused. |
| Regression readiness | **PASS (offline)** | Backend focused tests: 39/39; complete offline API suite: 535/535; API TypeScript check: PASS; client `recipesScreen` policy tests: 42/42. |
| Production deployment | **NOT AUTHORIZED / NOT DEPLOYED** | This mission does not authorize deployment or another billable image request. A protected PR is required before any release. |

## Evidence closure

The owner-provided QA evidence is preserved as supplied:

- schema: `calora.owner-controlled-production-qa.v1`
- result: `pass`
- source commit: `2ff27783de70e39608ee5151b70f96107764cb26`
- generation requests: `1`
- bounded identities: `2`
- private preview: `true`
- anonymous denied: `true`
- cross-account denied: `true`
- rejection terminal: `true`
- owner and secondary cleanup terminal: `true`
- post-delete preview unavailable: `true`
- failure: `null`

The lifecycle PASS is correctly interpreted as a PASS for authorization, privacy isolation, explicit human rejection, terminal state handling, and bounded cleanup. It is **not** semantic-accuracy approval: the owner explicitly rejected the visual depiction. The `productionMutation: not_started` field is not treated as evidence that no bounded QA state changes occurred; the evidence separately records one generation request and terminal cleanup. It should be read as no additional/unbounded production mutation phase was started, not as proof that the bounded QA lifecycle was read-only.

## Root-cause findings

### Confirmed: composition instructions were too weak

The deployed prompt builder in `artifacts/api-server/src/lib/recipe-media.ts` previously requested a generic “simple ceramic plate or bowl” with an overhead three-quarter composition. It required consistency with recipe data and visible ingredients, but did not require a bowl recipe to be shown as one complete serving in a bowl, nor did it prohibit the main protein from becoming an isolated ingredient portrait. That is sufficient to explain the observed chicken-breast-only depiction as a prompt-level composition defect.

### Confirmed: prompt version was not part of the cache identity

Before this change, `recipePhotoContentHash()` hashed only canonical recipe content. The database uniqueness key is `(owner_external_id, client_recipe_id, content_hash)`. Although rows persisted `prompt_version`, changing prompt instructions alone did not change the claim identity; a previously stored image could therefore be reused for the same recipe. The fix includes the prompt version in the hash and increments the prompt version to `recipe-photo-semantic-v3-composition`. Existing weak-prompt rows are not silently treated as equivalent to a new composition contract.

### Not confirmed: wrong recipe-to-image association or generic fallback substitution

The backend claim and object key remain owner-scoped and recipe-content keyed. The owner QA evidence does not show a cross-account or unrelated-image delivery: cross-account denial passed, the owner preview was private, and rejection became terminal. Existing client policy tests and source inspection show that generated candidates do not fall through to generic catalogue/provider photographs; pending, rejected, missing, or failed generated images render an explicit unavailable/retry state. No evidence supports an association or fallback substitution as the cause of this specific image.

### Not tested by offline evidence: model semantic fidelity

The new tests prove prompt construction and cache invalidation, not that a future provider image will visually contain every required ingredient. A fresh owner-reviewed generation is required to certify actual visual accuracy, and this report does not authorize or claim one.

## Changes in this PR

1. Bumped `RECIPE_MEDIA_PROMPT_VERSION` to `recipe-photo-semantic-v3-composition`.
2. Added deterministic composition guidance for bowls, soups/stews/curries/ramen, salads, sandwiches/wraps/tacos/burgers, beverages, and a complete-dish default.
3. Added explicit constraints against isolated ingredient portraits, invented toppings, and unrelated sides while preserving the existing recipe-data and dietary-exclusion safeguards.
4. Included the prompt version in `recipePhotoContentHash()` to invalidate reuse of images produced under the weaker prompt contract.
5. Updated synthetic persisted-media fixtures to the new prompt version.
6. Added tests for bowl composition, category-specific composition, prompt-version cache invalidation, and existing semantic fields.

## Validation

### Backend

- Focused semantic, generation, and recipe-route tests: **39/39 PASS**.
- Complete offline API suite with synthetic non-secret `DATABASE_URL` and OpenAI configuration: **535/535 PASS**.
- API TypeScript check: **PASS**.
- No provider request was made by these tests.

### Client image-integrity controls

- `recipesScreen` source-policy tests: **42/42 PASS**.
- Existing tests confirm pending/failed generated media is not disguised as a food-photo fallback and absent/rejected images render `Photo unavailable`.
- Existing Discover image-policy tests remain the source of truth for missing/untrusted image behavior, but their standalone sandbox invocation was not runnable in this checkout because the Expo alias/runtime configuration is unavailable outside the app's configured test runner. This is an environment limitation, not a changed-code failure.

### Security and scope

- No production credentials, provider requests, customer data, signed URLs, or image bytes were accessed.
- No database, storage, Railway, Supabase, or production configuration was modified.
- No native build or store release was triggered.
- Diff scan found no credentials or secret material.

## Remaining limitations and next step

The remediation is ready for protected review, not production deployment. After the PR passes its required checks and is merged, a separately authorized owner-controlled run would be needed to generate at most one new image and visually inspect whether the complete bowl composition is now accurate. The owner should continue to reject any image that omits the bowl or materially misrepresents the listed recipe. Offline tests cannot substitute for that visual review.
