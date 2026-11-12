# 244 â€” CAL-SCAN-ACCURACY-005 Direct Vision Benchmark Report

**Branch:** `fix/scan-accuracy-002`
**Mission:** Direct vision benchmark without cloud infrastructure
**Status:** BLOCKED before provider calls; production and infrastructure untouched.

## What was verified

The production photo path is implemented in `artifacts/api-server/src/routes/capture.ts`:

- Food photos use the exact hard-coded model `gpt-5.6-terra`.
- The production prompt requests structured JSON components, identity/portion/nutrition/preparation confidence dimensions, assumptions, review questions, non-negative nutrition values, and explicit uncertainty handling.
- The route uses `withAiProviderDeadline` with a 15-second capture provider deadline.
- The response is normalized through `parseVisionResponse`, `ensureCandidate`, and `ensureComponent`.
- Photo results are explicitly labeled `Photo estimate` / `Managed vision estimate`; nutrition is not presented as verified.
- Nutrition-label and receipt modes share the same model but use distinct prompts and provenance labels.

The OpenAI integration client requires both:

- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`

The current Windows environment contains neither value, and no credential file was found beyond `.env.example` files. No secret values were read or exposed.

## Standalone feasibility

A benchmark can avoid authentication and database persistence only if it invokes the analysis function directly through a test-only harness. The current `analyzeFoodPhoto` function is private to the capture route, while the route also imports Supabase authentication, rate limiting, database persistence, and user-row handling. Therefore the current production module cannot be imported as a clean standalone analyzer without a narrowly scoped refactor or a test harness that mocks those boundaries.

The existing benchmark runner is intentionally endpoint-based. It requires:

- `CALORA_BENCHMARK_API_URL`
- `CALORA_BENCHMARK_AUTH_TOKEN`
- A combined budget reservation

It sends requests to `/v1/capture/analyze`, so it cannot use the current route without an authenticated non-production API target. Its budget ledger protects the requested estimate locally, but it cannot enforce provider billing limits by itself.

## Validation evidence

- Existing capture contract suite: 66/66 passed without real credentials; these tests mock OpenAI, Supabase authentication, and database access and therefore do not measure model accuracy.
- API TypeScript validation: passed.
- Real model calls: zero.
- Benchmark images: available locally; 68-meal manifest preserved.
- Production API/database/provider: not contacted.

## Exact remaining owner action

Provide a separate authorized provider credential and endpoint that:

1. Grants access to the exact production model `gpt-5.6-terra` through the configured OpenAI-compatible base URL.
2. Is not a production credential and is not connected to production Calora data.
3. Has a provider-side hard project/key quota of **$10 or less** for the combined smoke test and benchmark, or an equivalent independently enforceable prepaid limit.
4. May be supplied through secure environment configuration, never chat, source control, logs, or screenshots.

After that, the smallest safe implementation is a test-only standalone adapter that reuses the production prompt, model constant, deadline, parser, and normalization code while omitting auth and persistence. The adapter must remain outside the production route and must not expose an unauthenticated HTTP endpoint.

## Verdict

**BLOCKED â€” direct model execution is technically feasible, but provider access and an enforceable provider-side $10 ceiling are unavailable.** No Docker, database, Railway, Supabase, production service, or native release is required for the eventual direct benchmark, but the separate provider credential and quota are mandatory before any billed call.
