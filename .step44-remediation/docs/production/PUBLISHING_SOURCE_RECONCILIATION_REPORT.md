# Replit Publishing source reconciliation report

Date: 2026-08-27
Status: **RESOLVED — the owner authorized and published the forward source**
Initial authorization: **DO NOT PUBLISH until an explicit source decision**
Final authorization: **PUBLISH THE FORWARD CANDIDATE — completed**

## Scope

The initial investigation was limited to determining why Replit Publishing was
not building the source represented by the active task workspace. The agent did
not change application code, a production safety control, a Fact Context
control, or a production database record. The owner later chose the forward
release path, confirmed the protected sensitive-activation controls were
cleared, and initiated Publishing.

Required workspace identity:

- commit: `44ca360f13818f51d989690e26740278e545f102`
- tree: `7287a23a683842719f04f5adb4fdd1c6d9550ee0`

Observed Publishing identity:

- source tree: `d1ae9d1af9e7f898188d53533624400bed56b658`
- representative generated deployment commits observed during verification:
  `34f65daca34e03a62ee91fea8a6a481de7b47d95` and
  `a2d724d37e982548974615ecce07e348842c21d4`

## Finding

The Publishing source is not a stale cache that can be refreshed from inside
this task. The active Agent task is an isolated project copy. Replit Publishing
snapshots the **applied main project version**, not local Git refs changed
inside an active isolated task.

Replit documentation returned the following supported behavior:

1. Agent tasks run in isolated copies and do not change the main project until
   their work is reviewed and applied.
2. Publishing snapshots the applied main project state.
3. Publishing cannot select a historical commit or branch from inside an
   active isolated task.
4. The supported lifecycle is to finish/apply or cancel the task, then publish
   the resulting main project state.

Relevant documentation:

- https://docs.replit.com/core-concepts/agent/task-system
- https://docs.replit.com/features/agent/task-lifecycle
- https://docs.replit.com/features/publishing/overview

The earlier description of `d1ae9d1a...` as a stale task mirror was therefore
incorrect. It is the source tree currently represented by the applied main
project from which Publishing is designed to build.

## Evidence

### Isolated task workspace before managed completion

Before this report was created:

- `git status --porcelain --untracked-files=all` returned no output.
- `git rev-parse HEAD` returned
  `44ca360f13818f51d989690e26740278e545f102`.
- `git rev-parse HEAD^{tree}` returned
  `7287a23a683842719f04f5adb4fdd1c6d9550ee0`.
- local `main`, local `subrepl-fgea4gv2`, and `origin/main` all resolved to
  `44ca360f13818f51d989690e26740278e545f102`.

This identity was proven before the task-completion rebase. The report and
memory note were the only task changes; no application source was changed.

### Final managed-rebase state

Completing the blocked investigation required Replit's managed task rebase onto
the applied main project. That rebase preserved the later application source
instead of rolling it back. The applied-main parent tree was
`d1ae9d1af9e7f898188d53533624400bed56b658`.

The rebase changed only this report and the two project-memory files. It did
not change application code or trigger a deployment. Consequently, the
historical `44ca360f...` identity is retained as investigation evidence but is
not the final post-rebase `HEAD`.

### Publishing source

Repeated fresh publishes produced new deployment commit identifiers but kept
serving source tree `d1ae9d1af9e7f898188d53533624400bed56b658`.
Aligning local task-workspace refs did not change that result, proving that
Publishing was not reading those isolated refs.

### Later valid work was preserved

The later source remains reachable at:

- backup ref: `backup/release-518-source-before-align`
- commit: `64868661f65144748e06eea691847e664e2e7cbe`
- tree: `d1ae9d1af9e7f898188d53533624400bed56b658`

The difference from `44ca360f...` includes 14 files and contains later legal
and support routes, release verification, tests, metadata, and sign-up changes.
No commit object or later source was deleted.

Because those trees contain different application source, making the applied
main project equal `7287a23a...` would necessarily omit the later
`d1ae9d1a...` changes from the deployed snapshot. That is a rollback of later
valid code and is explicitly outside the authorized scope.

### Production safety controls

Read-only verification after the investigation:

- `POST /api/v1/coach/fact-context/respond` returned HTTP `404` with
  `Coach Fact Context is unavailable.`
- production `calora_server_config` has
  `coach_fact_context_rollout_enabled = false`.
- production cohort `coach_fact_context_v1` has `0` total members and
  `0` active members.
- recent production logs contained no Fact Context, sensitive activation,
  cohort, consent, rollout, or activation events.
- the checked-in shared process gate remains
  `COACH_FACT_CONTEXT_ENABLED = "false"`.

No environment secret value was read or changed. No production SQL mutation
was executed.

## Actions taken

1. Verified the requested commit and tree in the isolated workspace.
2. Rebuilt the API locally and compared its `/api/version` identity with live
   production.
