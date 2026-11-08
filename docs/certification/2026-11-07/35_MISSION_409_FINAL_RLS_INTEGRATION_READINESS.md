# Mission 409 — Final RLS Integration Readiness

**Assessment date:** 2026-11-07
**Mission branch:** `mission/409-rls-integration-readiness`
**Starting PR #398 commit:** `73a14125684001bfd3cd4cc20a582b2abf6c327a`
**Protected-main baseline:** `b94cdbcf248d2d716ae590646b62a11ff905b0e3`
**Production mutation:** none
**Native build or store submission:** none
**Final verdict:** **NOT READY**

## Executive decision

The least-privilege RLS design works in an isolated disposable PostgreSQL environment, but Calora is not ready to activate it. The actual API still imports the global `@workspace/db` Drizzle instance backed by the existing `DATABASE_URL` pool, and the real request handlers still pass user IDs through application predicates rather than setting a signed transaction-local PostgreSQL identity. The production role `calora_api_runtime` remains the active role and has `BYPASSRLS = true` according to Mission 407 live evidence.

This is a deliberate fail-closed decision. No production role, grant, migration, secret, Railway variable, deployment, restart, or customer record was changed.

## Verified baseline

The existing Mission 408 pull request is PR #398, open and mergeable, at commit `73a14125684001bfd3cd4cc20a582b2abf6c327a`. Its protected checks completed successfully. Mission 408 supplied the prototype migration, identity helper, 20-scenario predecessor harness, and evidence report. The current Mission 409 branch is based on that commit and contains only isolated hardening, tests, and this report.

The production Railway environment was read-only verified before this work: three services were healthy, there were no recent failures, and no staged or applying work was pending. The latest deployment history remained on `release/calora-production` at the previously approved serving commit. Mission 409 created no deployment.

## Actual API integration audit

The real API database surface is broader than the Mission 408 prototype. `lib/db/src/index.ts` exports one process-global `pool` and one process-global Drizzle `db`. The API imports and uses those objects throughout routes and libraries. The audit found direct global-pool or global-Drizzle usage in account deletion, profile, diary, capture, sync, referral, Coach v2, Coach Fact Context, recipes, admin data, admin alerts, logging, recovery warning suppression, and provider-related persistence paths.

The API does have local `pool.connect()` transactions in some Coach and account-deletion paths, but they do not set a signed `calora.identity_token`. Other authenticated paths use `db.transaction(...)` without a mechanism to bind the transaction to the verified Supabase identity. Consequently, adding the new role or enabling its policies without a coordinated adapter would cause missing-context failures or incomplete route behavior; silently retaining the old role would defeat the purpose of independent database enforcement.

### API transaction-path matrix

| Area | Actual access observed | Identity context today | Mission 409 result | Required next step |
|---|---|---|---|---|
| Supabase bearer verification | `verifyBearerToken` returns verified external ID | Application object only | PASS as authentication prerequisite; not DB-bound | Create assertion only after successful verification |
| Profile and account routes | Global `db.transaction`, direct `db.execute`, and local pool usage | Application `userId`/external ID predicates | NOT READY | Route all user operations through a transaction-aware identity adapter |
| Diary and sync | Global Drizzle transactions and direct SQL | Application ownership predicates | NOT READY | Adapter plus two-user/three-user route regression |
| Capture and recipe media | Mixed Drizzle/global pool and media persistence | External ID passed by server code | NOT READY | Bind media and capture sessions to transaction-local identity |
| Coach v2 | Several explicit `pool.connect()` transactions | `userId` SQL predicates | NOT READY | Set identity on every client transaction and preserve advisory locks |
| Coach Fact Context | Global Drizzle operations and idempotency SQL | External ID application checks | NOT READY | Separate user transaction from system/idempotency operations |
| RevenueCat/webhooks | Server/provider operations and subscription persistence | Service-side operation | NOT READY | Separate service role/function; never inherit user identity |
| Admin routes | Dedicated admin authentication and admin-data access | Administrative principal/session | NOT READY | Dedicated admin/service role or narrowly scoped SECURITY DEFINER functions |
| Account deletion/recovery workers | Scheduled/background operations, deletion fences, storage/provider calls | No user assertion on worker DB operations | NOT READY | Dedicated worker role/functions with explicit deletion-worker authorization |
| Shared food/nutrition reference data | Shared tables | No RLS identity required for reads | Prototype PASS | Preserve read-only grant and deny writes |
| Migrations and maintenance | Dedicated migration URL contract exists | Migration role, not runtime identity | PASS boundary; integration pending | Keep migration credential separate and do not auto-run prototype in production |

## Changes made in Mission 409

The identity helper was hardened without wiring it into production routes. Assertions now use cryptographically secure random nonces, bounded identity and nonce formats, a maximum 300-second lifetime, and exact-expiry rejection. A savepoint-based helper was added for operations nested inside an existing transaction; it restores the prior transaction-local identity on success and relies on savepoint rollback to restore it on failure.

The prototype SQL parser was aligned with the helper's bounded token format and now rejects assertions at or beyond their expiry timestamp. These changes remain part of the isolated prototype lineage and are not a production migration authorization.

## Identity assertion threat model

