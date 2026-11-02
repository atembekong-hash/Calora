# Mission 329 — Calora Auth Traffic Effectiveness and Release Readiness

Date: 2026-11-01
Scope: Compare the Mission 328 authentication repair under identical isolated workloads, remove one remaining safe session-read inefficiency, validate the full client/API/security suites, and prepare—but do not execute—the controlled Railway deployment and rollback plan.

## Final verdict

**READY FOR CONTROLLED DEPLOYMENT AFTER PROTECTED MERGE — NOT DEPLOYED BY THIS MISSION.**

The evidence confirms that Mission 328 removed concurrent duplicate server-side Supabase user verifications, but did not and should not suppress sequential authenticated API requests. Mission 329 additionally removes redundant scoped client session reads while preserving the fresh account-identity check before every protected send and retry.

Production traffic effectiveness remains a post-deployment measurement item because no deployment was initiated during this mission.

## 1. Baseline evidence and interpretation

The prior read-only Supabase evidence recorded 31,297 successful `GET /auth/v1/user` responses in the available Calora 24-hour log window, including hourly bursts of 7,785, 6,465, 3,775, and 3,682 requests. Only 45 token-exchange requests were observed in that same aggregate.

That pattern is not consistent with a single small startup check. It is consistent with repeated authenticated API traffic, multiple concurrent consumers, multiple tabs/sessions, or a combination of those sources. Logs alone cannot prove how many browser sessions produced the requests, so the isolated workload comparison below distinguishes the concurrency component from the sequential component without over-claiming production attribution.

## 2. Identical isolated workload comparison

A temporary non-production Vitest harness exercised the same bearer token through representative workloads: navigation, dashboard refresh, recipe loading, and session restoration. The old model called the Supabase verifier once per concurrent request. The Mission 328 model shared only the currently in-flight verification promise for the same token.

| Workload | Concurrent width | Pre-repair verifier calls | Mission 328 verifier calls | Reduction |
|---|---:|---:|---:|---:|
| Navigation | 4 | 4 | 1 | 75.0% |
| Dashboard refresh | 6 | 6 | 1 | 83.3% |
| Recipe loading | 8 | 8 | 1 | 87.5% |
| Session restoration | 3 | 3 | 1 | 66.7% |
| **Aggregate** | **21** | **21** | **4** | **81.0%** |

The same harness then issued 21 authenticated requests sequentially. Both the pre-repair behavior and Mission 328 performed 21 verifier calls. This is correct: each request is independently verified after the previous verification has settled, preserving revocation and account-state correctness. Mission 328 is therefore an in-flight deduplication repair, not a long-lived authorization cache.

The temporary harness was removed and is not included in the protected source diff.

## 3. Mission 329 remaining amplification finding

The generated authenticated transport intentionally performs two identity guards around token acquisition and send. The scoped profile and capture option builders separately read the Supabase session in the first identity guard and token getter, then read it again in the second guard.

Mission 329 now shares the first guard's session result with the token getter. The second guard still performs a fresh read immediately before the request, so account-switch detection remains intact.

Measured request-local effect:

- Successful guarded request: 3 session reads reduced to 2, a 33.3% reduction.
- Request receiving one 401 and retrying: 6 session reads reduced to 5, a 16.7% reduction.
- The fresh second guard and fresh retry identity guard remain present.

This optimization affects local session-read amplification and can also reduce Auth traffic in runtimes where session reads fall through to Auth. It does not weaken bearer-token verification, token refresh, logout, deletion fencing, revocation behavior, or account isolation.

## 4. Source changes

Changed files:

- `artifacts/calora/lib/captureRequest.ts`
  - Shares the first session read between `authIdentityGuard` and `authTokenGetter`.
  - Retains a fresh identity check before send and before refresh retry.
- `artifacts/calora/lib/profileSync.ts`
  - Applies the same scoped session-read reuse to profile requests.
- `artifacts/calora/lib/__tests__/captureRequest.test.ts`
  - Asserts the reduced read count while preserving the retry-path behavior.

Mission 328 server-side in-flight token verification remains unchanged in this mission.

