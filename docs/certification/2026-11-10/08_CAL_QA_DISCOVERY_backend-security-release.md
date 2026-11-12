# CAL-QA Discovery — `backend-security-release`

- **Assessment date:** 2026-11-10
- **Repository:** `/tmp/calora-m417-main`
- **Inspected SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
- **Framework:** `/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt`
- **Method:** Read-only inspection of source, tests, workflows, migrations, local reports, and prior evidence. No tests, builds, deployments, provider mutations, database operations, or native builds were run.
- **Cluster verdict:** **BLOCKED**

## Executive summary

The current source contains meaningful backend security and release-control implementation: bearer-token verification, account-scoped route queries, fail-closed rate limiting, redacted error paths, account-deletion fences, release-attestation fields, source/database provenance checks, release-validation workflow gates, and bounded disposable non-`BYPASSRLS` rehearsal evidence recorded in prior reports.

This is not sufficient for certification at the inspected SHA. Required production and current-artifact evidence is missing or contradictory. In particular, the repository contains only three Supabase migration files at this checkout, while prior reports refer to a larger managed-PostgreSQL migration history; production roles/grants and the actual serving migration state were not independently verified. The real tenant-isolation integration suite is opt-in and skipped unless `CALORA_RUN_DB_INTEGRATION_TESTS=true` with a reachable `DATABASE_URL`. No test was executed during this inspection.

The strongest direct release contradiction is between `docs/certification/2026-11-09/64_MISSION_430_RELEASE_COMPLETION.md`, which reports a deployed release at merge SHA `1f32f51f...`, and `docs/production/TASK_503_CURRENT_RELEASE_REATTESTATION_REPORT.md`, which reports **BLOCKED** because validated source, trusted build, and live runtime do not match. Neither report is evidence that the currently inspected SHA `7a56ffb7...` is the serving production revision. The 2026-11-09 report also states that GitHub branch protections and the repository ruleset were intentionally removed, so automated merge blocking is no longer a current control.

## Mission classifications

| Framework mission | Classification | Basis at inspected SHA |
|---|---|---|
| **CAL-QA-20 — data CRUD, integrity, persistence, isolation, synchronization, recovery** | **BLOCKED** | Source and bounded tests cover account-scoped writes, sync idempotency, deletion fences, and some disposable tenant scenarios. Full current database-backed route coverage, production role/grant state, cross-device production behavior, and recovery are not proven. |
| **CAL-QA-21 — API, Supabase, Railway, providers, caching/retries, deployment health and recovery** | **BLOCKED** | API source/offline contracts and release workflow are present, and historical Railway health/deployment checks exist. Current serving SHA, production configuration, migration state, observability, provider state, and production recovery/RPO/RTO are not independently established at this SHA. |
| **CAL-QA-22 — application-wide security and privacy** | **BLOCKED** | Bounded source/unit and disposable non-`BYPASSRLS` evidence exists, including auth boundaries, redaction, rate limits, Coach controls, and selected real-handler isolation. Required API-wide adversarial coverage, production roles/migrations, service/worker identities, provider/commercial paths, and current production attestation remain absent. |
| **CAL-QA-24 — build/release configuration, signing, environment separation, metadata, compliance and deployment controls** | **BLOCKED** | Release workflow and release-attestation contracts are source-visible, but current native signed candidates, current artifact-to-source-to-serving identity, provider-signed release evidence, and protected production release controls are not proven. Branch protections/rulesets were reported removed. |
| **CAL-QA-25 — whole-app production readiness** | **BLOCKED** | The framework requires all prerequisite security, recovery, provider, native, billing, and serving evidence to remain current. The cited reports explicitly retain unresolved tenant-isolation, recovery, native, commercial, privacy, and provenance blockers. |

No mission is classified VERIFIED. No new defect was reproduced because execution was explicitly read-only and tests/builds were not run. Existing unresolved gaps are certification blockers rather than newly executed failures. Historical evidence tied to another SHA is treated as **OUTDATED for current certification**, not as current proof.

## Evidence inspected

### Framework acceptance rules

`/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt:120-138` defines CAL-QA-21 through CAL-QA-25. It requires genuine execution and says a mission with required unexecuted evidence is blocked; compilation, mocked responses, healthy endpoints, or queued builds cannot substitute for user/provider/production proof. CAL-QA-22 specifically requires adversarial tenant-isolation, escalation, injection, session-abuse, entitlement, prompt-injection, and secret testing in authorized environments. CAL-QA-24 requires current artifact identity, signing, environment separation, and deployment traceability. CAL-QA-25 requires all prerequisite evidence to remain current.

### Source and test controls

- `artifacts/api-server/src/__tests__/tenant-isolation.integration.test.ts:1-19,44-48` documents real managed-PostgreSQL intent but mocks Supabase token verification and skips the suite unless `CALORA_RUN_DB_INTEGRATION_TESTS=true` and a non-empty `DATABASE_URL` are supplied. The tests cover diary, profile, sync, and capture-session ownership at `:80-248`, but they were not run here.
- `artifacts/api-server/src/__tests__/db-integration-gate.ts:1-16` confirms database-backed suites are opt-in and perform no network I/O during collection.
- `artifacts/api-server/src/lib/recipe-media.ts:303-483` applies `owner_external_id` predicates to recipe-media operations. `supabase/migrations/20260923220000_create_recipe_media.sql:37-41` enables RLS and revokes table access from `anon` and `authenticated`; it does not itself prove the production role, policy, or executor configuration.
- `artifacts/api-server/src/lib/release-attestation.ts:1-52` defines compiled commit/tree/digest/build/release identity fields and validates an attestation shape. This is a source contract, not proof that a current production binary was built with those values.
- `.github/workflows/release-validation.yml:40-43,56-62,104-127,129-152,154-200` defines source-provenance, required-check audit, release-attestation fixture tests, typecheck, complete offline tests, production artifact builds, and same-SHA validation-gate attestations. The workflow uses deterministic invalid/loopback provider values for offline testing (`:112-127`); it does not establish live provider or production evidence.

