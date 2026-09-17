# Calora Intelligence Phase 2A.3 — Short Trend Report

## Final readiness determination

**IMPLEMENTATION COMPLETE — DARK, DEFAULT-OFF LOCAL CAPABILITY.**

Phase 2A.3 implements the corrected `weight.short_trend` Foundation fact and a
Progress-only, feature-gated descriptive selector candidate. The dedicated flag
is intentionally **OFF** by default:

`intelligence.insights.progress_weight_trend = false`

No existing Progress, Today, or Post-Log behavior changes while the flag is off.
Rollback is immediate: setting this one flag to `false` removes only the
optional trend candidate and requires no cleanup, migration, persistence, or
server action.

## Exact implementation

### Pure local algorithm

`calculateWeightShortTrend` is a pure local helper. Given the active
Foundation `todayKey`, timezone, and local `WeightEntry[]`, it:

1. validates the IANA timezone without throwing;
2. validates every weight entry as a finite, positive canonical-kg value on a
   strict `YYYY-MM-DD` local-calendar date that is not after `todayKey`;
3. uses two inclusive fixed 14-day calendar cohorts:
   - earlier: `todayKey - 27` through `todayKey - 14`;
   - recent: `todayKey - 13` through `todayKey`;
4. reduces all valid same-day records to one median-kg daily observation;
5. requires at least four distinct daily observations, with at least two in
   each cohort;
6. computes each cohort median in unrounded canonical kilograms;
7. classifies the unrounded delta (`recentMedianKg - earlierMedianKg`) exactly:
   - `>= +0.5 kg`: `up`;
   - `<= -0.5 kg`: `down`;
   - strictly between: `stable`.

All other input patterns return no trend. There is no interpolation, smoothing,
source priority, array-order dependence, inferred measurement time, prediction,
or explanation of why weight changed.

### Foundation and selector behavior

- Foundation emits a sanitized `weight.short_trend` fact with a real 28-day
  time window when eligibility passes. Its value contains only direction,
  derived delta, and derived counts; evidence is derived count-only with no raw
  IDs, dates, or sources.
- The fact is invalidated for weight changes, timezone changes, day boundaries,
  and source refreshes.
- The pure selector accepts the trend only through an explicit
  `includeWeightTrend` option.
- Only the existing Progress screen passes that option, and only when the new
  dedicated feature flag is on.
- The candidate has priority above the old descriptive weight-baseline result
  but below existing calorie, protein, and meal-distribution observations.
- Today and Post-Log never opt in and remain unchanged.
- Descriptive visible wording is limited to recorded entries in the logged
  28-day comparison window. It makes no physiology, fat-loss/gain, causality,
  adherence, health-status, recommendation, prediction, or future-trajectory
claim.

## Files changed

### Production code

- `artifacts/calora/lib/intelligence/weightTrend.ts` — pure strict
  local-calendar cohort, daily-median, and classification calculation.
- `artifacts/calora/lib/intelligence/facts.ts` — sanitized multi-day Foundation
  fact.
- `artifacts/calora/lib/intelligence/types.ts` — `weight_trend` category and
  `weight_short_trend` fact family.
- `artifacts/calora/lib/intelligence/invalidation.ts` — correct recomputation
  family mapping.
- `artifacts/calora/lib/intelligence/insightSelector.ts` — opt-in,
  Progress-appropriate descriptive candidate.
- `artifacts/calora/lib/intelligence/insightDelivery.ts` — optional delivery
  parameter with flag-off preservation.
- `artifacts/calora/lib/intelligence/featureFlags.ts` — dedicated default-off
  flag.
- `artifacts/calora/lib/intelligence/index.ts` — helper export.
- `artifacts/calora/app/(tabs)/insights.tsx` — Progress-only opt-in wiring.

### Tests and reporting

- `artifacts/calora/lib/__tests__/weightTrend.test.ts` — table-driven amended
  algorithm, fact, selector, privacy, hydration, account, stale, and flag
  coverage.
