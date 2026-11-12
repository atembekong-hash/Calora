# CAL-QA Discovery — integrations-commercial-data

**Assessment date:** 2026-11-10
**Repository:** `/tmp/calora-m417-main`
**Audited source SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
**Scope:** Read-only inspection of source, tests, reports, workflows, and local evidence. No source, database, provider, deployment, build, native artifact, or production state was changed. No native build was started.

## Cluster disposition

**Overall: PARTIAL / BLOCKED for full certification.**

The current source contains meaningful controls for Apple Health/Health Connect normalization, account-scoped local state, RevenueCat identity safety, server-side entitlement reads, webhook authentication/idempotency/order handling, and diary synchronization. However, the evidence required by the framework is not complete at this SHA: no current native Android/iOS provider run, no current App Store/Google Play transaction lifecycle, no production RevenueCat webhook/migration/serving evidence, and no fresh database-backed integration execution from this read-only audit are available. Historical reports are retained as bounded evidence only when their source/artifact/environment differs from the current SHA.

Framework mission mapping:

| Mission | Classification | Summary |
|---|---|---|
| CAL-QA-16 — Apple Health and Android health integrations | **PARTIAL** | Android and iOS adapters plus deterministic tests cover normalization, permission states, missing-vs-zero semantics, local-day/history ranges, and account-scoped use. Native permissions, real records, revocation, disconnect, restart/resume, and device/provider reconciliation remain unexecuted. |
| CAL-QA-19 — RevenueCat subscription lifecycle | **BLOCKED** | Client/server source and emulator/unit/webhook tests provide bounded implementation evidence, but the required provider-approved sandbox/store lifecycle is absent: purchase, restore, renewal, expiry, billing failure/grace, refund/revocation, cross-device, account switching, and full premium-gate denial are not currently proven. |
| CAL-QA-20 — data CRUD, integrity, persistence, synchronization | **PARTIAL** | Client outbox/saved-state synchronization is account-scoped, retryable, idempotent, and tombstone-aware in source/tests; server route tests and real-DB suites exist. Current database-backed execution is gated by `DATABASE_URL`/`CALORA_RUN_DB_INTEGRATION_TESTS` and was not run in this audit, so cross-device and production persistence are not certified. |
| CAL-QA-21 — API, Supabase, Railway, food/AI providers, caching, retries, background operations, deployment health/recovery | **PARTIAL / BLOCKED** | API/provider boundaries have source and disposable/emulator evidence, including RevenueCat webhook and timeout/error contracts. Production serving SHA, Railway state, provider configuration, live webhook delivery, migration/grants, observability, cost/performance, and recovery evidence are missing. |

## Evidence reviewed

### CAL-QA-16 — Health integrations

**Implementation evidence:**

- `artifacts/calora/lib/health/healthService.android.ts` requests Steps, ActiveCaloriesBurned, ExerciseSession, and Weight read permissions; distinguishes empty `dataOrigins`/missing data from a measured zero; validates aggregate values; reads current-day, seven-day, 60-day trend, and hourly data; and returns workouts/weights.
- `artifacts/calora/lib/health/healthService.ios.ts` requests HealthKit read identifiers for steps, active energy, body mass, and workouts; uses local-day/history filters; requests kcal explicitly for active energy; validates quantities; and maps HealthKit statistics, workouts, and weight.
- `artifacts/calora/lib/healthConnection.ts` normalizes provider/authorization/grants/snapshots and prevents a newly signed-in account from consuming device-wide provider permission until that account has explicitly connected.
- `artifacts/calora/lib/health/healthService.web.ts` deliberately reports health as unavailable on web rather than faking support.

**Deterministic test evidence:**

