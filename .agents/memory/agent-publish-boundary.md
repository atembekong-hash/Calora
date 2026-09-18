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

Publishing can append an empty local marker commit after the deployment has
already been built. That commit has a new Git SHA but the same source tree as
the deployed release.

**Why:** Comparing live attestation against the post-publish `HEAD` can falsely
report an identity mismatch despite the deployed source tree being unchanged.

**How to apply:** Verify the live `/api/version` identity against its attested
release commit, then separately confirm that its source tree equals the current
reviewed tree before claiming source-to-production alignment.