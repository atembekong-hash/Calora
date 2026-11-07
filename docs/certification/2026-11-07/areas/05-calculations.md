# Calora Autonomous Production Certification Mission
## Area 05 — Nutrition health and calculations

**Audit status:** bounded read-only audit
**Repository:** `/home/ubuntu/calora-coach-live-main`
**Protected-main baseline audited:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161`
**Observed HEAD:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161` (merge commit `Merge pull request #392: complete Android QA lab v2 workflow`)
**Working tree:** clean at audit start
**Audit date:** 2026-11-07

## Executive result

This domain is **not fully ready for an unqualified US commercial-launch PASS**. The protected source has strong deterministic coverage for macro targets, recipe/diary serving scaling, health-day boundaries, hydration state, fasting timestamps, weight/progress summaries, missing-data semantics, and local-first diary synchronization. The focused independent run executed in this checkout passed **12 test files / 165 tests**.

The main source-level concern is the calorie recommendation function: `recommendCalories()` is a simple deterministic estimate but has no direct test in the current focused suite and performs no runtime validation or clamping of `weightKg`. Profile hydration validates finiteness but does not reject non-positive profile numeric values. This means malformed or unsafe persisted/onboarding values can reach a health-related target calculation unless UI constraints are relied upon. This is classified **FAIL** for defensive calculation integrity, not as a claim that ordinary valid-user inputs produce incorrect arithmetic.

Live provider exact-barcode serving selection, native Android/iOS health-provider behavior, authenticated production synchronization, and database-backed synchronization were not independently proven in this bounded sandbox. These are **BLOCKED** or **NOT RUN**, never inferred PASS from historical reports.

## Requirement classifications

