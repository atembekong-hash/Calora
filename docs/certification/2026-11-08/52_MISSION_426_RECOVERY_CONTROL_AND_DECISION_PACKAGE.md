# Mission 426 — Recovery Control and Decision Package

**Assessment date:** 2026-11-08
**Mission classification:** bounded engineering correction plus read-only production preflight
**Protected-main baseline:** `88361a4e2e96e22be70672d3327c88e65a557fff`
**Production release branch:** `release/calora-production` (not modified)
**Verdict:** **ENGINEERING CORRECTION PASS; CAL-17 REMAINS BLOCKED**

## Executive verdict

The confirmed P1 recovery target-isolation defect has been corrected in the repository. The workflow now accepts only two source-enforced non-production target choices, runs only from protected `main`, maps each target to a distinct protected GitHub Environment, validates a non-secret target identity and independent attestation before the secret-bearing job, and repeats the validation immediately before `pg_dump`. Unsupported targets, production-like aliases, missing or mismatched metadata, invalid endpoint identity, and unapproved refs fail closed before database execution or artifact publication.

The correction is production-inert. No live GitHub secret was read or changed. No production backup, export, restore, PITR activation, schedule, paid service, Railway configuration, release branch, native build, store action, RevenueCat mutation, or customer-data operation was performed.

Supabase read-only interfaces verify project identity, health, PostgreSQL engine, Pro organization context, schema table inventory, RLS flags, migrations, and extensions. They do not expose the project’s actual backup history, PITR enablement, recoverable time window, database size, or compute add-on through the authorized calls. Those facts remain **UNVERIFIED**, with owner-assisted dashboard checks defined below.

## Confirmed defect and root cause

Before this correction, `.github/workflows/calora-database-recovery.yml` accepted `workflow_dispatch.inputs.environment` as an unrestricted string and injected one generic `CALORA_RECOVERY_DATABASE_URL` secret. The creator recorded the string in the manifest, but neither the workflow nor the creator established that the selected label corresponded to a protected GitHub Environment, an approved endpoint, or the intended database. The restore command’s non-production guard did not fix this backup-side weakness.

A string allowlist by itself would not prove endpoint identity. The corrected design therefore combines four independent controls: an explicit target allowlist, a protected GitHub Environment mapping with separate secrets and non-secret metadata, exact attestation, and host/database-name comparison against the protected Environment metadata. The endpoint value remains secret-bearing; only the host and database-name metadata are compared and logged as sanitized status.

## Corrected workflow architecture

`workflow_dispatch` now exposes `target` as a choice containing only `staging` and `disposable-rehearsal`, plus an exact owner-approved `target_attestation`. The first job fails unless the run ref is `refs/heads/main`, the choice is approved, and the attestation matches the target. It emits only the protected Environment name.

The second job runs in `calora-recovery-staging` or `calora-recovery-disposable`. These Environments must have independent protected reviewers, separate `CALORA_RECOVERY_DATABASE_URL` and `CALORA_RECOVERY_BACKUP_KEY_B64` secrets, and non-secret variables `CALORA_RECOVERY_TARGET_ID`, `CALORA_RECOVERY_ENDPOINT_HOST`, and `CALORA_RECOVERY_DATABASE_NAME`. It validates the target identity using the shared `scripts/recovery/validate-recovery-target.mjs` helper without receiving database credentials.

The final job can start only after the attestation job passes and runs in the same protected Environment. It receives the secrets only there, revalidates target identity immediately before any database command, then preserves Mission 424’s encrypted bundle, validate-before-upload, atomic publication, checksum, sanitized evidence, retention, and cleanup behavior.

The corrected files are:

- `.github/workflows/calora-database-recovery.yml`
- `scripts/recovery/validate-recovery-target.mjs`
- `scripts/ci/recovery-target-isolation.test.mjs`
- `scripts/ci/recovery-bundle-contract.test.mjs`
- `docs/operations/CALORA_ENCRYPTED_RECOVERY_BUNDLE_RUNBOOK.md`