- `artifacts/calora/lib/__tests__/healthConnection.test.ts` covers legacy metadata rejection, provider metadata, measured zero, malformed persisted snapshots/history, partial Android authorization categories, and account-scoped provider probing.
- `artifacts/calora/lib/__tests__/healthDayAndBurnedStatus.test.ts` covers local-day ranges, Android/iOS range parity, kcal units, missing-vs-zero active calories and steps, HealthKit authorization states, DST boundary behavior, and truthful dashboard states.
- `artifacts/calora/lib/__tests__/healthWeekHistory.test.ts` covers seven-day ranges, provider gaps, measured zeros, malformed history, 60-day trend axes, and real hourly readings.
- `artifacts/calora/lib/__tests__/liveStepTrackingLifecycle.integration.test.tsx` is a mocked/jsdom lifecycle suite for foreground pedometer behavior, background removal, account state, and denial/recovery paths; it is not native HealthKit/Health Connect execution.
- `artifacts/calora/tests/device/health-burned-authorization-validation.md` explicitly states that it contains **no asserted physical result** and requires a signed disposable Android device with Health Connect and an iOS device with Apple Health. It specifically requires deny/partial/revoke, empty-record, measured-zero, positive-record, local-midnight, relaunch/resume, and disconnect evidence.

**Missing evidence and status:**

No signed Android/iOS candidate, physical device, Health Connect grant, Apple Health grant, real provider record, provider revocation, OS-settings recovery, disconnect observation, or foreground/relaunch synchronization result is present for SHA `7a56ffb7...`. Background health delivery is not claimed by the source; the device procedure says refresh is foreground/manual only. Therefore CAL-QA-16 cannot be VERIFIED; it is **PARTIAL** pending the device matrix.

### CAL-QA-19 — RevenueCat lifecycle and commercial access

**Implementation evidence:**

- `artifacts/calora/lib/revenuecat.tsx` selects platform/test public keys, configures the SDK once, serializes identity readiness, gates customer-info reads and financial actions until identity synchronization, refreshes on app activation, and consumes customer-info callbacks.
- `artifacts/calora/lib/revenuecatBilling.ts` requires exact signed-in-account identity, fails closed before purchase/restore when identity is stale or pending, checks the exact `caloraapp_pro` entitlement, validates management URLs, and supplies platform fallbacks.
- `artifacts/calora/lib/revenuecatIdentity.ts` serializes login/logout transitions and rejects stale completions.
- `artifacts/api-server/src/lib/revenuecat.ts` separates entitlement-read and server-secret credentials, applies bounded provider timeouts, fails closed on configuration/upstream uncertainty, and supports verified customer deletion.
- `artifacts/api-server/src/routes/revenuecatWebhook.ts` authenticates the raw body with HMAC/timestamp checks or configured authorization fallback, deduplicates event IDs, dead-letters unknown users, maps lifecycle states, and suppresses older event timestamps.
- `artifacts/security/mission-429/migrations/0021_revenuecat_webhook_lifecycle.sql` is a deliberately non-auto-applied migration artifact, not evidence that the production schema contains the webhook ledger/order column.

**Tests and bounded evidence:**

- `artifacts/calora/lib/__tests__/revenuecatBilling.test.ts`, `revenuecatIdentity.test.ts`, and `revenuecatProvider.test.tsx` cover identity races, fail-closed purchase/restore, entitlement recognition, management URL safety, purchase/restore callbacks, app-resume refresh, and SDK updates using mocked SDK behavior.
- `artifacts/api-server/src/__tests__/revenuecat.test.ts` covers credential separation, safe loopback test-origin restrictions, fail-closed entitlement lookup, timeout/provider error handling, promotional idempotency, and deletion verification.
- `artifacts/api-server/src/__tests__/revenuecatWebhook.test.ts` covers signed initial purchase, invalid signatures, duplicates, cancellation/expiration ordering semantics, and malformed JSON.
- `artifacts/api-server/src/__tests__/revenuecat-emulator.test.ts` exercises a loopback disposable provider for success, synthetic upstream failure, malformed output, and idempotency-key forwarding.
- `artifacts/api-server/src/__tests__/revenuecat-webhook.integration.test.ts` is explicitly `skipIf(!enabled)` and requires a configured database; it is not current production evidence.
- `docs/certification/2026-11-08/61_MISSION_429_REVENUECAT_WEBHOOK_LIFECYCLE.md` records historical bounded evidence of 5/5 webhook unit tests and 2/2 disposable PostgreSQL rehearsal cases at an earlier baseline, while explicitly stating that production migration, webhook secret/endpoint, provider delivery, and signed Android/iOS validation remain required.
- `docs/certification/2026-11-07/areas/08-commercial.md` records the prior commercial result as not ready for full US launch: real store purchase, restore, renewal, expiry, grace/billing retry, refund/revocation, cross-device restore, account switch, full paid-feature denial, console state, and native accessibility were not proven. That report is not upgraded to current-SHA proof.

