# Mission 398 — Production Backup, Disaster Recovery, and Rollback Certification

**Audit date:** 2026-11-07  
**Scope:** read-only production recovery audit plus isolated local migration/bootstrap rehearsal  
**Restrictions honored:** no production deployment, restart, rollback, database mutation, customer-data query, credential/configuration change, native build, store submission, or PR #394 merge.

## Executive verdict

**VERDICT: CONDITIONAL FAIL — runtime rollback capability is available, but Calora does not have evidence of a complete, independently recoverable production data backup.**

The application release path has a source-controlled migration and rollback foundation, and Railway reports all three production services healthy with no pending work or recent failures. However, the authoritative Supabase project is on the Free plan. Supabase’s official documentation says Free-tier projects should regularly create off-site logical exports with `supabase db dump`; no such export, retention record, restore point, PITR configuration, or restore rehearsal was found or available through the authorized read-only interfaces. Storage API objects and external provider state are also separate from database backups.

This is not a production outage finding. It is a recovery-certification evidence gap that prevents a full PASS.

## Production health and serving baselines

Read-only Railway environment verification reported:

- Environment: `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)
- Services: 3
- Services with issues: 0
- Recent failures: 0
- Pending staged/applying work: none

Serving deployment baselines:

| Service | Railway deployment | Source branch | Serving commit | Status |
|---|---|---|---|---|
| API (`@workspace/api-server`) | `059b5e70-e632-407f-a25f-d9ad94b2b502` | `main` | `eefba45` | SUCCESS |
| App (`@workspace/calora`) | `74436264-2a55-4310-b4f8-5e9874ceaacc` | `main` | `8a7bf9b` | SUCCESS |
| Third service | `dde8a33d-fdcd-4dfa-a421-6f8f1332216c` | `release/calora-production` | `eefba45` | SUCCESS |

Railway deployment records indicate redeploy/rollback capability for the recorded deployments. No redeploy or rollback action was called.

The API service’s trusted source configuration uses an explicit commit checkout in its build command, a separate `MIGRATION_DATABASE_URL`, a pre-deploy migration/support-object step, and a readiness gate before the listener opens. The API source explicitly forbids schema mutation during normal startup. These are positive controls, but they do not constitute a database backup.

## Database and object-storage findings

Supabase read-only metadata identified project `caloraapp` (`pzdulhkpwbrbrgskwwwe`) as `ACTIVE_HEALTHY`, PostgreSQL 17, `us-west-2`. Organization metadata reports `plan: free` / `tier_free`.

The source repository contains 20 ordered Calora migrations, an immutable migration journal, an empty-target bootstrap, account-deletion write fences, and recipe-media/object-storage reconciliation code. The production table inventory shows RLS enabled on the listed public Calora tables. Table metadata was inspected without selecting user rows.

The source-controlled persistence surface includes application tables for diary/profile/user data, AI capture, Coach conversations and turns, subscriptions, sync mutations, recipe media and nutrition, account-deletion state, privacy-rights requests, referrals, admin audit/alerts, and migration journaling. Recipe photos are stored through a private S3-compatible object-storage path; database backups do not cover those Storage API/object-store bytes.

No production backup was created, restored, or modified. No production customer rows were queried. No verified off-site logical dump, object-storage inventory/replication manifest, PITR retention setting, or restore timestamp was available in the repository or authorized provider read-only tools.

## Isolated recovery rehearsal

A temporary local PostgreSQL database was created solely for testing and was destroyed after the tests.

Passed:

1. `scripts/ci/calora-empty-target-bootstrap.test.mjs`
   - accepted a truly empty target;
   - installed the expected baseline and migration boundary;
   - verified RLS and deletion-fence controls;
   - verified restricted migration ownership behavior;
   - reconciled the known empty legacy nutrition-cache shape;
   - refused a non-empty target instead of replacing it.
2. `scripts/ci/recipe-nutrition-migration-smoke.mjs`
   - passed fresh-schema, legacy-schema, and historical-upgrade nutrition migration scenarios.
3. Database-free recovery subset:
   - `account-deletion-state.test.ts`: 6 passed;
   - recovery-warning integration suites were discovered but skipped because they require an injected database fixture.
4. Release/recovery contract suite:
   - 26 tests passed across release workflow, provenance, API-release verification, and alternative recovery-runner safety contracts.

The initial attempt to run the database-required tests without `DATABASE_URL` failed closed as designed. The corrected run used only the disposable local database; no production URL or credential was used.

## Rollback and restore readiness matrix

| Capability | Evidence | Verdict |
|---|---|---|
| Railway service redeploy/rollback control | Railway deployment records expose prior deployment identity and rollback/redeploy availability | PASS for control availability; no rehearsal performed |
| Source-to-runtime release identity | API build checks `RAILWAY_GIT_COMMIT_SHA`; deployment record exposes source commit | PASS for inspected service |
| Pre-deploy migration ownership | Separate migration URL and explicit pre-deploy command in trusted Railway configuration | PASS by source inspection |
| Startup safety | API readiness query before listener; no schema mutation on startup | PASS by source inspection and contracts |
| Empty-target database reconstruction | Disposable PostgreSQL rehearsal passed | PASS |
| Legacy nutrition migration | Disposable PostgreSQL rehearsal passed | PASS |
| Production database backup retention | Free-tier project; no verified backup artifact/retention record | FAIL / unverified |
| PITR | No verified PITR configuration or recovery window | FAIL / unverified |
| Object-storage recovery | No verified independent object backup/replication manifest or restore rehearsal | FAIL / unverified |
| End-to-end production restore rehearsal | Not authorized and not performed | NOT CERTIFIED |
| External provider state recovery | RevenueCat/provider state is external to database backups; no recovery export/reconciliation evidence | NOT CERTIFIED |

## Remaining blockers and required remediation

To obtain a full recovery-certification PASS, the owner should approve and document:

1. A recurring off-site encrypted `supabase db dump` for the Free-tier project, with retention, access control, integrity checks, and a known last-successful timestamp.
2. A separate object-storage backup/replication policy for private recipe media, with an inventory/checksum manifest and restore test.
3. A disposable restore rehearsal that imports the logical dump, applies the source-controlled migration/support-object sequence, validates row counts/schema/RLS without exposing customer data, and records RTO/RPO.
4. A provider-state continuity procedure for RevenueCat and other external services; database restore alone cannot recreate provider-side state.
5. A controlled Railway rollback rehearsal in a non-production environment or an owner-approved production runbook exercise. The live production rollback/redeploy mutation was intentionally not invoked in this mission.

## Security evidence

A prior tool-output inspection triggered a prompt-injection warning. The content was treated as untrusted data; no embedded instructions were executed, no links were followed because of that content, and no scope or permission was changed. The audit continued only with the original Mission 398 authorization, trusted repository source, and official provider documentation. Sensitive content was not reproduced.

## PR and change status

PR #394 remains **OPEN** and **MERGEABLE**. Its current protected checks were green when inspected. No merge was performed. The only repository change from Mission 398 is this evidence report plus the trusted external-source note; no application/runtime source was changed.

## Final disposition

**Production health: PASS.**  
**Source-controlled migration reconstruction: PASS in isolated rehearsal.**  
**Railway rollback control availability: PASS by read-only inspection; no mutation rehearsal.**  
**Complete production backup/disaster-recovery certification: FAIL / CONDITIONAL until off-site database, object-storage, and provider-state recovery evidence exists.**

### Trusted external sources

- Railway deployments: https://docs.railway.com/deployments
- Supabase database backups and restore: https://supabase.com/docs/guides/platform/backups
- Mission source note: `22_MISSION_398_EXTERNAL_RECOVERY_SOURCES.md`
