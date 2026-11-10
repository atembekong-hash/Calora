# Mission 410 — Existing Tenant Isolation and Launch Decision

**Assessment date:** 2026-11-07
**Mission branch:** `mission/410-tenant-isolation-launch-decision`
**Protected-main baseline:** `b94cdbcf248d2d716ae590646b62a11ff905b0e3`
**Related evidence:** Missions 407, 408, and 409; PR #398 and PR #399
**Production mutation:** none
**Final verdict:** **INSUFFICIENT EVIDENCE**

## Executive decision

No reproducible cross-account read, write, or delete vulnerability was demonstrated in the tested existing application paths. The current application-level ownership model is effective in the tested real-handler scenarios, and the full offline API authorization suite passed.

The evidence is not sufficient to grant a temporary launch exception for CAL-15. Several required data domains and privileged paths were not exercised end-to-end over real HTTP and a disposable database. The correct decision is therefore **INSUFFICIENT EVIDENCE**, not a security PASS and not a silent waiver. CAL-15 remains BLOCKED.

This mission did not implement another RLS prototype, change production roles or grants, deploy, merge, restart Railway services, access customer data, or trigger a native build.

## Existing security architecture

The current Calora security model is application-enforced:

1. API requests authenticate through Supabase bearer-token verification. The server derives the external identity from the verified token rather than trusting a caller-supplied user ID.
2. API handlers use application ownership predicates, typically keyed by the verified external identity or the internal `calora_users.id` resolved from it.
3. Direct Calora table access by mobile/web `anon` and `authenticated` roles is denied according to Mission 407 live metadata. The API is the intended domain-data path.
4. The current API database role, `calora_api_runtime`, has `BYPASSRLS = true`. Therefore database RLS is not an independent tenant boundary for API traffic; application predicates are the effective boundary.
5. Admin routes use a dedicated admin host/session and permission model. Provider webhooks, background work, account deletion, migration operations, and service integrations have separate application code paths, but their live database credential separation was not fully independently verified.
6. Missions 408 and 409 validated an isolated least-privilege RLS design but did not wire it into the API or production. PR #398 and PR #399 remain separate review artifacts and are not treated as deployed evidence.

## Actual real-handler/database evidence

The supported integration harness used real Express routers, real application route handlers, real Drizzle/PostgreSQL persistence, synthetic identities, and a disposable local PostgreSQL schema. Supabase token verification was mocked only at the boundary so that no real Auth users or production provider credentials were needed. The route handlers received the same verified identity object the production Supabase boundary supplies.

**Result: 10 integration files, 44/44 tests passed.**

| Area | Real route/database evidence | Users / adversarial coverage | Result |
|---|---|---|---|
| Diary and meal history | `POST/GET/DELETE /v1/diary`, first-log capture ownership | Three independent users; guessed IDs, foreign delete, foreign capture session | PASS |
| Synchronization | `/v1/sync` real handler and persistence | Owner-scoped upsert/delete, client-controlled identity attempts, idempotent replay, multi-device reconciliation | PASS |
| AI capture persistence | Capture session/candidate persistence and approval path | Foreign session rejected before candidate access; owner can consume | PASS |
| Coach fact consent | Real persistence and consent routes | Auth and consent ownership boundaries | PASS |
| Recipe-media metadata | Real persistence helpers and PostgreSQL records | Owner A lifecycle; owner B cannot find, retry, review, render, or list A's media | PASS |
| Account deletion | Deletion-fence and provider-route integration | Fenced tables, generic error behavior, no sensitive detail disclosure | PASS |
| Referral operations | Concurrency and qualification integration | Competing/repeated user operations and ownership handling | PASS |
| Recovery suppression | Real database table/index provisioning and behavior | Expiry and suppression lifecycle | PASS |
| Privacy rights | Existing privacy authorization suite with disposable database URL | Export/delete authorization contracts | PASS |
| Background/service side effects | Limited provider failure and deletion-fence paths | No production provider or live worker credential | PARTIAL |

The three-user tenant-isolation integration test uses users A, B, and C. A creates diary data; B cannot list or delete A's record; B's sync data remains separately owned; B cannot consume C's capture session; C can consume its own session. The run completed successfully.

## Full offline application authorization evidence

With a disposable local database URL and non-routable synthetic OpenAI integration settings, the API offline suite completed:

- **46 test files passed**
- **561 tests passed**
- No test failures

The suite covers the real route modules with mocked database/provider boundaries where the test is intentionally unit-level. Relevant evidence includes:

- Profile: 7 tests.
- Diary: 32 tests, including cross-user and unauthenticated behavior.
- Sync: 27 tests.
- Capture: 64 tests, including forged/missing authentication and ownership states.
- Coach: 3 tests; Coach v2: 30 tests; Coach data: 5 tests; Fact Context: 20 tests; consent: 2 tests.
- Recipes: 31 tests; recipe generation: 25 tests; premium recipes: 33 tests; recipe-media semantics/generation/storage: 32 tests combined.
- RevenueCat/provider contracts: 16 tests; entitlement-gate behavior is tested with mocked provider responses.
- Admin route behavior: 13 tests; admin authorization policy: 3 tests; feature flags and alert controls are also covered.
- Supabase auth: 12 tests plus 2 deduplication tests.
- Account deletion state: 6 tests.
- Privacy rights: 3 tests.
- Health, CORS, startup, contract-parity, rate-limit, and runtime safety suites also passed.

The initial offline invocation without `DATABASE_URL` failed collection by design for database-importing modules. The corrected disposable-database run passed 561/561; this is an environment contract finding, not an authorization defect.

## Required coverage matrix and evidence classification

