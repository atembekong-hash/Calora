# Isolated Recipe-Image Staging Lifecycle Verification

## Purpose

`pnpm --filter @workspace/scripts run test:isolated-recipe-image-staging` executes a complete, non-production Recipe Create image lifecycle against the compiled Calora API. It is a release-confidence test only; it is not a replacement for the separately approval-gated production recipe-image QA workflow.

## Isolation boundary

The runner creates a newly named local PostgreSQL database and login role, uses two process-local disposable authenticated identities, and launches local-only provider endpoints. It uses a fresh, one-day, self-signed TLS certificate for mock Supabase Auth, S3-compatible image storage, and a RevenueCat-compatible customer-deletion endpoint. The production Supabase project, Railway, RevenueCat, storage bucket, and GitHub Environment secrets are not read or contacted.

The only generated image assets are supplied as local paths by the invoking process. The runner records SHA-256 fingerprints and test verdicts, never signed URLs, bearer tokens, service keys, local database passwords, storage credentials, or raw provider responses.

## Lifecycle assertions

The staging test requires all of the following to succeed:

1. A visually reviewed lentil-and-mushroom bowl reaches `stored` plus `needs_review`, rather than remaining in `generating`.
2. Its owner-only review preview is HTTPS, signed for fifteen minutes, and served with `private, no-store`.
3. Anonymous preview access receives `401`; a separate disposable identity receives `404`.
4. A human-reviewed matching image is explicitly accepted before an ordinary image locator is issued.
5. The exact lentil image is deliberately returned for a citrus-salmon recipe. The test confirms the visible mismatch, explicitly rejects it, and proves that no ordinary image locator is issued for the rejected media.
6. The real account-deletion route removes both persisted media records and local storage objects, verifies the local RevenueCat customer deletion, invalidates the deleted owner token, and retains only the account-deletion tombstone in the disposable database until the database itself is dropped.

## Test-only RevenueCat routing

The API may read `CALORA_TEST_REVENUECAT_V2_ORIGIN` only with `NODE_ENV=test`. It accepts only a credential-free loopback HTTPS origin with no path, query, or fragment. Any malformed, remote, or non-HTTPS target throws a configuration error before a request is sent. Production and development processes always use `https://api.revenuecat.com`.

## Cleanup and failure behavior

The runner removes its API and provider processes, then drops the uniquely named database and role regardless of test outcome. It keeps a sanitized JSON evidence file only after every lifecycle assertion completes. A failed run does not retain credentials, database names, storage objects, accounts, URLs, or a passing result.

A failure in image generation, private-preview verification, review policy, account deletion, S3 object removal, RevenueCat customer removal, or database assertions fails the command and must be investigated before any PASS claim.
