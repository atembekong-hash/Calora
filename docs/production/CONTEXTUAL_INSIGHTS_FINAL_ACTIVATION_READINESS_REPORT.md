# Contextual Insights / Coach Fact Context Activation Readiness Report

## Final production activation preflight verdict

**BLOCKED**

Task #502 is not cleared to resume. No pilot, Coach Fact Context rollout,
cohort membership, nonce, consent, provider, or production configuration was
changed during this review.

## Current source identity

| Field | Value |
| --- | --- |
| Git commit | `f29eb7dd603fe445dcd5a980db6b845743c92438` |
| Git tree | `41441ed9bbdc57b0211b598b2918dc387f5af541` |

The local production build probe correctly also requires a clean Git checkout.
It stopped because the newly uploaded mission brief is untracked in the
ordinary workspace. This is a local preflight guard, not the production
activation blocker; it prevents a non-reviewable workspace from being treated
as a production source release.

## Deployed runtime identity

The canonical production HTTPS origin returned HTTP 200 from `GET /api/version`
with `Cache-Control: no-store`.

| Field | Value |
| --- | --- |
| Git commit | `0dd2f5ab9755ddd8a4482b39292200da8df4801a` |
| Git tree | `2bce932145cef18a3d50a4fe5b84df4297e6b5fd` |
| Source digest | `481f82d9a34cd1da953961e752d08333eba651a89ec79a8c3e122b053ddf212e` |
| Release ID | `calora-api-0dd2f5ab9755-20260824043415112` |
| Build timestamp | `2026-08-24T04:34:15.112Z` |

## Source, build, and runtime equivalence

**Result: NO**

The current source commit/tree differs from the live production commit/tree.
No signed release manifest, detached signature, pinned release signer,
provider-signed final-package attestation, deployment identity, or externally
retained verifier record is available in this workspace to prove a trusted
build between them.

`/api/version` is a runtime cross-check only; it is not a substitute for
signed final-package evidence.

## Release-attestation architecture examined

The existing production build configuration requires protected production
controls for a release-attested build:

- build-only Ed25519 signing key;
- separately enrolled signer fingerprint;
- deployment-control-plane final artifact staging directory; and
- append-only evidence location outside the deployable workspace.

For a sensitive release, it additionally requires a provider-issued,
Ed25519-signed immutable record bound to the exact final package, provider
deployment ID, canonical HTTPS origin, and independently pinned provider
trust anchor.

The release verifier already validates signatures, pinned trust anchors,
final-package digest, deployment ID, canonical origin, HTTPS/TLS behavior,
live `/api/version`, live health, and exclusive verifier-evidence retention.

## Required versus optional controls

### Required for this application’s current production activation boundary

- A clean, reviewed source checkout.
- A protected build context for the existing signing controls.
- An atomic provider-owned stage → attest → deploy flow that issues evidence
  for the final deployable package before that package is published.
- External immutable retention of the manifest, signatures/public keys, provider
  record, and verifier result.
- Independent verifier confirmation that source, trusted build, deployment, and
  live runtime match exactly.

### Defense in depth or future hardening

- Additional, unrelated release hardening beyond the verifier’s current
  signature, digest, origin, and provider-identity checks.

No optional hardening is being used as the reason for this blocked verdict.

## Tests actually executed

| Check | Result |
| --- | --- |
| Provider package attestation and release verifier tests | 13 passed |
| Coach Fact Context targeted tests | 13 passed across 3 test files |
| Production build guard | stopped safely on untracked local input before any production build |

The release-verifier tests validate the verifier’s fail-closed behavior. They
do not attest the current live deployment without the protected external
evidence described above.

## Production health and control state

| Check | Result |
| --- | --- |
| Active deployment / successful build | yes |
| `GET /api/healthz` | HTTP 200, `{"status":"ok"}` |
| Legacy Coach request | `POST /api/v1/coach/respond` returned 404 |
| Fact Context request | `POST /api/v1/coach/fact-context/respond` returned 404 |
| Global Fact Context rollout | `false` |
| Active reviewed pilot memberships | `0` |
| Active Fact Context nonces | `0` |
| Pilot activation | none |

Production logs for the reviewed interval show health/version checks and both
Coach routes returning 404. They show no successful Fact Context provider
execution, activation, or Legacy Coach bypass.

## Single blocker

**The current Replit Publishing service has no configured or documented
provider-owned atomic stage → attest → deploy capability that can produce and
retain the signed final-package evidence required by the application’s existing
production build boundary.**

This is a real trust requirement: a normal Publish action can build and deploy,
but cannot establish that the provider-attested final package is the same
artifact later serving at the production origin.

## Exact human action required

1. Do **not** click Publish or change a production secret yet.
2. In the project, open **Publishing → Adjust settings** only to confirm the
   available production configuration surface; there is no ordinary owner
   control that creates the required atomic provider attestation.
3. Request a protected release workflow from Replit’s Publishing/platform
   operator with this exact requirement:

   “Provision a provider-owned atomic stage→attest→deploy workflow for this
   project. It must generate an immutable, Ed25519-signed final-package
   attestation bound to the provider deployment ID and canonical production
   HTTPS origin, and externally retain the signed release manifest, provider
   record, and exclusive verifier evidence.”

4. Do not paste a private key, production secret, credential, pilot identity,
   manifest value, or provider evidence into chat or source control.
5. After Replit confirms the workflow is provisioned, provide only the
   supported protected evidence location and the operator-approved procedure.
   The agent can then revalidate the clean source, run the verifier, check live
   identity and health, and reconfirm the deny-all controls.

## Activation and rollback procedure

No activation procedure is authorized while the preflight is blocked.

The current safe rollback posture is already active:

- leave the process gate off;
- leave the database rollout value `false`;
- keep zero active reviewed pilot members; and
- keep the legacy and Fact Context routes unavailable.

If a later authorized activation ever produces an unexpected result, restore
that same deny-all posture first, then verify the route responses, rollout
value, cohort count, nonce count, and production health before any further
request.

## Files changed

- `docs/production/CONTEXTUAL_INSIGHTS_FINAL_ACTIVATION_READINESS_REPORT.md`

## Production changes made

None.