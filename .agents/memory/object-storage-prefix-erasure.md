---
name: Object storage prefix erasure
description: Replit Object Storage authentication and empty-list behavior for account-owned recipe-photo erasure.
---

Replit Object Storage access uses a mediated credential exchange. A Google
Storage list response with no item-list property is a valid empty prefix, while
an explicitly present non-array value is invalid and must fail closed.

**Why:** The signed-object sidecar supports signing but not prefix listing, and
the raw credential is not itself accepted by the Google Storage API. Treating
an omitted `items` property as malformed blocks deletion for empty prefixes.

**How to apply:** Keep storage authorization and listing server-side, never log
credentials or object names, enforce an account-specific prefix and deletion
bound, and re-list after deletion before permitting later erasure stages.