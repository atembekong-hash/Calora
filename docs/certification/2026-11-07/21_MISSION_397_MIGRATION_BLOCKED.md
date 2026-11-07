# Calora Mission 397 — Railway Migration Blocked Safely

**Date:** 2026-11-07  
**Project:** Railway `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`)  
**Environment:** `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)

## Stop decision

The controlled migration was stopped before changing any production service. The first authorized source-branch mutation for `Calora` returned a Railway MCP transport error (`unexpected EOF`) before a result was received. Immediate read-only inspection established that the mutation did not apply:

- `Calora` still references `atembekong-hash/Calora@main`.
- Its latest deployment remains `df4cfff8-a4ba-450e-ad28-f5c856ead247`.
- Its configuration reports no staged changes.
- Production remains healthy.
- No additional migration call was attempted.
- The other two services were not modified.

Under Mission 397’s rule to stop when a service operation is uncertain or fails, the migration did not continue.

## Preflight evidence

- `main` baseline: `eefba459c190605a63eb9db874556ddf9bebb5c6`.
- `release/calora-production`: exact same commit `eefba459c190605a63eb9db874556ddf9bebb5c6`.
- Release branch protection: strict `Run release validation suite`, one approving review, stale-review dismissal, administrator enforcement, and required signed commits.
- PR #394: open and mergeable at head `6417852e0b7c38ce0e76f929108bcc009f614cce`; required checks were green at preflight.
- Railway environment: three services healthy, zero recent failures, no staged/applying work.

## Current serving identities

- `Calora`: deployment `df4cfff8-a4ba-450e-ad28-f5c856ead247`, serving `eefba459`, source branch `main`.
- `@workspace/api-server`: deployment `059b5e70-e632-407f-a25f-d9ad94b2b502`, serving `eefba459`, source branch `main`.
- `@workspace/calora`: deployment `74436264-2a55-4310-b4f8-5e9874ceaacc`, serving `8a7bf9b`, source branch `main`.

The web service’s SHA difference is pre-existing deployment history: its latest successful deployment is older than the API and gateway deployments. No new discrepancy was introduced by Mission 397.

## Exact intervention required

A Railway operator must resolve the `unexpected EOF` control-plane/API failure or perform the branch change in the Railway dashboard during an approved maintenance window. Before retrying, confirm the service’s source branch and deployment history again. Do not blindly repeat the mutation call.

The migration must then resume one service at a time, with immediate health and deployment-history inspection after each save. If Railway begins a deployment, monitor it to completion as an authorized migration side effect before changing another service. No automatic restart, redeploy, or rollback is authorized.

## Actions not performed

No Railway source branch, autodeploy setting, build setting, deployment, rebuild, restart, rollback, environment variable, credential, database, customer record, native build, store submission, or Android-device operation was performed.

PR #394 remains unmerged because production is still connected to `main` and merge-to-deploy separation has not been established.

## Certification verdict

The authoritative commercial verdict remains **NOT CERTIFIED — BLOCKED**. The source-level PR #394 repairs remain technically validated, but physical Android Auto Scan, database isolation, live operational, iOS signing/device, commercial billing, Coach production, provider/media, and other certification evidence gaps remain unresolved.