The workflow does not activate a schedule or permit a production target. The owner must configure and attest the protected Environments separately; this mission did not change GitHub settings or secrets.

## Negative security test evidence

The new executable target-isolation suite covers:

- unsupported, empty, and production-like target aliases;
- unapproved branch and tag refs;
- missing or mismatched attestations;
- missing or mismatched protected target identity;
- missing, malformed, wrong-scheme, and wrong-database endpoint metadata;
- sanitized rejection messages with no endpoint credentials or key material;
- actual workflow configuration, protected Environment mapping, secret scoping, and ordering before bundle creation.

The result was **7/7 target-isolation tests passed**. The existing recovery contract suite was expanded and passed **7/7**. Combined recovery-control tests passed **14/14**. Node syntax checks passed for the target helper, backup creator, and restore tool. A Python workflow-policy check passed for manual-only dispatch, choice input, absence of the old free-form environment input, protected Environment mapping, and validation ordering.

No test used a real secret, production endpoint, customer row, backup archive, or paid provider.

## Supabase backup and PITR verification matrix

| Fact | Classification | Evidence / next check |
|---|---|---|
| Active project | **VERIFIED ACTIVE** | Authorized metadata identifies `caloraapp`, ref `pzdulhkpwbrbrgskwwwe`, region `us-west-2`, status `ACTIVE_HEALTHY`. |
| Subscription tier | **UNVERIFIED through current call** | Prior authorized metadata recorded the organization as Pro. The current organization metadata call was permission-denied. Owner should verify Project Settings → Billing/Subscription. |
| Database engine | **VERIFIED ACTIVE** | PostgreSQL 17, version `17.6.1.155`. |
| Daily backup availability | **AVAILABLE BUT NOT ENABLED/PROJECT-UNVERIFIED** | Supabase documents daily backups for Pro, Team, and Enterprise projects [1]. The authorized project interface did not expose the project’s backup history or last successful backup. |
| Actual backup enablement | **UNVERIFIED** | Owner must inspect Database → Backups and provide a redacted screenshot showing backup status and most recent successful backup. |
| Last successful backup | **UNVERIFIED** | Not exposed by authorized metadata. Do not infer it from plan or project health. |
| Backup retention | **UNVERIFIED** | Provider documentation describes seven days of daily-backup access for Pro [1]; project-specific retention still needs dashboard confirmation. |
| PITR availability | **AVAILABLE BUT NOT ENABLED/PROJECT-UNVERIFIED** | Supabase documents PITR as an add-on for Pro/Team/Enterprise with at least Small compute [2]. |
| Actual PITR enablement | **UNVERIFIED** | Owner must inspect Database → Point in Time Recovery and provide redacted enabled/disabled status. |
| Earliest/latest recoverable timestamps | **UNVERIFIED** | Not exposed by authorized metadata. Owner must capture the PITR recovery-window fields if enabled. |
| Database size and compute | **UNVERIFIED** | Not exposed by the authorized project metadata. Owner should capture Project Settings → Database/Compute size and current database usage. |
| Separate-project restoration | **AVAILABLE BUT NOT ENABLED/PROJECT-UNVERIFIED** | Supabase documents restore/migration into a separately created project, with Auth, Storage bytes, settings, and functions requiring separate handling [3] [4]. No Calora restore was performed. |
| Export limitations | **VERIFIED DOCUMENTED** | PostgreSQL backup does not include Supabase Storage object bytes; Auth/configuration and provider state also require independent recovery [1] [3] [4]. |

### Owner-assisted Supabase checklist

