# Mission 405 — CAL-17 Disaster-Recovery Certification and Evidence Closure

**Assessment date:** 2026-11-07  
**Final verdict:** **BLOCKED — partial technical evidence completed; mandatory production recovery evidence remains unverified**

## 1. Executive verdict

Mission 405 completed every safe isolated activity available within the authorization boundary. The source-controlled Calora database bootstrap and migration path passed on disposable PostgreSQL. A fresh synthetic dump, checksum verification, restore into a separate empty database, schema validation, RLS validation, constraint validation, and deletion-fence validation also passed.

The result is not a full CAL-17 PASS. The mandatory production recovery evidence is still incomplete. No authorized evidence proves the existence, retention, encryption, accessibility, or last-successful timestamp of a production backup artifact. Private recipe-photo object recovery has not been exercised. RevenueCat and other external-provider state have not been reconciled. Current authorized Supabase project inventory no longer exposes the previously identified temporary recovery project, so its prior recovery evidence cannot be re-queried in this session. No production mutation, live restore, deployment, rollback, credential change, customer-data query, or native build was performed.

## 2. Starting and final production baseline

The starting and final baselines were read-only verified as follows:

- Protected `main`: `ef7de6348922b83af14a5e8ad00cc648bd8b88fa`.
- Production release branch: `release/calora-production` at `eefba459c190605a63eb9db874556ddf9bebb5c6`.
- Railway project: `attractive-harmony`.
- Railway environment: `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`).
- All three production services use `atembekong-hash/Calora@release/calora-production`.
- `@workspace/api-server`: online, deployment `10585054-72e1-4727-af32-86521826aa9c`, serving `eefba459`.
- `@workspace/calora`: online, serving deployment `74436264-2a55-4310-b4f8-5e9874ceaacc`, serving `eefba459`.
- `Calora` / FatSecret gateway: online, deployment `dde8a33d-fdcd-4dfa-a421-6f8f1332216c`, serving `eefba459`.
- Railway reported zero services with issues, zero recent failures, and no pending work.
- Production Supabase: `caloraapp`, immutable project ID `pzdulhkpwbrbrgskwwwe`, `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.155, region `us-west-2`.
- Current Supabase organization metadata reports `pro` / `tier_pro`. This current plan observation supersedes the older Mission 398 note that recorded `free`; it does not prove project-level backup configuration or a retrievable backup artifact.

No source was promoted to `release/calora-production`, and no production deployment or database change was performed during Mission 405.

## 3. CAL-17 acceptance matrix

| Requirement | Verification method | Actual result | Evidence | Verdict | Remaining owner action |
|---|---|---|---|---|---|
| Production database backup exists | Read-only Supabase/provider inspection and repository automation audit | No backup artifact, listing, timestamp, or manifest was available through authorized tools; no recurring repository backup job was found | Missions 398–403; current Supabase metadata; focused workflow/source audit | **BLOCKED** | Provide a sanitized backup record with immutable timestamp, source project ID, artifact location, and retention policy. Never send credentials or customer rows. |
| Backup frequency and retention are known | Provider plan metadata plus official backup documentation review | Current organization is Pro. Official documentation describes daily backups and default retention for eligible paid plans, but project-level retention and actual last-successful backup were not exposed | [1]; [2] | **BLOCKED** | Owner records the project’s actual backup schedule, retention window, and last successful backup from the provider control plane. |
| Backup encryption and access control are evidenced | Source/repository audit and provider metadata | No controlled backup artifact or encryption/access record was available; no encryption claim is inferred from provider plan alone | Missions 398–403; current audit | **BLOCKED** | Provide provider or off-site backup evidence showing encryption at rest/in transit, least-privilege access, and access-review ownership. |
| Database restore is repeatable | Fresh local synthetic restore rehearsal | A source-controlled schema with synthetic fixtures was dumped, SHA-256 verified, restored to a separate empty database, and validated successfully | This report, Section 4 | **PASS — isolated scope only** | Repeat against an owner-approved authorized backup artifact to establish production-backup compatibility. |
| Schema, RLS, constraints, and deletion fences survive restore | Post-restore catalog and aggregate checks | 33 RLS-enabled Calora tables, zero unvalidated constraints, one migration journal boundary, ten deletion-fence triggers, and one synthetic user/profile restored correctly | This report, Section 4 | **PASS — isolated scope only** | Compare restored metadata with a sanitized production backup-time manifest. |
| Measured production RPO | Backup timestamp versus incident/data-loss point | No production backup artifact or incident point was available; RPO cannot be measured | Missions 398–403; current audit | **BLOCKED** | Owner records the actual backup timestamp and defines the accepted maximum data-loss interval. |
| Measured production RTO | Timed live or authorized isolated restore of a production-equivalent backup | Local synthetic restore took 3.810 seconds. This is not a production RTO because it used a small synthetic database and local PostgreSQL | This report, Section 5 | **BLOCKED for production** | Run an approved restore rehearsal using a sanitized/authorized backup and record restore, validation, and application-start times. |
| Private recipe-photo object recovery | Storage inventory, checksum manifest, and restore rehearsal | Database metadata and source contract were reviewed, but no production object inventory, independent backup/replication manifest, or object restore was available | Mission 403; source storage contract; current audit | **BLOCKED** | Owner verifies the protected endpoint/bucket privately, supplies a sanitized object-count/checksum manifest, and completes an isolated object restore test. |
| Authentication/application configuration recovery | Recovery-project auth/provider/redirect/secret comparison | Previous recovery report found schema evidence but did not verify Auth providers, MFA, redirects, or hidden production values. The recovery project is not currently returned by `list_projects`, and `get_project` is permission-blocked | Missions 400–402; current Supabase inventory | **BLOCKED** | Owner/provider operator verifies Auth configuration, redirect URLs, MFA/password posture, and secret-to-project identity without disclosing values. |
| RevenueCat and external-provider state recovery | Source and provider dependency review | Source confirms provider state is outside the database. No export/reconciliation evidence or transaction-free recovery manifest was available | Missions 398–403; source RevenueCat contract | **BLOCKED** | Produce a provider-state continuity/reconciliation record covering entitlements, subscriptions, webhooks, and key ownership. Do not use live transactions as a substitute for the record. |
| Railway rollback/redeploy control | Read-only deployment history and release-branch verification | Prior deployments expose redeploy/rollback controls; current services are healthy and release-branch isolated. No rollback mutation was authorized or performed | Mission 404; current Railway environment/deployment metadata | **PASS — control availability only** | Perform an approved non-production rollback rehearsal or explicitly document the owner-approved production runbook exercise. |
| End-to-end service recovery | Restore database, storage, auth, provider state, deploy/configure services, and verify application | Only the local synthetic database path was exercised. End-to-end production-equivalent recovery remains unproven | This report and Missions 398–403 | **BLOCKED** | Complete one approved end-to-end isolated rehearsal using sanitized provider/storage/auth fixtures and record measured RPO/RTO. |

## 4. Tests and restore-rehearsal results

### Source-controlled database tests

The following tests ran against disposable local PostgreSQL databases and were destroyed after execution:

- `scripts/ci/calora-empty-target-bootstrap.test.mjs` — PASS. The test verified empty-target acceptance, 33-table baseline creation, RLS creation, deletion-fence structure, restricted migration ownership, empty legacy-cache reconciliation, and refusal to replace a non-empty target.
- `scripts/ci/recipe-nutrition-migration-smoke.mjs` — PASS. Fresh, legacy, and historical-upgrade nutrition migration scenarios passed.
- API recovery warning-suppression integration suite — 4/4 PASS.
- API rolling-restart recovery rehearsal — 1/1 PASS after provisioning the reviewed disposable schema and supplying non-routable synthetic AI startup values. No outbound AI call was made.
- Client recovery interaction contracts — 4/4 PASS.
- Release/recovery contract tests — 15/15 PASS.

An initial attempt to collect the database integration suites failed closed because the repository requires the explicit `CALORA_RUN_DB_INTEGRATION_TESTS=true` opt-in. A second attempt failed only because the disposable database was empty; the tests correctly surfaced missing schema. After bootstrap/migration provisioning and the documented local-only opt-in, all targeted recovery scenarios passed. These failures were harness-preparation findings, not production failures.

### Synthetic dump and restore rehearsal

The rehearsal used only a synthetic user and profile with an `example.invalid` email and no customer data:

1. Created an isolated source PostgreSQL database.
2. Installed the reviewed empty-target baseline and applied source migrations.
3. Inserted one synthetic user and one synthetic profile.
4. Created a custom-format `pg_dump` archive with owner/privilege restoration disabled.
5. Calculated and verified an SHA-256 checksum before restore.
6. Restored into a separate empty PostgreSQL database using `pg_restore --exit-on-error`.
7. Verified one synthetic user, one synthetic profile, one migration journal boundary, 33 RLS-enabled Calora tables, zero unvalidated constraints, and ten deletion-fence triggers.
8. Destroyed both temporary databases and the archive after verification.

Measured local elapsed time from source setup through checksum, restore, and validation: **3.810 seconds**. This is an isolated test measurement only. It is not a production RTO and does not establish production RPO.

Archive checksum recorded during the rehearsal: `5b44f2727ed7b7097e0adaf7a4ded5f1d6c4c6a128f54f1619b72eb8e95c2631`.

## 5. Security and data-integrity findings

The mission did not select or query production rows. It did not print or serialize credentials, secret values, private object contents, auth identities, provider tokens, or customer records. The recovery fixture used a synthetic identity and was destroyed.

Positive findings include deterministic migration ordering, an explicit empty-target acknowledgement, refusal to bootstrap non-empty Calora targets, transaction-scoped bootstrap locking, source-controlled migration journaling, post-restore RLS catalog checks, validated constraints, deletion-fence trigger preservation, and fail-closed recovery integration gates.

The temporary recovery project previously identified as `rqiwgktdqiqqwipznyyf` was not returned by the current authorized `list_projects` call, and a direct current `get_project` check returned a permission error. This is not evidence that the project was safely retired or that its evidence was preserved elsewhere. The owner must confirm its current lifecycle and preserve any remaining evidence before treating the prior recovery rehearsal as independently re-queryable.

## 6. Code changes and PR details

No application, database, workflow, Railway, Supabase, authentication, storage, or provider code was changed in Mission 405. No corrective code change was necessary after the isolated tests passed.

Repository evidence from this mission is recorded in this report and the authoritative register update. The prior protected PR #394 remains merged through protected main at `ef7de6348922b83af14a5e8ad00cc648bd8b88fa`. Production remains on `release/calora-production` at `eefba459c190605a63eb9db874556ddf9bebb5c6`.

## 7. Exact owner actions required

1. Confirm the current lifecycle and evidence-retention location of recovery project `rqiwgktdqiqqwipznyyf`; do not delete or assume retirement without an immutable-ID decision record.
2. Capture the production project’s actual backup schedule, retention, encryption, access-control, and last-successful-backup evidence from the authorized provider control plane.
3. Provide a sanitized backup-time aggregate manifest so restored schema/data completeness can be compared without exposing row values.
4. Verify the protected Railway recipe-photo endpoint and bucket privately against the production Supabase identity and recovery identity. Record only a boolean no-reference result.
5. Inventory private recipe-photo objects through the approved storage control plane, preserve a count/checksum manifest, and perform an isolated restore test.
6. Verify Auth providers, redirects, MFA/password protection, and relevant recovery secrets without sharing secret values.
7. Reconcile RevenueCat and other provider-side state using approved export/reconciliation procedures.
8. Run one approved end-to-end isolated recovery rehearsal and record actual RPO/RTO. Keep CAL-17 blocked until every mandatory row in the matrix is satisfied.

## 8. Recommended next certification mission

**Mission 406 — Owner-supervised recovery evidence completion.** The next mission should be limited to non-secret owner-provided evidence: backup timestamp/retention record, sanitized backup manifest, private storage inventory/checksum manifest, Auth configuration attestations, provider-state reconciliation, and the recovery project lifecycle decision. If all evidence is available, perform one isolated end-to-end rehearsal and update CAL-17. Do not delete the recovery project, change backup settings, or restore production without separate explicit authorization.

## Final verdict

**CAL-17 remains BLOCKED.** The safe, isolated database reconstruction and synthetic dump/restore path are demonstrated. Complete production disaster-recovery readiness is not demonstrated because backup artifact/retention evidence, object-storage recovery, provider-state recovery, authenticated configuration recovery, and measured production RPO/RTO remain unverified.

## References

[1]: https://supabase.com/docs/guides/platform/backups "Supabase database backups and restore"
[2]: https://docs.railway.com/deployments "Railway deployment lifecycle and recovery controls"
