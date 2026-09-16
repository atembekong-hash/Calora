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

The Step 51 targeted window is best modeled as an expanded adjacent product
sequence from the pre-prompt Coach work (`0ba0ef5`) through the final bounded
Coach Fact Context integration (`2486ae3`), with the report-16–19 core nested
inside it (`53eddce` through `22cbe8a`). Its genuine recovery scope excludes
the intentional Fitness/More rollback and is limited to onboarding keyboard and
agreement UX, recipe freshness/remount behavior, nutrition-state presentation,
and a disconnected Health workout destination requiring a new product decision.

**Why:** The broader historical branch mixes product remediation with release
control, superseded architecture, and intentional rollbacks. A bounded
ancestry-and-mission window prevents those items from inflating missing-work
conclusions.

**How to apply:** Treat the Step 51 report as the evidence boundary for future
recovery planning; reimplement against canonical architecture rather than
merging the historical release branch wholesale.