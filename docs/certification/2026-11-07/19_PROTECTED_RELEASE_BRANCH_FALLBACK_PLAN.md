# Calora Protected Production Release-Branch Fallback Plan

**Mission:** 395  
**Date:** 2026-11-07  
**Project:** Railway `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`)  
**Production environment:** `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)

## Decision

A dedicated `release/calora-production` branch is a viable conservative fallback, but it is **prepared, not connected**. Railway production still tracks `main`; therefore the requested decoupling is not yet live. PR #394 remains open and unmerged.

The branch was created from protected-main commit `eefba459c190605a63eb9db874556ddf9bebb5c6` and has no source changes relative to that baseline. It is not connected to any Railway service.

## Verified current Railway trigger model

Railway’s published GitHub autodeploy documentation states that a linked service automatically deploys when commits are pushed to its connected branch. It also states that the trigger branch is configured per service in Service Settings, and that automatic deployments can be disabled. Manual deployment is then available through Railway’s “Deploy Latest Commit” command.

The current read-only service configurations show all three production services connected to `atembekong-hash/Calora@main`:

- `Calora` — `34cc2dda-a35e-49c4-a93f-b6846c2a0f02`
- `@workspace/api-server` — `12af1b5f-0e00-4c41-ba51-f6b3901d7be7`
- `@workspace/calora` — `c9c9f941-10fa-4495-88cf-ba9999a28af7`

The repository’s workflows do not call Railway deployment APIs. The new branch is not a connected Railway branch, so its creation caused no Railway deployment. GitHub did start a repository CI workflow on the branch because `account-deletion-fence.yml` has an unrestricted `push` trigger; this is a GitHub CI effect, not a production rollout.

The current Railway MCP configuration-update surface does not expose the GitHub autodeploy enable/disable flag or source-branch trigger field. Consequently, no safe API mutation was attempted. The production source branch remains unchanged.

## Prepared GitHub controls

The branch now exists at:

`release/calora-production` → `eefba459c190605a63eb9db874556ddf9bebb5c6`

Direct branch protection was applied with the following controls:

- strict required status check: `Run release validation suite`;
- one approving pull-request review;
- stale review dismissal;
- administrator enforcement;
- required signed commits;
- no force-pushes or branch deletion through the protected-branch policy.

The existing `Calora Release Protection` ruleset remains unchanged because its update endpoint rejected the existing `pull_request` rule representation when asked to add a second target. The new branch’s direct protection supplies the same material review/check/signature controls without weakening the existing ruleset.

## Safe migration sequence requiring separate owner approval

1. Confirm the current production serving identities and export the three current Railway service settings for rollback.
2. In each of the three Railway production service settings, change the GitHub trigger branch from `main` to `release/calora-production`. Do not change repository, root directory, build command, start command, variables, credentials, domains, or watch patterns.
3. Before saving each service, confirm Railway presents the intended branch and no other pending configuration change.
4. Treat saving the branch change as potentially deployment-triggering. The owner must explicitly approve that live configuration action separately; this mission did not perform it.
5. After the branch change is saved, inspect deployment history immediately. If any service begins `QUEUED`, `INITIALIZING`, `BUILDING`, or `DEPLOYING`, stop and do not perform further migration steps.
6. If Railway offers a distinct “Disable automatic deployments” control, disable autodeploy for each production service after the branch is selected. Verify the saved state in Service Settings. This is the preferred manual-release posture.
7. Make a harmless, non-production branch commit only after the owner has approved a trigger test, or rely on Railway’s documented saved configuration state. Do not use a production commit as a trigger test.
8. Verify that a future push to `main` has no matching Railway deployment event and that the production services remain on the previous serving SHA.
9. Record the final trigger branch and autodeploy state for all three services.
10. Only after this evidence is complete should a separate owner-approved production deployment be considered.

## Rollback and emergency hotfix

**Configuration rollback:** restore each service’s trigger branch to `main`, preserving all other settings. Treat the save as potentially deployment-triggering and inspect deployment history immediately. If the service starts a rollout unexpectedly, stop further changes and use Railway’s owner-approved rollback/redeploy procedure; do not restart or redeploy automatically.

**Release rollback:** use the last known-good `release/calora-production` commit and the Railway rollback control for the affected service only, after explicit deployment authorization. Record the deployment ID and serving SHA.

**Emergency hotfix:** create a focused branch from the last protected release commit, open a PR into `release/calora-production`, pass the required release validation check and one review, then merge. Do not merge directly to the protected release branch. If the hotfix must land in `main`, merge it to `main` first and then promote the exact same SHA through a release PR; never use an unreviewed branch push as the production source.

## Current health and deployment evidence

At the post-preparation read-only check, all three Railway production services were online with no pending staged/applying work and no recent failures. The last known successful serving deployments remain tied to `eefba459`:

- `Calora`: deployment `df4cfff8-a4ba-450e-ad28-f5c856ead247`;
- `@workspace/api-server`: deployment `059b5e70-e632-407f-a25f-d9ad94b2b502`;
- `@workspace/calora`: deployment `74436264-2a55-4310-b4f8-5e9874ceaacc`.

The first two services’ latest deployments were created at `2026-11-07T18:50:15.973Z`; the web service’s latest deployment was created at `2026-11-07T11:27:33.139Z`. No deployment was created by this mission’s branch creation or GitHub protection changes.

## PR #394 and certification boundary

PR #394 remains **OPEN** and **MERGEABLE** at `ad71360ab9fdd2f0bc7f33c1180a12074df512d5`. Its required release validation, portable PostgreSQL, and account-deletion checks are green. It remains intentionally unmerged because Railway still tracks `main`; merging before the Railway migration would risk an automatic production rollout.

The authoritative certification verdict remains **NOT CERTIFIED — BLOCKED**. The unresolved material items include:

- CAL-02: legacy/orphan API contract paths require removal, routing, or an explicit intentional contract;
- CAL-03: authenticated Coach persistence and deletion evidence remains unavailable;
- CAL-04/CAL-08/CAL-09/CAL-13/CAL-26/CAL-30: physical/native interaction, Health Connect, accessibility, iOS device, live recipe-generation, and native commercial acceptance evidence remain unrun;
- CAL-07: no current protected-main signed Android release candidate has been built and installed;
- CAL-12: current Apple signing, App Store Connect, signed artifact, and tester evidence is absent;
- CAL-15/CAL-16/CAL-17: independent tenant-isolation/database-role, live operational identity, and rollback/restore evidence remain incomplete;
- CAL-20/CAL-22/CAL-23/CAL-25/CAL-28/CAL-29: live provider sync, Coach production provenance/operations, database-backed recipe media, purchase lifecycle, and store/legal/support evidence remain blocked;
- Samsung Galaxy S20 Auto Scan verification still requires an authorized fresh compatible binary and physical execution.

PR #394 remediates source-level camera recovery, calorie recommendation boundaries, and iOS repository preflight contracts. Those source-level results do not by themselves close the physical, production, commercial, or database evidence gaps.

## Approvals still required

The following actions require a separate owner approval and were not performed here:

1. Change the Railway trigger branch for all three production services.
2. Disable Railway autodeploy for all three services, if the dashboard exposes and saves that control.
3. Merge PR #394 after the branch migration is independently verified.
4. Trigger any production deployment or rollback.
5. Build or distribute any native Android/iOS artifact.

**Current status:** release branch and GitHub protections prepared; Railway unchanged; PR #394 unmerged; production healthy; no build, deployment, restart, data, secret, or credential operation performed.

## References

[1]: https://docs.railway.com/deployments/github-autodeploys "Railway Controlling GitHub Autodeploys"