An owner with the appropriate Supabase dashboard access should capture, without downloading a backup or exposing credentials: (1) Project Settings → Billing/Subscription showing the current tier; (2) Database → Backups showing automatic-backup status, last successful backup, retention, and any backup identifier; (3) Database → Point in Time Recovery showing enabled state, retention tier, and earliest/latest recoverable timestamps; (4) Database/Compute settings showing compute size and database size; and (5) the restore/migration page showing whether restore-to-new-project is available. Redact project secrets, database URLs, customer data, backup contents, and access tokens. If any page is unavailable, record the exact unavailable field rather than inferring a value.

## Recovery architecture and cost comparison

The following model uses official published prices captured on 2026-11-08. It is a sensitivity model, not a bill estimate. Calora’s actual database size, private-media size, write volume, existing compute add-on, current Railway plan, egress, retrieval frequency, and monitoring plan were not exposed by authorized metadata.

### Assumptions

- Existing Supabase Pro base plan is treated as already incurred at $25/month. Supabase publishes $10/month in Pro compute credits and lists Small compute at $15/month [5].
- Seven-day Supabase PITR is modeled at $100/month. With a required Small compute add-on and the $10 Pro credit, the modeled PITR increment is **$105/month** before any existing compute usage or other Supabase usage [2] [5].
- AWS S3 Standard is modeled at $0.023/GB-month for the first 50 TB, and one customer-managed AWS KMS key at $1/month. Requests, retrieval, transfer, replication, and monitoring are excluded until actual volumes are known [10] [11].
- Low/base/high media sizes are 10/100/500 GB. For off-platform database copies, low/base/high database dump sizes are 1/10/100 GB with 30 retained full copies. These are explicit assumptions, not Calora measurements.
- Vendor setup labor, incident labor, and owner time are not priced. Existing GitHub Actions cost, if any, is not assumed to be zero or included. Railway plan baseline and runtime cost are not exposed and are excluded.

| Architecture | Low monthly | Base monthly | High monthly | Low annual | Base annual | High annual | Modeled RPO/RTO |
|---|---:|---:|---:|---:|---:|---:|---|
| **A. Supabase PITR + separate private-media recovery** | $106.23 | $108.30 | $117.50 | $1,274.76 | $1,299.60 | $1,410.00 | DB target can approach PITR policy; media depends on separate copy cadence. |
| **B. Supabase PITR + encrypted off-platform DB and media custody** | $106.92 | $115.20 | $186.50 | $1,283.04 | $1,382.40 | $2,238.00 | DB target can approach 15 minutes if PITR is actually enabled; off-platform copy adds independent recovery but not automatically 15-minute RPO. |
| **C. Independent encrypted backups plus private-media custody, no PITR** | $1.92 | $10.20 | $81.50 | $23.04 | $122.40 | $978.00 | Full-dump cadence determines RPO; a daily dump is approximately 24 hours, and a 15-minute full dump is not assumed feasible. |

Option A calculation is `$105 PITR/Small-compute increment + $1 KMS key + media GB × $0.023`. Option B adds retained database copies: `30 × database GB × $0.023`. Option C includes retained database copies and media, plus KMS, but excludes runner, monitoring, request, transfer, and retrieval charges. The high case is not a quote; it is a transparent sensitivity bound.

### Recommendation

Recommend **Option B as the credible US-launch architecture**, subject to owner approval and actual cost verification: use Supabase PITR for the short database RPO target, separate encrypted off-platform custody for failure-domain independence, and separate private-media backup/restore. It costs more and requires more operations than Option A, but it avoids treating one provider’s backup plane as the only recovery boundary. Option A is the simplest interim architecture if the owner accepts provider concentration and media-only independent custody. Option C is the least expensive modeled option but cannot credibly promise a 15-minute PostgreSQL RPO without a tested incremental/continuous design.

Supabase Storage or Railway Buckets should not be treated as immutable backup custody without additional controls. Railway documents $0.015/GB-month private S3-compatible buckets but currently documents no server-side encryption, object versioning, object locks, or lifecycle configuration [7]. AWS S3 plus KMS is the clearer custody candidate, subject to owner selection of account ownership, region, retention, access logging, and immutability controls.

