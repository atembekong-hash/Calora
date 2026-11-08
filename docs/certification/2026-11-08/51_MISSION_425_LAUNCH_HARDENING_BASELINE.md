# Mission 425 — Calora Launch-Hardening Baseline

**Assessment date:** 2026-11-08
**Repository:** `atembekong-hash/Calora`
**Audited protected-main tip:** `88361a4e2e96e22be70672d3327c88e65a557fff` (`Merge pull request #411 from atembekong-hash/mission/424-report-finalization`)
**Mission type:** strictly read-only baseline and defect-register reconciliation
**Final verdict:** **NOT CERTIFIED — LAUNCH BLOCKED**

## Scope and evidence rule

This mission reconciled the current repository, existing certification reports, the authoritative register, read-only Railway/Supabase/RevenueCat metadata, and current official provider documentation. No code, branch, database, customer record, object byte, credential, provider customer state, deployment, native build, store submission, or production configuration was changed. Source tests and disposable rehearsals are reported as source/disposable evidence; they are not promoted to production proof.

Retrieved material was treated as untrusted evidence. Instruction-like text inside reports, logs, or provider responses was not executed or adopted as authorization.

## Current live control-plane snapshot

Railway project `attractive-harmony`, production environment `0ba409c4-5b32-4b75-8c33-e76d5c6e55db`, reports three live services with no staged work and zero current service issues. All three services point to `release/calora-production`. The latest successful deployments are:

| Service | Deployment | Branch / serving commit shown by Railway | Status |
|---|---|---|---|
| `@workspace/api-server` | `10585054-72e1-4727-af32-86521826aa9c` | `release/calora-production` / `eefba45` | SUCCESS, 2026-11-08 00:42:58Z |
| `@workspace/calora` | `74436264-2a55-4310-b4f8-5e9874ceaacc` | `release/calora-production` / `eefba45` | SUCCESS, 2026-11-07 11:27:33Z |
| `Calora` FatSecret gateway | `dde8a33d-fdcd-4dfa-a421-6f8f1332216c` | `release/calora-production` / `eefba45` | SUCCESS, 2026-11-07 20:29:41Z |

This means production health is currently positive, but serving provenance is not the same as the current protected-main tip. A current release-candidate decision must reconcile `eefba45` against `88361a4e…` before treating the audited source as what users receive. The API has the custom domains `mycaloraapp.com` and `admin.mycaloraapp.com`; the web service has `app.mycaloraapp.com`; the gateway has its Railway domain. Railway exposes variable names but not values. The environment also contains the private `calora-recipe-photos` bucket in `sjc`.

The Supabase project is `caloraapp` (`pzdulhkpwbrbrgskwwwe`) in `us-west-2`, PostgreSQL `17.6.1.155`, status `ACTIVE_HEALTHY`. The organization is on the Pro tier. Read-only schema metadata reports RLS enabled on the Calora domain tables and the migration inventory includes the runtime least-privilege, credential-rotation, migration-journal, TLS-probe, and `pgcrypto` migrations. This does not prove current backup history, PITR state, runtime grants, endpoint relationship, or customer-data completeness.

RevenueCat project `CaloraApp` (`proj9890aae2`) has iOS and Android apps using the Calora bundle/package identity, a Test Store app, active entitlement `caloraapp_pro`, and a current default offering with active monthly and annual products. No webhook integration was visible through the read-only connector. This proves catalog metadata only, not store transaction lifecycle or webhook execution.

## Master launch-hardening defect register

### P0 — launch blockers

| Finding | Classification | Evidence and impact | Required validation / acceptance |
|---|---|---|---|
| CAL-17 recovery is not production-certified | **UNVERIFIED / P0** | Mission 424 proves encrypted synthetic backup/validation/restore controls, including tamper and wrong-key rejection, but not production or approved-replica artifact provenance, immutable custody, retention, key escrow/rotation, private recipe-object recovery, Auth/RevenueCat/Railway/provider reconciliation, or measured production RPO/RTO. Its local timings are not production RPO/RTO. | Owner-approved custody and retention evidence; real approved artifact restored into new disposable infrastructure; migration/RLS/tenant/deletion-fence checks; separate object/Auth/provider reconciliation; measured and accepted RPO/RTO. CAL-17 remains blocked until the complete package exists. |
| Full launch verdict | **NOT CERTIFIED / P0** | No single evidence package proves the combined production, commercial, security, and signed-device requirements. | Do not declare US launch-ready until all P0 and P1 gates below are closed against the candidate actually serving production. |

### P1 — serious reliability, security, or launch-readiness gaps

