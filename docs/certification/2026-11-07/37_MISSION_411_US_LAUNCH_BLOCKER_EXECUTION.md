# Mission 411 — Calora US Launch Blocker Consolidation and Execution

**Assessment date:** 2026-11-07
**Branch:** `mission/410-tenant-isolation-launch-decision`
**Working baseline:** protected-main `b94cdbcf248d2d716ae590646b62a11ff905b0e3`
**Final verdict:** **EXTERNAL APPROVALS OR RESOURCES REQUIRED**

## 1. Executive result

Mission 411 consolidated the 30-control authoritative register, reconciled stale contract evidence, and completed one bounded engineering correction: a real PostgreSQL/HTTP profile ownership regression was added to the existing tenant-isolation harness. The expanded real-handler suite passed **45/45 tests** across 10 integration files. The focused contract/parity/profile/Coach set passed **20/20 tests**.

No cross-account defect was reproduced in the tested application paths. CAL-02's old FAIL was stale: the current OpenAPI contract already removes the orphan privacy export/delete operations, and the legacy Coach route is explicitly documented as terminal 404 with a regression test. CAL-02 is therefore updated to PASS at the tested source baseline.

The remaining mandatory launch work is dominated by external certification resources: signed Android and iOS artifacts/devices, store credentials and processing, live RevenueCat lifecycle evidence, production operational/backup evidence, and owner-controlled reviewer/support operations. No native build, deployment, production migration, credential change, customer-data operation, or merge was authorized or performed.

## 2. Bounded execution budget and actual cost

The mission budget was limited to one focused source/test correction plus evidence consolidation. No experimental RLS redesign, provider integration, native build, production operation, or broad new audit was undertaken.

Actual engineering work:

- 1 integration test file changed.
- 1 new profile ownership scenario added.
- 0 production files, secrets, infrastructure settings, migrations, or customer data changed.
- 0 native builds, APK/AAB/IPA/TestFlight/App Store/Google Play actions.
- 0 production deployments or restarts.
- 0 database migrations applied to Supabase/Railway production.
- 1 bounded source-level contract reconciliation (CAL-02).
- 10 real-handler integration files executed: 45 tests passed.
- 4 focused contract/profile/Coach files executed: 20 tests passed.
- Previously established Mission 410 offline evidence reused: 561/561 API tests passed.

No reliable dollar-level cost accounting is available in this environment; no dollar amount is invented. The bounded work was completed within the existing repository and disposable local PostgreSQL infrastructure.

## 3. Prioritized blocker matrix

Priority meanings: **P0** = demonstrated security/privacy/billing/data-loss/core defect; **P1** = mandatory release evidence or required functionality not certified; **P2** = safe post-launch improvement.

