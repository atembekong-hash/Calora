# Isolated Recipe-Image Staging Verification — 23 October 2026

## Verdict

**PASS — complete isolated staging lifecycle.** The compiled Calora API completed authenticated image creation, private review delivery, explicit acceptance and rejection, rendered acknowledgement, account deletion, storage erasure, provider-customer erasure, Auth invalidation, and database verification in a new disposable local environment.

This is not a production certification. The approval-gated production QA workflow remains undispatched in this mission, and prior unresolved production QA identities are not represented as deleted by this result.

## Scope and isolation

The run used a fresh local PostgreSQL database and role, two process-local disposable Auth identities, local TLS Supabase-compatible Auth and S3-compatible storage endpoints, a local RevenueCat-compatible deletion endpoint, and a loopback image-provider endpoint. It contacted no production Calora origin, Supabase project, Railway service, RevenueCat service, storage bucket, or GitHub Environment secret.

All local state was removed after completion. Post-run PostgreSQL catalog checks found no database or role matching the staging-run naming convention.

## Actual image evidence and semantic review

Two staging-only food images were generated locally for this mission and visually reviewed before execution:

| Fixture | Intended recipe | Outcome | Evidence |
| --- | --- | --- | --- |
| Lentil-and-mushroom bowl | Lentil & mushroom bowl | **Accepted** after visual confirmation that the generated image matched the recipe | SHA-256 fingerprint recorded only in sanitized run evidence |
| Same lentil-and-mushroom bowl | Citrus salmon bowl | **Rejected** because the visible image did not represent salmon or citrus | Explicit review rejection; ordinary delivery locator withheld |

The lifecycle ran through Calora's real compiled image-generation, private-storage, review, media-delivery, rendered-acknowledgement, and deletion routes. The provider transport was intentionally local and returned the generated fixture image as a controlled staging response. Therefore this verifies application behavior and review enforcement, not a live third-party image-provider availability claim.

## Sanitized end-to-end result

The final run completed in 4.9 seconds and wrote only a redacted JSON evidence record. Assertions passed:

- `POST /api/v1/recipes/photo`: `200` for both controlled recipe requests; no perpetual `generating` state.
- Owner review preview: `200`, HTTPS, fifteen-minute review capability, and `private, no-store`.
- Anonymous preview denial: `401`.
- Separate-account preview denial: `404`.
- Explicit acceptance: `200`; accepted media then received an ordinary delivery locator (`200`).
- Explicit rejection: `200`; rejected media delivery response contained no ordinary image locator (`200`).
- Render acknowledgement: `204`.
- Media listing before deletion: `200` with `private, no-store`.
- Account deletion: `200`; owner media access after deletion: `401`.
- Terminal cleanup: zero remaining recipe-media rows, zero storage objects, verified local RevenueCat customer deletion, and one terminal deletion tombstone before the entire disposable database was dropped.

The evidence record was separately checked to contain no token, service key, URL, password, credential, account identifier, or database identifier.

## Defects found and fixed

### 1. No safe full-lifecycle test seam for RevenueCat account deletion

The existing deletion route correctly requires the real provider to confirm customer erasure. A local isolated staging run could not safely execute that route without a tightly bounded test transport.

**Fix:** `artifacts/api-server/src/lib/revenuecat.ts` accepts `CALORA_TEST_REVENUECAT_V2_ORIGIN` only when `NODE_ENV=test`, and only when it is a credential-free loopback HTTPS origin with no path, query, fragment, username, or password. All production and development processes retain `https://api.revenuecat.com`.

### 2. Local harness compatibility defects, not Calora production defects

Three harness-only issues were found during staged execution and corrected without altering production behavior:

1. Manual `pgcrypto` installation used the wrong schema for Calora's repository-owned support-object bootstrap; the persistent image-rate limiter correctly failed closed with `503`.
2. The local S3 emulator initially rejected the valid bucket-root ListObjects path used during storage cleanup; the application correctly failed closed with `502`.
3. The local Auth fixture initially used descriptive IDs, while the real Supabase Admin client validates `auth.users.id` as a UUID before it sends `deleteUser`; fixture identities now use fresh process-local UUIDs.

## Changed files

- `artifacts/api-server/src/lib/revenuecat.ts`
- `artifacts/api-server/src/__tests__/revenuecat.test.ts`
- `scripts/run-isolated-recipe-image-staging.mjs`
- `scripts/run-isolated-recipe-image-staging.test.mjs`
- `scripts/package.json`
- `docs/operations/isolated-recipe-image-staging.md`
- `docs/operations/isolated-recipe-image-staging-verification-2026-10-23.md`

## Validation

- RevenueCat unit coverage, including the loopback-origin guard: PASS.
- Isolated staging harness static contract coverage: PASS.
- Focused API recipe generation, recipe-photo storage, and account-deletion tests: **3 files, 51 tests, PASS**.
- Scripts typecheck: PASS.
- Library and API TypeScript checks: PASS.
- API production bundle build: PASS.
- Complete isolated compiled-API staging lifecycle: PASS.

## Production boundaries and remaining blocker

No production QA workflow was dispatched, no production account was created or deleted, and no production deployment occurred in this mission.

The next separate action, if owner-authorized, is the existing approval-gated production recipe-image workflow only after protected-main release equality and the QA environment prerequisites are verified. Its purpose is to validate the live provider and production storage—not to repeat this isolated staging lifecycle. The unresolved identities associated with earlier production QA failures remain documented separately and must be recovered only through the approved production recovery procedure.
