# Calora Intelligence Phase 2A.4 Authorization Brief

**Status:** Proposed for approval only.  
**Recommendation:** **GO, conditionally and within the boundary below.**  
**Implementation status:** Not authorized or started.

## 1. Exact phase name

**Calora Intelligence Phase 2A.4 — Local 7-Day Nutrition Coverage**

## 2. User problem

Current nutrition intelligence is mostly same-day. Users cannot tell whether
their recent nutrition picture is supported by several recorded days or only an
isolated log. Missing records are not evidence that the user did not eat, so
the capability must report observed logging coverage rather than adherence,
completeness, or diet quality.

## 3. User-facing value

Progress may show one factual observation such as:

> Nutrition logged on 5 of the last 7 local-calendar days.

This helps users interpret the coverage of their own recent nutrition record.
It must never say that a user was consistent, skipped meals, stayed on plan, or
met nutrition needs.

## 4. Why this is the correct next phase

This is the smallest useful longitudinal nutrition signal that avoids turning
sparse records into a behavioral inference. It reuses existing local food logs,
Foundation metadata, account boundaries, and the stateless Progress delivery
path. It does not require the higher-risk alternatives: Coach, a model,
recommendations, notification, persistence, server facts, macro/adherence
scoring, Planner, Recipe, or evidence UI.

## 5. Dependencies and current status

| Dependency | Status |
| --- | --- |
| Account-keyed storage, hydration, and lifecycle boundary | Existing |
| Local deterministic Foundation and fact adapter | Existing and enabled |
| Freshness, confidence, watermark, and provenance contracts | Existing |
| Stateless selector and one-card Progress delivery | Existing |
| Progress surface | Existing |
| Coach Fact Context | Implemented but dark; not a dependency |
| New fact, selector candidate, flag, invalidation, and tests | Required work |

Before implementation, product must approve the exact wording and fixed
candidate priority, and this phase must receive explicit written authorization.

## 6. Exact Foundation fact required

Add exactly one local fact:

`nutrition.seven_day_coverage`

Its sanitized value is:

```ts
{
  loggedDayCount: number; // 0 through 7
  windowDays: 7;
  state: "eligible" | "insufficient";
}
```

It uses the existing Intelligence Fact metadata: calculation version, source
watermark, confidence, freshness, missing-data state, explicit timezone, and a
real local-calendar window from `todayKey - 6` through `todayKey`. Evidence is
derived count-only. The fact must not contain account IDs, log IDs, food names,
notes, images, provider/source data, or per-day dates.

## 7. Exact deterministic intelligence logic

1. Strictly validate `todayKey`, timezone, and every food-log date.
2. Include only valid local dates in the inclusive seven-day window.
3. Exclude future dates and malformed inputs.
4. Count distinct qualifying dates, not raw logs.
5. Require at least **three distinct logged days** for an eligible observation.
6. Generate only the fixed count-based message: “Nutrition logged on N of the
   last 7 local-calendar days.”
7. Do not interpolate, infer completeness, compare to a target, score macros,
   rank foods, smooth data, predict, claim causality, recommend action, or make
   a health conclusion.

## 8. Eligible delivery surface

**Progress only.** The capability uses the existing render-derived, stateless,
one-card Progress path. It must not appear in Today, Post-Log, Coach, Planner,
Recipe, notifications, or a background process.

## 9. Trigger conditions

Recompute only from the hydrated active-account snapshot while Progress renders,
and through existing local invalidation paths for food-log changes, local day
boundary, timezone change, source refresh, or account reset.

It must not react to network completion, create a post-log banner, execute in
the background, or enter Coach.

## 10. Suppression and insufficient-data rules

Deliver no card when any of the following is true:

- the dedicated flag is off;
- hydration is incomplete, the scope is reset, or the user is a guest;
- timezone/date/log input is invalid or ambiguous;
- a date is future-dated;
- fewer than three distinct qualifying dates exist;
- freshness is stale, expired, or unknown;
- watermarks are mixed;
- confidence is low or insufficient;
- a selector/fact exception occurs.

An unlogged day must never be described as skipped food or a failed day. Do not
show a `0/7` conclusion. Existing higher-priority Progress candidates win, and
the one-card maximum remains authoritative.

## 11. Feature flag and default state

Add one independently reversible, default-off flag:

```ts
intelligence.insights.progress_nutrition_coverage = false
```

The selector receives an explicit opt-in; it must not activate implicitly.

## 12. Account-isolation requirements

Compute only inside the existing keyed, hydrated account provider. Return no
result during hydration, guest state, or scope reset. Keep no prior result in
component, provider, module, or cache state. An A → guest → B → A transition
must clear output before recomputing.

## 13. Privacy and data boundaries

