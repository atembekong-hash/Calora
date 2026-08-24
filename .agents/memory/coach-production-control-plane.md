---
name: Coach production control plane
description: Supported production access boundary for the controlled Coach Fact Context rollout.
---

The project review environment can read production metadata and aggregate state,
but the approved human operator path is Replit's Publishing production-secret
settings for the process gate and Production Database My Data for the global
rollout and reviewed cohort membership.

**Why:** The first controlled activation requires auditable, reversible
production controls. Public/admin endpoints, ad-hoc production SQL, scripts,
and deployment workarounds are not approved substitutes for that operator-only
control plane.

**How to apply:** A future live one-account activation must be performed by an
authorized production operator following the protected approval/evidence,
per-transition verification, and deny-all rollback procedure in the operator
runbook. The agent/review environment must not attempt activation; until that
human approval and execution occur, preserve deny-all.

## Release attestation boundary

A production build records Git commit/tree provenance and a derived SHA-256
source digest into the running API, then exposes only that fixed release record
for an exact source-to-runtime comparison. Production builds reject any dirty
or untracked source input.

**Why:** Deployment-health status alone cannot bind a security review to a
specific source revision; build-time provenance makes the current trusted
build-and-runtime boundary independently comparable.

**How to apply:** Before a sensitive rollout, compare the live release record
with the reviewed Git commit, tree, and source digest, and require a healthy
deployment plus the deny-all preflight. This does not protect against an actor
who can replace the final artifact after a trusted build; that stronger threat
model requires an external signed artifact provenance system.

## Supported release identity

Calora's controlled-pilot boundary uses a clean reviewed checkout, a
build-time binding to the reviewed Git commit, and exact canonical-HTTPS
comparison of compiled `/api/version` commit/tree/source-digest metadata plus
health before any runtime gate may be changed. The build compiles eligibility
only when its explicit reviewed-commit value equals the clean build commit.

**Why:** Replit Publishing supports a normal source build and live runtime
identity check, but does not expose an atomic final-package staging and
attestation contract. Calora's activation threat model relies on verified
source-to-runtime equivalence and its independent authorization gates, rather
than treating post-build artifact replacement as a required blocking threat.

**How to apply:** For a sensitive release, set the build-only reviewed-commit
request, publish while all runtime gates remain deny-all, then run the release
identity verifier against the canonical HTTPS origin. Hold activation on any
dirty source, failed build, redirect, unhealthy endpoint, or identity mismatch.

## Optional external artifact provenance

Provider-signed final-package attestations remain available as defense in depth
for the stronger post-build artifact-replacement threat model, but are not a
required input to Calora's supported controlled-pilot activation path.

**Why:** A provider-observed final-package digest detects an artifact-replacement
actor that compiled metadata alone cannot detect; Replit's current Publishing
path cannot supply that evidence atomically.

**How to apply:** Use the provider verifier only when such external evidence is
actually available and a release requires that stronger assurance. Do not make
its absence block the normal commit-bound runtime-identity release check.

## Development workflow guard

The API development workflow must not be used with a sensitive release
activation request. Its build guard rejects that combination because release
activation is production-only; keep the development service deny-all instead of
overriding the guard.

**Why:** A stale activation request can make an otherwise healthy development
workflow fail before the server starts, and bypassing that check would blur the
boundary between local verification and production authorization.

**How to apply:** If the development API workflow fails with the
production-only activation error, clear the stale request through the approved
environment control plane and restart it; do not change Coach rollout flags or
call activation endpoints as a workaround.