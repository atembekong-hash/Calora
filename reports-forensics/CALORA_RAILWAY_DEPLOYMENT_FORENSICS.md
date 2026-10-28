# Calora Railway Deployment Forensics

## Identifiers
Supplied read-only metadata identifies Railway project `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`), production environment `0ba409c4-5b32-4b75-8c33-e76d5c6e55db`, and API service `@workspace/api-server` (`12af1b5f-0e00-4c41-ba51-f6b3901d7be7`). Source is `atembekong-hash/Calora@main`.

## Deployment evidence
Historical deployment `793bc3a1-01ef-4396-be86-26d7f33fd4c6` for `f3ed6ec` succeeded at `2026-10-28T10:47:03.383Z`. Historical successful deployment `2a0abed3-8b62-4a05-a8f9-358c4dbd9b24` served `e9b971b`. A separate historical `5b374621-f0c4-4189-a54f-4ed870e22bb8` reached build execution for `f3ed6ec` and failed with exit code 1; the underlying compiler error is not preserved.

The verifier-fix deployments `e7722a4f-4d79-44b3-81e1-b60da432197c` and `0824226f-a194-4aad-ae96-c3d4b553bb4e` target `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`, were observed at 18:21:40.094Z and 18:23:47.540Z as QUEUED/applying, with zero build and deploy logs. They were not proven live.

Unauthenticated `/api/healthz` returned `{status: ok}` for `mycaloraapp.com` and `app.mycaloraapp.com`; `/api/version` did not expose a usable SHA in the supplied check. Health alone does not attest the serving revision or authenticated behavior.

## Safety boundary
No retry, restart, redeploy, variable read/change, production mutation, credential access, build, or deployment was performed by this synthesis.

## Verdict
`PRODUCTION_BLOCKED_EXTERNAL`. Railway queue/initialization state prevents production verification. No official incident bulletin or definitive queue root cause is preserved.