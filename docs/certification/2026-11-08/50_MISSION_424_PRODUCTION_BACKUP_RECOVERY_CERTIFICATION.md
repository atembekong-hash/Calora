# Mission 424 — Calora Production Backup, Recovery and Disaster Readiness Certification

**Date:** 2026-11-08  
**Scope:** Production-inert recovery implementation, synthetic PostgreSQL restore rehearsal, and owner approval package  
**Protected-main baseline:** `b626fe1ca91231166dd9942229abc0881456da80`  
**Production database/configuration/provider mutation:** None  
**Native builds/store submissions:** None

## Executive verdict

**CONDITIONAL — CAL-17 remains BLOCKED.** Mission 424 closes several repository-level recovery-tooling gaps and provides executed synthetic evidence for encrypted backup creation, authenticated validation, PostgreSQL restoration, synthetic private-object manifest verification, corruption rejection, wrong-key rejection, and tenant-row-count preservation. It does not prove production backup custody, production retention, production restore, Supabase Auth restoration, Supabase Storage restoration, RevenueCat state recovery, Railway configuration recovery, or measured production RPO/RTO. Those items remain owner/provider gated and must not be represented as complete.

## 1. Recovery inventory and recovery boundaries

| Component | Classification | Recovery evidence or procedure | Current status |
|---|---|---|---|
| Supabase PostgreSQL schema, customer rows, migration state | Backed-up data, subject to approved endpoint access | Custom-format `pg_dump` inside an AES-256-GCM bundle; sanitized metadata records migration state | Synthetic restore proven; production custody unverified |
| Supabase Auth identities/configuration | Provider-managed external state | Supabase Auth configuration attestation, identity reconciliation, and provider support procedures | Not independently restored; BLOCKED |
| Private recipe images/storage objects | External storage, not database data | Sanitized object-count/checksum manifest and isolated object copy/restore procedure | Two synthetic objects verified; production object custody unverified |
| Railway services/configuration/dependencies | Reconstructible/provider-managed configuration | Protected release source, Railway service/configuration attestation, domains, variables, and deployment records | No production inspection or mutation in this mission; BLOCKED |
| RevenueCat subscriptions/entitlements/catalog/webhooks | Provider-managed external state | Read-only state reconciliation and catalog/webhook manifest; provider support for provider-side recovery | Not independently restorable; BLOCKED |
| External AI/nutrition/provider integrations | Reconstructible configuration plus provider state | Secret-manager ownership/rotation record and provider health/reconciliation procedures | No live credential access; BLOCKED |
| Encryption keys/secrets | Externally managed custody | `CALORA_BACKUP_KEY_B64` supplied at execution time by an approved secret manager; no key in artifact/report | Tool boundary proven; custody/escrow/rotation unapproved |

A PostgreSQL backup does **not** contain private storage objects, Auth identities, RevenueCat state, Railway variables/domains, or provider credentials. The bundle deliberately carries only sanitized external-state manifests.

## 2. Implemented recovery improvements

The focused Mission 424 changes are:

1. **Atomic bundle publication.** The creator writes to a process-scoped temporary output and renames it into place only after encryption succeeds. A failed/interrupted backup cannot leave a file that looks like a completed bundle.
2. **Database archive checksum verification.** The restore tool now requires the manifest to identify a `pg_dump` custom archive and compares the extracted archive SHA-256 before `pg_restore` can mutate a target.
3. **Validate-before-upload.** The manual GitHub Actions workflow decrypts, extracts, validates archive members, verifies the manifest checksum, and verifies the database archive checksum before uploading an encrypted artifact.
4. **Concurrency control.** Manual runs for the same environment serialize instead of overlapping.
5. **Sanitized evidence artifact.** Successful workflow runs emit only a schema version, run ID, environment label, bundle SHA-256, retention period, and timestamp. No database URL, key, customer row, provider token, or object content is emitted.
6. **Contract coverage.** Recovery tests now assert atomic publication, database archive checksum enforcement, manual-only workflow behavior, concurrency protection, validate-before-upload, and sanitized evidence.

The workflow remains `workflow_dispatch` only. No production schedule was enabled and no production secret binding was accessed.

The documented future scheduling design uses an external scheduler or provider-native backup service to invoke an immutable owner-approved workflow/environment on the approved cadence. It must enforce one active run per environment, alert on missed or failed runs, retain sanitized evidence, and never receive or print the encryption key. Enabling that schedule remains separately owner-authorized.

## 3. Executed synthetic evidence

The rehearsal used the disposable PostgreSQL database from the prior security missions and a newly created disposable empty target. The backup role was granted temporary read access only within the disposable source database so `pg_dump` could read the reviewed schema; this grant was not applied to production and the target database was destroyed after verification.

Results:

- Encrypted backup creation: **PASS**.
- AES-256-GCM authenticated envelope: **PASS**.
- Validate-only decrypt/extract/manifest/archive checksum verification: **PASS**.
- PostgreSQL restore into a newly created empty disposable database: **PASS**.
- Synthetic `calora_users` rows: **3 source / 3 restored**.
- Synthetic private storage objects: **2/2 SHA-256 checks passed** through the separate storage manifest/copy rehearsal.
- Tampered encrypted bundle rejection: **PASS**.
- Incorrect encryption-key rejection: **PASS**.
- Temporary plaintext and disposable database cleanup: **PASS**.

