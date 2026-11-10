# Mission 422 — Staged-RLS Real-Handler Certification

**Assessment date:** 2026-11-08  
**Branch:** `mission/422-real-handler-rls`  
**Source worktree baseline:** protected-main descendant of merged Mission 421  
**Scope:** disposable PostgreSQL staged-RLS rehearsal for synchronization and referral flows; no production database, provider account, customer data, Railway service, native build, or store operation was used.

## Verdict

**CONDITIONAL PASS for the bounded staged-RLS rehearsal.** The requested three-user synchronization/referral real-handler evidence is now PASS on a fresh disposable PostgreSQL 16 database, using a non-superuser, non-`BYPASSRLS` runtime role and synthetic users only. This is not a production certification: the staged SQL remains an explicit security artifact, the production runtime role and grants were not inspected or changed, and the complete API route family is not yet certified under staged RLS.

## Implementation delivered

1. `sync.ts` continues to use one verified outer identity transaction for a request batch. Mutation claims and diary writes execute on the supplied executor; nested pooled transaction boundaries were removed.
2. Referral summary, redemption, qualification, and activation database phases use the transaction-scoped identity adapter.
3. Referral activation has an explicit `CALORA_REFERRAL_DURABILITY_MODE=staged` path. Each redemption side (`referred`, `referrer`) is claimed in a short transaction, represented by a durable attempt key and five-minute lease, and committed before the RevenueCat call. Provider success and retryable failure are recorded in separate short transactions. A stale processing lease is reclaimable and marked for reconciliation.
4. Staged promotional calls pass the durable attempt key as `Idempotency-Key`. The existing legacy path remains the default until the staged schema and production rollout are separately approved.
5. The staged RLS artifact now covers the capture tables needed by sync qualification and models referral-code discovery as intentionally shareable while keeping redemptions tenant-scoped.
6. `0023_referral_reward_attempts.sql` is under `artifacts/security/mission-422/migrations/` and is deliberately **not** in the normal auto-applied migration directory.

## Disposable database evidence

A uniquely named local PostgreSQL 16 database was created from an empty target and bootstrapped with the reviewed Calora baseline. The Mission 417 staged RLS artifact and the Mission 422 reward-attempt artifact were then applied only to that disposable database.

The application runtime connected as `calora_api_runtime_rls`. Direct catalog evidence recorded:

```text
current_user          = calora_api_runtime_rls
rolsuper              = f
rolbypassrls          = f
```

The disposable identity secret and passwords were synthetic. They were not copied to the repository or exposed in this report. The evidence-reader role was separate and disposable; it was granted bypass for inspection only and was not the application runtime role.

Direct RLS smoke checks passed:

- User A could create and read User A’s diary row.
- A pool checkout without an identity token saw zero diary rows.
- User B saw zero of User A’s diary rows.
- A forged/invalid assertion saw zero users.
- The runtime role remained non-superuser and non-bypass-RLS.

## Real-handler rehearsal

Test file: `artifacts/api-server/src/__tests__/mission422-real-handler-rls.integration.test.ts`

The rehearsal used three synthetic users:

- A: referral-code owner
- B: independent redeemer used to prove shared-code discovery and tenant-scoped summary
- C: capture-backed referred user used for sync and activation

The genuine Express handlers exercised were `/v1/referral`, `/v1/referral/redeem`, `/v1/sync`, `/v1/referral/activate`, and `/v1/diary`. Results:

```text
Test Files: 1 passed
Tests:      2 passed
```

Assertions included:

- A’s invite code was discoverable by B without exposing B to A’s redemption summary.
- C’s capture-backed sync mutation was accepted and persisted.
- Activation returned `rewarded` and invoked the mocked provider twice with durable UUID idempotency keys.
- Evidence rows for both `referred` and `referrer` sides ended in `granted`.
- A later activation replay issued no additional provider grants.
- A could not read C’s diary entry.

The provider calls in this handler rehearsal were mocked to prevent any real credit or subscription change. Separate loopback provider-emulator tests covered the HTTP helper contract.

## Provider-emulator evidence

Test files: `revenuecat-emulator.test.ts`, `revenuecat.test.ts`

```text
Test Files: 2 passed
Tests:      19 passed
```

The loopback emulator verified successful grant forwarding with `Idempotency-Key`, bounded upstream failure propagation, and malformed subscriber-response rejection. Existing origin-safety tests continued to reject arbitrary HTTP/remote origins; HTTP is permitted only with an explicit test-only emulator flag, while production remains HTTPS-only.

## Regression matrix

| Validation | Result |
|---|---:|
| Focused sync/referral unit suites | 37/37 passed |
| API offline suite | 564/564 passed across 47 files |
| Existing real PostgreSQL integration suite | 43/43 passed across 10 files |
| Mission 422 staged-RLS real-handler rehearsal | 2/2 passed |
| RevenueCat/provider tests including emulator | 19/19 passed |
| Mission 417 security contracts | 3/3 passed |
| API TypeScript check | passed |
| Database package TypeScript check | passed |
| API production artifact build | passed; final release label `calora-api-a6d672224780-20261108134941422` |

The first full integration attempt reported one pre-existing harness prerequisite failure because `artifacts/api-server/dist` had not yet been built. After building the API artifact, the complete suite passed 43/43; no product failure was hidden or suppressed.

## Security boundaries and remaining blockers

This report does not claim that production is staged-RLS certified. No production database URL, Railway service, environment variable, role grant, secret, provider account, customer record, RevenueCat entitlement, deployment, or native artifact was touched.

The staged artifact currently provides evidence for sync, referral, diary isolation, capture-backed qualification, and the referral grant state machine. CAL-15 remains **BLOCKED** for launch certification because saved meals/recipes, weight/activity, full Coach persistence, live entitlement lifecycle, admin/service/worker paths, production role migration, and production deployment evidence remain outside this rehearsal. The staged migration also remains a design artifact pending owner approval and a separately reviewed production migration plan.

## Recommended next action

Review and approve the staged referral-attempt schema and provider idempotency contract. Then run a separate bounded mission for the remaining route families under a disposable non-bypass-RLS runtime role before considering any production role migration. Production deployment, migration, or live RevenueCat grant requires a new explicit authorization.
