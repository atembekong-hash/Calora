---
name: Calora release candidate freeze
description: Preserves the boundary between the frozen Calora candidate and later documentation or development state.
---

Signed Android and iOS release-candidate builds must originate from the exact immutable candidate identified in `FINAL_CALORA_RELEASE_CANDIDATE_FREEZE_REPORT.md`, not from the current branch tip or a later workspace checkpoint.

**Why:** The validated local release line diverged from the GitHub default branch, so the exact candidate was preserved on a dedicated remote RC branch without merging, rebasing, or force-pushing either history.

**How to apply:** Consult the freeze report for the authoritative commit and remote branch. Use a clean detached checkout of that commit for signed EAS builds, and keep later documentation or feature commits outside the candidate.