# CALORA_RETIRED_IMAGE_MODEL_FINAL_REMEDIATION

Date: 2026-10-27 UTC

## Verdict

**READY_TO_MERGE.** The smallest safe source fix replaces the retired OpenAI image model with `gpt-image-2.5-flare`. The fix is prepared on a protected pull-request branch and has not been merged, deployed, or used for a live image-generation request.

## Confirmed defect

Protected Calora main at the start of this repair was:

`67ae88ef0735cf14fa588d4e4a1ccdc1ecfa1774`

Both production API `/api/version` endpoints reported that exact SHA before the source-only repair. The deployed code used `gpt-image-1`, which OpenAI shut down on October 23, 2026. The prior production diagnostics showed HTTP 400 with `providerCode=invalid_value` and `providerType=image_generation_user_error` during the provider phase, before storage upload.

## Changes

1. Added the shared production constant `RECIPE_MEDIA_MODEL = "gpt-image-2.5-flare"` in `artifacts/api-server/src/lib/recipe-media.ts`.
2. Derived the persisted model marker from that constant: `gpt-image-2.5-flare:low:1024:v1`.
3. Updated `generateClaimedRecipeMedia()` to use the shared model constant rather than a duplicated literal.
4. Updated lifecycle fixtures and assertions to require the supported model and persisted model marker.
5. Expanded the request assertion to require `1024x1024`, `low`, `png`, and `n: 1`.
6. Kept the existing prompt construction, base64 response handling, 30-second deadline, one-request behavior, rate limiting, authorization, private preview, human-review state, storage isolation, cleanup saga, and sanitized provider diagnostics unchanged.

No automatic retry, provider request, credential access, production mutation, or deployment was performed.

## Compatibility evidence

OpenAI’s current image-generation documentation supports the existing Images API shape: `openai.images.generate()`, 1024x1024 output, low quality, PNG output, one image, and base64 image data. The current documentation recommends `gpt-image-2.5-flare` for fast, high-quality everyday image generation. The existing SDK version and method remain unchanged.

References:

- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-1
- https://developers.openai.com/api/docs/deprecations

## Validation

All validation used synthetic offline configuration only; no real API key or provider request was used.

- Focused generation/media/storage/semantics suite: **45/45 passed**, three consecutive passes.
- Full API offline suite: **533/533 passed**, 43 test files.
- Workspace library TypeScript build/type validation: **PASS** (`pnpm run typecheck:libs`).
- API TypeScript validation: **PASS** (`pnpm --filter @workspace/api-server run typecheck`).
- Diff whitespace validation: **PASS** (`git diff --check`).
- Retired-model source scan: **PASS**; no `gpt-image-1` remains in production source, scripts, or the covered tests.
- Production-source secret scan: **PASS**; no credentials or tokens were introduced.

The full offline suite emits expected synthetic database-readiness warnings in health tests; all assertions pass.

## Release and deployment boundary

The current production release remains unchanged. This repair has **not** been merged or deployed. A fresh protected-main release validation and normal Railway deployment are required after merge, followed by read-only version and health verification. A separate owner-authorized live recipe-image QA run is still required; this PR does not authorize or perform that billable test.

## Final status

**READY_TO_MERGE** after the required GitHub checks pass. Merge and deployment were intentionally not performed under this mission’s constraints.
