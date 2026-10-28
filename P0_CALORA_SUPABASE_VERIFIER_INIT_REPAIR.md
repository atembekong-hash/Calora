# Calora P0 Supabase Verifier Initialization Repair

Date: 2026-10-28

## Finding

The API deployment of protected commit `d9d57482d0dc102156c72064792603bfdbd770ab` was healthy and served the exact release SHA, but unauthenticated `GET /api/v1/profile` still returned HTTP 500. Railway logs classified the request as `Unhandled request error` / `unknown_error` before the route's fail-closed `if (!auth) return 401` branch.

The merged repair handled missing Supabase variables, but `createClient(url, anonKey)` can itself throw when the public URL/key configuration is malformed. That exception occurred before `verifyBearerToken` could return null. The defect is configuration-initialization error handling, not database access and not a credentialed authentication failure.

## Minimal repair

`getVerifier()` now wraps `createClient()` in `try/catch` and returns `null` on configuration errors. This preserves fail-closed authentication and allows the route to return HTTP 401. No secrets, variables, schemas, storage, or customer records were changed.

Added a regression test using synthetic malformed configuration (`not-a-supabase-url`, `synthetic-anon-key`) and asserting `verifyBearerToken()` resolves to null without throwing.

## Validation

- Focused Supabase verifier tests: **13/13 passed**
- Offline API regression suite: **547 tests passed across 43 files**
- API TypeScript validation: **passed** after `pnpm run typecheck:libs`
- `git diff --check`: **passed**
- Production API deployment of d9: **SUCCESS**, deployment `53423bc0-2d27-4fa3-9ccc-98f02a52b4da`
- Public release SHA after d9 deployment: exact `d9d57482d0dc102156c72064792603bfdbd770ab`
- Remaining production result before this repair: profile 500, sync 503

## Next gate

This repair must pass protected GitHub checks and be merged before it can be deployed. No new production deployment or Android build was started from this feature branch. The previously authorized APK phase remains paused until the corrected API returns safe 401/profile and sync behavior.