| # | Requirement assessed | Result | Current evidence / gap |
|---:|---|---|---|
| 1 | Calorie target calculation is deterministic and rejects unsafe profile inputs | **FAIL** | `artifacts/calora/lib/calorieRecommendation.ts` computes `10 * weightKg + 900`, applies activity and goal factors, and rounds to 50 kcal, but does not validate finite/positive weight or bound the result. `CaloraContext` profile validation checks `Number.isFinite` but not positivity for height, weights, age, or calorie target. No direct `calorieRecommendation.test.ts` was found. Add pure tests for valid vectors, zero/negative/NaN/Infinity, extreme values, and explicit minimum/maximum policy before launch. |
| 2 | Macro targets and custom macro input are safe and predictable | **PASS** | `artifacts/calora/lib/nutritionGoals.ts`; `lib/__tests__/nutritionGoals.test.ts` (8 tests). Automatic ratios and custom grams are covered; invalid, decimal, non-positive, and out-of-range values are rejected. Note that custom macros are intentionally independent of calorie consistency; this is product behavior and should remain clearly disclosed. |
| 3 | Recipe and diary serving quantities scale nutrition exactly once and preserve unknown values | **PASS** | `lib/recipeServing.ts`, `lib/recipeDiaryServing.ts`; `recipeServing.test.ts` and `recipeDiaryServing.test.ts`. Tests cover bounds, fractional quantities, explicit diary quantity, rounding, invalid quantity fallback, and preservation of missing/negative macro values as null. Historical Mission 319/322 reports document the prior manual-serving defect and generic repair; current source/test evidence supports the repaired path. |
| 4 | Activity/health active-energy and steps use correct units, evidence, and zero-vs-missing semantics | **PASS** | `lib/health/healthService.android.ts`, `healthService.ios.ts`, `health/burnedPresentation.ts`, `lib/__tests__/healthDayAndBurnedStatus.test.ts` (20 tests in the focused run). Measured zero is distinct from absent data; invalid negative/non-finite totals fail; Android maps active calories rather than unrelated energy totals; HealthKit uses kcal. Steps/workouts do not alter onboarding calorie targets, as documented in `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md`. |
| 5 | Hydration totals, goals, units, and missing-day presentation are bounded | **PASS** | Hydration is account-scoped via `CaloraContext.waterLogs` and `addWater`; goal restoration is bounded to 8–512 fl oz in `CaloraContext.tsx`; hydration route/report `docs/master-mission/345-CALORA-HYDRATION-PAGE-2026-11-05.md` documents daily/weekly/monthly actual totals, explicit missing bars, >100% progress, and clear actions. Focused `hydrationGuard.test.ts` passed 43 tests. Native-device and production rollout evidence remains separate (see blocked items). |
| 6 | Weight records and progress summaries handle invalid, duplicate, same-day, stale, baseline, and source-provenance data | **PASS** | `lib/progressWeightSummary.ts`, `lib/intelligence/weightTrend.ts`; `progressWeightSummary.test.ts` (4) and `weightTrend.test.ts` (19). Tests cover chronological ordering without mutating input, invalid dates/non-positive/non-finite weights, no fabricated zero trend, stale records, onboarding baseline distinction, source labels, four distinct dates, same-day median deduplication, input-order independence, month/year/DST boundaries, and invalid timezone fail-closed behavior. |
| 7 | Fasting duration and history are timestamp-derived, bounded, and safe on malformed persistence | **PASS** | `lib/fasting.ts`; `fasting.test.ts` (3). ISO timestamps, elapsed/remaining time, early completion, one-time finish, invalid persisted state, custom-hour clamping, and 60-entry history cap are covered. The implementation explicitly makes no physiological claims and blocks known under-18 users before timer creation. |
| 8 | Diary dates, local calendar ranges, and DST handling are deterministic | **PASS** | `lib/dates.ts`, `lib/health/dayRange.ts`, `lib/health/weekHistory.ts`; `dates.test.ts` and health-day tests cover local date keys, add/subtract days, inclusive ranges, local midnight, native adapter alignment, and the 2026 DST fallback boundary. Health history uses explicit local-date keys and preserves missing values as null. |
| 9 | Missing, unavailable, stale, and measured-zero data are not silently converted into false numeric results | **PASS** | `burnedPresentation.ts`, `burnedStatus.ts`, `weekHistory.ts`, weight summary, and nutrition/serving normalization all preserve null/unavailable states. Health tests cover connection, permission, syncing, failed, unavailable, past-date, future-date, prior-day snapshot, no-data, and measured-zero states. Recipe tests cover partial/unavailable nutrition without invented macros. |
| 10 | Diary synchronization is account-scoped, idempotent, retryable, and conflict-aware | **PASS** | `lib/diarySync.ts`, `api-server/src/routes/sync.ts`, `lib/__tests__/diarySync.test.ts`, `api-server/src/__tests__/sync.test.ts`, and `sync.integration.test.ts`. The current focused client run passed 44 diary-sync tests. Source/test evidence covers `(user_id, client_id)` upsert idempotency, delete retry/no-op, account namespaces, permanent conflict retirement, transient session quarantine and restart retry, durable tombstones, offline newer-edit retention, and server validation. |
| 11 | Duplicate and conflicting same-day records do not inflate progress/coverage calculations | **PASS** | Weight trend groups same-day values by median; nutrition coverage counts distinct dates; macro-record coverage requires complete non-negative fields and distinct qualifying dates. Relevant sources: `intelligence/weightTrend.ts`, `intelligence/nutritionCoverage.ts`, `intelligence/macroRecordCoverage.ts`; tests include duplicate dates, input-order independence, strict dates, DST/timezone behavior, malformed values, and watermark invalidation. Coverage features are default-off by design, not silently active. |
| 12 | Exact live provider serving data is verified for commercial barcode flows | **BLOCKED** | Current source has generic exact-barcode provider logic and safe 100 g/100 ml fallback. Historical Mission 322/323 reports explicitly state that the live FatSecret exact-barcode response and production credentials were not verified; the available Open Food Facts record lacked authoritative packet metadata. No authorized authenticated provider lookup was run in this read-only audit. Do not claim automatic manufacturer-serving recognition until a bounded authorized live response proves it. |
| 13 | Authenticated production/database synchronization round-trip is independently verified | **BLOCKED** | No `DATABASE_URL`, Supabase, FatSecret, or production auth variables were present in the audit environment. Historical reports explicitly distinguish offline/unit tests from database-backed checks and state that authenticated production sync and customer-data preservation require a disposable authorized QA identity. No production request, database operation, credential use, or live sync was initiated. |
| 14 | Native Android/iOS health, timezone/DST, and physical end-to-end acceptance are run on target devices | **NOT RUN** | Pure tests cover local date/DST and native adapter contracts, but no native build, physical Android/iOS execution, Health Connect/HealthKit permission cycle, OS timezone change, offline reconnect, or process restart was run in this bounded audit. Historical reports also identify physical-device validation as pending. |

## Independent test execution

Command executed from the repository:

