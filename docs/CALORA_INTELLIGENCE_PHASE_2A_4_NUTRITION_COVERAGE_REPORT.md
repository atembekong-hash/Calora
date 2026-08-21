# Calora Intelligence Phase 2A.4 — Local 7-Day Nutrition Coverage

## Status

Implemented as an independently reversible, local-only Progress insight. The rollout remains disabled by default.

## User-facing behavior

When explicitly enabled and eligible, Progress may show one stateless local insight:

> Nutrition logged on N of the last 7 local-calendar days.

The capability reports only observed records. It does not characterize unlogged days as skipped meals, non-adherence, inconsistency, insufficient nutrition, or diet quality.

## Eligibility and calculation

- The inclusive local-calendar window is `todayKey - 6` through `todayKey`.
- The result is the count of distinct qualifying food-log dates, not individual food-log records.
- At least three distinct dates are required.
- Duplicate same-day records do not inflate the count.
- Calendar keys are strictly validated as real `YYYY-MM-DD` dates.
- Invalid timezone, malformed dates, future dates, insufficient history, or malformed inputs fail closed with no coverage card.
- All computation is pure and deterministic; input order does not change the result.

## Foundation fact and freshness

`nutrition.seven_day_coverage` is a count-only Foundation fact with:

- `loggedDayCount`, `windowDays`, and eligibility state only;
- derived evidence with a count and no raw food-log IDs, dates, food names, notes, images, or nutrition content;
- a seven-day local-calendar time window;
- its own deterministic coverage-window watermark built from the contributing local logs, window, timezone, and day-boundary semantics.

An edit to an earlier qualifying date therefore changes the coverage fact's watermark without broadening the existing current-day watermark used by daily facts or Coach. The selector preserves fail-closed mixed-watermark behavior within facts sharing an identical time window, while allowing separate, valid windows for scoped multi-day facts.

## Delivery and priority

- Delivery is restricted to the existing stateless local Progress insight path.
- The candidate priority is `125`, below calorie status (`400`), protein balance (`300`), meal distribution (`200`), and the separately gated weight trend (`150`).
- Today and Post-Log routes receive no new option or behavior.
- Standard hydration, enabled, freshness, and account-snapshot boundaries continue to suppress delivery when unsafe.

## Rollout and rollback

- Added `intelligence.insights.progress_nutrition_coverage`.
- Default: `false`.
- The Progress screen passes the explicit enablement option only for this flag.
- Rollback is a flag-off change; no server change, migration, persisted data, cache cleanup, or user-data mutation is required.

## Privacy, isolation, and no-I/O boundary

- No API, server, database, network, AsyncStorage, cache, analytics, background job, notification, Coach, LLM, Planner, Recipe Intelligence, or recommendation work was added.
- The capability reads only the isolated local `IntelligenceContext` snapshot already used by Progress.
- The derived fact serializes no raw food content or record identifiers.
- The render-derived Progress path remains synchronous with hydration and local account scope changes.
- Coach Fact Context remains dark and unchanged.

## Files changed

- `artifacts/calora/lib/intelligence/nutritionCoverage.ts`
- `artifacts/calora/lib/intelligence/facts.ts`
- `artifacts/calora/lib/intelligence/types.ts`
- `artifacts/calora/lib/intelligence/invalidation.ts`
- `artifacts/calora/lib/intelligence/insightSelector.ts`
- `artifacts/calora/lib/intelligence/insightDelivery.ts`
- `artifacts/calora/lib/intelligence/featureFlags.ts`
- `artifacts/calora/lib/intelligence/index.ts`
- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/lib/__tests__/nutritionCoverage.test.ts`
- `artifacts/calora/lib/__tests__/intelligencePerformance.test.ts`
- `artifacts/calora/lib/__tests__/intelligenceHardening.test.ts`

## Validation

### Focused Foundation and selector regression suite

Command:

```sh
pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/nutritionCoverage.test.ts \
  lib/__tests__/weightTrend.test.ts \
  lib/__tests__/intelligenceFoundation.test.ts \
  lib/__tests__/intelligenceHardening.test.ts \
  lib/__tests__/intelligencePerformance.test.ts
```

Result: **5 files, 46 tests passed.**

The coverage performance sample completed locally in approximately `0.1515 ms` per iteration in the validation run.

### Full application validation

```sh
pnpm --filter @workspace/calora run typecheck
pnpm --filter @workspace/calora test -- --run
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server test -- --run
```

Results:

- Calora TypeScript typecheck passed.
- Calora suite passed: **56 files, 948 tests**, plus **6 static-server security tests**.
- API TypeScript typecheck passed.
- API suite passed: **23 files, 241 tests**.

Expected test-only warning output exercised existing simulated persistence, rate-limit, provider, and database failure paths; no test failed.

### Mobile browser smoke

A Playwright browser validation opened the mobile web preview at a `390×844` viewport, navigated to Progress/Insights, and confirmed:

- Progress rendered without a blank screen or error boundary.
- The rollout flag remained untouched/default-off.
- No browser console or page errors occurred.
- Existing non-blocking environment warnings were limited to Expo web notifications, deprecated shadow props, RevenueCat browser mode, and API-base information.

Screenshot evidence: `5o50fw`.

## Explicit pending validation debt

The following work was intentionally deferred by authorization and is **not passed**:

- physical Android and iOS validation;
- responsive-layout validation beyond the web smoke;
- large-text validation;
- TalkBack validation;
- VoiceOver validation;
- related device and accessibility checks.

This debt remains pending and does not imply feature activation.