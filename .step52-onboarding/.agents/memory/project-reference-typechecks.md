---
name: Project-reference typechecks
description: How to distinguish stale generated workspace declarations from real downstream TypeScript contract errors.
---

When a downstream package reports that an inferred database-row property is missing, compare the source schema with the generated declaration before changing application code. Rebuild workspace project references through the canonical repository typecheck when the generated declaration is stale.

**Why:** Package-local `tsc -p` checks consume existing project-reference outputs but do not rebuild those references. After an isolated merge, a valid source schema can therefore coexist temporarily with an outdated ignored declaration that produces a false downstream contract error.

**How to apply:** Verify the source schema, migration, live database contract, query selection, and generated declaration. If only the declaration is stale, run the library-first repository typecheck and then repeat the package-local check; do not add assertions or alter correct runtime code.