| Priority | Controls | Remaining requirement | Classification | Can Manus close safely now? | Dependency / owner action | Minimum closure evidence |
|---|---|---|---|---|---|---|
| P0 | None | No demonstrated P0 exploit or data-loss defect remains from this mission | No confirmed defect | N/A | Continue monitoring and incident response | Reproducible exploit would be required to open P0 |
| P1 | CAL-03, CAL-22, CAL-23 | Authenticated Coach persistence, active-route provenance, provider/retention/cost/latency and operational proof | Missing runtime/device/production evidence | Not without authorized account and production/provider access | Product, AI Ops, Privacy, QA | Signed-account device flow, route telemetry, retention/cost/latency evidence, deletion proof |
| P1 | CAL-04, CAL-08, CAL-09, CAL-13, CAL-30 | Physical Android/iOS interaction, Health Connect/HealthKit, accessibility, lifecycle, permissions, deletion and purchase-sheet acceptance | Missing device evidence | Not in sandbox | QA and Android/iOS owners; Samsung S20 and Apple test device | Fresh signed binaries, device matrix, screenshots/logs and acceptance checklist |
| P1 | CAL-06, CAL-07 | Fresh signed Android RC Auto Scan recovery and current release artifact | Missing signed artifact/device evidence | No native build authorized | Android Release + QA | Exact signed RC SHA/version, S20 evidence for camera launch, timeout, retry, background/foreground recovery |
| P1 | CAL-10–CAL-12 | iOS signing credentials, signed IPA, ASC/TestFlight processing and tester/device proof | External credentials/artifact | No native build or Apple submission authorized | iOS Release owner | Signing preflight, IPA provenance, ASC processing, TestFlight/device evidence |
| P1 | CAL-15 | Complete real ownership coverage for remaining domains and independent database boundary decision | Test/architecture evidence gap | Partially; profile gap closed in this mission | Backend/DB Security owner | Real HTTP/database matrices for remaining domains; approved RLS/role decision or explicit risk acceptance |
| P1 | CAL-16 | Current production roles, grants, migrations, storage, alerts and observability evidence | Production inspection/owner-controlled evidence | Read-only evidence can be collected; mutation cannot | Platform/DBA | Sanitized role/grant/identity map, alert thresholds, serving SHA, rollback ownership |
| P1 | CAL-17 | Production backup artifact, retention, private recipe-photo restore, Auth/provider-state recovery, measured RPO/RTO | External operational evidence | Not without owner-controlled backup access | SRE/DBA | Encrypted restore drill, object/Auth/provider recovery record, measured RPO/RTO |
| P1 | CAL-20 | Live barcode metadata, authenticated sync, native health, timezone/DST and offline acceptance | Missing live/device evidence | Not fully in sandbox | Nutrition + QA | Signed-device matrix with fixtures and live provider evidence |
| P1 | CAL-25, CAL-26 | Authenticated Plus/provider/media persistence and live recipe generation/review/retry acceptance | Missing provider/live evidence | Limited source tests only | Backend + Recipes + QA | Disposable real DB matrix plus authorized live/provider/device run |
| P1 | CAL-27, CAL-28 | Purchase, restore, renewal, expiration, cancellation, refund, revocation, cross-device restoration | External RevenueCat/store evidence | No live purchase authorization in this mission | Revenue/Payments + QA | Sandbox store receipts and RevenueCat event/entitlement timeline on two devices |
| P1 | CAL-29 | Store metadata/legal finalization, signed build, Data Safety, support mailbox/SLA, reviewer access | External owner/store operations | No | Compliance + Support + Release | Final console screenshots/exports, legal review, test account and support response proof |
| P2 | None newly identified | Improve independent RLS boundary, broaden worker/admin separation and post-launch observability after launch gates | Architecture improvement, not a demonstrated exploit | Defer safely after approved plan | Backend/DB Security + SRE | Approved migration plan, canary, performance and rollback evidence |

### CAL-02 reconciliation

CAL-02 was the only stale FAIL identified during this mission. Current evidence shows:

- `/v1/privacy/export` and `/v1/privacy/delete` are absent from the OpenAPI contract.
- Account deletion is documented through `/v1/account`.
- The legacy `/v1/coach/respond` route is deliberately terminal 404 and is explicitly documented as unavailable.
- `compatibility-contract.test.ts` and `api-contract-parity.test.ts` pass.

The register is updated from FAIL to PASS for the bounded contract-integrity requirement. This does not certify the authenticated Coach runtime or production behavior; those remain CAL-03, CAL-22, and CAL-23 blockers.

## 4. Actual engineering change

The existing tenant-isolation integration harness now mounts the real profile router and verifies:

1. User A saves a durable profile through `PUT /v1/profile`.
2. User B cannot read User A's profile and receives the account-appropriate absence response.
3. User B saves an independent profile.
4. User A still reads User A's original profile values.

The test uses the existing verified-identity boundary mock only to supply deterministic synthetic Supabase identities; it uses real Express handlers, real Drizzle persistence, and disposable PostgreSQL tables. No production code behavior was changed.

No confirmed product defect required a source fix in this bounded mission. The profile scenario closes a documented real-coverage gap; it does not overclaim certification of all account domains.

## 5. Tests added and executed

### New/changed coverage

- `artifacts/api-server/src/__tests__/tenant-isolation.integration.test.ts`
  - Added one real profile ownership scenario.
  - Expanded the existing integration file from 3 to 4 tests.

### Fresh disposable database evidence

- 10 integration files passed.
- **45/45 tests passed.**
- Includes diary, sync, capture persistence, profile ownership, Coach consent, recipe-media persistence, deletion fences, referrals, recovery suppression, and privacy rights.
- Database was disposable and destroyed after the run.

### Focused contract evidence

- `compatibility-contract.test.ts`: 8 passed.
- `api-contract-parity.test.ts`: 2 passed.
- `coach.test.ts`: 3 passed.
- `profile.test.ts`: 7 passed.
- **20/20 tests passed.**

### Reused prior evidence

Mission 410's complete API offline run remains valid and was not unnecessarily repeated: **46 files, 561/561 tests passed** with disposable database and synthetic non-routable AI configuration.

## 6. Android release-candidate requirements

No native build was triggered. The exact next Android certification action requires an owner-authorized fresh signed release candidate; the prior APK cannot be treated as current evidence unless its source SHA and compatibility are proven.

Required Samsung Galaxy S20 evidence:

