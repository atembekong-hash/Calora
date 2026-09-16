# Calora Production API Deployment Final Report

**Report date:** 2026-09-16 UTC  
**Deployment scope:** API-only production release  
**Target:** Existing Replit autoscale production deployment  
**Production mutations by this verification:** None

## Final verdict

**PRODUCTION DEPLOYMENT VERIFIED**

The active production API is serving the exact authorized candidate. A later
publish attempt failed before promotion because the workspace contained an
untracked generated file; that failed attempt did not replace the active
release.

## Post-deployment task reconciliation

After the successful API publish, the main branch advanced through the
completed release-hardening tasks. The current main branch is:

```text
commit:      3113883f8174cc24b992b62c25d60bffe09eeeec
source tree: c6867f17eefb9aa7f43a77df82c87be5481f5b48
```

The merged tasks changed:

- ignored mockup-preview output and clean-checkout regression coverage;
- default scripts validation;
- release-attestation and monitoring fixtures;
- monitoring report collision and concurrency protections;
- sanitized release-fetch failure handling;
- required release-validation GitHub workflows and required-check auditing;
- related tests, documentation, and agent memory.

The complete diff from the deployed candidate to current `main` contains no
changes under:

```text
artifacts/api-server/
lib/db/
lib/api-spec/
lib/api-client-react/
lib/api-zod/
artifacts/calora/
```

Therefore, these merged tasks do not change the deployed API runtime,
database schema, mobile client, or API compatibility contract. The active
production release remains the exact candidate documented below:

```text
380973d6f36caa97472350e651447130221e2a5f
```

### Republish decision

**No republish is required for the current production API.**

The current production release is healthy and already contains the authorized
API compatibility remediation. The completed tasks are release-process and
validation improvements, not API-runtime changes.

A future publish is appropriate only if the owner wants to place the newer
release-validation tooling and current `main` source tree into a new
production release. That would be a separate release with a new commit, source
tree, release ID, and preflight; it is not needed merely because these tasks
were merged.

## Exact deployed identity

The successful deployment build record is:

```text
build ID:    65b55e3c-e58e-41e6-a1b3-e29373662e3a
provider:    cloud_run / Replit autoscale
status:      success
created:     2026-09-15T23:57:14.736Z
completed:   2026-09-16T00:00:47.370Z
```

The successful build logs attested:

```text
commit:      380973d6f36caa97472350e651447130221e2a5f
source tree: 1b6edcc5af7efd418892aaa70732715e910d9b95
source hash: cea88f04f72e8e3edea5a9685f818a9b9f6c5c37e9df31bdeb635772bb916b32
release ID:  calora-api-380973d6f36c-20260915235729814
```

The live `/api/version` response matches that exact identity.

## Deployment target and result

The target is the existing public Replit autoscale deployment serving:

```text
https://calorie-coach-pie35449.replit.app
```

The deployment metadata reports a successful current build. The custom
primary alias `https://mycaloraapp.com` is the same deployment, not a separate
target. Railway was not touched.

The successful build logs reached:

```text
Creating Autoscale service
upsertCloudRunService completed
Waiting for service to be ready
Deployment successful
```

## Required production probes

### `GET /api/healthz`

```text
HTTP 200
{"status":"ok"}
```

