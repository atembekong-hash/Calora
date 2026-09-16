# Contextual Insights Final Completion Report

## Executive summary

**Estimated completion: 92%**

Calora has a working, deterministic, local-first Contextual Insights system for
Today and Progress, with a bounded Fact Context path for Coach. This audit found
no unsafe missing implementation that should be expanded automatically. The one
user-facing mismatch found was corrected: Coach now describes the limited
calorie-and-protein facts it actually receives.

The remaining work is optional, policy-led expansion of new high-confidence
signals for Planner and Recipes. It is not required for the current launch
scope and must not be added without explicit relevance, safety, and display
rules.

## Current architecture summary

- The mobile client constructs a deterministic local intelligence context from
  confirmed local sources such as food logs, profile targets, weights, water,
  mood, activity, planner state, shopping state, and recipes.
- The shared fact builder creates derived nutrition, meal-distribution,
  completeness, weight-baseline/trend, and seven-day coverage facts.
- The pure selector applies freshness, coherent-watermark, evidence, and
  confidence gates, then returns at most one prioritized insight or useful
  silence.
- Delivery is feature-flagged, hydration-aware, and fail-closed. It performs
  no provider call, network call, automatic mutation, or persistent insight
  write.
- Today and Progress consume this shared output with surface-specific policy.
- Coach remains a separate conversational experience. Its Fact Context request
  sends only approved daily calorie and protein facts; it does not use broader
  wellness, planning, memory, or weight data.

## Feature inventory and status matrix

| Capability | Status | Current behavior / boundary |
| --- | --- | --- |
| Dashboard / Today insight | COMPLETE | Builds current-day context, applies gated local selection, and shows one relevant insight only when confidence and freshness permit. |
| Planner contextual experience | PARTIAL | Planner state participates in the shared context and invalidation model, but there is no planner-specific derived fact or low-noise insight surface. |
| Recipes contextual experience | PARTIAL | Recipe provenance, nutrition confidence, offline behavior, and recommendations are implemented, but there is no recipe-specific derived insight family. |
| Progress insight | COMPLETE | Uses the shared selector with controlled longitudinal weight and nutrition-coverage policies. |
| Calora Coach | COMPLETE | Restricted Fact Context is consented, fail-closed, evidence-backed, and separate from the conversational layer. Entry copy now matches the approved scope. |
| Shared contextual engine | COMPLETE | One deterministic fact and selection pipeline; no parallel provider or intelligence system. |
| Context generation | PARTIAL | Nutrition and weight context are derived; planner, recipe, hydration, mood, and activity inputs are intentionally not promoted into facts without an explicit safety policy. |
| Insight generation | COMPLETE | Selector enforces priority, evidence, freshness, confidence, and coherent source-watermark checks. |
| Recommendation logic | COMPLETE | Current categories provide factual, non-mutating guidance and prefer silence when no condition is strong enough. |
| Trigger logic | COMPLETE | Uses local source invalidation and delivery gating; no repeated network or provider trigger exists. |
| Personalization | PARTIAL | Current targets and confirmed personal logs shape local facts; broader behavioral personalization is intentionally not inferred. |
| Cross-feature context sharing | PARTIAL | Shared context accepts planner, shopping, recipe, wellness, and activity sources, but only approved nutrition/weight facts currently affect output. |
| Safety and consent | COMPLETE | Coach consent is explicit; facts are allowlisted; legacy Coach is unavailable; no insight may alter user data automatically. |
| Fallback behavior | COMPLETE | Hydration, freshness, malformed-data, low-confidence, and no-data conditions safely suppress output or preserve the existing non-insight experience. |
| Persistence | COMPLETE | Confirmed source records persist through existing state; derived insights remain transient to avoid stale or misleading history. |
| Mobile presentation and UX | COMPLETE | Today and Progress use compact, low-noise presentation; Coach clearly shows the scope of its contextual request. |

## Gap audit outcome

### Implemented now

The Coach consent copy previously implied that a conversation could use
hydration, mood, activity, weight, Food Memory, and planning data. The
Fact Context request deliberately excludes those sources and only sends
calorie/protein facts. The copy and labels now state that scope clearly.

### Not implemented automatically

Planner- and recipe-specific insights, and broader wellness-derived facts, are
not safe to add merely because their source data is available. Each would need:

1. an explicit fact definition;
2. a confidence and relevance threshold;
3. a selector priority and suppression policy;
4. a compact surface presentation; and
5. dedicated safety and regression tests.

Adding them without those constraints would create random or repetitive advice
and would weaken the product's current useful-silence behavior.

## Changes made

- Updated Coach’s subtitle, consent title, description, and scope labels to
  accurately represent the calorie-and-protein-only Fact Context boundary.
- Preserved the established local contextual engine and all Coach safety gates.
- Did not add a provider call, broaden the allowlist, introduce new persistence,
  or alter any user data.

## Files modified

- `artifacts/calora/app/coach.tsx`
- `docs/contextual-insights/CONTEXTUAL_INSIGHTS_FINAL_COMPLETION_REPORT.md`

## Validation

| Check | Result |
| --- | --- |
| Coach/Fact Context targeted tests | 19 tests passed across 7 files |
| Calora TypeScript typecheck | passed |
| Diff validation | passed |
| Coach mobile web preview | rendered the corrected consent panel without a browser runtime error |

Targeted coverage included consent caching, Fact Context request construction,
activation coordination, adapter isolation, current Coach context construction,
and legacy-path isolation.

## Remaining issues

- Planner and Recipes do not yet present dedicated contextual-insight cards.
- Wellness, activity, planning, and recipe inputs are not yet approved fact
  families for the shared selector.
- Broader Coach context is intentionally excluded from the restricted Fact
  Context request and must not be reintroduced without a separately reviewed
  safety boundary.

## Launch assessment

### Launch-critical remaining work

None for the existing bounded Contextual Insights launch scope.

### Optional post-launch improvements

- Design and test a single high-confidence planner-specific fact and surface.
- Design and test a recipe-specific relevance policy that preserves nutrition
  provenance and avoids recommendation repetition.
- Consider any wellness-derived facts only after defining explicit consent,
  confidence, and low-noise rules.

## Final recommendation

Launch the current bounded Contextual Insights experience as implemented.
Retain the existing useful-silence, deterministic, local-first model. Treat any
expansion beyond nutrition and approved weight signals as a separate
product-and-safety decision rather than an automatic completion requirement.