**Missing evidence and status:**

There is no current authorized App Store/Google Play or RevenueCat Test Store transaction evidence at this SHA. No purchase, active restore, trial/pricing verification, renewal, expiration, cancellation, billing failure/grace, refund/revocation, cross-device restore, account switch, or complete marketed-Pro denial-after-loss matrix was run. No production webhook delivery, migration application, production secret configuration, or serving provenance was inspected. CAL-QA-19 is **BLOCKED** for certification. The source-level implementation is not itself a verified defect, but historical paid-feature enforcement failure remains an unresolved launch risk until a current feature inventory and post-loss run proves coverage.

### CAL-QA-20 — Data persistence, integrity, and synchronization

**Implementation evidence:**

- `artifacts/calora/lib/diarySync.ts` uses encrypted/account-scoped sync bookkeeping, persisted signatures and tombstones, idempotent mutation keys, permanent conflict retirement, bounded transient retries, account-scope generation fencing, and restart-safe replay behavior.
- `artifacts/calora/hooks/useDiarySync.ts` scopes synchronization to the authenticated account/session, detects in-flight diary changes, schedules bounded reconnect retries, and avoids presenting permanently rejected mutations as fully synchronized.
- `artifacts/calora/lib/savedStateSync.ts` uses account-specific tombstones, validates the current session before network requests, merges remote/local saved meals and recipes, and retries deferred writes through `useSavedStateSync.ts`.
- `artifacts/api-server/src/routes/sync.ts` validates payloads, binds writes to verified identity, supports idempotent diary upsert/delete, and fences account deletion. `artifacts/api-server/src/__tests__/sync.test.ts` covers auth, validation, idempotency, deletion, conflicts, mixed batches, and fence behavior.

**Integration and isolation evidence:**

- `artifacts/api-server/src/__tests__/sync.integration.test.ts` is real-schema evidence for duplicate-safe upsert/mutation replay, delete replay, and capture approval, but is explicitly skipped without database integration configuration.
- `artifacts/api-server/src/__tests__/tenant-isolation.integration.test.ts` is real PostgreSQL tenant-isolation evidence for diary/profile/sync/capture ownership, but is also explicitly skipped when database integration is disabled.
- `artifacts/calora/lib/__tests__/diarySync.test.ts` provides extensive mocked-storage/outbox evidence for encrypted state migration, account switching, deletion cleanup, permanent conflicts, transient retry quarantine, and restart retry.
- Prior reports, including `docs/certification/2026-11-08/49_MISSION_423_COMPLETE_API_SECURITY_INTEGRATION.md`, record disposable PostgreSQL results but also state that current all-route staged-RLS/production integration remained conditional and that the environment was not production.

**Missing evidence and status:**

The current audit did not run tests, did not have authorization to create/mutate a database, and did not have fresh database-backed results tied to SHA `7a56ffb...`. The integration tests themselves require `DATABASE_URL`/the database integration gate. No two-device native sync, reinstall/restart persistence, concurrent/interrupted write run, current production row verification, or current Railway serving-SHA comparison was performed. CAL-QA-20 is **PARTIAL**, not VERIFIED.

