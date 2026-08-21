# Calora Intelligence Phase 2A.5 — Local 7-Day Macro Record Coverage

## Status

Implemented as a local-only, stateless, Progress-only candidate. The rollout remains default-off.

## User-facing behavior

When explicitly enabled and eligible, Progress may show:

> Macro records are complete on N of the last 7 local-calendar days.

This statement refers only to the completeness of Calora's stored macro fields. It does not describe the completeness, adequacy, quality, balance, or healthfulness of a person's nutrition.

## Calculation and qualification rule

The pure local calculation:

1. Validates the explicit IANA timezone and strict `YYYY-MM-DD` local calendar keys.
2. Uses the inclusive local-calendar window from `todayKey - 6` through `todayKey`.
3. Rejects malformed or future-dated records.
4. Requires every included record in the seven-day window to contain finite, non-negative values for calories, protein, carbohydrates, and fat.
5. Counts distinct observed record dates only; duplicate records on one date count once.
6. Requires at least three distinct qualifying dates.

Any invalid in-window macro record fails closed to no result. Records before the window do not contribute to the calculation.

## Foundation fact and watermark

Added the sanitized Foundation fact:

```text
nutrition.seven_day_macro_record_coverage
```

Eligible value:

```ts
{ qualifiedDayCount: number; windowDays: 7; state: 'eligible' }
```

Insufficient value:

```ts
{ state: 'insufficient' }
```

The fact contains aggregate derived evidence only. It serializes no raw food-log IDs, dates, names, notes, images, provider payloads, calorie values, or macro values.

Its dedicated seven-day watermark includes the scoped log identity, date, calories, protein, carbohydrates, fat, window, timezone, and local-calendar day-boundary semantics. A prior-day macro edit therefore invalidates and recomputes this fact correctly without broadening the current-day watermark used by daily facts or Coach.

## Delivery and priority

- Delivery: existing stateless local Progress one-card path only.
- Candidate category: `macro_record_coverage`.
- Priority: `110`.
- It is below calorie status (`400`), protein balance (`300`), meal distribution (`200`), optional weight trend (`150`), and optional nutrition coverage (`125`), while remaining above weight baseline (`100`).
- Today and Post-Log do not receive a macro-record-coverage option or new behavior.

## Rollout and rollback

- Added flag: `intelligence.insights.progress_macro_record_coverage`.
- Default: `false`.
- The Progress screen passes this option explicitly only to local Progress delivery.
- Rollback is a flag-off change with no server work, migration, persistence cleanup, cache cleanup, or data mutation.

## Privacy, account isolation, and no-I/O proof

- The calculation receives only the existing hydrated, account-scoped `IntelligenceContext` snapshot.
- It is pure, deterministic, render-derived, and transient.
- Hydration, account reset, sign-out, local-data clear, stale facts, malformed snapshots, and unsafe selector states fail closed to silence.
- No AsyncStorage, API, server, database, network, cache, analytics, notifications, background processing, Coach integration, Coach Fact Context activation, LLM, Planner/Recipe Intelligence, evidence UI, recommendation, personalization, score, prediction, or additional Intelligence capability was added.
- Coach Fact Context remains dark and unchanged.

## Prohibited interpretations preserved

The feature makes no assertion or implication about:

- skipped meals or unlogged food;
- adherence, consistency, effort, success, failure, or scoring;
- diet quality, calorie sufficiency, macro adequacy, nutritional balance, or health;
- causal weight/nutrition relationships;
- recommendations, nudges, predictions, or forecasts.

## Files changed

- `artifacts/calora/lib/intelligence/macroRecordCoverage.ts`
- `artifacts/calora/lib/intelligence/facts.ts`
- `artifacts/calora/lib/intelligence/types.ts`
- `artifacts/calora/lib/intelligence/invalidation.ts`
- `artifacts/calora/lib/intelligence/featureFlags.ts`
- `artifacts/calora/lib/intelligence/insightSelector.ts`
- `artifacts/calora/lib/intelligence/insightDelivery.ts`
- `artifacts/calora/lib/intelligence/index.ts`
- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/lib/__tests__/macroRecordCoverage.test.ts`
- `artifacts/calora/lib/__tests__/intelligenceHardening.test.ts`
- `artifacts/calora/lib/__tests__/intelligencePerformance.test.ts`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_5_AUTHORIZATION_BRIEF.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_5_MACRO_RECORD_COVERAGE_REPORT.md`

## Defect found and corrected

The original selector guard treated distinct multi-day facts with the same calendar window as stale because their intentionally different fact-specific watermarks differed. This blocked the existing nutrition-coverage candidate as well as macro-record coverage.

The guard now continues to fail closed for conflicting same-day snapshot watermarks, while validating scoped multi-day facts by both their window and fact type. This preserves independent watermark validity for weight trend, nutrition coverage, and macro record coverage without weakening current-day snapshot safety.

## Validation

### Focused Foundation and selector suite

```sh
pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/macroRecordCoverage.test.ts \
  lib/__tests__/nutritionCoverage.test.ts \
  lib/__tests__/weightTrend.test.ts \
  lib/__tests__/intelligenceFoundation.test.ts \
  lib/__tests__/intelligenceHardening.test.ts \
  lib/__tests__/intelligencePerformance.test.ts
```

Result: **6 files, 58 tests passed.**

Coverage included threshold boundaries, duplicate dates, input order, strict dates, month/year/DST/timezone behavior, finite/non-negative macro requirements, macro-aware prior-day watermark changes, privacy serialization, stale/hydration/account suppression, default-off rollback, one-card priority, existing coverage regression, invalidation, and local performance.

Macro record coverage averaged approximately **0.1427 ms** per local iteration in the focused validation run.

### Full validation

```sh
pnpm --filter @workspace/calora run typecheck
pnpm --filter @workspace/calora test -- --run
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server test -- --run
```

Results:

- Calora typecheck passed.
- Calora suite passed: **57 files, 960 tests**, plus **6 static-server security tests**.
- API typecheck passed.
- API suite passed: **23 files, 241 tests**.

Expected test-only logs exercised simulated persistence, provider, rate-limit, and database failure paths. No test failed.

### Default-off Progress browser smoke

At a `390×844` mobile viewport, the browser opened `/insights` and confirmed:

- Progress rendered without a blank screen or error boundary.
- The Phase 2A.5 flag remained untouched/default-off.
- No browser or page errors occurred.
- Screenshot evidence: `cyfxtz`.

Observed non-blocking development/web warnings were limited to Expo notifications on web, deprecated shadow and pointer-event props, RevenueCat Browser Mode, React DevTools, and development logging.

## Final diff scope check

The final implementation diff is limited to the authorized Phase 2A.5 local fact, flag, invalidation, selector/delivery, Progress opt-in, focused tests, existing Foundation test expectations, and required documentation. No unrelated behavior was intentionally changed.

## Explicit deferred validation debt

The following are still pending and are **not passed**:

- physical Android validation;
- physical iOS validation;
- responsive-layout validation beyond the web smoke;
- large-text validation;
- TalkBack validation;
- VoiceOver validation;
- related device and accessibility checks.

No Phase 2A.6 work was begun, defined, or implemented.