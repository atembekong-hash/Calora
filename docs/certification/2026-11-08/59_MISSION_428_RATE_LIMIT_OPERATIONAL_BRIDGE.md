# Mission 428 — Restricted Rate-Limit Operational Bridge

The Coach real-handler rehearsal correctly identified that the persistent rate limiter was the remaining staged-RLS boundary: user-owned tables must remain tenant-scoped, while operational metering must still work for the restricted runtime.

## Correction

The staged prototype now creates `public.calora_check_rate_limit(text, integer)` as a narrowly parameterized `SECURITY DEFINER` function. The function performs the existing atomic upsert against `calora_capture_rate_limits`, exposes only `count` and `reset_at`, revokes public execution, and grants execution only to `calora_api_runtime_rls`.

`rate-limit.ts` selects this function only when `CALORA_RLS_DATABASE_MODE=staged-rls`; legacy mode retains the existing direct upsert. No broad table grant or tenant-data policy was added.

## Evidence

- Disposable non-BYPASSRLS runtime successfully executed the function and received the first bucket count.
- API TypeScript validation passed.
- The complete staged-RLS real-handler rehearsal passed 5/5 tests after the bridge was applied.
- No production database, credentials, deployment, native build, or store submission was touched.

This closes the previously observed operational rate-limit boundary for staged validation. Production rollout remains separately gated because the migration artifact is explicitly non-production.
