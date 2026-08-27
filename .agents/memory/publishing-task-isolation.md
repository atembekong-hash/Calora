---
name: Publishing task isolation
description: Why Publishing can differ from the Git state visible inside an active Agent task.
---

Publishing snapshots the applied main project, not the local Git state visible
inside an active isolated Agent task. Repointing local branches in the task copy
does not change the applied main project and therefore does not change the
Publishing source.

**Why:** Repeated successful builds can receive new deployment commit IDs while
serving the same applied-main source tree. A task copy that is older than
applied main cannot be published as an exact historical tree without omitting
later main changes.

**How to apply:** Compare the live tree with both the task checkout and the
applied-main tree before publishing. Apply forward task changes before release.
For an older historical tree, require an explicit owner release decision or
Replit Support guidance; do not rewrite history, roll back valid later code, or
keep republishing.