| Threat | Result | Evidence / limitation |
|---|---|---|
| Forged identity | PASS | HMAC mismatch returns no identity in disposable rehearsal |
| Wrong signing secret | PASS | Helper regression test fails closed |
| Expired assertion | PASS | Exact expiry and past expiry are rejected in helper; SQL exact-expiry behavior rehearsed |
| Malformed context | PASS | Missing, extra-part, invalid-signature, and invalid-format cases return no identity |
| Cross-user impersonation | PASS in isolated DB | Three synthetic users saw only their own rows |
| Pool-context leakage | PASS | Commit/rollback and separate concurrent clients were tested |
| Nested transaction boundary | PASS for helper | Savepoint helper tested; not integrated into actual API transaction graph |
| Rollback and retry | PARTIAL | Helper rollback behavior tested; full route retry semantics not integrated |
| Replay of a valid assertion | BLOCKED | Nonces are cryptographically random but are not persisted or consumed. A stolen assertion remains replayable until expiry. One-time replay prevention must be added where threat modeling requires it. |
| Clock skew | BLOCKED | No explicit distributed clock-skew policy exists. Production deployment needs a bounded skew allowance and synchronized clocks. |
| Constant-time SQL comparison | BLOCKED | TypeScript verification uses `timingSafeEqual`; the PostgreSQL prototype compares hexadecimal strings with `<>`. This should be replaced with a reviewed constant-time database primitive or a carefully bounded alternative before production use. |
| Unauthorized privilege escalation | PASS in prototype | Runtime role has `NOBYPASSRLS`, does not own the test table, and cannot read server configuration in the rehearsal |

## Disposable application/database evidence

A fresh local PostgreSQL database was created and destroyed for the run. It used the source-controlled Calora empty-target bootstrap plus the required operational/privacy fixtures. No production URL, credential, Supabase project, Railway variable, customer row, or native device was used.

The adversarial harness used three independent synthetic users and separate diary data sets. It completed **20/20 scenarios**, including owner reads, cross-user reads, cross-user insert/update/delete attempts, forged and expired contexts, missing context, exact-expiry rejection, pooled-connection reset, shared-reference read/write boundaries, server-owned table access, role bypass and ownership checks, and concurrent separate clients.

Mission 409 identity helper coverage passed **4/4 tests**. Mission 408 static RLS/search-path contracts passed **6/6 tests**. API TypeScript validation passed. Client TypeScript validation passed. The isolated SQL migration applied successfully to the disposable database.

The tests demonstrate database policy behavior, not actual HTTP-to-database integration. Existing offline API tests remain valuable for application-level authorization but cannot certify that all real API queries run under the new role.

## Performance and reliability decision

A production performance claim was not made. The prototype's RLS query behavior was rehearsed functionally, but a representative benchmark comparing the current API model with the proposed actual API adapter was not run because the adapter is not integrated into the real route graph. Running synthetic SQL latency numbers would not establish API response latency, worker behavior, or pool resource consumption.

This is an explicit evidence gap, not a presumed regression or presumed pass. The required benchmark must use the real API operation set on a disposable database with controlled sample sizes, concurrency, pool size, query latency, transaction overhead, error rate, and resource observations.

## Rollout and rollback readiness

The production rollout must be a coordinated, owner-approved operation:

1. Provision a separate runtime login role with `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, and `NOBYPASSRLS`; verify only sanitized attributes.
2. Provision a database-only HMAC secret and matching API secret through the approved secret manager; record fingerprints only.
3. Introduce a transaction-aware database adapter and migrate all user routes, local pool paths, Drizzle transactions, workers, webhooks, and admin paths according to the matrix above.
4. Add one-time assertion consumption for operations that require replay prevention, and define a bounded clock-skew policy.
5. Provide dedicated worker/admin/migration roles or narrowly scoped `SECURITY DEFINER` functions. Do not give scheduled jobs the user runtime role merely to make tests pass.
6. Run the full synthetic HTTP workflow matrix: registration/login fixtures, profiles, diary, sync, capture, recipes/media, Coach, subscriptions/webhooks, account deletion, workers, admin, and maintenance boundaries.
7. Perform a controlled canary against an isolated release environment, then activate traffic incrementally with abort thresholds.
8. Only after stable evidence, revoke the legacy role's broad grants and leave `BYPASSRLS` disabled for the production runtime path.

### Measurable abort conditions

Abort activation for any cross-user read/write result, any missing-context success, any forged-context success, any authentication failure increase attributable to the adapter, any database error-rate increase above the pre-canary baseline, any sustained API 5xx increase, any connection-pool exhaustion, or any rollback that cannot restore the prior authenticated workflow without broadening privileges.

Rollback must be rehearsed on the same adapter and route matrix: stop new traffic, restore the previous API release and connection configuration, preserve the RLS migration and evidence, and verify two-user isolation and normal authenticated workflows. Do not automatically regrant `BYPASSRLS` or alter production policies during an incident.

## Outstanding defects and severity

- **Critical — actual API not integrated:** the global Drizzle/pool paths still use the legacy role and application predicates.
- **High — replay prevention absent:** valid assertions are reusable during their lifetime if stolen.
- **High — privileged path separation incomplete:** workers, admin operations, webhooks, deletion, and maintenance require separate roles/functions.
- **High — production role/secret provisioning unavailable:** no authorized production role or secret change was performed.
- **Medium — SQL signature comparison is not constant-time:** requires database-specific security review before production use.
- **Medium — performance benchmark missing:** no representative real-API adapter benchmark exists.
- **Medium — clock-skew policy missing:** distributed deployment behavior is not yet specified.

## Production safety attestation

No production database migration was run. No production role or grant was changed. No production secret, Railway variable, service, domain, deployment, restart, customer record, or storage object was modified. PR #398 was not merged. No Android or iOS build, store submission, or native release was triggered.

## Final verdict

**NOT READY.** The prototype and isolated three-user database rehearsal pass their bounded objectives, but mandatory real-API integration, replay policy, privileged-operation separation, representative performance validation, and production role/secret provisioning remain unresolved. CAL-15 must remain **BLOCKED**.