- `artifacts/calora/lib/__tests__/intelligenceFoundation.test.ts`
- `artifacts/calora/lib/__tests__/intelligenceHardening.test.ts`
- `artifacts/calora/lib/__tests__/intelligencePerformance.test.ts`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_3_SHORT_TREND_REPORT.md`

## Privacy, isolation, and failure guarantees

- **Current account only:** the calculation runs from the existing hydrated,
  account-keyed Progress snapshot. It stores no previous result. Existing
  account-keyed provider remounting and hydration guards remain unchanged.
- **No persistence:** no Calora state, AsyncStorage, React Query, sync outbox,
  database record, file, Coach history, living memory, or insight history is
  added.
- **No network/server/LLM:** the helper and fact/selector path import no API,
  network, server adapter, LLM, background, notification, or Coach code.
- **No analytics expansion:** no new logging or analytics path is introduced.
- **Sanitized output:** visible text and fact references exclude raw
  weight-entry IDs, dates, sources, food content, notes, photos, account
  identifiers, and provider payloads.
- **Fail closed:** malformed, invalid, future, sparse, clustered, stale,
  mixed-watermark, low-confidence, disabled, unhydrated, wrong-account, or
  invalid-timezone input results in no trend delivery.

## Automated validation

Completed on 2026-08-21:

| Command / review | Result |
| --- | --- |
| `pnpm --filter @workspace/calora run typecheck` | PASS |
| Focused trend/Foundation/hardening/performance tests | PASS — 4 files, 38 tests |
| `pnpm --filter @workspace/calora test` | PASS — 53 files, 933 tests; 6 static-server security tests |
| `pnpm --filter @workspace/api-server run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 20 files, 228 tests |
| Final Phase 2A.3 boundary review | PASS — no blockers |
| Expo web smoke | PASS for unauthenticated onboarding/root only; no visible Phase 2A.3 reference with flag off; no browser errors |

The API suite emitted its established mocked rate-limit and provider-error test
warnings while passing; no Phase 2A.3 server code exists.

The local 100-iteration performance harness measured `weightShortTrendMs` at
0.0621 ms in this run. This is a development-machine regression signal, not a
native-device performance claim.

### Algorithm matrix covered

The table-driven suite covers:

- exact `-0.5`, `+0.5`, and just-inside stable thresholds;
- same-day manual/mixed repeated values and ordering independence;
- four-distinct-date and two-per-cohort gates;
- sparse, irregular, clustered, and old-history suppression;
- strict invalid dates, future dates, non-positive values, and non-finite
  values;
- inclusive month/year/DST calendar boundaries;
- invalid-timezone suppression;
- sanitized fact serialization;
- flag-off preservation, hydration reset, stale suppression, and next-account
  empty-scope delivery.

Existing full regression coverage protects existing Progress, Today, and
Post-Log behavior. The dedicated trend flag remains off, so normal user-facing
behavior is unchanged.

## Unresolved validation debt and limitations

The following are **NOT EXECUTED / NOT PASSED** by this implementation:

- authenticated-browser Progress trend validation;
- physical Android and iOS validation;
- responsive narrow/large layout checks;
- large accessibility-text checks;
- TalkBack and VoiceOver checks;
- real-device performance/jank measurements.

The Expo browser smoke test reached onboarding only; no authenticated Progress
session was available. No physical-device or assistive-technology claim is made.

The observation remains deliberately limited: it describes only median
differences among recorded local weights inside a fixed 28-day comparison
window. It cannot distinguish normal short-term fluctuation from a long-term
change and does not claim to do so.

## Stop condition

Phase 2A.3 does not authorize or begin Phase 2A.4, Coach Intelligence,
proactive behavior, persistence, feedback, Planner/Recipe Intelligence,
evidence UI, server facts, or any other Intelligence expansion.