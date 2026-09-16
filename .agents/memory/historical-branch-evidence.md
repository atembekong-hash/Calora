---
name: Historical branch evidence
description: How to reconcile old Calora release branches and closure reports against canonical source.
---

Historical closure reports and release branches are evidence sources, not proof
that behavior exists in canonical main. Compare each behavior against the
current tree, tests, and commit ancestry before recovering any work.

**Why:** The Step 49 audit found that canonical main selectively preserved
historical features while divergent branches still contained missing onboarding
UX, freshness work, and reports labeled complete.

**How to apply:** Use `git show`, `git merge-base --is-ancestor`, and current
source/test tracing per requirement. Recover behavior selectively and never
merge a historical release branch wholesale.