Only the sanitized derived count, fixed window wording, safe fact reference,
and safe evidence class may reach the UI. Exclude account IDs, raw dates, log
IDs, food names, notes, photos, source/provider payloads, and Coach content.
No new telemetry or nutrition-content serialization is allowed.

## 14. Persistence, network, server, Coach, and LLM boundaries

This phase adds no persistence, AsyncStorage value, state history, React Query
persistence, sync entry, database record, file, cache, network/API call,
server adapter, background worker, provider request, Coach history, Coach
context, LLM call, or analytics event.

Coach Fact Context remains dark: its client/server gates, cohort, fallback
policy, routing, and user migration do not change.

## 15. Failure and stale-data behavior

Malformed, stale, mixed-watermark, low-confidence, invalid-account,
invalid-timezone, and calculation-error states fail closed to no card. The
optional candidate must not block Progress, retry indefinitely, or retain a
prior result.

## 16. Interaction with Progress, Today, and Post-Log

The candidate is Progress-only. It is lower priority than calorie status,
protein balance, meal distribution, and the separately gated weight-trend
candidate. It does not replace daily nutrition facts. Today and Post-Log remain
unchanged.

## 17. Explicitly prohibited capabilities

- Calorie/macro adequacy or adherence scoring.
- “On track,” consistency, skipped-meal, diet-quality, health, physiology, or
  causal claims.
- Recommendations, nudges, forecasts, goal dates, or predictions.
- Evidence/explanation screens, raw-history exposure, feedback, personalization,
  learning, persistence, analytics, notifications, or background work.
- Coach integration, LLM output, server/API/database work, and bundled
  Intelligence features.

## 18. Rollback strategy

Set `intelligence.insights.progress_nutrition_coverage` to `false`. Rollback is
immediate and cleanup-free because this capability creates no stored state,
migration, cache, server route, or persistent output.

## 19. Required automated validation

- Deterministic repeat-input and no-mutation tests.
- Seven-day inclusive boundary, month/year/DST, and timezone tests.
- Zero through seven distinct-date coverage, duplicate same-day logs, and
  order-independence tests.
- Invalid, malformed, null, future, and duplicate-input suppression.
- Assertions that missing days do not become adherence/completeness claims.
- Sanitization tests proving raw IDs, dates, food content, and notes do not
  serialize.
- Fact metadata, freshness, confidence, watermark, hydration, guest,
  account-switch, reset, failure, and stale-data tests.
- One-card priority tests with existing calorie/protein/meal/weight candidates;
  Today and Post-Log regressions.
- Dedicated flag rollback and no-I/O assertions for storage, network, server,
  analytics, background, Coach, and LLM behavior.
- Local performance measurement and full Calora/API typecheck and regression
  suites.

## 20. Deferred pre-production validation

The following are intentionally deferred and must remain recorded as **pending,
not passed**:

- authenticated Progress browser validation;
- physical Android and iOS validation;
- responsive narrow and large layout checks;
- large-text checks;
- TalkBack and VoiceOver checks;
- real-device performance/jank measurement;
- offline/relaunch and device account-switch evidence where applicable.

They do not authorize untested claims and remain required for final
pre-production validation. They do not block unrelated Phase 2A development.

## 21. Exact subsequent implementation scope

The next implementation task may only:

1. add/reuse strict local date/timezone validation;
2. add the `nutrition.seven_day_coverage` fact, type/family, and invalidation
   wiring;
3. add one pure, explicitly opted-in Progress selector candidate with fixed
   priority;
4. add the dedicated default-off flag and existing delivery-path wiring;
5. add focused privacy, isolation, failure, performance, and regression tests;
6. update the completion report.

It may not add an API/server/database/schema/migration, persistence, Coach,
LLM, telemetry, unrelated refactor, or another Intelligence feature.

## 22. Required completion report

Create `docs/CALORA_INTELLIGENCE_PHASE_2A_4_NUTRITION_COVERAGE_REPORT.md`
covering:

- implementation boundary and exact changed files;
- final fact schema, threshold, wording, priority, flag default, and rollback;
- trigger and suppression matrix;
- account-isolation, privacy, and no-I/O audit;
- confirmation that Coach Fact Context remains dark;
- automated commands, results, test counts, and local performance result;
- proof that flag-off preserves prior behavior and no raw content serializes;
- all deferred browser/device/accessibility validation debt, explicitly marked
  unexecuted.

## Authorization decision

**GO, conditionally.** Authorize an implementation task only if the exact
count-based wording and strict boundary above are accepted. If the requested
experience expands into adherence, completeness, target comparison, persistence,
network/server work, Coach, or any other added capability, revise or reject the
proposal rather than widening its scope.