The measured run on this local disposable environment was:

| Stage | Measured duration |
|---|---:|
| Backup creation | 232 ms |
| Validate-only integrity check | 87 ms |
| PostgreSQL restore | 311 ms |
| End-to-end synthetic sequence | 630 ms |

These are synthetic local measurements, not production RTO/RPO evidence.

## 4. Validation matrix

- Recovery contract tests: **6/6 passed**.
- Mission 417 security plus recovery contracts: **9/9 passed**.
- API offline suite: **564/564 tests across 47 files passed**.
- API TypeScript validation: passed.
- Database TypeScript validation: passed via `tsc -p tsconfig.json --noEmit`.
- Recovery script syntax checks: passed.
- Workflow safety contract: passed; manual-only, read-scoped, no schedule, 30-day retention, validate-before-upload, and evidence emission.
- `git diff --check`: passed.

## 5. Proposed production RPO/RTO targets

These are proposed targets requiring owner/SRE approval, not measured results:

| Service tier | Proposed RPO | Proposed RTO | Required dependency |
|---|---:|---:|---|
| Core PostgreSQL data plane | 15 minutes | 60 minutes | Provider-supported backup cadence, encrypted artifact custody, disposable restore proof, staffed approval path |
| Private recipe media | 15 minutes | 90 minutes | Object-store versioning/replication, checksum manifest, object restore procedure |
| Auth and subscription state | Provider-defined reconciliation window | 4 hours | Supabase/RevenueCat support and read-only reconciliation procedures |
| Railway application services | Git/source reconstructible | 60 minutes | Protected release branch, configuration attestation, deployment approval and health checks |

The actual production RPO is currently **unknown** because no approved production backup artifact or retention log was inspected. The actual production RTO is currently **unknown** because no production restore was authorized or executed.

## 6. External-state recovery matrix

| External state | Independent database restore? | Required recovery action | Evidence status |
|---|---:|---|---|
| Supabase Auth identities | No | Provider-side identity/configuration reconciliation; do not recreate identities blindly | Unverified |
| Supabase Storage/private recipe objects | No | Restore objects from approved object-store custody and verify checksums/object ownership | Synthetic-only evidence |
| RevenueCat entitlements | No | Read-only customer/catalog/webhook reconciliation, then provider-supported repair where necessary | Unverified; no live mutations |
| Railway services | No | Verify source SHA, service config, domains, variables, health, and deployment provenance | Unverified in Mission 424 |
| AI/provider integrations | No | Retrieve secrets through approved secret manager; validate provider connectivity and rotate if required | Unverified |
| Encryption-key custody | No | Obtain key-manager recovery authorization, escrow record, rotation status, and dual-control approval | Unverified |

## 7. Disaster-recovery runbook sequence

1. Declare incident severity and appoint recovery owner, security owner, and communications owner.
2. Freeze destructive changes and identify the last approved backup artifact.
3. Verify artifact SHA-256, authenticated envelope, manifest checksum, archive checksum, environment label, and retention record.
4. Obtain explicit recovery authorization and retrieve the key through the approved secret manager; never place it in chat, GitHub, or reports.
5. Restore PostgreSQL only into a newly created disposable target first; run migration-journal, constraints, RLS, deletion-fence, tenant-isolation, and application compatibility checks.
6. Reconcile Supabase Auth, Storage, RevenueCat, Railway, and external providers independently; never assume the PostgreSQL restore covers them.
7. Verify tenant isolation, account-deletion fences, subscription enforcement, webhook posture, health checks, and customer-data protection.
8. Obtain a second approval for service restoration, then restore application services from the approved protected release source/configuration.
9. Perform post-restore monitoring, reconcile missed provider events, and preserve sanitized evidence.
10. Close the incident only after recovery owners sign the evidence package and customer-impact assessment.

## 8. Remaining CAL-17 blockers and exact approvals required

CAL-17 remains **BLOCKED** until the owner approves and evidence establishes all of the following:

1. External encrypted artifact storage, retention/expiration policy, and custody owner.
2. Secret-manager binding for the recovery database endpoint and 32-byte encryption key, without sharing either value in chat or Git.
3. Key escrow, rotation, break-glass retrieval, and dual-control procedure.
4. Backup cadence and alert destination, while preserving the current manual emergency fallback.
5. A production or approved backup-replica artifact whose provenance and retention can be inspected.
6. An authorized restore rehearsal from that approved artifact into disposable infrastructure.
7. Private recipe-object backup/restore evidence, including ownership and checksum verification.
8. Supabase Auth, RevenueCat, Railway, and external-provider reconciliation evidence.
9. Approved production RPO/RTO targets and an operator/on-call acceptance of the recovery runbook.

No production backup schedule, production dump, production credential, Railway deployment/restart, Supabase migration/grant, RevenueCat mutation, native build, OTA update, or store submission was performed.

## 9. Delivery provenance

- Mission 424 source baseline: `b626fe1ca91231166dd9942229abc0881456da80`.
- Mission 424 implementation branch: `mission/424-recovery-certification`.
- PR and final protected-main merge SHA will be recorded after required CI completes.

## Final verdict

**CONDITIONAL / CAL-17 BLOCKED.** The repository recovery system is safer and has executed synthetic end-to-end evidence. Production backup custody, external-state recovery, production restore proof, and production RPO/RTO remain unverified. Documentation does not substitute for those missing executed production-approval artifacts.