### Security and tenant-boundary reports

- `docs/certification/2026-11-07/10_SECURITY_PRIVACY_COMPLIANCE_REPORT.md:3-8` records source-level controls but says the customer-data boundary, production roles/grants, storage policy, migration state, observability, and restore controls were not reverified.
- `docs/certification/2026-11-07/02_AUTHORITATIVE_CERTIFICATION_REGISTER.md:25-28` classifies application auth/rate-limit/readiness as bounded PASS but customer-data isolation, live deployment/roles/observability, and recovery as BLOCKED. At `:55-73`, the addenda explicitly limit staged-RLS evidence to bounded disposable coverage and retain blockers for remaining route families, production role/migration state, service identities, recovery, and native/provider gates.
- `docs/certification/2026-11-08/54_MISSION_428_CALORA_FINAL_AUTONOMOUS_LAUNCH_COMPLETION.md:10-15,49-71` says the release is **NOT READY** and names production tenant-boundary attestation, complete non-`BYPASSRLS` coverage, current signed Android/iOS acceptance, live subscription lifecycle, production recovery, and service-identity rehearsal as unresolved.
- `docs/certification/2026-11-08/50_MISSION_424_PRODUCTION_BACKUP_RECOVERY_CERTIFICATION.md:9-12,42-67,91-102,117-143` records synthetic encrypted backup/restore success but says production custody, retention, restore, Auth/Storage/RevenueCat/Railway reconciliation, and measured production RPO/RTO remain unverified and CAL-17 remains blocked.

### Release and serving-provenance contradiction

- `docs/certification/2026-11-09/64_MISSION_430_RELEASE_COMPLETION.md:8-10,34-47,51-66` claims a deployed release, with merge SHA `1f32f51f2713425084c0fcfb81effc0ddd7bc15e`, three Railway deployment IDs, and successful health checks. It is not the inspected SHA and is not independently revalidated here.
- The same report states at `:24-32,68-73` that GitHub branch protections and the repository ruleset were removed per owner authorization, and that future missions must run checks explicitly because merge blocking is no longer enforced.
- `docs/production/TASK_503_CURRENT_RELEASE_REATTESTATION_REPORT.md:3-9,34-72` independently reports **BLOCKED**, with validated source `65fa97c...` and live runtime `0dd2f5a...` mismatching in commit, tree, and digest, and no trusted manifest/signature/deployment identity bridging the difference.
- That report’s validation table (`:97-108`) records tests and typechecks passing but production provenance failing closed without protected inputs. Its final recommendation (`:134-149`) is to keep production deny-all and require a new independent re-attestation proving `source = trusted build = live runtime`.

## Missing evidence and release blockers

1. **Current serving provenance:** No authoritative record ties SHA `7a56ffb7...` to the currently serving API/app artifacts, deployment IDs, build digests, and `/api/version` identity.
2. **Production database boundary:** No current, independently reviewed production role/grant, migration-journal, RLS/policy, storage-policy, or service-identity attestation was available at this SHA.
3. **Complete tenant isolation:** The opt-in real-schema suite is not proof until executed against the current reviewed schema and runtime role. Existing disposable rehearsal evidence covers only selected route families; recipes/media, saved content, planner/wellness, Coach persistence, admin/service/worker, and deletion-worker paths remain incomplete in cited reports.
4. **Production recovery:** No inspected production backup artifact/retention record, restore rehearsal, private-media/Auth/provider reconciliation, or measured RPO/RTO.
5. **Native release evidence:** No current signed Android candidate installed and tested on the authorized Samsung Galaxy S20, and no current signed iOS/TestFlight acceptance evidence. No native build was started.
6. **Provider/commercial evidence:** No current live or provider-approved RevenueCat lifecycle proof (purchase, renewal, cancellation, expiration, refund/revocation, restore, cross-device), webhook production evidence, or external provider-state recovery evidence.
7. **Release-control integrity:** Current source workflow is detailed, but historical evidence says branch protections/rulesets were removed; no current protected release-control attestation was inspected.
8. **Privacy/compliance operations:** No current legal/store Data Safety/App Privacy, deletion fulfillment, support mailbox, or production privacy operational evidence was inspected.

## Safe conclusion

The appropriate current disposition is **BLOCKED / NO-GO for backend-security-release certification**. The source and test contracts support bounded **PARTIAL** engineering confidence, but they cannot be promoted to VERIFIED without current execution and production/provider evidence. Do not infer certification from historical green suites, source-only controls, mocked token verification, a healthy endpoint, or the 2026-11-09 deployment report. The next authorized evidence package must re-attest the exact SHA, build artifact, serving runtime, production database role/migration state, API-wide non-`BYPASSRLS` isolation, recovery controls, and required native/provider gates.