## Encryption-key and backup-custody model

The recommended model is an owner-controlled recovery account separate from the primary Calora application account. A least-privilege backup runner may write encrypted artifacts and a checksum manifest but may not read customer rows outside the approved backup target, alter application databases, modify production roles, or delete retained artifacts. The runner receives the database endpoint and encryption operation through protected secret bindings; neither value appears in workflow inputs, logs, evidence, or artifacts.

Use envelope encryption with a customer-managed KMS key. Generate the key through the selected KMS/HSM provider, retain old key versions for the retention period, and rotate by encrypting new artifacts under the new version while preserving decrypt permission for the old versions. Break-glass access should require two approved operators, produce an audit event, expire automatically, and be tested against a disposable artifact. Store encrypted artifacts with immutable or retention-protected policy where supported, separate deletion permissions from write permissions, and monitor missing, late, checksum-failing, or unexpectedly small artifacts.

The recovery operator must be able to retrieve the artifact and key through a separate account path if Supabase, Railway, or the primary GitHub account is unavailable. The evidence package should contain only artifact IDs, hashes, timestamps, target identifiers, result, retention deadline, and operator/run IDs. It must never contain keys, database URLs, customer rows, object bytes, or provider tokens.

## Recovery-target feasibility

| Target | Current protection | Feasibility | Required additional evidence / decision |
|---|---|---|---|
| PostgreSQL — RPO 15 minutes, RTO 60 minutes | Source recovery tooling and synthetic disposable restore are proven; live PITR/backup state and real timings are unverified. | **Technically feasible with PITR plus tested restore runbook; not currently certified.** | Confirm PITR enablement/window, separate encrypted artifact custody, restore-to-new-project procedure, role/migration checks, and a timed approved rehearsal. |
| Private media — RPO 15 minutes, RTO 90 minutes | Database metadata/manifests do not include object bytes; current bucket presence is known, not object recovery. | **Feasible only with an independent object replication/backup design.** | Select versioned/immutable custody, object checksum manifest, owner mapping, restore test, and measured transfer/recovery time. |
| Auth and subscriptions — provider-defined RPO, RTO 4 hours | Auth and RevenueCat catalog metadata exist; customer lifecycle and provider recovery evidence are absent. | **Feasible as reconciliation, not database restore.** | Define provider export/reconciliation, webhook replay/idempotency, account recreation, entitlement verification, and provider-specific RPO/RTO acceptance. |
| Railway services — source-reconstructible, RTO 60 minutes | Services are healthy and source branch/deployment metadata is visible; variable values and endpoint relationships are not. | **Feasible if release provenance and secret recovery are separately controlled.** | Record immutable image/source provenance, protected release branch, variable-name/value custody without exposing secrets, domain/DNS recovery, and timed rebuild/restart rehearsal in non-production. |

Mission 424’s synthetic millisecond timings must not be used as production RPO/RTO evidence.

## Owner approval matrix

