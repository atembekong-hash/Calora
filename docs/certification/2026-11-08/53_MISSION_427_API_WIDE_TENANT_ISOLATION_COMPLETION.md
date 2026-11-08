# Mission 427 — Diary First-Log Identity Hardening

**Assessment date:** 2026-11-08
**Mission branch:** `mission/427-api-wide-tenant-isolation`
**Protected-main baseline:** `597421cff52859b90717f7d51eb9cc68f834a676`
**Scope:** bounded correction of the authenticated Diary first-log/capture-provenance path; no production database, deployment, provider, native build, store, or customer-data operation.

## Verdict

**CONDITIONAL PASS for the Diary first-log family; CAL-15 remains BLOCKED.**

The first-log path now runs user resolution, account-deletion fencing, existing-entry detection, capture-session ownership/replay/age checks, candidate nutrition validation, single-use session claiming, image-evidence normalization, and diary insertion through one `withVerifiedDatabaseIdentity` callback. In staged-RLS mode this gives the entire path one signed transaction-scoped identity and removes the former nested pooled transaction. Legacy mode retains the existing database executor behavior.

This is not API-wide tenant-isolation certification. Coach persistence, recipes/media, weight/activity, remaining capture branches, service/admin/worker identities, production role migration, and live provider lifecycle evidence remain outside this bounded correction.

Per mission boundary, `release/calora-production` was not modified, Railway was not deployed, and no EAS/OTA/native/store action was initiated.

## Implementation

### Corrected source

- `artifacts/api-server/src/routes/diary.ts`
  - Removed the first-log route's direct pooled/legacy `db` access.
  - Removed the route-local user creation helper in favor of the shared executor-aware `ensureUserRow`.
  - Wrapped the complete first-log flow in `withVerifiedDatabaseIdentity`.
  - Replaced the nested `database.transaction(...)` mutation claim with updates and inserts on the already verified outer executor.
  - Preserved all existing rejection messages and image-evidence behavior.
  - Early validation outcomes are returned as typed transaction results so no HTTP response is emitted from inside the transaction callback.

- `artifacts/api-server/src/__tests__/diary.test.ts`
  - Added a regression assertion that the first-log route does not invoke a nested database transaction.
  - Existing first-log provenance, nutrition-band, stale-session, replay, exact-image, idempotency, and unauthenticated coverage remains intact.

- `artifacts/api-server/src/__tests__/mission422-real-handler-rls.integration.test.ts`
  - Added a fresh synthetic user/session fixture.
  - Added genuine Express-handler coverage for first-log success under staged RLS and rejection when another synthetic user presents the foreign session.

No migration, production configuration, provider state, or customer record was changed.

## Evidence

### Focused and static validation

| Validation | Result |
|---|---:|
| Diary route suite | **32/32 passed** |
| Mission 417 security contracts | **3/3 passed** |
| API TypeScript check | **passed** |
| Complete API offline suite | **561/561 tests across 46 files passed** |
| Existing disposable PostgreSQL integration matrix | **45/45 tests passed across 10 files; 7 tests skipped by existing gates** |
| Existing rolling-restart recovery rehearsal | **BLOCKED: spawned API did not become healthy on its randomized port; reproduced after rebuilding the API artifact and is unrelated to the Diary diff** |
| Diary source boundary audit | No direct pooled `db` reference and no nested `.transaction()` remain in `diary.ts`; all four authenticated persistence branches use `withVerifiedDatabaseIdentity`. |
| `git diff --check` | **passed** |

### Disposable staged-RLS real-handler rehearsal

The existing local PostgreSQL 16 disposable database was used with synthetic users only. The runtime connected as the previously certified non-superuser, non-`BYPASSRLS` staged-RLS role. The identity secret was read only from the disposable local database through peer administration and was not printed, persisted, or committed.

`mission422-real-handler-rls.integration.test.ts` completed:

```text
Test Files: 1 passed
Tests:      4 passed
```

The four tests included referral isolation, the new Diary first-log rehearsal, sync/referral activation isolation, and referral crash-recovery/concurrency evidence. The new first-log test proved:

