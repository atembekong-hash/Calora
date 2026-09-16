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

The broader Step 50 archaeology also found that a historical Fitness/More
navigation phase can be removed while its underlying Health data foundation
survives. Treat a missing destination and a missing data capability as separate
questions.

**Why:** The historical Fitness screen, More aggregator, and workout
presentation were deleted, but canonical HealthKit/Health Connect snapshots
remain available through Profile and Insights.

**How to apply:** When a historical route disappears, trace its former state,
provider, and visible outputs independently before classifying it as lost.