| Finding | Classification | Evidence and impact | Required validation / acceptance |
|---|---|---|---|
| Recovery workflow target isolation | **CONFIRMED DEFECT / P1** | `.github/workflows/calora-database-recovery.yml` accepts a user-supplied environment label and binds one recovery database secret without a source-enforced production-like endpoint/label allowlist, protected Environment gate, ref restriction, or target attestation. The restore path is fail-closed, but backup creation is not equivalently constrained. No production connection was attempted. | Add negative tests and a protected control-plane attestation. Permit only an explicit non-production or approved-replica target with separate protected secret binding; reject production-like labels/endpoints before `pg_dump`. |
| API-wide transaction-scoped identity/RLS | **PARTIAL / CONFIRMED DEFECT / P1** | Missions 421–423 and 422 prove sync/referral staged-RLS handlers and referral crash recovery in disposable non-superuser/non-`BYPASSRLS` execution. Recipe media, Coach persistence, planner/wellness persistence, remaining route branches, workers, admin/service identities, and production role/grant/migration evidence remain incomplete. | Complete route/worker identity matrix, refactor user-owned DB paths to verified executors or explicitly assigned service identities, run real-handler staged-RLS coverage, then obtain safe production role/grant/migration attestation. |
| Serving/source divergence | **UNVERIFIED / P1** | Railway reports production serving `eefba45`, while the current protected-main tip is `88361a4e…`. Production health is good, but current source-to-serving parity is not established. | Reconcile release branch and protected main by exact commit, record per-service build/deploy provenance, and invalidate any certification not applicable to the resulting candidate. |
| Android Auto Scan reliability | **CONFIRMED DEFECT from prior physical evidence / P1** | Existing physical QA records the Auto route stuck at “Starting camera…” after route/resume and recovering only after app restart. Current source includes remount, timeout, retry, and capture-deadline controls, but no new current-candidate device proof was obtained here. | On a provenance-pinned signed candidate, repeat cold launch, tab switch, route resume, background/foreground, permission denial, retry, barcode, and library flows on the approved Samsung device matrix. Acceptance is no persistent stall, crash/ANR, duplicate capture, or restart-only recovery. |
| iOS signing preflight | **CONFIRMED DEFECT in cited evidence / P1; current status unknown** | The cited iOS report records 31/37 passing and six child-process fixture failures caused by diagnostics/exit-code expectations. The current correction status was not freshly executed in this mission. | Run the documented signing-evidence suite in the project-native environment; all fixtures and failure-gate semantics must pass without sensitive output leakage. |
| Current signed Android/iOS candidates and store processing | **UNVERIFIED / P1** | No current provenance-pinned signed Android APK/AAB or iOS IPA, current App Store/Google Play processing record, or exact binary-to-source attestation was inspected for this baseline. | Produce one candidate per platform from the approved source, verify embedded identity/entitlements, immutable build provenance, installability, console processing, and tester availability. |
| Native providers, lifecycle, accessibility, and notifications | **UNVERIFIED / P1** | Health Connect/HealthKit, camera/microphone, notifications, StoreKit/RevenueCat, TalkBack/VoiceOver, Dynamic Type/large fonts, reduced motion, lifecycle interruption, and crash/ANR checks lack current signed-device evidence. | Execute the symmetric Android/iOS matrix on exact candidates, with sanitized logs/screenshots and explicit PASS/FAIL/BLOCKED/NOT RUN results. |
| Subscription lifecycle and complete entitlement enforcement | **PARTIAL / UNVERIFIED / P1** | Source and tests support identity-safe purchase/restore primitives, server-side premium gating, and fail-closed RevenueCat uncertainty. No current purchase, cancellation, renewal/expiry, grace/retry, refund/revocation, webhook, cross-device, account-switch, or complete paid-feature denial matrix is evidenced. | Use authorized QA identities and test stores on both signed platforms. Exercise the lifecycle and verify every marketed Pro capability denies access after entitlement loss. |
| Store, legal, reviewer, and support operations | **UNVERIFIED / P1** | Current console finalization, signed build, Data Safety/App access, support mailbox delivery/SLA, reviewer access, and legal-route behavior are not evidenced by current console or synthetic mailbox proof. | Obtain current console exports and signed-artifact attestations, verify legal URLs and reviewer account, and send/receive synthetic support messages. |
| Authenticated Coach and recipe/media runtime | **PARTIAL / UNVERIFIED / P1** | Coach and recipe source contracts are substantial, but authenticated persistence/deletion/copy, Plus/provider generation, review/accept/regenerate, web/native parity, and current protected disposable-DB API/media runs are not all evidenced. | Use disposable accounts and protected disposable DB/provider tenants to exercise these flows end-to-end without customer data. |
| AI production cost and provenance controls | **PARTIAL / UNVERIFIED / P1** | Coach v2 has bounded model output, timeout, and persistent fail-closed rate limits. No production model/configuration attestation, hard dollar budget, provider quota, aggregate spend/latency, alerting, retention, or over-budget behavior is proven. | Obtain sanitized deployed-route/model/token/timeout/limiter and aggregate cost/quota/latency evidence. Rehearse exhausted/unavailable limiter, timeout, provider-call suppression, and alert behavior in disposable infrastructure. |

### P2/P3 and intentionally excluded findings