1. User B can persist a first-log entry anchored by User B's own capture session through the real Express route.
2. User A cannot use User B's capture session; the handler returns the existing 422 provenance rejection rather than creating a Diary row.
3. The operation runs under staged identity enforcement without a nested transaction boundary.

The provider grant function remained mocked in this rehearsal. No RevenueCat credit, subscription, or customer state was changed.

## Remaining route-family status

The Mission 427 inventory identified additional direct or mixed database families. They remain deliberately unmodified in this bounded correction rather than receiving an unsafe partial rewrite:

- Coach V2 saved conversations/settings and Coach Fact Context consent/nonce persistence.
- Recipe, saved-meal, and recipe-media persistence.
- Weight/activity/planner/wellness persistence.
- Remaining capture/session branches and rate-limit paths.
- Account deletion, service-worker, admin, and provider-worker identities.

These require separate executor adapters or explicit service identities and their own real-handler rehearsals. In particular, Coach V2 still uses raw `pg` transaction clients in its persistence helper, while the authoritative identity adapter currently exposes a Drizzle database executor; converting that family safely requires a deliberate adapter design, not a mechanical route edit.

## Certification interpretation

This evidence upgrades only the Diary first-log family from legacy-only source behavior to bounded staged-RLS real-handler evidence. It does **not** alter the authoritative launch verdict. CAL-15 remains **BLOCKED** because API-wide tenant isolation and production role/migration evidence are not established. No production deployment, migration, credential change, native build, store release, live RevenueCat grant, or customer-data query was performed.

## Recommended next correction

Approve a separate Coach persistence adapter mission. It should first define a transaction-compatible raw-query executor contract for `withVerifiedDatabaseIdentity`, then migrate Coach V2 saved-chat/settings operations and add a three-user staged-RLS real-handler rehearsal before touching Coach Fact Context consent/nonce persistence. Keep provider calls outside database transactions and preserve the existing safety and deletion-fence contracts.

## Route-family identity matrix at mission close

| Family | Representative paths / jobs | Current identity path | Mission 427 classification | Next action |
|---|---|---|---|---|
| A | Recipes, saved meals, recipe media | Mixed legacy Drizzle/raw persistence | BLOCKED for staged-RLS real-handler proof | Executor-aware media and saved-content adapter plus three-user rehearsal |
| B | `/v1/coach/v2/*`, Coach Fact Context consent/nonce | Mixed raw `pg` pooled clients and Drizzle helpers | VERIFIED BY SOURCE/UNIT TEST ONLY; staged-RLS proof BLOCKED | Define raw-query executor adapter, then migrate saved-chat/settings and context metadata |
| C | Planner, wellness, fasting, weight, activity, progress | Mixed legacy user-owned database paths | BLOCKED for staged-RLS real-handler proof | Migrate user-owned persistence and test foreign identifiers/bulk reads |
| D | `/v1/diary`, especially `/v1/diary/first-log` | Verified identity executor for ordinary Diary routes and first-log | VERIFIED WITH REAL-HANDLER STAGED RLS for first-log | Extend the same treatment to remaining capture/barcode branches |
| E | Background workers, queues, retries | Explicit service/provider paths mixed with user-owned follow-up work | BLOCKED | Name restricted service identities and prove deleted-user/retry behavior |
| F | Admin/service operations | Privileged/admin authorization paths | INTENTIONALLY EXCLUDED FROM END-USER RLS | Separate service-identity certification; do not force user identity |
| G | Account deletion/privacy cleanup | Deletion fences and asynchronous cleanup | BLOCKED for complete staged-RLS proof | Test cleanup ownership, delayed jobs, and cross-account safety |
| H | Subscription/entitlement persistence | Provider and account-linked persistence | BLOCKED for complete lifecycle proof | Add entitlement tenant tests and live lifecycle evidence under separate authorization |

The matrix is an evidence map, not a claim that the remaining families are defective in every deployment. Source-only or unit evidence is not promoted to staged-RLS or production certification.
