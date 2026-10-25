# Railway Calora Access Recovery Report

Date: 2026-10-25

## Final verdict

**PASS — existing Railway access was restored through the official hosted Railway MCP, and the protected-main API revision deployed successfully through Calora’s existing GitHub-linked Railway service.**

No replacement Railway project or service was created. No production secret, database, storage object, customer record, or unrelated service was modified.

## Root cause

The previously used Railway CLI MCP depended on a local Railway CLI session. The CLI session had expired/revoked: `railway status` returned `Unauthorized. Please login with railway login`, and the supported CLI browser callback subsequently timed out without a callback. The configured `Railway CLI MCP` connector remained present and enabled, but its tool status was unavailable because the CLI was not authenticated.

The existing official hosted connector also remained present but disabled and reported `authorization_required`. It was restored and enabled through its supported OAuth flow. The hosted connector then reported `available` and exposed the Railway project and deployment tools.

## Connector state

- Existing CLI connector: `Railway CLI MCP`, UID `707cf615-05d1-4ae3-994e-2df634f3ccf6`, retained but unusable without a fresh CLI login.
- Existing hosted connector: `railway`, UID `17bb9265-9a77-4210-a4a3-bd3a456c0cf6`, server `https://mcp.railway.com`, OAuth enabled and restored.
- Authenticated Railway identity: `atembekong-hash`.
- No new connector was created.

## Calora Railway project and service

- Project: `attractive-harmony`
- Project ID: `b2484b01-c599-4a80-9b83-3139a2cba813`
- Environment: `production`
- Environment ID: `0ba409c4-5b32-4b75-8c33-e76d5c6e55db`
- API service: `@workspace/api-server`
- API service ID: `12af1b5f-0e00-4c41-ba51-f6b3901d7be7`
- Source: `atembekong-hash/Calora@main`
- Railway state before verification: live, no staged changes, no pending work, successful deployment.

The similarly named Railway project `pm-live-prod-20260929` was inspected and confirmed to be the unrelated `polymarket-live-trader` project; it was not changed.

## Release and deployment evidence

Protected main after PR #225 merge:

`abf7cb114f35d391fadb81d37ae373988977a8ae`

Required post-merge validation passed:

- Release validation: run `40183732966` — success.
- Release attestation job completed successfully within the release-validation run.
- Portable PostgreSQL database integrations: run `40183732953` — success.
- Account-deletion fence validation: run `40183732958` — success.

Railway deployment:

- Deployment ID: `dfa417ec-e5e4-4f45-9978-551a5a737538`
- Status: `SUCCESS`
- Created: `2026-10-25T10:11:17.248Z`
- Branch: `main`
- Railway commit shown: `abf7cb1`
- Deployment source: existing GitHub-linked Calora `main` branch

Railway automatically deployed the merged protected-main commit; no duplicate manual redeploy was issued.

## Public production verification

Both production API origins were checked after the Railway deployment:

| Origin | `/api/version` commit | `/api/healthz` |
|---|---|---|
| `https://mycaloraapp.com` | `abf7cb114f35d391fadb81d37ae373988977a8ae` | `ok` |
| `https://app.mycaloraapp.com` | `abf7cb114f35d391fadb81d37ae373988977a8ae` | `ok` |

Both domains therefore match protected main exactly and are healthy.

## Safety boundaries observed

- No Railway project or service creation.
- No unrelated project deployment; `pm-live-prod-20260929` was not modified.
- No production variables were read or changed; only variable names were visible in service metadata.
- No database or storage mutation.
- No recipe-image QA workflow dispatch.
- No historical QA recovery or account operation.
- No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build/release.

## Remaining status

Railway access is restored through the hosted OAuth connector. The CLI connector remains stale and is not needed for the completed deployment. The Calora API is deployed and verified on both public domains at the protected-main SHA.
