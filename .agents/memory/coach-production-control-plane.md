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