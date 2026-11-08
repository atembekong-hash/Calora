# Mission 404 — Production Isolation Baseline and Safety Blocker

**Date:** 2026-11-07  
**Verdict:** **PARTIAL**  
**Scope:** Establish live baseline and determine whether production source-branch isolation can be completed without an unapproved rollout

## Executive result

The live production baseline is healthy and the dedicated release branch is currently identical to protected `main`. The FatSecret gateway already uses `release/calora-production`. The API and app services still use `main`.

Railway documentation states that when changes are detected in a service source, Railway builds and deploys the service. Changing the API and app source branches from `main` to `release/calora-production` is therefore a production source configuration change that can trigger a deployment. Under Calora’s release operating rule, it cannot be performed without fresh explicit authorization for that production deployment.

Accordingly:

- No Railway source branch was changed.
- No deployment, rebuild, restart, merge, native build, store submission, credential change, database change, or customer-data operation was performed.
- PR #394 remains unmerged because production isolation is not yet complete.
- The exact remaining action is owner authorization for the controlled API/app source-branch migration, followed by a planned validation deployment.

## 1. Live production baseline

### GitHub

| Item | Current value |
|---|---|
| Protected `main` SHA | `eefba459c190605a63eb9db874556ddf9bebb5c6` |
| `release/calora-production` SHA | `eefba459c190605a63eb9db874556ddf9bebb5c6` |
| Branch divergence | None; both branches point to the same commit |
| Protected-main required check | `Run release validation suite` |
| Required check strictness | Strict / up-to-date branch required |
| Admin enforcement | Enabled |
| PR #394 | Open; head `4c94e92b5a09456cf3347a236368ac9d7ee29885`; all displayed checks successful; mergeable at baseline |

The successful PR checks include account-deletion fence validation, portable PostgreSQL integrations, and release validation. PR #394 has not been merged.

### Railway production services

Project: `attractive-harmony`  
Environment: `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)

| Service | Railway source | Latest serving deployment | Serving commit | State |
|---|---|---|---|---|
| `@workspace/api-server` | `atembekong-hash/Calora@main` | `059b5e70-e632-407f-a25f-d9ad94b2b502` | `eefba45` | SUCCESS |
| `@workspace/calora` | `atembekong-hash/Calora@main` | `74436264-2a55-4310-b4f8-5e9874ceaacc` | `eefba45` | SUCCESS |
| `Calora` / FatSecret gateway | `atembekong-hash/Calora@release/calora-production` | `dde8a33d-fdcd-4dfa-a421-6f8f1332216c` | `eefba45` | SUCCESS |

The environment reports three services, zero services with issues, zero recent failures, and no pending staged/applying work. The production environment has one Railway recipe-photo bucket and no volumes; no topology or storage configuration was changed.

### Supabase

Current Supabase project inventory contains production `caloraapp` (`pzdulhkpwbrbrgskwwwe`) as `ACTIVE_HEALTHY`. The temporary recovery project `calora-recovery-test-20261107` / `rqiwgktdqiqqwipznyyf` is no longer present in the current project inventory, consistent with the latest mission state. No Supabase project was modified by this mission.

## 2. Deployment-trigger determination

Railway documentation retrieved during this mission states that, after service creation, changes detected in a service source cause Railway to build and package the service. The production deployment history also shows source-branch-associated deployment records for the current services.

Therefore the following operation is classified as a production deployment risk:

```text
Change @workspace/api-server source: main -> release/calora-production
Change @workspace/calora source: main -> release/calora-production
```

Although the two branches currently contain the same commit, changing the service source configuration can still cause Railway to rebuild/redeploy. The equal SHA makes the content compatible, but it does not make the source-configuration mutation non-deploying.

## 3. Isolation status

| Isolation requirement | Result | Evidence |
|---|---|---|
| Dedicated release branch exists | PASS | Remote `release/calora-production` exists. |
| Release branch equals current main | PASS | Both resolve to `eefba459c190605a63eb9db874556ddf9bebb5c6`. |
| FatSecret gateway uses release branch | PASS | Railway service description. |
| API uses release branch | BLOCKED | API remains connected to `main`. |
| App uses release branch | BLOCKED | App remains connected to `main`. |
| Main merge cannot affect production API/app | FAIL / NOT ESTABLISHED | API/app still follow `main`; source changes trigger builds/deployments. |
| Production Supabase connection unchanged | PASS | No configuration mutation performed; production project remains healthy. |
| Production health | PASS | Three services healthy; no recent failures or pending work. |
| PR #394 safe to merge now | NO | Merging into `main` could still trigger API/app production rollouts. |

## 4. Required safe migration, pending authorization

The smallest safe production action is:

1. Obtain fresh owner authorization that explicitly names the API/app source-branch migration and permits the resulting production deployment(s).
2. Confirm the release branch is still the intended content and remains protected.
3. Change only `@workspace/api-server` and `@workspace/calora` from `main` to `release/calora-production`; do not change the FatSecret gateway, domains, environment variables, credentials, storage bucket, or Supabase project.
4. Observe and record the resulting deployment IDs and serving commits.
5. Verify all three services are healthy and the production Supabase project remains healthy.
6. Verify subsequent `main` merges do not create deployments for API/app.
7. Only after isolation is proven, refresh PR #394, rerun required checks, and merge through protected GitHub procedures.

No part of this migration was executed because the current mission prohibits an unapproved production deployment.

## 5. Rollback if separately authorized

If an authorized source migration causes a service regression:

1. Stop further release actions.
2. Use Railway’s supported rollback/redeploy control to restore the last known-good serving deployment, or restore the previous source branch only under explicit authorization.
3. Verify API, app, FatSecret gateway, and Supabase health.
4. Record exact deployment IDs, serving commits, and the rollback reason.
5. Do not merge PR #394 until the isolation state and health evidence are re-established.

No rollback control was invoked.

## Final verdict

**PARTIAL.** Baseline, branch compatibility, current health, and the exact deployment-safety blocker are established. Production isolation is incomplete because API and app remain connected to `main`, and switching them to the release branch is a deployment-triggering production change.

**Owner action required:** explicitly authorize the API/app Railway source-branch migration and its resulting production deployment. Until that authorization is provided, PR #394 must remain open and unmerged.
