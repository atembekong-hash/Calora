---
name: Dependency audit freshness
description: How to interpret dependency scanner results that lag the current workspace graph
---

The platform dependency audit can continue to report vulnerable package versions after the workspace lockfile, installed links, and local package audit have moved to patched versions.

**Why:** Security findings may be produced from a committed or cached project snapshot rather than the current uncommitted workspace, so treating the stale package names as live dependencies can lead to unnecessary upgrades or risk exceptions.

**How to apply:** First verify the current `pnpm-lock.yaml`, workspace package links, and `pnpm audit --audit-level high`. If all three agree on patched versions, record the exact stale package/version identifiers and re-run the platform audit after the changes are committed or otherwise refreshed.