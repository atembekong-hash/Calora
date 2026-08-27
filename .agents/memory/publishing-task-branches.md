---
name: Publishing task branches
description: Why publishing from the workspace can miss changes that still live only in an isolated task branch.
---

An in-progress isolated project task is not necessarily the source snapshot used by the user-facing Publishing flow. If repeated builds get new build IDs but expose the same old compiled source tree, stop republishing: merge the task first.

**Why:** Publishing can truthfully build a clean but unchanged base snapshot while the task agent sees and tests newer isolated commits. Successful build status alone does not prove that the intended source was deployed.

**How to apply:** Compare the live compiled source tree with the intended clean checkout, not just timestamps or build status. Complete the task merge before publishing task-only changes, then require the public-release verifier to pass.