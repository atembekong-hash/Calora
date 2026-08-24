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

## External artifact provenance

Production releases create an Ed25519-signed canonical manifest outside the API
artifact. It binds commit, source tree, derived source digest, and a
content-addressed digest list for the final deployment staging directory
(including all external runtime modules). The signing key, final artifact
directory, and manifest retention location are required production build inputs,
not runtime settings. The production artifact directory and manifest directory
must be absolute paths; the manifest directory is resolved and must remain
outside the deployable workspace. Activation verification requires a deployment-control-plane (or
independently acquired) artifact digest, verifies the detached signature with a
trusted public key, and then uses `/api/version` only as an additional
cross-check.

**Why:** An attacker who replaces a final artifact can also forge its
self-reported `/api/version` data. Only a digest observed outside that process
and compared to externally retained signed provenance detects that replacement.

**How to apply:** Before any sensitive activation, retain the manifest,
signature, and trusted public key in immutable operator evidence; obtain the
candidate deployment digest from its control plane or immutable package store;
run `pnpm --filter @workspace/api-server verify:release -- ...` with the
manifest, signature, public key, independently pinned public-key fingerprint,
trusted digest, and HTTPS live origin. Hold
activation on a missing control-plane digest, failed signature, digest mismatch,
or endpoint mismatch.

The configured artifact publishing path does not currently stage the final
package before `build.mjs` runs or expose a matching independent package-content
digest. It must therefore remain ineligible for sensitive activation until a
deployment control plane provides both capabilities and immutable evidence
retention.

**Why:** A manifest over a pre-existing arbitrary directory, or a digest
reported only by the application, cannot detect a final-package replacement.

**How to apply:** Do not substitute `dist`, a build log, or `/api/version` for
the final-package staging-and-digest contract. Preserve deny-all and require a
provider-managed staging, digest, and retention integration first.