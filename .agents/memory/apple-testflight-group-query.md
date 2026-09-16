---
name: App Store Connect TestFlight group queries
description: Read-only evidence for whether an Apple build is assigned to an internal beta group.
---

Use the beta-group builds collection to verify assignment:
`GET /v1/betaGroups/{groupId}/builds`. App Store Connect may reject a read of
the inverse `relationships/betaGroups` endpoint because that relationship only
allows create/delete operations.

**Why:** A successful upload does not prove internal TestFlight assignment, and
the inverse relationship endpoint is not consistently readable.

**How to apply:** Verify the existing group metadata, then match the Apple build
ID in the supported group-build collection. Do not create or mutate groups
unless the release explicitly authorizes that action.