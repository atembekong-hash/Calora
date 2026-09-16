---
name: Managed artifact merge conflicts
description: Safe Git reconciliation when a managed artifact configuration changed on both branches.
---

Resolve managed artifact configuration differences before merging divergent histories, using the validated artifact TOML replacement flow rather than editing conflict markers in place.

**Why:** Artifact registration can refresh the managed configuration and clear an in-progress conflict resolution. Pre-integrating the desired configuration lets the subsequent normal merge preserve both histories without a force-push.

**How to apply:** When both branches changed a managed artifact TOML, create a safety branch, apply the combined configuration through validated replacement, commit it, then merge the remote branch normally and revalidate.