# Production API Deployment Verification — 2026-10-23

**Repository:** `atembekong-hash/Calora`
**Environment:** Railway production
**Scope:** API service only; no changes to secrets, databases, storage, accounts, or unrelated services.
**Requested target at verification:** protected-main commit `525fbc9db765eb502cb59e1984794901ffd3025a`.

## Deployment target and release eligibility

The protected `main` branch resolved to `525fbc9db765eb502cb59e1984794901ffd3025a` (`docs(qa): require current deployment sha (#212)`). Its required GitHub `Release validation` workflow completed successfully in run [39897646749](https://github.com/atembekong-hash/Calora/actions/runs/39897646749), including both the release-validation suite and the same-SHA release-attestation job.

The authorized production target was the Calora API service `12af1b5f-0e00-4c41-ba51-f6b3901d7be7` in Railway project `attractive-harmony`, production environment `0ba409c4-5b32-4b75-8c33-e76d5c6e55db`.

## Deployment result

At the authorized deployment preflight, both public API origins already reported the requested protected-main SHA. The authenticated Railway dashboard independently showed the API service online with active deployment ID `ec0572f9-9019-4c58-a2a2-0dcff3f0e238`, source commit `525fbc9db765eb502cb59e1984794901ffd3025a`, and terminal status **Deployment successful**.

This was a GitHub-connected Railway deployment that had already promoted the requested source revision. A second manual redeploy was intentionally not issued, because it would have been redundant and would have needlessly restarted the healthy production API. No service settings, secrets, database records, storage objects, accounts, or unrelated Railway services were changed.

## Public release and health verification

Each check used `GET /api/version` and `GET /api/healthz`, with no authentication and no data mutation. Three bounded verification passes produced the following results:

| Origin                        | `/api/version` | Reported commit                                          |         `/api/healthz` |
| ----------------------------- | -------------: | -------------------------------------------------------- | ---------------------: |
| `https://mycaloraapp.com`     |       HTTP 200 | `525fbc9db765eb502cb59e1984794901ffd3025a` — exact match | HTTP 200, `status: ok` |
| `https://app.mycaloraapp.com` |       HTTP 200 | `525fbc9db765eb502cb59e1984794901ffd3025a` — exact match | HTTP 200, `status: ok` |

All six version checks and all six health checks passed. The `/api/version` responses were marked `Cache-Control: no-store` during preflight, avoiding stale browser or proxy release identity evidence.

## Production QA workflow status

The protected `Production recipe-image QA` workflow was **not dispatched** in this deployment mission. No disposable QA account, recipe, generated image, private preview, storage object, review decision, or cleanup request was created.

The source-side repair for failed QA run `39891020186` is present in the deployed source tree. Before a credentialed recovery-only QA dispatch can be authorized, `CALORA_QA_SUPABASE_URL` must be configured as the root HTTPS project origin only, with no `/auth/v1` or other path. The recovery run must use the then-current protected-main SHA and prove it matches the live API release before cleanup begins.

## Final verdict

**PASS — the requested Calora production API release target was deployed and verified.** Railway deployment `ec0572f9-9019-4c58-a2a2-0dcff3f0e238` is successful, both production API origins report the exact authorized source SHA, and both health endpoints are healthy. No unrelated production resource was modified.