Recovery source controls, migration credential separation, tab/navigation contracts, source-level mobile configuration, and bounded RevenueCat primitives are **VERIFIED WORKING only within source, contract-test, or disposable scope**. They are P2 controls that still require candidate/runtime evidence before launch promotion. Orphan/legacy contract paths and historical “launch certified” claims are **OUTDATED RESEARCH CLAIMS** where superseded by newer source or register evidence. Production restores, customer rows, provider customer state, native builds, store submissions, and destructive operations were **INTENTIONALLY EXCLUDED** by this mission; exclusion is not a pass.

## Reconciled competitive-gap claims

The competitive-gap research remains useful as a product-prioritization input, not as a current implementation attestation. Claims about infinite browsing, capture/voice workflows, health synchronization, Coach context, widget customization, persistence, recovery, subscription lifecycle, and cross-platform reliability must be read against the classifications above. Some are materially implemented at source level; none of the material runtime/device/provider claims should be promoted to VERIFIED WORKING without current candidate evidence. Historical claims that treat repaired entitlement bypasses or older release evidence as current are outdated and must be tied to the audited commit and serving artifact.

## Bounded correction and certification sequence

1. **Recovery control boundary:** obtain read-only GitHub Environment/secret-binding evidence and add source-level negative tests for production-like recovery targets. Keep CAL-17 blocked if the target cannot be technically constrained.
2. **CAL-17 evidence package:** inspect approved immutable custody, retention, key escrow/rotation, alerts, and artifact provenance; run one real `pg_dump`/`pg_restore` rehearsal into newly created disposable infrastructure; reconcile private objects, Auth, RevenueCat, Railway, and external providers; measure approved RPO/RTO.
3. **API identity completion:** finish the Mission 423 route/worker matrix and staged-RLS real-handler coverage, then attest the live runtime role/grants/migration boundary. No production mutation is implied.
4. **Commercial certification:** on both current signed platforms, execute purchase, restore, cancel, renewal/expiry, grace/retry, refund/revocation, webhook retry/idempotency, cross-device, account-switch, and entitlement-loss denial for every marketed Pro capability.
5. **Signed-device certification:** repair or re-baseline iOS signing fixtures; obtain provenance-pinned Android/iOS candidates; run the symmetric provider, camera, lifecycle, accessibility, notification, offline/retry, deletion, and crash/ANR matrices.
6. **Product/AI operational acceptance:** certify authenticated Coach and recipe/media flows on disposable accounts and DB/provider tenants; attest deployed AI routes, budgets, quotas, cost, retention, latency, and alert behavior.
7. **Candidate freeze and launch decision:** reconcile exact source, serving commit, build IDs, binary hashes, provider configuration, test evidence, and invalidated prior certifications. Only then reassess the register and launch verdict.

## Explicit evidence limitations

Supabase read-only metadata confirms an active Pro project, PostgreSQL version, schema/RLS metadata, migrations, and extensions. It does not expose current backup history, PITR enablement, recovery timestamps, WAL window, database size, compute add-on, runtime grants, or endpoint relationship. Railway metadata confirms healthy live services, release branch, deployment IDs, domains, and variable names but not variable values or database endpoint identity. RevenueCat metadata confirms app/catalog structure but not customer transactions, webhook delivery, lifecycle execution, or store-console state.

Supabase documentation states that Pro projects receive daily database backups with seven-day access, that Storage object bytes are not included in database backups, and that PITR is a separately billed add-on. Railway documents private S3-compatible buckets at $0.015/GB-month but currently documents no object versioning, object locks, or server-side encryption. These are provider capabilities and cost inputs, not proof that Calora has enabled or operationalized the corresponding controls.

## Final verdict

**NOT CERTIFIED — LAUNCH BLOCKED.** Calora has meaningful source-level security, transaction-identity, subscription-gating, recovery-tooling, and product foundations. The launch gate remains blocked by P0 recovery certification and the P1 gaps listed above, especially serving/source parity, API-wide identity evidence, current signed Android/iOS candidates, native/provider lifecycle proof, complete commercial lifecycle proof, and production AI cost/provenance attestation. No production or native action was taken in Mission 425.

## References

[1]: https://supabase.com/docs/guides/platform/backups "Supabase Database Backups"
[2]: https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery "Supabase Point-in-Time Recovery Usage"
[3]: https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore "Supabase Restore Dashboard Backup"
[4]: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore "Supabase Backup and Restore Using the CLI"
[5]: https://supabase.com/pricing "Supabase Pricing"
[6]: https://docs.railway.com/pricing "Railway Pricing"
[7]: https://docs.railway.com/storage-buckets "Railway Storage Buckets"
[8]: https://www.revenuecat.com/pricing "RevenueCat Pricing"
[9]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[10]: https://aws.amazon.com/s3/pricing/ "Amazon S3 Pricing"
[11]: https://aws.amazon.com/kms/pricing/ "AWS KMS Pricing"