1. Record package version, version code, source commit, signing provenance, and installation timestamp.
2. Sign in as a test account and verify the Today dashboard opens.
3. Exercise Auto Scan from camera permission through capture, review, retry, approval, and diary persistence.
4. Background/foreground the app during camera initialization and retry after timeout.
5. Verify no crash/ANR marker belongs to Calora.
6. Collect screen dimensions, orientation, permission state, network state, and logcat evidence.
7. Run Health Connect authorization/read/write checks, lifecycle restore, large-font, TalkBack, and deletion checks.
8. Store evidence under a timestamped Windows QA directory and distinguish physical results from sandbox results.

A request to test or certify does not authorize an Android build; a separate instruction must name the exact build or submission.

## 7. iOS release-candidate requirements

No iOS build or submission was triggered. Required owner-controlled evidence includes:

- Current signing preflight and credential identity.
- Signed IPA provenance tied to an approved source SHA.
- ASC upload/processing and TestFlight availability.
- Physical iPhone or approved simulator acceptance.
- HealthKit permissions/data, StoreKit purchase/restore, VoiceOver, Dynamic Type, lifecycle/background recovery, offline behavior, account deletion, and crash evidence.

Static preflight remains PASS but is not a signed-artifact or device PASS.

## 8. RevenueCat and commercial certification

Source-level premium recipe enforcement remains repaired and tested: inactive entitlement returns 403 and provider uncertainty fails closed with 503. The following remain external commercial gates:

- Initial purchase and entitlement activation.
- Restore on the same device and a second device.
- Renewal and entitlement refresh.
- Expiration, cancellation, refund, revocation, and retry behavior.
- RevenueCat webhook/event timeline and app entitlement state.
- Store receipt provenance, legal subscription text, pricing, cancellation instructions, reviewer account, support mailbox, and SLA.

Do not mark CAL-27 or CAL-28 PASS from mocked provider tests alone.

## 9. Disaster recovery requirements

Mission 398–405 evidence remains valid for synthetic recovery rehearsal but does not prove production recovery. Closure requires owner-controlled evidence of encrypted backups, retention, private recipe-photo/object restore, Supabase Auth recovery, RevenueCat/store state recovery, measured RPO/RTO, alerting, and a tested rollback owner. No production backup or customer data was accessed in Mission 411.

## 10. Updated register

The authoritative register is updated in the same change:

- CAL-02: **PASS** for the bounded contract-integrity requirement after current OpenAPI and parity evidence reconciled the old stale FAIL.
- CAL-15: remains **BLOCKED**, now citing 45/45 real-handler integration tests and the added profile ownership scenario while preserving remaining real-coverage and RLS-boundary limitations.
- All Android/iOS/device/store/production controls remain unchanged unless their required evidence already existed; no static evidence was promoted to device or production evidence.
- Overall verdict remains **NOT CERTIFIED — BLOCKED**.

## 11. GitHub and CI

Mission 411 changes are intended for one protected PR. The PR must pass repository-required validation before any merge decision. This mission does not authorize merging. PR #398 and PR #399 remain unmerged. The production release branch remains isolated from protected-main merges.

## 12. Production safety attestation

No Railway deployment, restart, source-branch change, production database migration, role/grant change, environment-variable change, credential change, customer-data read/write, storage change, native Android/iOS build, app-store submission, or protected-branch weakening occurred. Tests used synthetic identities and disposable local PostgreSQL only.

## 13. Exact next steps toward launch

1. Owner authorizes and supplies the exact Android signed RC/device run, then complete the Samsung S20 evidence checklist.
2. iOS owner supplies signing/ASC/TestFlight resources and completes the physical acceptance matrix.
3. Backend closes the remaining bounded real ownership matrix for saved meals/recipes, Coach v2, weight/activity where server-backed, and admin/service paths; do not implement the experimental RLS prototype without a separate approval.
4. Revenue owner runs the RevenueCat/store lifecycle matrix on two devices.
5. SRE/DBA provides production backup, restore, RPO/RTO, roles, grants, alerting, and rollback evidence.
6. Compliance/support finalizes store metadata, legal disclosures, reviewer access, mailbox/SLA, and deletion support.
7. Reconcile the register only when each control has its required evidence; do not convert missing external evidence to PASS.
8. Re-run only the focused regression suites affected by each change, followed by the applicable protected release checks.

## Final verdict

# EXTERNAL APPROVALS OR RESOURCES REQUIRED

The bounded engineering work completed successfully and no P0 defect was demonstrated. Calora is not yet commercially launch-ready because mandatory certification gates still require signed device artifacts, Apple/Google/store resources, live commercial lifecycle evidence, production operations/recovery evidence, and owner-controlled approvals.
