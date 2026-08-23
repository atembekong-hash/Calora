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