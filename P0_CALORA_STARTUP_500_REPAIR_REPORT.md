# Calora P0 Startup 500 Repair Report

Date: 2026-10-28

## Verdict

**READY_FOR_PROTECTED_REVIEW; PRODUCTION DEPLOYMENT BLOCKED pending owner authorization.** The investigation confirmed two independent failure modes: the deployed API turns an unavailable Supabase public verifier into an unhandled HTTP 500, and the mobile bootstrap has unbounded auth, encrypted-storage, and profile-reconciliation waits. A scoped repair is prepared on branch `fix/calora-startup-recovery`. It has not been merged or deployed, and no native build was triggered.

## Production evidence

Railway reports the API deployment `793bc3a1-01ef-4396-be86-26d7f33fd4c6` as `SUCCESS` in project `attractive-harmony`, production environment, at `2026-10-28T10:47:03Z`. The companion services also report `SUCCESS`. Public release checks currently report protected commit `f3ed6ec44df5c716abb5f602851f0b4e275bc0c0` on both `https://mycaloraapp.com` and `https://app.mycaloraapp.com`.

Read-only endpoint checks returned:

- Both `/health` endpoints: HTTP 200.
- Both `/api/healthz` endpoints: HTTP 200 with `{"status":"ok"}`.
- Both `/api/version` endpoints: HTTP 200 and the exact protected SHA above.
- Both `/api/v1/profile` endpoints without a bearer token: HTTP 500 with the sanitized generic error `An unexpected server error occurred.`

Railway runtime logs show repeated `/api/v1/profile` HTTP 500 responses and `/api/v1/sync` HTTP 503 responses immediately after the latest deployment. The source path explains the 500: `verifyBearerToken()` throws when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is unavailable to the running process. Since the profile route does not catch that exception, the global handler emits HTTP 500. An unauthenticated request with a working verifier would instead return HTTP 401. The live 500 therefore confirms a verifier-configuration or verifier-initialization failure, but the exact secret value cannot be independently confirmed because Railway CLI authentication is unavailable and the Railway MCP exposes variable names without secret values.

The API database readiness check passing does not prove Supabase Auth verifier readiness. It only proves the API PostgreSQL dependency is queryable.

## Repair implemented on the feature branch

The backend verifier now fails closed by returning `null` when its public Supabase verifier is unavailable. Authenticated routes consequently return their existing safe 401 response instead of an unhandled 500. No credentials are logged, substituted, or exposed.

The mobile client now bounds the following operations at 12 seconds:

- Supabase session restoration.
- Encrypted local-state hydration, including the SecureStore key read.
- Profile reconciliation, session checks, token refresh, and the API request itself.

A completed account with a valid local profile is allowed to render the dashboard in degraded mode when remote profile reconciliation fails. The sync error remains visible and the existing retry path remains available. A first-run account is still fail-closed until its profile can be saved. This preserves existing local data and does not pretend that remote synchronization succeeded.

## Validation

The following passed on the isolated feature worktree:

- Calora focused timeout/profile tests: **10/10**.
- API verifier and profile tests with synthetic database configuration: **19/19**.
- API offline suite with synthetic database and OpenAI configuration: **546/546 tests across 43 files**.
- Calora TypeScript validation: **PASS**.
- API-server TypeScript validation: **PASS**.
- Calora root-access gate tests: **5/5**.
- Full Calora suite: **1,688 tests passed**. Twenty worker-start errors occurred in unrelated tests because the sandbox's Node/undici runtime cannot initialize the existing fork workers (`undici ... decompress.js ... bind`); this is an environment compatibility failure, not a failing assertion in the repair.

No production credentials, customer data, database rows, storage objects, images, or native build systems were accessed or modified. No Railway deployment was triggered by this repair.

## Remaining blocker and next action

The running production API still needs its Supabase public configuration verified in Railway and redeployed only after owner authorization. The exact owner action is to confirm that the API service's production variables contain the correct Supabase project URL and public anon key under the exact source names `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then authorize a normal protected-PR merge followed by an API-only Railway deployment. The service-role key must remain separate and must not be used as a mobile/public verifier fallback.

The Android app cannot be certified from this sandbox because a native build and physical-device run are explicitly out of scope. After the protected repair is merged and an API-only deployment is separately authorized, the owner should install a new native build and verify that an existing signed-in account either reaches the dashboard within 12 seconds or sees the explicit recovery state, never an indefinite spinner.