### `GET /api/version`

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "380973d6f36caa97472350e651447130221e2a5f",
  "sourceTree": "1b6edcc5af7efd418892aaa70732715e910d9b95",
  "sourceDigest": "cea88f04f72e8e3edea5a9685f818a9b9f6c5c37e9df31bdeb635772bb916b32",
  "buildTimestamp": "2026-09-15T23:57:29.814Z",
  "releaseId": "calora-api-380973d6f36c-20260915235729814"
}
```

The September 9 rollback release is no longer serving traffic.

## Compatibility smoke tests

All probes below were non-mutating and sent without credentials. Protected
routes were expected to return authentication responses rather than route
level 404s.

| Surface | Probe result | Interpretation |
|---|---:|---|
| Capture approval | `POST /api/v1/capture/00000000-0000-4000-8000-000000000001/approve` → `401` | Restored route reached authentication: `Please sign in first.` |
| Capture analysis | `POST /api/v1/capture/analyze` with `{}` → `400` | Route exists and reached request validation; no provider or data operation was attempted. |
| Recipes | `GET /api/v1/recipes?query=apple` → `200` | Public open-source recipe route returned TheMealDB recipe data. |
| Premium Recipes | `GET /api/v1/premium-recipes` → `401` | Protected route reached authentication. |
| Planner | `POST /api/v1/planner/generate` with `{}` → `401` | Protected route reached authentication. |
| Sync | `POST /api/v1/sync` with `{"mutations":[]}` → `401` | Protected route reached authentication. |
| Restaurant Foods | `GET /api/v1/restaurant-foods?query=apple` → `401` | Protected route reached authentication. |
| Coach Fact Context | `POST /api/v1/coach/fact-context/respond` with `{}` → `404` | Expected unavailable response while sensitive activation remains false. |
| Coach consent | `GET /api/v1/coach/fact-context/consent` → `401` | Protected consent route reached authentication. |
| Referral read | `GET /api/v1/referral` → `401` | Protected referral route reached authentication. |
| Referral redeem | `POST /api/v1/referral/redeem` with an invalid smoke code → `401` | No referral code lookup or mutation occurred. |
| Referral activation | `POST /api/v1/referral/activate` with `{}` → `401` | Protected route reached authentication. |
| Authentication | `GET /api/v1/diary` → `401` | Protected diary route rejected the unauthenticated request. |
| Account deletion | `DELETE /api/v1/account` → `401` | Deletion route rejected the request before any deletion operation. |

The Coach Fact Context `404` is intentional for this release path: the
server-side gate reports `Coach Fact Context is unavailable` while sensitive
activation is disabled. It is not evidence of a missing route or startup
failure.

The capture analysis `400` is intentional for the empty body. A valid
anonymous analysis payload was not sent because it could invoke an external
provider or create a capture session; no real user data was used for smoke
testing.

## Sensitive activation

Sensitive activation remained disabled:

```text
RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false
```

No sensitive activation commit binding was changed. The Coach Fact Context
runtime gate remained unavailable as expected.

## Database and migration safety

- No `drizzle-kit push` or reverse migration was run.
- No destructive schema operation was run.
- No production row was created, edited, or deleted for verification.
- The preflight-verified production schema and support objects were not
  modified.
- The account-deletion write-fence schema and triggers remained in place.
- The unauthenticated account-deletion probe returned `401` before any deletion
  work.

## Preserved rollback identity

The prior rollback target was preserved:

```text
commit:  22cbe8a68905654f769e2ac5f5beab65f894cadf
tree:    3a6f9b93cb7590d57d5f456fca1b993a0a61091a
release: calora-api-22cbe8a68905-20260909020243693
```

Rollback was **not required**. The failed later publish attempt left the
successful candidate release serving traffic.

## Failed publish diagnosis and remediation

The later failed build was:

```text
build ID: b55ff0ce-1768-48b8-a6ee-c647563249f5
status:   failed
created:  2026-09-16T01:18:43.684Z
```

Its build log stopped at the API production build with:

```text
Error: Release attestation requires a clean production Git checkout.
```

The cause was an untracked, disposable generated file:

```text
artifacts/mockup-sandbox/src/.generated/mockup-components.ts
```

That file is generated by the mockup preview plugin and was not part of the
frozen candidate tree. It was removed locally, the workspace was re-pinned to
the exact candidate, and the same production API build passed:

```text
[release-source] commit=380973d6f36caa97472350e651447130221e2a5f
tree=1b6edcc5af7efd418892aaa70732715e910d9b95
```

The failed build did not change the live deployment, as confirmed by the live
`/api/version` response.

## Mobile and TestFlight boundary

No EAS command, native Android build, native iOS build, or TestFlight
submission was performed by the agent. The successful Replit publish log did
run the existing Expo static-export step, which generated JavaScript bundles
and manifests for the Expo iOS and Android platforms as part of the workspace
publish pipeline. This was not a native app build and did not create or submit
a new mobile binary.

The existing TestFlight 1.0.0 (2) installation can be tested by the owner
against the now-active API release.

## Final production status

Production is healthy and serving the exact authorized API candidate:

```text
PRODUCTION DEPLOYMENT VERIFIED
```