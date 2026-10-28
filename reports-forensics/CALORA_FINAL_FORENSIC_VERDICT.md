# Calora Final Forensic Verdict

## Final labels
- **Primary verdict:** `ROOT_CAUSE_PARTIALLY_PROVEN`
- **Offline repair status:** `REPAIR_VALIDATED_OFFLINE`
- **Production status:** `PRODUCTION_BLOCKED_EXTERNAL`
- **Security-event status:** `ROOT_CAUSE_UNDETERMINED` for the October 21 Railway/terminal exposure event

## Primary cause
The most strongly supported application cause is a Supabase verifier boundary defect: `/api/v1/profile` initialized/used the verifier before rejecting absent or malformed bearer credentials, and verifier configuration or Auth-provider failures could escape as an ordinary error. The global handler then returned HTTP 500 instead of a bounded dependency-unavailable response. This mechanism is supported by the preserved P0 report, `e9b971b` pre-repair history, `artifacts/api-server/src/routes/profile.ts:84-100`, `supabase-auth.ts:139-156`, and `app.ts:99-115`.

A client startup resilience defect is a supported contributing risk: protected startup/profile reconciliation can await operations without a default timeout (`AuthContext.tsx:125-143`; `profileSync.ts:151-169`; `custom-fetch.ts:427-463`). It is not proven as the first production trigger. The exact runtime configuration fault—missing variable, malformed value, wrong project, invalid key, or transient Supabase Auth failure—remains unproven.

## Repair conclusion
`c3b0549` / merge `efe059a` checks bearer presence first, classifies verifier failures as bounded non-secret codes, maps them to 503, and preserves 401/404 semantics. Supplied offline evidence records 43/43 files and 547/547 tests passing, with API typecheck passing; preserved diagnostics record 26/26 focused and 546/546 full tests. The discrepancy is noted, not hidden.

## Production conclusion
Production is not verified. The named October 28 verifier-fix Railway deployments were QUEUED/applying with no build/deploy logs; current serving SHA was not independently exposed by `/api/version`; health checks only prove reachability. No authenticated disposable-user request, runtime variable inspection, production log export, live database/Auth check, production build, or deployment was performed.

## Remaining blockers
1. Attest a live serving SHA for `efe059a` or later.
2. Resolve Railway queue/platform state and preserve deployment/build logs.
3. Verify effective Supabase URL/key presence and project identity without disclosing secrets.
4. Run an authorized disposable-user authenticated profile GET/PUT smoke test.
5. Confirm Supabase Auth reachability, database schema/migrations, profile-row behavior, and sanitized request IDs.
6. Add and run timeout/liveness regression tests for auth restore and profile reconciliation.
7. Complete owner-controlled Railway October 21 incident and terminal-output audit, containment, and credential rotation review.

No production credentials, customer data, builds, deployments, or protected runtime values were accessed by this forensic synthesis.