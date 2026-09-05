---
name: Railway deployment identity
description: External Railway-to-GitHub deployment event naming and release-gate behavior.
---

Railway’s GitHub deployment integration emits the deployment environment as `<project> / production`, not the bare string `production`, while preserving the exact deployed Git SHA. Production release workflows should accept that qualified suffix and continue requiring a successful deployment status.

**Why:** Exact equality against `production` caused real deployment-status workflow runs to skip even though the provider identified its production environment and emitted the correct commit.

**How to apply:** When validating a Railway-backed release gate, inspect the GitHub deployment record and terminal status. Treat `in_progress` and failed statuses as non-release events; only a successful qualified production status should run the published-release verification job.