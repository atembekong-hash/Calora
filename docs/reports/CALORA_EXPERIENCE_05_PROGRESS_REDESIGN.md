# Calora Experience 05 — Progress Redesign

## Preserved data model

The existing Progress route remains the single Progress system and preserves its Overview, Trends, and Weight sections, existing nutrition/activity/hydration/weight sources, historical ranges, health context, and contextual navigation. It is not promoted to a duplicate visible tab.

## Refinements

- `lib/progressWeightSummary.ts` separates valid chronological recorded weigh-ins from an onboarding baseline, source labels, recency, and stale context.
- The weight view avoids fabricated trends when fewer than two valid records exist.
- More uses the same chronological summary instead of array insertion order, removing stale “latest” values and duplicate units.
- More counts meal logs with `dateKey()`—the app’s local-day convention—rather than UTC string slicing.
- Existing visual work retains compact summaries, chart/date-range controls, responsive viewports, reduced-motion behavior, enlarged-text support, and accessible route access from Today and More.

## Validation

`progressWeightSummary.test.ts` and `progressScreen.test.ts` cover chronological ordering, source/recency truthfulness, range contracts, charts, and no-fabricated-value boundaries. The More render regression is in the protected suite; local JSDOM execution is blocked by the documented sandbox Undici/Node incompatibility before test import.