## 5. Validation evidence

- Calora focused auth/profile/capture tests: **30 passed**.
- Calora complete suite: **186 test files, 1,944 tests passed**.
- Calora TypeScript: passed.
- Calora web/security contract suite: **29 passed**.
- API complete isolated suite: **46 test files passed, 558 tests passed; 12 integration files skipped because no disposable PostgreSQL/Supabase integration service was provisioned, totaling 49 skipped tests**.
- API Supabase auth and deduplication tests: **14 passed**.
- API TypeScript: passed.
- Image governance, native auth preflight, release workflow, and Android workflow contracts: **29 passed**.
- `git diff --check`: passed.

The first API rerun omitted `AI_INTEGRATIONS_OPENAI_BASE_URL` and blocked two suites at import time; the corrected isolated run with both OpenAI placeholder variables passed all 558 executable tests. No production credentials were used.

## 6. Protected delivery and deployment state

The current protected main before this Mission 329 source change is `57469f89e93bc72612ae7ea069277089d9072297`.

The existing Railway production environment identified as `attractive-harmony` has three healthy services and no pending work. The prior automatic deployment for the Mission 328 merge was recorded as:

- Current documentation-merge deployment: `06ec23d4-d2be-437f-940c-f49af816bf13` and `698224fa-d9c5-4d59-a1ec-39210f11fb93`, serving commit `57469f8`.
- Mission 328 repair deployment retained as rollback reference: `114b2dfa-0067-4379-8750-90fdfc512b0e`, serving commit `fb8a0fd`.
- The associated prior deployment records are marked rollback-capable by Railway.

No Railway deployment, restart, configuration change, database change, credential change, native build, or store release was initiated for Mission 329.

## 7. Controlled deployment plan

1. Complete the protected PR checks for the Mission 329 session-read optimization.
2. Merge through protected main only after all required checks pass.
3. Confirm the exact merged SHA and verify that the release workflow attests to that same SHA.
4. Allow the existing Railway main-branch automation to deploy; do not create a manual deployment unless separately authorized.
5. Confirm all three Calora services are healthy and record deployment IDs and serving SHA.
6. Verify `/health`, `/api/healthz`, and `/api/version`.
7. Run bounded authenticated checks for Today, Recipes, Profile, Settings, Notifications, Membership, synchronization, and one non-mutating auth/session flow.
8. Measure pre-deployment and post-deployment Auth request counts over comparable windows. The success criterion is a material reduction in duplicate/burst traffic without an increase in 401/403 behavior or account-isolation errors.
9. Re-check Supabase Usage by project and service after enough traffic has accumulated; do not claim quota recovery from source tests alone.

## 8. Rollback plan

If a critical regression appears after the separately authorized deployment, stop further rollout and use the Railway deployment rollback operation for the affected service(s) to the last known-good deployment serving `fb8a0fd` / Mission 328. Verify health, serving SHA, authentication, and account-scoped data after rollback. Do not roll back database schema or alter customer data because Mission 329 contains no schema or data migration.

Rollback triggers include authentication failure for valid sessions, account-crossing requests, logout/revocation failures, elevated 401/403 responses, persistent startup failure, or evidence of duplicate data access. Increased but bounded Auth request volume alone should first be measured against the comparable baseline unless accompanied by functional or quota-impact regression.

## 9. Remaining risks and limitations

- Production post-release effectiveness is not yet measured; this mission has no authority to deploy.
- The original 31,297 requests cannot be attributed exactly to one browser, one user, or one code path using the available aggregate log interface.
- The isolated API suite skips database-backed integration tests because no disposable integration service was provisioned. The skipped tests are explicitly not counted as passed.
- Supabase billing egress bytes remain unavailable through the accessible logs; the Usage page remains authoritative for GB attribution.
- Sequential authenticated requests remain intentionally verified one by one to preserve security semantics.

**Conclusion:** The completed Mission 328 repair is effective against concurrent verification bursts, and Mission 329 safely reduces remaining request-local session reads. The code is release-ready after protected merge, with production traffic and quota effectiveness requiring a separately authorized deployment and post-deployment measurement.
