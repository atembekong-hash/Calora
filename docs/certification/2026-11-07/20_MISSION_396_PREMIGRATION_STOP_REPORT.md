# Calora Mission 396 — Controlled Railway Production Branch Migration

**Date:** 2026-11-07  
**Project:** Railway `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`)  
**Environment:** `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)

## Final decision

**STOPPED BEFORE PRODUCTION CONFIGURATION CHANGE.**

The production source-branch migration could not be established as a no-deployment operation. Railway’s documented UI can change the connected trigger branch, but the available Railway control surface does not expose a verified atomic “change branch without deploy” operation. Railway’s source-connection operation is explicitly described as building immediately, and the service update operation does not include the GitHub trigger branch or autodeploy switch. The dashboard branch-change behavior was not experimentally tested on live production because doing so could trigger an unauthorized rollout.

No Railway source branch, autodeploy setting, build setting, deploy setting, variable, credential, domain, database, customer record, or runtime process was changed.

## Phase 1 evidence

### GitHub release baseline

- `main`: `eefba459c190605a63eb9db874556ddf9bebb5c6`
- `release/calora-production`: `eefba459c190605a63eb9db874556ddf9bebb5c6`
- Baseline comparison: exact match; no release-branch-only changes.
- Release branch protection: strict `Run release validation suite`, one approving review, stale-review dismissal, administrator enforcement, and required signed commits.
- PR #394: open and mergeable; latest head `1f9b5aae71a057d041b5dad2438b1870b77372a7`.
- At the final check, the new PR commit’s release validation was still in progress; other fresh checks were successful. The PR was not merged.

### Current Railway source configuration

All three production services still point to `atembekong-hash/Calora@main`:

- `Calora` — service `34cc2dda-a35e-49c4-a93f-b6846c2a0f02`.
- `@workspace/api-server` — service `12af1b5f-0e00-4c41-ba51-f6b3901d7be7`.
- `@workspace/calora` — service `c9c9f941-10fa-4495-88cf-ba9999a28af7`.

The current source configuration was exported read-only through Railway service descriptions. Build commands, start commands, health checks, watch patterns, domains, and replica settings were inspected. Variable names were visible for rollback inventory; secret values were not read or exported.

### Pre-migration serving identities

- `Calora`: deployment `df4cfff8-a4ba-450e-ad28-f5c856ead247`, successful, serving commit `eefba459`.
- `@workspace/api-server`: deployment `059b5e70-e632-407f-a25f-d9ad94b2b502`, successful, serving commit `eefba459`.
- `@workspace/calora`: deployment `74436264-2a55-4310-b4f8-5e9874ceaacc`, successful, serving commit `8a7bf9b`.

The web service discrepancy is explained by deployment history: its latest successful serving deployment is older (`8a7bf9b`), while a later `eefba459` deployment record is skipped rather than live. The service is healthy but does not currently serve the same SHA as the API/gateway services.

### Production health

At the final read-only check:

- all three services were online;
- there were zero recent service failures;
- there was no staged or applying work;
- no new deployment appeared after branch creation or GitHub protection preparation.

## Why migration was not applied

Railway’s documentation confirms that linked services automatically deploy from commits pushed to their configured branch, that the branch is selected per service, and that autodeploy can be disabled. It does not establish that saving a source-branch change is non-deploying. The available MCP operation for attaching a GitHub source says it builds immediately, and the available service update contract has no source-branch/autodeploy field.

Because the mission explicitly forbids experimenting on live production, the migration was not attempted. Therefore it is not yet possible to claim that future merges to `main` no longer trigger production deployments.

## Configuration actually applied

Only GitHub preparation was applied:

- created `release/calora-production` at the exact protected-main baseline;
- applied direct branch protection and required signatures to that branch;
- committed the Mission 396 stop report to the PR #394 source branch.

Railway configuration changes applied: **none**.

## Controlled maintenance-window procedure for owner approval

1. Owner selects a maintenance window and confirms that a rollout caused by a branch-setting save is acceptable and reversible.
2. Capture fresh Railway service descriptions and deployment IDs immediately before the change.
3. Change only the GitHub trigger branch for one service from `main` to `release/calora-production` in Railway Service Settings.
4. If the UI exposes a separate autodeploy toggle, disable it and confirm the saved state.
5. Immediately inspect deployment history, health, and serving SHA. Stop if the service enters any rollout state.
6. Repeat for the other two services only after the first service’s configuration and health are confirmed.
7. Verify all three services reference the release branch and that no unintended deployment occurred.
8. Only then refresh PR #394 checks and merge if all required checks are green.
9. After merge, verify that no Railway deployment was created and record the merge SHA.

This procedure requires a separate authorization because changing the Railway source branch may itself deploy.

## Rollback

If the owner approves the maintenance-window operation and a service begins an unintended rollout, stop further migration and do not restart or redeploy automatically. Restore the previous branch setting only under the owner’s explicit rollback decision, then verify health and serving SHA. The prior source branch for every service is `main`; the pre-migration serving deployment IDs and SHAs are recorded above.

## Certification verdict

The authoritative commercial verdict remains **NOT CERTIFIED — BLOCKED**. PR #394’s source-level repairs remain technically ready, but the PR is intentionally unmerged. Outstanding blockers continue to include database tenant-isolation evidence, live operational identity and rollback/restore evidence, commercial purchase lifecycle and store operations, iOS signing/device evidence, current Android release-candidate and physical Auto Scan verification on the Samsung Galaxy S20, Coach authenticated persistence/production evidence, live provider/media flows, and the unresolved legacy/orphan API contract review.

No Android or iOS build, store submission, database change, customer-data change, secret change, deployment, rebuild, restart, or rollback was performed.

## Exact next owner action

Approve a maintenance-window execution of the controlled three-service Railway source-branch change, acknowledging that the setting save may trigger a rollout. Until that approval is separately granted, leave Railway on `main` and leave PR #394 unmerged.

## Reference

[1]: https://docs.railway.com/deployments/github-autodeploys "Railway Controlling GitHub Autodeploys"
