# Mission 423 — Complete Remaining API Security Integration and Staged-RLS Certification

**Assessment date:** 2026-11-08  
**Source baseline:** protected `main` merge `66791199def3d71dd476e47b786f8aeda09a8fdd` (Mission 422)  
**Working branch:** `mission/423-complete-api-rls`  
**Scope:** application-level transaction-identity review and bounded staged-RLS implementation/evidence. No production deployment, release-branch change, production migration, live RevenueCat grant, native build, OTA update, store submission, or real customer-data access was performed.

## Verdict

**CONDITIONAL — referral durability and previously scoped sync/referral paths are PASS under disposable staged RLS; API-wide staged-RLS certification is not complete.**

Mission 423 confirmed that the remaining route families are not all integrated with the transaction-scoped identity abstraction. A complete API-wide PASS would be inaccurate. The safe work completed in this mission is the final referral durability evidence package plus a route-by-route authorization matrix that distinguishes user-owned request paths, public/cache paths, and privileged service/admin paths. The remaining user-owned families require separate bounded implementation work before CAL-15 can move from BLOCKED.

## Source and delivery

- Protected-main baseline verified: `66791199def3d71dd476e47b786f8aeda09a8fdd`.
- Mission 422’s source commit was present in the baseline.
- Mission 423 implementation commit: `d154708058e61248b281089b48a2665307368b9d` on `mission/423-complete-api-rls`.
- Protected pull request: [#408](https://github.com/atembekong-hash/Calora/pull/408).
- Protected-main merge commit: `eb46dcf1eed3c58d0cc921a318740eecf44ed071`.
- The report-finalization documentation commit is intentionally separate from the application change.

## Completed work package — Referral durability finalization

The existing Mission 422 staged reward-attempt design was exercised against the disposable PostgreSQL 16 environment using the non-superuser, non-`BYPASSRLS` runtime role `calora_api_runtime_rls` and synthetic users only.

The real-handler test now covers:

1. Referral-code discovery as intentionally shareable public metadata while redemption summaries remain tenant-scoped.
2. Three-user sync and referral activation through genuine Express handlers.
3. Concurrent claims for one reward side: exactly one request obtains a claim and competing requests observe `in_flight`.
4. Crash-after-claim simulation: an uncompleted `processing` lease remains protected while valid.
5. Lease expiry and reclaim: a new attempt key is issued and `reconciliation_required` is set before provider outcome is known.
6. Provider-success-with-lost-response simulation: the retry/reclaim attempt can be completed durably with its matching idempotency key.
7. Repeated activation/replay: a granted side returns `granted` and does not issue another provider call.
8. Forged/missing identity and cross-account denial through the existing staged-RLS and real-handler harness.

The provider remains a loopback emulator or mock in all tests. The real RevenueCat service’s idempotency guarantee is not independently proven. Until provider-side idempotency is contractually confirmed, the required operational control is durable attempt-key reconciliation: every expired or `reconciliation_required` attempt must be reviewed against provider state before a new grant is authorized.

## Route-to-identity authorization matrix

| Route family / representative handlers | Data class | Current identity boundary | Mission 423 evidence | Status / next action |
|---|---|---|---|---|
| `/v1/sync` | User-owned diary and sync ledger | `withVerifiedDatabaseIdentity`; one outer transaction | Three-user real-handler staged-RLS rehearsal; cross-account read denial; atomic batch tests | **PASS bounded**; retain existing coverage |
| `/v1/referral`, `/redeem`, `/activate` | Shared invite code plus user-owned redemption/reward state | Scoped identity for DB phases; provider call after committed claim | Three-user handler test plus crash/lease/concurrency test | **PASS staged**; production schema approval still required |
| `/v1/profile` | User-owned profile | Scoped identity adapter | Prior Missions 418–420 evidence | **PASS bounded** |
| `/v1/diary` | User-owned diary/capture qualification | Scoped identity for integrated paths; legacy helpers remain in some diary flows | Prior capture/diary evidence plus sync rehearsal | **PARTIAL**; complete diary first-log/approval path review remains |
| `/v1/capture/*` | User-owned capture session/candidates | Scoped identity on integrated session/approval paths | Prior Mission 420 evidence; sync-backed capture rehearsal | **PARTIAL**; remaining capture/media branches require route-level matrix |
| `/v1/privacy/requests` | User-owned data-rights request records | Prior scoped identity integration | Source and focused tests | **PASS bounded**; external export/delete provider evidence remains |
| `/v1/account` and deletion recovery | Privileged account lifecycle and external Auth/storage/RevenueCat state | Deliberate service-owned deletion claim/checkpoint workflow using separate worker semantics | Existing deletion-fence and PostgreSQL integration evidence | **PARTIAL by design**; requires service-identity/RLS rehearsal, not ordinary user transaction identity |
| `/v1/recipes`, `/v1/recipes/:id` | Public/shared recipe discovery and nutrition cache | Public routes use IP/account rate limits; nutrition cache is shared | Offline/API tests only | **PARTIAL**; public/shared portion is distinct from private persistence |
| `/v1/recipes/photo*`, `/v1/recipes/media*` | User-owned generated recipe media and private object ledger | Helper functions still use pooled direct queries and advisory lock wrapper | Existing media persistence tests; no staged-RLS real-handler proof | **UNVERIFIED / P1**; adapt `recipe-media.ts` and generation transitions to scoped executor |
| `/v1/coach/v2/chat` | User-owned conversations, turns, snapshots | Route uses deletion lock, but `coach-v2-data.ts` still uses `pool`/`PoolClient` directly | Focused Coach tests only | **UNVERIFIED / P1**; refactor persistence helper to identity-aware executor while keeping AI calls outside DB transactions |
| `/v1/coach/v2/conversation*` | User-owned conversation history | Direct pooled helper transactions | Focused route tests only | **UNVERIFIED / P1**; same Coach persistence refactor |
| `/v1/coach/v2/report` | Server-owned report intake, optionally linked to user | Direct `pool.query`; requires service/report authorization distinction | Source review only | **UNVERIFIED**; define report-intake service identity and account-link policy |
| `/v1/coach/v2/settings` | User-owned personalization | Direct pooled helper queries | Focused tests only | **UNVERIFIED**; executor-aware settings helper required |
| `/v1/coach/fact-context*` | User-owned memory/context plus consent/idempotency | Consent path has scoped work; fact-context route still contains direct `db.execute` | Focused consent tests | **PARTIAL**; complete fact-context persistence and idempotency under staged RLS |
| `/v1/health`, `/healthz` | Service readiness only | Service probe; no tenant data | Existing health tests | **INTENTIONALLY EXCLUDED from user identity**; service DB role must be separately certified |
| `/v1/planner/*` | User-specific generated planning data/provider work | Route/provider path not fully identity-integrated | Offline tests | **UNVERIFIED / P1**; separate claim/provider/persistence review |
| `/v1/premium-recipes`, `/v1/restaurant-foods` | Public/provider data plus server-side entitlement gate | Premium gate verifies server-side RevenueCat entitlement; public/provider reads are not tenant-owned | Premium and provider tests | **PARTIAL**; live lifecycle and cache persistence require evidence |
| `/v1/admin/*` | Privileged administrative data and operations | Separate admin authentication/session layer | Admin source and offline tests | **INTENTIONALLY SEPARATE**; requires service/admin identity rehearsal, never ordinary user assertions |
| Background recovery, alert, rate-limit, and worker paths | Server-owned operational state | Direct service-owned DB paths | Existing operational tests | **UNVERIFIED**; must use narrowly scoped service identities and no fabricated users |

## Work packages A–E and G assessment

### A — Recipes and saved content

Public/shared discovery is intentionally separate from private media persistence. Server-side premium entitlement enforcement remains present and client entitlement claims are not trusted. However, the private recipe-media helper (`recipe-media.ts`) still uses direct pooled queries for claims, state transitions, and reads. No API-wide staged-RLS claim is made. Saved meals and private generated recipe persistence remain CAL-15 blockers.

### B — Coach and memory

Coach safety, provider deadlines, deletion locks, and focused persistence behavior remain present. However, `coach-v2-data.ts` still owns direct `PoolClient` transactions and `pool.query` calls, and the active chat holds an application deletion lock across the external AI call. This is not acceptable as complete staged-RLS evidence. A follow-up must make DB persistence executor-aware, keep DB claims short, and keep the AI call outside database transactions.

### C — Wellness and health

The current route inventory does not expose a complete user-owned activity/steps/hydration/weight/fasting persistence family in the API route set reviewed here. Existing diary/profile/sync evidence does not prove those domains. They remain unverified rather than declared absent or broken.

### D — Service and admin operations

Health probes are service-owned and intentionally excluded from ordinary user identity. Admin authentication is a distinct privileged boundary. Recovery, alerts, rate limits, and worker paths require a dedicated service identity rehearsal. No ordinary request was granted broad `BYPASSRLS` privileges.

### E — Privacy and account lifecycle

Privacy request persistence is scoped at the application level. Account deletion is a multi-stage service workflow involving storage, application data, RevenueCat, and Supabase Auth. It must be certified as a service operation with least-privilege grants and external-state evidence; it must not be forced into an ordinary user transaction identity.

### G — Complete staged-RLS certification

Not complete. The disposable runtime remains useful evidence, but the route matrix above identifies outstanding user-owned and service-owned paths without real-handler staged-RLS proof. Production RLS certification remains explicitly out of scope and requires separate approval.

## Regression evidence

The Mission 422 baseline passed:

- API offline suite: 564/564 across 47 files.
- Existing PostgreSQL integration suite: 43/43 across 10 files.
- RevenueCat/provider emulator tests: 19/19.
- Focused sync/referral tests: 37/37.
- Mission 417 security contracts: 3/3.
- API and database TypeScript validation.
- API build.

Mission 423 validation:

- Focused sync/referral unit suites: **37/37 passed**; the real-handler file is skipped when the database gate is disabled.
- Disposable staged-RLS real-handler rehearsal: **3/3 passed** with three synthetic users.
- API offline suite: **564/564 passed across 47 files**.
- Mission 417 security contracts: **3/3 passed**.
- API TypeScript check: passed.
- Database TypeScript compiler check: passed via direct `tsc -p tsconfig.json --noEmit` because the package has no `typecheck` script.
- Legacy disposable PostgreSQL regression subset: **38/38 passed across 8 integration files**.

An attempted all-integration run under the staged non-bypass runtime was intentionally not counted as a product regression: legacy fixtures perform direct setup writes and disposable-schema creation that are not yet identity-aware, and the resulting permission/RLS failures are direct evidence of the remaining route/service integration gap. A separate legacy-admin run passed the applicable existing regression subset. The rolling-restart recovery test was not counted after its disposable process failed to become healthy; this is an infrastructure/harness blocker, not evidence of a Mission 423 source failure.

## Required production approvals

Before any production action, the owner must separately approve:

1. A reviewed production migration for `calora_referral_reward_attempts` and its RLS policy.
2. Production role/grant changes, including proof that the API runtime is non-superuser and non-`BYPASSRLS`.
3. Provider idempotency contract and reconciliation runbook.
4. Separate service identities for account deletion, workers, health probes, recovery, alerts, and admin operations.
5. Post-migration staged verification and rollback plan.

This mission performed none of those production-changing actions.
