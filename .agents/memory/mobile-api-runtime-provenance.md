---
name: Mobile/API runtime provenance
description: How to investigate a current mobile binary that appears older than a development runtime
---

When a mobile binary appears older than the current app, verify the embedded
bundle and the API release attestation separately. A current IPA can contain
the latest screen code while its production API origin still serves an older
source tree than the development origin.

**Why:** The UI source and the data/behavior supplied by authenticated planner,
recipe, capture, sync, and Coach endpoints can come from different release
chains. Comparing only Git SHA or only screenshots can misclassify a healthy
but stale backend as an old mobile binary.

**How to apply:** Record the mobile Git SHA → EAS build → IPA → submission
chain, inspect distinctive current-main strings in the embedded bundle, then
query the exact production and development API `/api/version` endpoints. Treat
the environment split as a likely cause only after ruling out local persisted
state, platform overrides, and OTA updates.