3. Verified health, CORS allow/deny behavior, and association files.
4. Temporarily aligned local `main` and the active local task ref to the
   requested commit while retaining the later source on a backup ref.
5. Confirmed that new publishes still used the applied main project tree.
6. Attempted only read-only/dry-run access to the internal task mirror. The
   Replit SSH proxy required separate authentication, so no remote write or
   history rewrite occurred.
7. Consulted Replit documentation to establish the supported task and
   Publishing source lifecycle.
8. Stopped publishing once the source boundary was proven.

## Blocker

The two requirements below cannot both be satisfied through supported
self-service Publishing:

1. deploy exact tree `7287a23a683842719f04f5adb4fdd1c6d9550ee0`; and
2. do not roll back or omit later valid tree
   `d1ae9d1af9e7f898188d53533624400bed56b658`.

Publishing has no historical-revision selector, and applying this older
isolated task state to the newer applied main project would be a rollback.

## Required owner-side action (completed)

The owner explicitly selected the first path below and completed Publishing
after the forward candidate passed validation and independent review.

Choose one of these explicitly different release decisions:

1. **Preserve later valid code:** cancel/close this isolated task without
   applying its older source state, retain the applied main project at
   `d1ae9d1a...`, and create a newly reviewed release target for that tree.
   This is the safe option, but it changes the requested release identity.
2. **Require the exact historical tree:** ask Replit Support whether they can
   pin the existing deployment to the historical commit/tree without changing
   the applied main project. This is not available through the documented
   Publishing UI. Do not use a checkpoint rollback because that would violate
   the requirement to preserve later valid code.

Exact Replit Support request:

> During task 518, Publishing correctly snapshotted the applied main project,
> then tree d1ae9d1af9e7f898188d53533624400bed56b658, while the active Agent
> task was an isolated clean checkout at commit
> 44ca360f13818f51d989690e26740278e545f102 / tree
> 7287a23a683842719f04f5adb4fdd1c6d9550ee0. We must preserve all later valid
> main-project code and Git history, must not change production controls, and
> must not enable Fact Context. Does Replit have a provider-side supported way
> to pin the existing deployment build source to that historical commit/tree
> without applying or rolling back the main project? If not, please confirm
> that these requirements cannot be satisfied on the existing deployment and
> advise the supported release workflow.

## Forward release resolution

The owner authorized preserving later valid code and reviewing a new release
target. The approved application candidate was:

- candidate commit: `64868661f65144748e06eea691847e664e2e7cbe`
- candidate source tree: `d1ae9d1af9e7f898188d53533624400bed56b658`

Pre-publish validation completed successfully:

- API typecheck passed.
- 29 test files passed with 360 tests passed and 4 intentionally skipped.
- 13 release-attestation tests passed.
- the production build passed with both sensitive-activation variables unset.
- an independent release review returned `APPROVE`; no changed code could open
  Coach Fact Context.

The owner confirmed both sensitive-activation controls were cleared and clicked
Publish. The resulting live release attestation is:

- deployment commit: `80518c6122d2fa2757269b45157fc9a274225e41`
- source tree: `d1ae9d1af9e7f898188d53533624400bed56b658`
- source digest:
  `13aa6ff618f68da2e0e99641292c20499da3a1b7857494e08eac7266793b1da9`
- release ID:
  `calora-api-80518c6122d2-20260827074135754`
- build timestamp: `2026-08-27T07:41:35.754Z`

The digest was independently recomputed from the deployment commit and source
tree, and the strict runtime-identity verifier passed over canonical HTTPS. The
public-release verifier also passed from a clean checkout of the approved
candidate tree.

Post-publish verification:

- `/api/version`, `/api/healthz`, and `/api` returned the expected release and
  healthy responses.
- allowed-origin CORS preflight returned `204` with the exact allowed origin;
  an unapproved origin returned `403`.
- Apple and Android association files returned `200` with the configured app,
  package, and signing identifiers.
- privacy, terms, and support routes returned `200`.
- `POST /api/v1/coach/fact-context/respond` returned `404` with
  `Coach Fact Context is unavailable.`
- production `coach_fact_context_rollout_enabled` remained `false`.
- cohort `coach_fact_context_v1` remained at `0` total and `0` active members.
- deployment status was successful and public.
- startup probes briefly returned `500` before the artifact ports were ready;
  the API then reported its listening port and no post-ready errors occurred.
- post-ready logs contained no sensitive activation, rollout, cohort, consent,
  or activation-request events.

## Final verdict

**Published successfully from the approved forward source. Fact Context remains
disabled.**

The historical `44ca360f...` release requirement was superseded by the owner's
explicit decision to preserve and publish the later valid source. The live tree
matches the approved forward candidate, the release identity and public routes
are verified, production safety gates remain deny-all, and post-ready logs are
clean.