### CAL-QA-21 — API/provider/deployment and recovery operations

**Positive source and disposable evidence:**

- API routes and provider helpers use verified bearer identity, bounded provider requests/timeouts, fail-closed error handling, and explicit retry/idempotency contracts. Representative files are `artifacts/api-server/src/lib/revenuecat.ts`, `artifacts/api-server/src/routes/revenuecatWebhook.ts`, `artifacts/api-server/src/routes/sync.ts`, and their focused tests.
- `docs/certification/2026-11-08/61_MISSION_429_REVENUECAT_WEBHOOK_LIFECYCLE.md` records an earlier complete API offline result of 569 passed/57 skipped across 62 files, plus TypeScript checks and disposable PostgreSQL webhook rehearsal. This is historical bounded evidence, not a fresh run at the requested SHA.
- `.github/workflows/database-integration-postgres.yml` and `.github/workflows/release-validation.yml` define repository controls for disposable PostgreSQL integrations, migration/build checks, typecheck, tests, provenance, and release validation.

**Missing evidence and status:**

No current Railway serving SHA, deployment health, production environment configuration, Supabase state, provider credentials/configuration, production webhook delivery, migration/grant application, live alerting/observability, cost/performance measurement, or recovery drill was inspected or executed. The framework requires production/provider evidence for API/integration certification and forbids treating healthy endpoints, mocks, compilation, or queued artifacts as proof of user success. CAL-QA-21 is **PARTIAL / BLOCKED** pending authorized staging/production-provenance and provider evidence.

## Classification notes

- **VERIFIED:** No cluster mission reaches full VERIFIED status because each has a required unexecuted native, provider, database, or production evidence category.
- **PARTIAL:** CAL-QA-16 and CAL-QA-20 have substantial current source and deterministic test support, but incomplete execution coverage.
- **BLOCKED:** CAL-QA-19 is blocked by absent store/provider lifecycle evidence; CAL-QA-21 is blocked for production/provider/deployment certification.
- **DEFECT:** No new defect was reproduced in this read-only inspection. The historical commercial report’s failed marketed-Pro enforcement is a material unresolved risk, but current source changes mean it should not be reasserted as a current code defect without a feature-by-feature retest.
- **OUTDATED:** Earlier reports use earlier baselines (for example, `9e7790c...` in the 2026-11-07 commercial area and pre-429 state in the 2026-11-08 reports); they are historical/bounded and cannot certify SHA `7a56ffb...` without equivalence/provenance.
- **UNVERIFIED:** Native provider/store behavior, current production webhook/migration state, production serving provenance, current live entitlement lifecycle, and current database-backed integration execution remain unverified.

## Required next evidence

1. Run the documented signed Android Galaxy S20 Health Connect matrix and symmetric signed iOS Apple Health matrix against an artifact built from this exact SHA; capture only sanitized grant/state/status evidence.
2. Use authorized disposable Test Store identities on both platforms to exercise product/trial, purchase, cancel, renewal, expiration, billing issue/grace, restore, refund/revocation, resubscription, cross-device, account switch, and every marketed Pro gate.
3. Review/apply the RevenueCat webhook migration only with explicit owner authorization; configure production endpoint/signing secret through the protected mechanism; verify provider delivery and monotonic/duplicate behavior without changing real customer entitlements.
4. Execute the gated disposable PostgreSQL suites (`sync.integration.test.ts`, `tenant-isolation.integration.test.ts`, `revenuecat-webhook.integration.test.ts`) against a protected synthetic database and retain SHA/build/database provenance.
5. Establish current Railway serving SHA, Supabase schema/migration state, provider configuration, monitoring/alerting, and recovery evidence. Do not use production customer data or perform live financial mutations.

**Final cluster verdict:** **PARTIAL / BLOCKED — not certified for production or full US commercial launch at `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`.**
