---
name: Trusted static asset routing
description: The durable trust-boundary rule for serving deployment assets.
---

Public static-file requests must resolve canonical URL keys against a trusted file allowlist built before the server accepts traffic. Filesystem readers are captured only after real-root and symlink checks.

**Why:** Request-derived filesystem paths leave traversal safety dependent on every future normalization and decoding detail. A startup trust boundary is easier to audit, prevents symlink escapes, and avoids ambiguous dataflow through public request handlers.

**How to apply:** Build the allowlist from the immutable deployment artifact, deny symlinks and malformed encodings, route only canonical URL keys to pre-verified readers, and retain HTTP regression tests for traversal variants and normal asset delivery.