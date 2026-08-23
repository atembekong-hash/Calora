---
name: Coach production control plane
description: Supported production access boundary for the controlled Coach Fact Context rollout.
---

Production verification can read deployment metadata and aggregate production
state, but it does not provide the supported control-plane write access required
to change the Coach Fact Context process gate, global rollout, or reviewed
cohort membership.

**Why:** The first controlled activation requires auditable, reversible
production controls. Public/admin endpoints, ad-hoc production SQL, and
deployment workarounds are not approved substitutes for that control plane.

**How to apply:** A future live one-account activation must be performed by an
authorized production operator with supported control-plane access. Until then,
verify and preserve the deny-all state rather than attempting activation.