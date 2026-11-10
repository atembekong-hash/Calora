# Mission 404 — Completion Evidence

**Date:** 2026-11-07  
**Final verdict:** **PASS for production deployment isolation and protected PR integration**  
**CAL-17:** Remains separately **BLOCKED**; this mission does not certify disaster recovery

## Executive result

The authorized Railway production source-branch migration completed successfully for the two named services:

- `@workspace/api-server`: migrated from `main` to `release/calora-production` and deployed successfully.
- `@workspace/calora`: migrated from `main` to `release/calora-production`; Railway detected no watched-path changes and marked the migration deployment `SKIPPED`; the service remained online on its existing approved serving revision.

The FatSecret gateway was not modified. Production Supabase, credentials, environment variables, domains, storage, and customer data were not intentionally changed.

PR #394 passed all required checks and was merged through protected main. The merge advanced `main` only; production services follow `release/calora-production`, which was not promoted or changed. No Railway deployment was created from the merge commit.

## 1. Before-and-after Railway source configuration

### Before migration

| Service | Source before | Serving commit before |
|---|---|---|
| `@workspace/api-server` | `atembekong-hash/Calora@main` | `eefba45` |
| `@workspace/calora` | `atembekong-hash/Calora@main` | `eefba45` |
| `Calora` / FatSecret gateway | `atembekong-hash/Calora@release/calora-production` | `eefba45` |

### After migration

| Service | Source after | Result |
|---|---|---|
| `@workspace/api-server` | `atembekong-hash/Calora@release/calora-production` | Live and healthy |
| `@workspace/calora` | `atembekong-hash/Calora@release/calora-production` | Source changed; migration deployment skipped because no watched-path changes; service online |
| `Calora` / FatSecret gateway | `atembekong-hash/Calora@release/calora-production` | Unchanged, live and healthy |

No shared variables, volumes, domains, or the single Railway bucket `calora-recipe-photos` were changed.

## 2. Branch and release controls

| Control | Evidence |
|---|---|
| Protected `main` before merge | Required `Run release validation suite`; strict status checks; admin enforcement enabled |
| `main` before migration | `eefba459c190605a63eb9db874556ddf9bebb5c6` |
| `release/calora-production` before and after | `eefba459c190605a63eb9db874556ddf9bebb5c6` |
| Branch divergence at migration | None; release and main were identical before the merge |
| PR #394 head | `a3dcf46679e9e911f59c31dae5a35a7ad5b305cb` |
| PR #394 checks | Required release validation, deletion-fence, and PostgreSQL integration checks successful |
| PR #394 merge | Protected merge completed at 2026-11-08T00:49:43Z |
| Resulting protected-main SHA | `ef7de6348922b83af14a5e8ad00cc648bd8b88fa` |
| Release-branch promotion | Not performed, as explicitly required |

## 3. Exact deployment evidence

### API service

- Service: `@workspace/api-server`
- Service ID: `12af1b5f-0e00-4c41-ba51-f6b3901d7be7`
- Deployment ID: `10585054-72e1-4727-af32-86521826aa9c`
- Status: `SUCCESS`
- Source branch: `release/calora-production`
- Commit: `eefba459c190605a63eb9db874556ddf9bebb5c6`
- Runtime: server listening on port 8080
- Pre-deploy: all migrations already applied; support objects provisioned successfully

### App service

- Service: `@workspace/calora`
- Service ID: `c9c9f941-10fa-4495-88cf-ba9999a28af7`
- Source branch after migration: `release/calora-production`
- Migration deployment ID: `8f6afd8d-05ab-4ef1-85a9-c995c775e17b`
- Migration deployment status: `SKIPPED`
- Skip reason: Railway reported `no changes detected in watch paths, build will skip`
- Serving deployment remained: `74436264-2a55-4310-b4f8-5e9874ceaacc`
- Serving commit: `eefba459c190605a63eb9db874556ddf9bebb5c6`
- Final service state: online

The app source configuration is now release-branch based even though no new image was required. The service remained healthy on the same approved commit, so the skip did not introduce an unverified runtime revision.

### FatSecret gateway

- Service: `Calora`
- Service ID: `34cc2dda-a35e-49c4-a93f-b6846c2a0f02`
- Source branch: `release/calora-production`
- Serving deployment: `dde8a33d-fdcd-4dfa-a421-6f8f1332216c`
- Serving commit: `eefba459c190605a63eb9db874556ddf9bebb5c6`
- Status: unchanged and successful

## 4. Production health verification

Railway final environment status:

- `@workspace/api-server`: Online
- `@workspace/calora`: Online
- `Calora`: Online
- Services with issues: 0
- Recent failures: 0
- Pending/staged work: none

Production Supabase project `caloraapp` remains the active production project and was not modified by this mission. No native Android or iOS build was triggered, and no store submission was made.

## 5. Merge isolation verification

After PR #394 merged into protected `main`:

- `main` advanced from `eefba459` to `ef7de634`.
- `release/calora-production` remained at `eefba459`.
- All three Railway production services continued to point to `release/calora-production`.
- Deployment history showed no new production deployment for `ef7de634`.
- No pending Railway work remained.
- Production remained healthy.

This verifies that the protected-main merge did not automatically roll out to production.

## 6. Validation summary

The required PR checks on head `a3dcf466` completed successfully:

- Account-deletion fence validation — success.
- Portable fresh-schema PostgreSQL integrations — success.
- Release validation suite — success.
- Release validation attestation gate — skipped by workflow design after the validation suite, with the required release validation check successful.

The API production build also verified the exact release commit in its build output and completed successfully. The app migration required no rebuild because Railway’s watch-path check found no relevant changes; the service remained online on the approved existing revision.

## 7. Remaining certification blockers

This mission does not close unrelated certification requirements:

- CAL-17 disaster-recovery certification remains blocked by its independent evidence requirements.
- Native Android physical verification and iOS signing/build certification remain separate requirements; no native build was triggered.
- Subscription/provider and other commercial certification items retain their authoritative register status.
- Production is isolated by source branch, but future production releases still require an intentional update/promotion of `release/calora-production`; merging to `main` alone is no longer sufficient.

## Final verdict

**PASS for the authorized Mission 404 scope.**

Production API, app, and FatSecret services are release-branch based; the authorized API migration deployed successfully; the app source migration completed with a safe no-change skip; all services are healthy; PR #394 was merged through protected main; and the merge produced no production rollout.
