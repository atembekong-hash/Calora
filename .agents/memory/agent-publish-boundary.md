---
name: Agent publish boundary
description: Production promotion limits in this task runtime.
---

The agent task runtime may expose production deployment status, build, and log
readers without exposing a publish mutation. A connected deployment provider
may also appear in inventory while its action callbacks are unavailable.

**Why:** Claiming a deployment after only reading status would falsely close the
source-to-runtime provenance chain.

**How to apply:** Complete and validate release-control code, record the live
identity honestly, and leave publishing/post-publish verification to the
approved operator or UI control plane when no mutation operation is callable.