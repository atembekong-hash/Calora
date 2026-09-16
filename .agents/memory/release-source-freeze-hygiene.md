---
name: Release source freeze hygiene
description: Preserve the exact approved Git source identity before a native release operation.
---

Before a native release preflight, treat documentation and attached-file commits the same as code commits for source provenance. If they make local `main` differ from the owner-approved `origin/main` SHA, the checkout is no longer the exact frozen candidate.

**Why:** Automated report preservation can create a local commit after a gate is verified. Even when its tree changes only documentation and attachments, an exact-SHA release authorization and an EAS provenance check cannot treat it as the same source.

**How to apply:** Fetch first, compare local and remote SHA/tree and ahead/behind, and stop before build/submission if the specified release source differs. Do not use reset, rebase, force push, or a substitute checkout unless the owner explicitly authorizes that recovery path.