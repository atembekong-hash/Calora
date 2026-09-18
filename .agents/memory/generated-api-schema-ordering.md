---
name: Generated API schema ordering
description: OpenAPI/Orval behavior when inline numeric constraints produce forward references in generated Zod code.
---

Represent reused constrained inline objects as named OpenAPI components and reference them with `$ref` before running Orval. This keeps generated Zod constants available before the schemas that use them.

**Why:** Orval can emit bounds for a large inline object after the generated schema declaration, producing TypeScript temporal-dead-zone errors even though the OpenAPI document is structurally valid.

**How to apply:** When generated Zod output reports `used before its declaration` for constraint constants, fix the OpenAPI component structure and regenerate both clients; do not hand-edit generated output as the source-of-truth fix.