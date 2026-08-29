---
name: OpenAPI request schema naming
description: Preventing generated API validator and TypeScript export name collisions.
---

Use named component schemas for request bodies in the shared OpenAPI contract rather than inline request-body objects.

**Why:** The current client and Zod generators can emit a validator named from an operation body alongside an identically named TypeScript body export. A named component gives the generated type a distinct stable name and keeps the workspace library build valid.

**How to apply:** When adding an operation with an application/json request body, add an appropriately named schema under `components.schemas` and reference it from the operation before regenerating the API libraries.