# Calora Remediation and Regression Tests

## Implemented remediation
The committed repair in `c3b0549dd1d71c607ec6d1f12e422d801f412400` (merged by `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`) does the following:

- rejects missing/malformed bearer headers before verifier initialization (`supabase-auth.ts:139-147`);
- distinguishes `supabase_config_missing`, `supabase_config_invalid`, and `supabase_auth_unavailable` (`15-27`, `43-49`, `144-153`);
- maps those failures to generic 503 (`app.ts:99-115`);
- preserves invalid-token 401 and absent-profile 404 behavior (`profile.ts:84-100`);
- keeps raw messages, stacks, URLs, keys, tokens, provider bodies, and customer data out of diagnostics (P0 report lines 13-20).

The earlier `25a6c1e` startup repair added bounded auth/profile/local hydration recovery and existing-profile fallback, but the sequence evidence says later rollback removed those protections.

## Validation evidence
Preserved P0 report: workspace build PASS, API TypeScript PASS, focused verifier/logger/profile 26/26 PASS, full offline API 546/546 PASS across 43 files, diff/format and source-secret checks PASS. Independent supplied final run: 43/43 files and 547/547 tests PASS, focused auth/logger/profile 26/26 PASS, API typecheck PASS, clean worktree. The count discrepancy (546 versus 547) is not explained.

Client-focused supplied results: logger 7/7, profile 7/7, profile-sync 8/8, session storage 9/9, root gate 5/5, API networking 6/6. AuthContext integration was blocked by jsdom/undici worker startup; direct verifier import initially required a synthetic/local `DATABASE_URL` sentinel.

## Required next tests
Before release, add route-level tests for no bearer, malformed bearer, invalid JWT, missing configuration, malformed configuration, Auth outage, authenticated missing profile, and successful profile. Add never-settling promise tests for `getSession`, profile GET/PUT, refresh, and response-body reads; add a default timeout or explicit timeout contract for protected startup calls. Then perform a disposable-user authenticated smoke test after deployment and attest serving SHA.

## Verdict
`REPAIR_VALIDATED_OFFLINE; PRODUCTION_BLOCKED_EXTERNAL`. Offline repair evidence is strong; it is not production verification.