```sh
cd /home/ubuntu/calora-coach-live-main && pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/nutritionGoals.test.ts \
  lib/__tests__/recipeServing.test.ts \
  lib/__tests__/recipeDiaryServing.test.ts \
  lib/__tests__/dates.test.ts \
  lib/__tests__/fasting.test.ts \
  lib/__tests__/healthDayAndBurnedStatus.test.ts \
  lib/__tests__/progressWeightSummary.test.ts \
  lib/__tests__/weightTrend.test.ts \
  lib/__tests__/diarySync.test.ts \
  lib/__tests__/hydrationGuard.test.ts \
  lib/__tests__/healthConnection.test.ts \
  lib/__tests__/profileSync.test.ts
```

Result: **12 test files passed; 165 tests passed**. Diary-sync stderr was expected test instrumentation for permanent conflict retirement and transient quarantine; it did not represent a failing test.

The audit did not run the full repository suite, native builds, EAS, deployment, production HTTP, database, provider lookup, or device automation. The package declares Node `>=22.13.0 <23.0.0`, pnpm `10.26.1`, Expo `~54.0.37`, React Native `0.81.5`, and Vitest `^4.1.12`; these are environment assumptions for interpreting local results.

## Important source paths

- `artifacts/calora/lib/calorieRecommendation.ts`
- `artifacts/calora/lib/nutritionGoals.ts`
- `artifacts/calora/lib/recipeServing.ts`
- `artifacts/calora/lib/recipeDiaryServing.ts`
- `artifacts/calora/lib/dates.ts`
- `artifacts/calora/lib/fasting.ts`
- `artifacts/calora/lib/health/dayRange.ts`
- `artifacts/calora/lib/health/weekHistory.ts`
- `artifacts/calora/lib/health/burnedStatus.ts`
- `artifacts/calora/lib/health/burnedPresentation.ts`
- `artifacts/calora/lib/progressWeightSummary.ts`
- `artifacts/calora/lib/intelligence/weightTrend.ts`
- `artifacts/calora/lib/intelligence/nutritionCoverage.ts`
- `artifacts/calora/lib/intelligence/macroRecordCoverage.ts`
- `artifacts/calora/lib/diarySync.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/api-server/src/__tests__/sync.test.ts`
- `artifacts/api-server/src/__tests__/sync.integration.test.ts`
- `artifacts/calora/context/CaloraContext.tsx`

## Historical reports used only as contextual evidence

Historical reports were not treated as proof of current PASS. Relevant caveats and implementation history were cross-checked against current protected-main source:

- `docs/master-mission/10-m315-nutrition-integrity-final.md`
- `docs/master-mission/13-m319-manual-serving-quantity-integrity-2026-11-01.md`
- `docs/master-mission/17-m322-serving-integrity-final-2026-11-01.md`
- `docs/master-mission/19-m323-provider-readiness-android-28-2026-11-01.md`
- `docs/master-mission/345-CALORA-HYDRATION-PAGE-2026-11-05.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_3_ALGORITHM_REVIEW.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_4_NUTRITION_COVERAGE_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_5_MACRO_RECORD_COVERAGE_REPORT.md`
- `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md`
- `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md`

## Critical launch findings and required closure

1. **Calorie recommendation needs a defensive contract.** Add and run direct pure tests for `recommendCalories()` and decide explicit behavior for zero, negative, non-finite, implausibly low/high weight, and target overflow. Validate profile numeric domains before calculation; do not rely only on form/UI constraints.
2. **Provider serving proof remains an evidence gate.** The generic fallback is safe, but a commercial claim of automatic packet/manufacturer serving recognition requires an authorized exact-barcode provider response with complete serving metadata and a round-trip diary calculation.
3. **Native health and timezone behavior remains unproven on devices.** Run Android Health Connect and iOS HealthKit permission/no-data/measured-zero/revocation flows, DST and timezone-change scenarios, offline/reconnect, restart, and visible Today/Progress synchronization on supported target devices.
4. **Authenticated/database synchronization remains unproven in this environment.** Use a disposable non-customer QA identity and isolated database in an authorized environment to verify sync round-trip, duplicate retry, edit conflict, delete tombstone, account switch, and historical-data preservation.

## Count summary

- **PASS:** 10
- **FAIL:** 1
- **BLOCKED:** 2
- **NOT RUN:** 1
- **NOT APPLICABLE:** 0 (no assessed requirement was excluded as N/A)

These counts cover only the 14 requirements listed above and are not a whole-application certification verdict.