| Required capability | Evidence level | Decision |
|---|---|---|
| Profile and account access | Profile/account route unit tests; no dedicated three-user real DB HTTP profile isolation run | **TEST COVERAGE GAP** |
| Food diary and meal history | Real three-user HTTP/database integration plus unit tests | **VALIDATED IN TESTED SCOPE** |
| Saved meals and recipes | Recipe/premium unit suites and recipe-media real persistence; no complete saved-meal/recipe owner-vs-foreign HTTP/database matrix | **TEST COVERAGE GAP** |
| Weight and activity records | No dedicated real HTTP/database authorization suite identified; related Coach/context calculations are not equivalent | **TEST COVERAGE GAP** |
| AI capture and Coach data | Real capture persistence and Coach-consent integration; broad Coach v2 route persistence remains primarily unit-level | **PARTIAL / TEST COVERAGE GAP** |
| Subscriptions and entitlements | Premium entitlement and RevenueCat tests pass with mocked provider responses; no live provider lifecycle or real account-bound subscription persistence matrix | **TEST COVERAGE GAP** |
| Account deletion | Real deletion-fence integration and provider-route protections pass | **VALIDATED IN TESTED SCOPE** |
| Synchronization/background operations | Real sync integration passes; worker credential separation and all background jobs are not fully exercised | **PARTIAL / TEST COVERAGE GAP** |
| Recipe-media metadata | Real owner-scoped persistence lifecycle passes | **VALIDATED IN TESTED SCOPE** |
| Administrative/service endpoints | Admin route and permission unit suites pass; no end-to-end admin session/database/service-credential exercise | **TEST COVERAGE GAP** |

## Adversarial findings

The following attacks were exercised in real integration or route tests where the capability existed:

- Missing authentication and forged/unsigned bearer tokens.
- User B attempting to list, delete, replace, or consume User A/C records.
- Client-controlled ownership identifiers in synchronization payloads.
- Foreign capture-session IDs and nested candidate access.
- Foreign recipe-media IDs used for find, retry, review, render, and list operations.
- Replayed synchronization mutations.
- Account-deletion fence failures and attempts to expose raw account identity details.
- Provider/entitlement uncertainty and unauthenticated premium requests.
- Admin host, session, role, and permission boundary violations.
- Concurrent referral and synchronization operations.

No unauthorized cross-account access or modification was reproduced.

## Findings classification

### Confirmed vulnerabilities

**None demonstrated in the tested application scope.** A passing result here means no exploit was reproduced; it does not prove every route or privileged path is safe.

### Architectural risks

1. **Database independence risk:** `calora_api_runtime` bypasses RLS, so tenant isolation depends on application predicates and code review rather than an independent database policy boundary.
2. **Privileged-path separation risk:** worker, admin, webhook, deletion, and maintenance credential boundaries were not fully validated end-to-end.
3. **Provider lifecycle risk:** entitlement tests use mocks; purchase, restore, renewal, expiration, refund, revocation, and cross-device behavior remain unverified.
4. **Operational recovery risk:** Mission 398/405 evidence records unresolved production backup/RPO/RTO and provider-state gaps.
5. **Authentication boundary substitution:** the integration harness mocks Supabase verification, so it validates handler behavior after identity verification but not the live Supabase Auth network/provider itself.

### Test coverage gaps

Profile persistence, saved meals, weight/activity routes, complete Coach v2 data workflows, live subscription persistence, complete admin service operations, and all background-worker credential paths lack a complete three-user real HTTP-to-database matrix. These gaps prevent a temporary exception decision.

## Confirmed defects and fixes

No critical or high-severity cross-account defect was reproduced. Consequently, no application fix was safely justified within this bounded mission, and no source remediation PR was created. Existing PR #398 and PR #399 remain unchanged and unmerged.

## Launch recommendation

**INSUFFICIENT EVIDENCE.** The evidence supports a statement that the tested application-level controls are effective in their tested scope. It does not support declaring CAL-15 ready for launch or granting a temporary exception.

A temporary exception is **not justified** on this record because the required real-handler coverage is incomplete. No named owner, expiration date, or silent waiver is proposed. If the owner later requests an exception, it must be a separate, explicit risk decision naming:

- a responsible security/product owner;
- an expiration or mandatory review date;
- the exact excluded routes and privileged paths;
- monitoring and alert thresholds;
- incident-response/rollback ownership; and
- the post-launch least-privilege/RLS remediation milestone.

## Post-launch RLS remediation requirements

The RLS redesign remains required rather than waived:

1. Integrate a transaction-scoped identity adapter into the actual API route graph.
2. Separate user runtime, worker, admin, webhook, migration, and service credentials/functions.
3. Add replay prevention and a defined clock-skew policy for signed assertions if that design is retained.
4. Complete real HTTP/database tests for every ownership-bearing route and nested resource.
5. Benchmark representative API operations, pool usage, latency, errors, and rollback behavior.
6. Rehearse canary activation and fail-closed rollback in an isolated release environment.
7. Only then remove the runtime RLS bypass or revoke the legacy role's broad grants through an explicitly approved production operation.

## Production safety attestation

No production database migration, role/grant change, secret change, Railway configuration change, deployment, restart, customer-data query or modification, storage operation, native build, store submission, or protected-branch change occurred. All database tests used disposable local PostgreSQL databases and synthetic records, which were destroyed after each run. PR #398 and PR #399 remain unmerged.

## Final verdict

**INSUFFICIENT EVIDENCE.** No exploitable cross-account access was found in the tested scope, but coverage is inadequate to support a temporary launch exception or a CAL-15 PASS. Calora must not be described as fully certified based on this mission.
