# Calora Experience 02 — Architecture and Plan

## Design architecture

The implementation follows the project principle: **sophisticated underneath, effortless on the surface**.

1. **One source of truth.** Fasting, Learning reader state, dashboard preferences, and weight summaries are pure utilities wired into `CaloraContext`; screens do not duplicate business data.
2. **Additive encrypted persistence.** State is normalized during hydration, included in autosave/export, reset through clear-data and export-gap paths, and migrated through the storage schema.
3. **Focused destinations.** More is a lightweight navigation hub. Fasting, Learning, Saved Meals, and Dashboard Layout are standalone routes with standard headers/back behavior.
4. **Truthful presentation.** Progress derives a valid chronological recorded-weight summary without fabricating measurements, and More uses that summary rather than array insertion order.
5. **Safety before feature depth.** Fasting remains optional, supports interruption and recovery, links to relevant safety education, and blocks creation of a timer for a known under-18 profile age.

## Key modules

| Module                                                                     | Responsibility                                                                                                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/fasting.ts`                                                           | Pure schedule normalization, timestamp timer state, completion history, calendar/insight derivation, and adult eligibility guard.              |
| `lib/learning.ts` + `content/learning.ts`                                  | Original lesson catalog, search, collections, reader state, progress, saved lessons, journeys, safety metadata, and editorial review metadata. |
| `lib/progressWeightSummary.ts`                                             | Chronological validation and safe Progress/More weight presentation.                                                                           |
| `context/CaloraContext.tsx`                                                | Account-scoped hydration, autosave, export, clear/reset, and public actions for all durable state.                                             |
| `app/fasting.tsx`, `app/learning.tsx`, `app/learning/[lessonId].tsx`       | Feature destinations.                                                                                                                          |
| `app/(tabs)/more.tsx`, `app/(tabs)/insights.tsx`, `app/(tabs)/profile.tsx` | Connected navigation and existing-system refinement.                                                                                           |

## Delivery plan executed

The branch implemented the durable models first, then connected screen routes and contextual links, added regression coverage, completed reviewer-driven safety/data fixes, and ran offline validation. Protected GitHub CI is the remaining authority for branch validation after submission.
