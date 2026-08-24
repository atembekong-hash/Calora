# Current Production Release Re-attestation Report

## Executive verdict

**BLOCKED**

Task #502 remains paused. The latest validated source, a trusted production
build, and the currently serving runtime cannot be proven to be the same
release. No pilot activation was attempted.

## Why the activation task was paused

The prior release attestation covered an earlier published runtime. Subsequent
production-security and release-provenance work was merged after that
attestation, so the older runtime identity cannot authorize a later pilot
operation.

## Production-relevant changes since the prior attestation

The source history after the earlier release includes these production-relevant
areas:

- signed external artifact provenance and release verification;
- provider-signed final-package evidence, key pinning, digest, deployment-ID,
  origin, HTTPS, and redirect checks;
- a compiled production release authorization boundary that remains deny-all;
- release verifier evidence and negative-path coverage; and
- documentation for the controlled pilot process.

The latest source also retains prior API security work covering Coach Fact
Context authorization, consent, cohort rollout, nonce/replay controls,
account-status checks, provider boundaries, and legacy-route retirement.

## Validated source identity

| Field | Value |
| --- | --- |
| Git commit | `65fa97c7123037ae6ed68ba0ab40e9c30faca633` |
| Git tree | `b5f4644b5218114107426c291534cae8749ef7f1` |
| SHA-256 source digest | `29ba18d471206bcda06eaa507b037339949fb34a3495376654954b6c1ca6b484` |

The source digest was independently calculated as SHA-256 over the canonical
two-line `gitCommit + newline + sourceTree + newline` input. Before this report
was created, the source checkout had no staged, modified, or untracked files,
and `git diff --check` passed.

## Current live production identity

| Field | Value |
| --- | --- |
| Git commit | `0dd2f5ab9755ddd8a4482b39292200da8df4801a` |
| Git tree | `2bce932145cef18a3d50a4fe5b84df4297e6b5fd` |
| SHA-256 source digest | `481f82d9a34cd1da953961e752d08333eba651a89ec79a8c3e122b053ddf212e` |
| Release ID | `calora-api-0dd2f5ab9755-20260824043415112` |
| Build timestamp | `2026-08-24T04:34:15.112Z` |

The live `GET /api/version` response was HTTP 200, used `Cache-Control:
no-store`, and returned the values above. `GET /api/healthz` returned HTTP 200
with `{ "status": "ok" }`.

## Source, build, and runtime comparison

**Mismatch:**

- Latest validated source commit/tree/digest: `65fa97c…` / `b5f4644…` /
  `29ba18d…`
- Live runtime commit/tree/digest: `0dd2f5a…` / `2bce932…` / `481f82d…`

The live runtime therefore does not match the latest validated source. There
is no trusted manifest, detached signature, independently pinned release key,
provider package attestation, deployment identity, or protected external
verification record available in this workspace to bridge that difference.

## Build and provenance evidence

The current production build correctly failed closed when attempted without
the required protected, externally retained inputs:

```text
RELEASE_ATTESTATION_MANIFEST_DIR
RELEASE_ATTESTATION_SIGNING_KEY
RELEASE_ATTESTATION_SIGNING_KEY_FINGERPRINT
RELEASE_ATTESTATION_ARTIFACT_DIR
```

The task did not request, reveal, create, or change any of those protected
values. The failure is expected and prevents an unauthenticated production
release from being treated as attested.

For a future re-attestation, the authorized operator must perform the
protected build and retain the signed manifest, signature, public key,
provider package record, provider signature/public key, independently pinned
fingerprints, provider deployment ID, canonical HTTPS origin, and exclusive
external verifier evidence record. The verifier must then confirm the final
package, source, and live `/api/version` identity match exactly.

## Validation performed

| Check | Result |
| --- | --- |
| Provider package and release verifier tests | 13 passed |
| Full API tests | 341 passed; 4 development-only rehearsal tests skipped |
| Full Calora tests | 971 passed |
| API typecheck | passed |
| Calora typecheck | passed |
| Source diff validation | passed before report creation |
| Production provenance build without protected evidence | failed closed as expected |
| Workspace-wide typecheck | blocked by existing mockup-sandbox TypeScript errors in `calendar.tsx` and `spinner.tsx`, outside the API/release scope |

## Production runtime and deny-all controls

| Control or check | Result |
| --- | --- |
| Deployment health | active deployment with successful build |
| Legacy Coach route | `POST /api/v1/coach/respond` returned 404 |
| Fact Context route | `POST /api/v1/coach/fact-context/respond` returned 404 |
| Global Fact Context rollout | `false` |
| Active reviewed pilot memberships | `0` |
| Active Fact Context nonces | `0` |
| Pilot activation | none |

The Fact Context route was unavailable before any request authorization or
provider-capable work. Existing deployment logs showed legacy-route probes
returning 404 and did not show a successful Coach Fact Context provider
execution, activation, nonce, or legacy-provider bypass.

## Changes made by this task

- Added this permanent report only.
- No API, deployment configuration, database, rollout, cohort, consent, nonce,
  RevenueCat, Supabase account, provider, or user-facing activation state was
  changed.

## Remaining uncertainties and human-action blocker

An authorized production operator must use the protected deployment control
plane to build and publish the exact validated source with the required
externally retained, signed release and provider-package evidence. They must
then run the verifier against the canonical HTTPS production origin and retain
the exclusive verification record outside the workspace.

Until that evidence proves `source = trusted build = live runtime`, Task #502
must not resume and no pilot, rollout, or provider path may be activated.

## Final recommendation

Keep production deny-all. Do not activate a pilot. Resume Task #502 only after
a new independent re-attestation report proves that the current validated
source, trusted production build, and live runtime release are identical.