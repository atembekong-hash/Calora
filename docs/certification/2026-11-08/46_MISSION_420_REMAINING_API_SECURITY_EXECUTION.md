# Mission 420 — Remaining API Security Execution

**Date:** 2026-11-08  
**Scope:** Continue the staged transaction-identity rollout from Mission 419 without weakening the fail-closed boundary or changing production.

## Verdict

**CONDITIONAL / NOT READY for full API-wide RLS enforcement.** Mission 420 completed a bounded, production-safe integration for capture-session persistence and approval. The API now routes these account-owned writes through the verified transaction identity abstraction when staged mode is enabled, while preserving legacy compatibility when it is disabled.

The remaining sync and referral paths were not force-integrated in this mission. That is intentional: both combine nested transaction/idempotency claims with cross-account qualification and, for referral activation, external RevenueCat grants. A mechanical replacement of `db` with a scoped executor could create partial claims, provider-grant inconsistency, or nested-transaction regressions. They require dedicated integration work and disposable real-handler tests before production rollout.

## Implemented source changes

- `artifacts/api-server/src/routes/capture.ts`
  - Capture-session and candidate persistence now runs under `withVerifiedDatabaseIdentity`.
  - User-row resolution uses the scoped database executor and transaction state.
  - Legacy mode preserves the prior atomic transaction behavior.
  - Staged mode reuses the verified outer transaction rather than opening a nested transaction.
  - Capture approval now uses the same verified executor and preserves owner-scoped idempotency.
  - Existing account-deletion-fence handling remains intact.
- `scripts/ci/mission-420-api-security-contract.test.mjs`
  - Static contracts require the capture identity integration.
  - Contracts make the remaining sync/referral transaction and provider-grant surfaces explicit.
  - Contracts reject broad privileged fallbacks.

No production migration, environment variable, credential, Railway configuration, database, native build, or store operation was performed.

## Validation evidence

| Check | Result |
|---|---:|
| Workspace library typecheck | PASS |
| API TypeScript validation | PASS |
| Capture route tests | 64 passed |
| Diary route tests | 32 passed |
| Privacy-rights route tests | 3 passed |
| Combined focused tests | **99 passed, 0 failed** |
| Full API offline suite | **561 passed, 0 failed across 46 files** |
| Mission 420 static contracts | PASS |
| `git diff --check` | PASS |
| Production deployment/configuration mutation | None |

The focused route suite was run with a non-routable synthetic database URL only to satisfy import-time configuration; no production database was contacted.

## Remaining integration matrix

| Surface | Mission 420 status | Reason |
|---|---|---|
| Profile | Integrated in Mission 418 | Existing evidence retained |
| Diary | Integrated in Mission 419 | Existing evidence retained |
| Privacy rights | Integrated in Mission 419 | Existing evidence retained |
| Capture sessions / approval | **Integrated in Mission 420** | Focused tests pass |
| Sync | **Remaining** | Outer identity transaction must encompass idempotency claim, capture-session verification, diary write, and deletion fence without nesting |
| Referral summary/redeem | **Remaining** | Multi-account ownership and redemption writes need scoped executor coverage |
| Referral activation | **Remaining / high risk** | Atomic reward claims must be separated from external RevenueCat grants and rollback/retry semantics |
| Coach, recipes, activity, weight, subscriptions | **Remaining** | Route-by-route inventory and disposable real-handler validation required |

## Recommended next bounded mission

1. Integrate sync first using an explicit request-scoped executor passed through `claimDiaryMutation`, capture-session reads, and diary writes.
2. Add a three-user disposable PostgreSQL rehearsal covering owner reads, foreign reads, stale mutation claims, deletion tombstones, and concurrent clients.
3. Integrate referral summary/redeem separately from activation.
4. For referral activation, keep database claim transactions short and outside provider calls; use durable claim/retry state and verify both provider failure and concurrent activation cases.
5. Do not enable staged production RLS until all route families have real-handler evidence and the release owner approves the production migration.

## Certification-register interpretation

This evidence improves the CAL-15 tenant-isolation boundary but does not close it. The authoritative status must remain **BLOCKED / NOT READY** until the remaining authenticated route families and production-role migration are validated.
