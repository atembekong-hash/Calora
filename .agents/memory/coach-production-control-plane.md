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

## Release attestation limitation

Deployment metadata can confirm that a production build succeeded and the
published route behavior can be probed, but it may not expose a source revision
or immutable build hash. Treat those signals as behavioral evidence, not a
proof that a specific reviewed source revision is the one serving production.

**Why:** A successful deployment alone cannot independently bind a security
review to the exact production artifact when the publishing control plane omits
a revision identifier and has no corresponding build logs.

**How to apply:** Before authorizing a sensitive rollout, require an approved
operator-provided release attestation or an immutable build/revision record.
Without it, keep deny-all and report the activation preflight as blocked even
when all observable route and database gates are closed.