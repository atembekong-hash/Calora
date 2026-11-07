# Mission 399 — Production Recovery and Release Separation Closure

**Status:** BLOCKED at required safety preconditions  
**Date:** 2026-11-07  
**PR:** #394 — remains open and unmerged

## Executive result

Mission 399 could not reach the merge or production-migration phases without violating its own prerequisites.

Two independent blockers remain:

1. **Recoverable backup not established:** the sandbox has no production database credential or approved provider export session, and no owner-approved encrypted private destination/key or retention configuration was supplied. `pg_dump`, `gpg`, and `openssl` are installed locally, but tools alone do not authorize access to production or establish safe backup custody. No export was attempted.
2. **Railway separation is incomplete:** the API and app services still source GitHub `main`. Only the FatSecret gateway service sources `release/calora-production`. Therefore it would be unsafe to merge PR #394 under the rule that separation must be independently verified first.

No production database write, restore, deployment, restart, rollback, configuration change, credential change, customer-data query, native build, or store submission was performed.

## Phase 1 — Backup and recovery

### Authoritative persistence

- Supabase project: `caloraapp` (`pzdulhkpwbrbrgskwwwe`)
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.6.1.155
- Region: `us-west-2`
- Organization plan: `free`
- Database application data: Calora PostgreSQL tables and migration journal
- Separate persistent media: private S3-compatible recipe-photo object storage configured through the API service
- Separate external state: RevenueCat and other provider-side records

Supabase’s official backup documentation says Free-tier projects should regularly create off-site logical exports with `supabase db dump`. It also states that database backups do not include Storage API objects and do not recreate external provider state.

### What was tested safely

The source-controlled reconstruction procedure passed against a disposable local PostgreSQL database:

- Empty-target bootstrap and refusal of non-empty targets
- RLS and deletion-fence checks
- Restricted migration ownership behavior
- Fresh and legacy recipe-nutrition migration scenarios
- Database-free recovery and release contract tests

The disposable database was destroyed after testing. This proves reconstruction logic, not production backup availability.

### Exact missing prerequisite

Before a backup can be created, the owner must provide or authorize all of the following through an approved provider workflow:

1. A least-privilege, read-only production export session or approved Supabase export mechanism.
2. A private encrypted destination outside GitHub, with an approved encryption recipient/key or managed encryption service.
3. Retention, access-control, integrity-verification, and deletion rules for the backup.
4. A separate object-storage inventory/backup procedure for private recipe media.
5. An isolated recovery environment and authorization to restore/import the backup there.

Until those are available, exporting production data would be unsafe and was correctly skipped.

## Phase 2 — Actual Railway configuration

Read-only `describe-service` results, not deployment-history inference:

| Service | Service ID | Source branch | Latest deployment | Serving SHA | Status |
|---|---|---|---|---|---|
| API / `@workspace/api-server` | `12af1b5f-0e00-4c41-ba51-f6b3901d7be7` | `main` | `059b5e70-e632-407f-a25f-d9ad94b2b502` | `eefba45` | live |
| App / `@workspace/calora` | `c9c9f941-10fa-4495-88cf-ba9999a28af7` | `main` | `74436264-2a55-4310-b4f8-5e9874ceaacc` | `8a7bf9b` | live |
| FatSecret gateway / `Calora` | `34cc2dda-a35e-49c4-a93f-b6846c2a0f02` | `release/calora-production` | `dde8a33d-fdcd-4dfa-a421-6f8f1332216c` | `eefba45` | live |

All three services reported no staged changes. Railway production health reported three services, zero issues, zero recent failures, and no pending work.

This resolves the Mission 397/398 discrepancy: the third service is genuinely on `release/calora-production`, but the other two production services are still on `main`. The environment is therefore **not separated**.

## Phase 3 — Controlled Railway migration

Not executed. Mission 399 requires a usable recovery point and tested recovery procedure before migrating any service. The isolated migration rehearsal is not a production recovery point. No Railway source branch, deployment, restart, or environment configuration was changed.

## Phase 4 — PR #394

PR #394 is currently:

- State: `OPEN`
- Mergeability: `MERGEABLE`
- Head commit: `1636788d4a1c2bb00a624eb1977abd9764559a91`
- Required checks: still updating after the latest documentation push; no merge was attempted

The PR must remain unmerged until all production services are independently confirmed to source the controlled release branch and the backup/recovery precondition is satisfied.

## Owner actions required to close Mission 399

1. Establish the approved encrypted backup destination and retention policy.
2. Authorize or provide the least-privilege export session through the approved provider path.
3. Back up database and private object storage separately; record checksums and timestamps without exposing records.
4. Restore into an isolated recovery environment and record measured recovery time and integrity results.
5. Move the API and app Railway source branches to `release/calora-production` through the supported Railway dashboard/control-plane workflow, one service at a time, during the approved maintenance window.
6. Re-read each service configuration after migration and verify health after each change.
7. Only then refresh PR #394, verify protected checks, merge through protected `main`, and confirm no unintended Railway rollout.

## Final verdict

- Production health: **PASS**
- Isolated migration reconstruction: **PASS**
- Railway rollback/redeploy control availability: **PASS by read-only inspection**
- Safe production backup: **BLOCKED — missing authorized export access and encrypted custody prerequisites**
- Railway release separation: **FAIL / INCOMPLETE — API and app still source `main`**
- PR #394 merge: **NOT PERFORMED — correctly withheld**

### Sources

- Mission 398 recovery certification: `23_MISSION_398_RECOVERY_CERTIFICATION_VERDICT.md`
- Trusted provider sources: `22_MISSION_398_EXTERNAL_RECOVERY_SOURCES.md`
- Railway deployments: https://docs.railway.com/deployments
- Supabase backups: https://supabase.com/docs/guides/platform/backups