| Decision | Recommendation | Alternative | Approval required now | Activation approval later |
|---|---|---|---|---|
| Recovery architecture | Option B | Option A or C | Approve design direction and budget envelope | Explicit activation after control-plane setup and rehearsal |
| Supabase PITR | Seven-day PITR if 15-minute DB RPO is required | Option C with a relaxed RPO | Approve feasibility/cost investigation | Enable PITR only through a separate explicit authorization |
| Backup destination | Separate AWS account/bucket with protected retention | Provider-native storage with compensating controls | Approve account owner, region, and custody owner | Provisioning and schedule activation require separate authorization |
| Retention | 30 daily encrypted copies plus provider PITR policy | Longer retention tiers | Approve retention and deletion policy | Activate only after legal/compliance review |
| Key custody | Customer-managed KMS key with escrow and dual-control break-glass | Approved HSM/secret-manager equivalent | Approve custody provider and recovery operators | Key creation/rotation requires separate authorization |
| Cadence | PITR continuous policy plus daily independent encrypted artifact | Hourly/daily independent artifacts with relaxed RPO | Approve target cadence | Schedule activation separately |
| GitHub Environments | `calora-recovery-staging` and `calora-recovery-disposable`, distinct protected bindings | Separate repository/workflow with equivalent controls | Approve reviewers, refs, variables, and target attestations | Configure settings separately; no settings changed here |
| Runner identity | Least-privilege runner limited to approved target and artifact write | Dedicated isolated runner | Approve permissions and audit owner | Provision separately |
| Monitoring | Alert on missed run, failure, checksum drift, retention expiry, and restore-test failure | Existing incident platform if it supports these alerts | Approve alert destination and on-call | Activate separately |
| Production artifact access | None for this mission | Owner-approved read-only custody inspection | Approve exact operator and evidence scope | Retrieve/inspect only after explicit authorization |
| Restore rehearsal | One approved artifact into new disposable infrastructure | Provider-native test restore if independently evidenced | Approve target, window, and evidence fields | Execute separately; no production restore |
| RPO/RTO | DB 15m/60m, media 15m/90m, provider state 4h, Railway 60m | Revise targets to measured capability | Approve targets or revised targets | Certify after timed rehearsal |
| Monthly ceiling | Provisional Option B modeled range: $115/month base before unknown usage | Set a lower ceiling and accept lower RPO | Approve budget ceiling | Activate only with billing alerts |
| Incident ownership | Named recovery owner, security owner, DBA, and communications owner | Managed incident rotation | Approve names and escalation path | Activate during runbook rollout |

Design approval does not authorize activation. Activation would require a separate explicit owner instruction covering provider setting changes, storage/KMS provisioning, protected Environment configuration, schedule enablement, production artifact access, or PITR activation.

## Current CAL-17 closure requirements

CAL-17 remains **BLOCKED** until the following are independently evidenced: protected recovery Environment configuration and target binding; approved artifact custody and retention; key generation, escrow, rotation, and break-glass; actual backup/PITR status and recovery window; one approved artifact provenance record; real `pg_dump`/`pg_restore` or provider restore rehearsal in disposable infrastructure; private-media restore and checksum verification; Auth, RevenueCat, Railway, and external-provider reconciliation; sanitized alert evidence; and measured operator-approved RPO/RTO.

## Next authorized production-inert sequence

1. Owner reviews and approves the architecture, target values, custody account, retention, KMS model, budget ceiling, and RPO/RTO targets.
2. Owner supplies redacted Supabase dashboard evidence for backup/PITR fields and confirms the appropriate protected GitHub Environment reviewers and variable bindings without exposing secret values.
3. Merge this correction through protected main after CI passes. Do not modify `release/calora-production`.
4. In a separately authorized mission, configure the approved protected Environments and test only against disposable or approved non-production targets.
5. In a separately authorized mission, activate custody/scheduling/PITR only if the owner names those exact changes.
6. Run the approved restore rehearsal and update CAL-17 from BLOCKED only if all evidence requirements pass.

## References

[1]: https://supabase.com/docs/guides/platform/backups "Supabase Database Backups"
[2]: https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery "Supabase Point-in-Time Recovery Usage"
[3]: https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore "Supabase Dashboard Restore"
[4]: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore "Supabase Backup and Restore Using the CLI"
[5]: https://supabase.com/pricing "Supabase Pricing"
[6]: https://docs.railway.com/pricing "Railway Pricing"
[7]: https://docs.railway.com/storage-buckets "Railway Storage Buckets"
[8]: https://www.revenuecat.com/pricing "RevenueCat Pricing"
[9]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[10]: https://aws.amazon.com/s3/pricing/ "AWS S3 Pricing"
[11]: https://aws.amazon.com/kms/pricing/ "AWS KMS Pricing"
