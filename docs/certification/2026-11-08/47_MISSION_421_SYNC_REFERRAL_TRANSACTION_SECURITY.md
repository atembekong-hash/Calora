# Mission 421 — Synchronization and Referral Transaction Security

**Assessment date:** 2026-11-08  
**Source baseline:** protected `main` at `a7d2478eb5c45af360a80423c64a8846188dfccc` (PR #405 merge)  
**Working branch:** `mission/421-sync-referral`  
**Scope:** synchronization, referral summary/redemption, referral activation transaction boundaries, and staged identity compatibility  
**Production safety:** no Railway deployment, release-branch update, production SQL migration, role/grant change, credential change, native build, OTA update, store submission, or live RevenueCat grant was performed.

## Executive verdict

**CONDITIONAL — NOT READY FOR STAGED-RLS CERTIFICATION.**

The synchronization route now uses one verified outer transaction per request. In staged-RLS mode, the transaction-scoped identity assertion is installed by `withVerifiedDatabaseIdentity`; all idempotency claims, capture-session verification, candidate evidence checks, diary writes, capture approval, deletion fences, and final record reads use that same checked-out transaction executor. In legacy mode, the same callback is wrapped in one Drizzle transaction, preserving the existing deployment behavior without nested pooled transactions.

Referral summary, redemption, qualification, and reward-claim database operations now use the verified identity adapter. RevenueCat calls occur only after the corresponding database claim transaction has completed, and claim-release writes occur in a new scoped transaction after provider failure. No database transaction is held across a provider network request.

The work remains conditional because the existing referral schema has no durable provider-attempt/lease state separate from the completion timestamps. A process crash after a claim commit and before RevenueCat completion can leave a claim requiring reconciliation. Adding such state would require a separately authorized schema migration, which Mission 421 expressly forbids. The implementation therefore does not claim complete crash-recovery certification or close CAL-15.

## Exact changed files

- `artifacts/api-server/src/routes/sync.ts`
  - Added `withVerifiedDatabaseIdentity` around the complete sync request operation.
  - Removed nested pooled transaction boundaries around individual upsert/delete mutations.
  - Passed the scoped executor through capture-session, candidate-evidence, diary, tombstone, and response queries.
  - Aborts the outer transaction on non-fence database errors so a batch cannot partially commit.
- `artifacts/api-server/src/routes/referral.ts`
  - Added the `withReferralIdentity` adapter.
  - Scoped summary and redemption reads/writes.
  - Scoped activation qualification, qualification stamping, reward claims, and claim-release writes.
  - RevenueCat calls remain outside all database callbacks.
- `artifacts/api-server/src/lib/referral-qualification.ts`
  - Added an optional scoped executor parameter for qualification reads.
- `artifacts/api-server/src/lib/account-deletion-state.ts`
  - Allowed `assertAccountWritable` to receive either the normal database or a transaction executor.
- `artifacts/api-server/src/lib/user-rows.ts`
  - Allowed user-row lookup/creation to use the same executor union.
- `artifacts/api-server/src/__tests__/sync.test.ts`
  - Updated transaction doubles and added regression expectations for one outer transaction and atomic 503 aborts.
- `artifacts/api-server/src/__tests__/referral.test.ts`
  - Updated qualification assertion to require the scoped executor.
- `docs/certification/2026-11-08/47_MISSION_421_SYNC_REFERRAL_TRANSACTION_SECURITY.md`
  - This report.
- `docs/certification/2026-11-07/02_AUTHORITATIVE_CERTIFICATION_REGISTER.md`
  - CAL-15 addendum below.

## Transaction diagrams

### Synchronization

```text
JWT verification
      |
      v
withVerifiedDatabaseIdentity(user.id)
      |
      +-- staged-RLS: checkout client, BEGIN, set_config(calora.identity_token)
      |                 |
      |                 +-- assert deletion fence + ensure user row
      |                 +-- for each mutation:
      |                 |     validate -> verify capture/session evidence
      |                 |     claim ledger -> diary upsert/delete -> approval
      |                 +-- select owner records
      |                 +-- COMMIT once for the whole request
      |
      +-- legacy: execute the same operation inside one Drizzle transaction
```

A mutation database error is rethrown, causing rollback of the entire request transaction. Account-deletion fence errors are counted and returned as the existing retryable 503 response.

### Referral activation

```text
JWT verification
      |
      +-- scoped transaction: read redemption + deletion fence
      +-- scoped transaction: qualification read
      +-- scoped transaction: qualification stamp (conditional)
      +-- scoped transaction: referred reward claim
      |        COMMIT
      +-- RevenueCat grant (no DB transaction held)
      +-- on provider failure: scoped claim-release transaction
      +-- scoped transaction: referrer reward claim
      |        COMMIT
      +-- RevenueCat grant (no DB transaction held)
      +-- on provider failure: scoped claim-release transaction
```

The claim timestamp remains the current durable idempotency marker. It is not a complete provider-attempt state machine because the existing schema has no separate pending/claimed/completed/error/lease fields.

## Authorization matrix

| Operation | Identity source | Database executor | Cross-account expectation | Status |
|---|---|---|---|---|
| Sync idempotency claim | verified bearer user ID | one outer verified executor | user ID and ownership predicates constrain ledger and diary rows | Implemented; real-RLS evidence pending |
| Capture session/evidence verification during sync | verified bearer user ID plus internal owner row | same sync executor | foreign session/candidate cannot become verified evidence | Implemented; real-RLS evidence pending |
| Sync deletion/tombstone | verified bearer user ID | same sync executor | guessed foreign `client_id` cannot delete foreign row | Implemented; real-RLS evidence pending |
| Referral summary | verified bearer user ID | scoped executor | only caller's code, referrer aggregate, and own redemption | Implemented; real-RLS evidence pending |
| Referral redemption | verified bearer user ID | scoped executor | self-referral and duplicate referred account rejected | Implemented; real-RLS evidence pending |
| Referral qualification | verified bearer user ID | scoped executor | only owner-scoped server capture evidence qualifies | Implemented; real-RLS evidence pending |
| RevenueCat referred grant | server-claimed redemption side, then provider call | no DB transaction during provider call | deleted/anonymized referrer marker is never sent to provider | Implemented; live provider deliberately not exercised |
| RevenueCat referrer grant | server-claimed redemption side, then provider call | no DB transaction during provider call | only non-anonymized stored referrer ID is sent | Implemented; live provider deliberately not exercised |

## Validation evidence

### Passing evidence

- Protected-main provenance check: `origin/main` and the requested baseline resolved to `a7d2478eb5c45af360a80423c64a8846188dfccc` before edits.
- API TypeScript validation: **passed** with `DATABASE_URL` set to an inert local sentinel.
- Focused synchronization and referral unit suites: **37/37 passed**.
- Full API offline suite: **46 files / 561 tests passed** with inert local `DATABASE_URL` and inert local OpenAI configuration placeholders.
- Mission 417 static security contracts: **3/3 passed**.
- Boundary audit: no direct pooled `db.transaction` remains inside mutation handling; the only route-level legacy adapter is the explicit outer transaction fallback. Referral provider calls are outside `withReferralIdentity` callbacks.
- Existing unit coverage continues to exercise duplicate submissions, stale claims, capture evidence downgrade, deletion fences, referral qualification gates, anonymized referrers, and provider-independent idempotency behavior.

### Not executed and not counted as PASS

- Mission 421 disposable PostgreSQL real-handler rehearsal: **BLOCKED**. This sandbox has no `postgres`, `initdb`, Docker runtime, reachable `DATABASE_URL`, or running PostgreSQL server.
- Staged Mission 417 SQL application: **NOT RUN** because there is no disposable database target.
- Three-user cross-account HTTP tests under staged RLS: **NOT RUN**.
- Concurrent pooled-client sync and referral activation under staged RLS: **NOT RUN**.
- Existing `referral-concurrency.integration.test.ts`: **not counted**; it is database-gated and was not run in this sandbox.
- RevenueCat provider failure/timeout/retry against a provider emulator: **NOT RUN**.
- Live RevenueCat grants or customer/subscription changes: **intentionally not performed**.

## Provider failure and retry assessment

The route keeps provider calls outside database transactions and releases the current claim after a returned provider failure, preserving the existing retry-on-next-request behavior. The repository's integration suite contains concurrency and failure scenarios, but those tests require a real database and were not executed here. A network timeout/crash after a committed claim and before a provider result remains an unresolved durability case because the schema lacks an attempt lease or explicit provider completion state. This is a **P1 security/commercial reliability blocker** for complete activation certification, not a reason to add an unapproved migration.

## Remaining blockers and acceptance criteria

1. **Disposable staged-RLS real-handler rehearsal — P0 for CAL-15 closure.** Apply the staged Mission 417 SQL only to a disposable PostgreSQL target; exercise three synthetic users through actual Express handlers. Acceptance: owner reads/writes succeed, foreign reads/writes are denied or empty as policy requires, stale claims and tombstones behave correctly, deletion fences remain fail-closed, concurrent clients do not leak identity, and pooled connections do not retain a prior token.
2. **Referral provider state durability — P1.** Design and separately authorize a migration adding a durable per-side grant state/lease/reconciliation record. Acceptance: crash after claim, provider timeout, retry, duplicate concurrent activation, and reconciliation all converge to exactly one entitlement grant per side without lost rewards or unsafe duplicate extension.
3. **Provider emulator rehearsal — P1.** Use a loopback-only test provider, never live RevenueCat. Acceptance: success, 5xx, timeout, malformed response, retry, and concurrent activation evidence is captured with no open database transaction during network calls.
4. **Complete API route-family staged-RLS coverage — P0 for production certification.** Sync and referral are only two of the remaining route families; saved content, activity/weight/wellness, Coach, entitlement lifecycle, admin, workers, and service identities remain open.
5. **Production role migration — P0 for production certification.** Current API runtime role remains `BYPASSRLS = true`; no production role/grant change was authorized or performed.

## CAL-15 status

**BLOCKED / CONDITIONAL PROGRESS.** Mission 421 materially reduces the scoped-transaction gap for synchronization and referral paths and passes source-level/offline regression evidence. It does not establish staged-RLS real-handler proof, complete API coverage, durable RevenueCat crash recovery, or production least-privilege role migration. CAL-15 remains open.

## Owner approvals required for next mission

- Provide or authorize a disposable PostgreSQL runtime/connection for the staged real-handler rehearsal.
- Separately authorize any schema migration required for durable RevenueCat grant state.
- Separately authorize production RLS/role/grant migration after all route-family evidence is complete.
- No native, store, Railway, production database, or live RevenueCat authorization is implied by this report.
