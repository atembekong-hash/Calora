# CAL-QA Discovery — `coach-progress-wellness`

**Assessment date:** 2026-11-10
**Repository:** `/tmp/calora-m417-main`
**Inspected SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
**Mode:** read-only discovery. No source edits, builds, native execution, deployment, provider calls, database mutation, or test execution was performed.

## Executive summary

This cluster maps to **CAL-QA-13 (AI Coach), CAL-QA-14 (Progress), and CAL-QA-15 (fasting, water, mood, steps/activity and dependent widgets)**. The repository contains substantial implementation and focused unit/source-contract coverage. Those checks are useful bounded evidence, but they do not establish genuine Android/iOS execution, Health Connect/HealthKit provider behavior, authenticated cross-device synchronization, staged-RLS coverage for all relevant persistence families, production serving provenance, or live AI/provider behavior.

**Cluster verdict: PARTIAL overall, with required release evidence BLOCKED.**

No verified defect was newly established from this read-only inspection. Existing historical reports identify evidence gaps and one staged Coach-runtime boundary; those findings remain relevant unless superseded by current evidence. Historical reports at older SHAs are not promoted to current PASS. The current requested SHA is later than the 2026-11-07/08 reports, but no current native/provider/production evidence was found in the repository that closes their stated gaps.

## Mission status matrix

| Mission | Status | Discovery conclusion |
|---|---|---|
| **CAL-QA-13 — AI Coach, context, conversation continuity, Living Memory, data access, privacy and safe advice** | **PARTIAL** | Active v2 Coach architecture, bounded server snapshot, account scoping, safety gates, rate/deadline controls, conversation lifecycle, and consent/Fact Context source contracts are present. Focused API/client tests are documented as passing in prior audits. Full acceptance is not met: current live screen is not the dormant Fact Context path; production schema/serving/provider retention/cost state is unverified; supported-device, accessibility, offline/background, and live provider execution are absent. The staged-RLS rehearsal also recorded a fail-closed 503 boundary caused by rate-limit table access. |
| **CAL-QA-14 — Progress, trends, daily/historical summaries, weight tracking, goals and insights** | **PARTIAL** | Progress/Insights navigation, date-range/trend derivation, weight summaries, duplicate/date/missing-data handling, and deterministic calculations have source/test evidence. Physical Android/iOS execution, authoritative authenticated persistence and cross-device conflict/restart behavior, timezone/DST validation, and production data agreement are absent. |
| **CAL-QA-15 — fasting, water, mood, steps/activity, goals and dependent widgets** | **PARTIAL** | Fasting, hydration, step goals/charts, live foreground step lifecycle, mood/wellness UI contracts, unavailable-vs-zero semantics, and local persistence are implemented and covered by focused tests. Health Connect/HealthKit permission/provider/revocation/data flows, native restart/background behavior, authenticated cross-device/RLS proof for wellness persistence, and production synchronization are unexecuted or explicitly blocked. |

## Evidence inspected

### Framework acceptance requirements

`/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt:88-102` defines CAL-QA-13 through CAL-QA-16. In particular, CAL-QA-13 requires context/privacy/safety/persistence/synchronization and no invented or cross-user data; CAL-QA-14 requires agreement with authoritative data across views, ranges, weight CRUD and empty states; CAL-QA-15 requires start/pause/stop/resume/edit/delete/reset/history, timers, timezone boundaries, persistence, restart, and synchronization. Framework evidence rules at `:32-33` require genuine execution for full PASS and prohibit substituting compilation, mocks, healthy endpoints, or queued builds for user-success proof.

### Coach implementation and tests

- `artifacts/calora/app/coach.tsx` is the current clean-room v2 screen. The source-level contract test `artifacts/calora/lib/__tests__/coachV2Screen.test.ts:15-165` checks v2 conversation APIs, saved-chat lifecycle, copy/report controls, keyboard layout, and deliberate absence of the old broad-context/Fact Context client adapter.
- `artifacts/api-server/src/routes/coachV2.ts:39-145,185-243` implements rate limits, provider deadline/failure handling, deterministic safety classification, bounded server-owned snapshot prompting, and explicit prohibitions on invented records, raw timelines, health-provider data, and local-only hydration/steps/fasting claims.
- `artifacts/api-server/src/routes/coachFactContext.ts:25-75,84-171,173-219` contains strict allowlisted fact keys, exact value/limitation contracts, body/message budgets, TTL/skew controls, and safety screening. This route is not the active path used by the current Coach screen.
- `artifacts/api-server/src/__tests__/coachV2.test.ts` and `coachFactContext.test.ts` provide source-level/API-mocked coverage for anonymous/account flows, authorization, safety redirects, provider failures, conversation ownership, consent, nonce/schema rejection, and bounded prompt content. Prior report `docs/certification/2026-11-07/areas/06-ai.md:11-36,74-86` records 5 API files/60 tests and 12 client files/146 tests passed at an older evidence SHA; these results are contextual, not a fresh execution at `7a56ffb7`.
- `docs/certification/2026-11-08/58_MISSION_428_COACH_STAGED_RLS_REHEARSAL.md:16-27` records 5 real-handler staged-RLS tests passing for synthetic users, consent, conversation ownership, and deletion. Its `:29-31` finding is material: a provider-isolated `POST /v1/coach/v2/chat` attempt fail-closed with 503 because the shared rate limiter accesses `calora_capture_rate_limits`, excluded from the staged prototype's application-RLS grants. No production change was made.

### Progress and wellness implementation/tests

- Progress implementation and contracts: `artifacts/calora/app/progress-insights.tsx`, `artifacts/calora/lib/progressSnapshot.ts`, `progressTrends.ts`, `progressWeightSummary.ts`, and tests `progressInsights.test.ts`, `progressNavigation.test.ts`, `progressScreen.test.ts`, `progressSnapshot.test.ts`, `progressTrends.test.ts`, `progressWeeklyGraphs.test.ts`, and `progressWeightSummary.test.ts`.
- Fasting implementation: `artifacts/calora/app/fasting.tsx` (timer, plan selection, custom-hour clamping, adult eligibility, early/completed save, local history) and `artifacts/calora/lib/fasting.ts`; `artifacts/calora/lib/__tests__/fasting.test.ts` covers ISO timestamp derivation, progress, early completion, invalid persisted state, custom-hour clamping, and history cap.
- Steps implementation: `artifacts/calora/app/steps.tsx`, `artifacts/calora/components/AndroidStepsCard.tsx`, `artifacts/calora/lib/steps/stepTracking.ts`, `stepCalories.ts`, `stepMotion.*`, and `artifacts/calora/lib/__tests__/stepTracking.test.ts`, `stepCalories.test.ts`, `stepsScreen.test.ts`, `liveStepTrackingLifecycle.integration.test.tsx`, and Android layout/card tests. The source distinguishes null/unavailable from measured zero and limits live tracking to the foreground dashboard lifecycle.
- Wellness UI contracts: `artifacts/calora/lib/__tests__/wellnessPagesEnhancement.test.ts`, `wellnessWaterButton.test.ts`, and `waterConfirmation.test.ts`; hydration behavior is documented in `docs/master-mission/345-CALORA-HYDRATION-PAGE-2026-11-05.md`.
- Historical calculations evidence `docs/certification/2026-11-07/areas/05-calculations.md:13-33,38-60,99-104` records 12 focused files/165 tests passing at an older SHA and describes bounded macro, hydration, fasting, health-day, and progress semantics. It explicitly states native health/timezone behavior and authenticated synchronization remain unproven.

## Missing or blocked evidence by acceptance area

### CAL-QA-13

1. **Current live end-to-end Coach provider execution:** no current authenticated provider-backed run, response trace, latency/cost evidence, or production model/configuration proof.
2. **Fact Context integration:** `coachV2Screen.test.ts` intentionally asserts the current screen does not use `useCoachSendAdapter`/Fact Context. Therefore Fact Context route tests cannot be treated as proof of the active user journey.
3. **Production state:** no current applied migration history, Railway serving SHA, production logs, provider retention attestation, quota/cost ceiling, or deployment provenance was inspected that closes `docs/certification/2026-11-07/areas/06-ai.md:31-34,104-109`.
4. **Native/runtime:** no Android/iOS signed candidate, offline/background/force-close/restart run, accessibility/TalkBack/VoiceOver run, or current device screenshots/logs.
5. **Staged-RLS/runtime boundary:** the 2026-11-08 rehearsal's rate-limit-table 503 remains an unresolved integration boundary unless a later report proves correction.

### CAL-QA-14

1. No current native execution of Progress/Insights navigation, empty states, date-range controls, charts, weight CRUD, restart, or deep links.
2. No current authoritative authenticated cross-device round trip, concurrent edit/conflict, retry/delete tombstone, account-switch, or server-versus-local reconciliation evidence.
3. No device timezone/DST change and relaunch evidence. Historical calculation tests are deterministic local/source evidence only.
4. `docs/certification/2026-11-08/53_MISSION_427_API_WIDE_TENANT_ISOLATION_COMPLETION.md:77-110` classifies planner/wellness/weight/activity/progress persistence as blocked for staged-RLS real-handler proof; this is a direct dependency for CAL-QA-14 full certification.

### CAL-QA-15

1. No Health Connect or HealthKit provider session proving grant/deny/partial/revoke, stale/no data, measured zero, reconnect, settings recovery, or authoritative steps/active-calorie comparison on supported devices.
2. No current native restart/background/foreground/timezone execution for fasting, water, mood, or steps. The Android QA matrix states feature certification is prepared but physical execution is required (`docs/qa/CALORA_ANDROID_QA_COVERAGE_MATRIX_V2.md:11-19`).
3. No cross-device/server persistence proof for wellness domains. The route-family matrix explicitly classifies planner/wellness/fasting/weight/activity/progress as `BLOCKED` for staged-RLS real-handler proof (`docs/certification/2026-11-07/02_AUTHORITATIVE_CERTIFICATION_REGISTER.md:73` and `docs/certification/2026-11-08/53_MISSION_427_API_WIDE_TENANT_ISOLATION_COMPLETION.md:99-104`).
4. No current signed Android/iOS candidate or production serving evidence. Prior Android evidence marks full feature certification and Health Connect integration not run/blocked (`docs/certification/2026-11-07/areas/02-android.md:24-30`).

## Classification rationale

- **VERIFIED:** none of CAL-QA-13/14/15 at full mission level. Source-level subcontrols are strong, but the framework reserves VERIFIED/PASS-style certification for complete mission-specific acceptance with appropriate genuine execution.
- **PARTIAL:** all three missions. Implementations and focused deterministic/source/API tests provide meaningful bounded evidence.
- **UNVERIFIED:** production/provider/cross-device portions of all three missions; no current authoritative external evidence was found.
- **DEFECT:** no new defect was proven during read-only inspection. The prior Coach staged-RLS rate-limit access boundary is a documented integration blocker, not silently reclassified as fixed.
- **OUTDATED:** older PASS reports and test counts are outdated as proof of the requested SHA where they cite older commits; they remain useful historical context only.
- **BLOCKED:** native Health Connect/HealthKit and device gates, production/provider/serving gates, and complete staged-RLS/cross-device persistence gates are blocked by absent authorization/environment/evidence. No new native build or provider session was started, consistent with the framework's explicit restriction.

## Required evidence to close the cluster

1. Run the focused current test suites at SHA `7a56ffb7` and preserve exact command/output, without treating them as full certification.
2. Obtain one explicitly authorized signed Android candidate for the Samsung Galaxy S20 and an authorized iOS/TestFlight candidate; execute Coach, Progress, fasting, hydration, mood, steps, restart/background/offline/timezone and accessibility journeys with screenshots/logs and exact build/source provenance.
3. Execute the Health Connect and HealthKit permission/data/revocation matrix, including no data versus measured zero, stale data, reconnect/settings recovery, and Today/Progress synchronization.
4. Use synthetic QA identities in a non-BYPASSRLS disposable database to prove Coach, wellness, progress, weight/activity persistence, foreign-ID rejection, cross-device synchronization, retries, conflicts, deletes, and account switching. Resolve or explicitly disposition the staged rate-limit access boundary.
5. Verify current Railway serving SHA, applied migrations, provider/model configuration, retention/logging policy, cost/rate ceilings, and production-safe rollback/observability evidence. Do not mutate production as part of this discovery.

## Final verdict

**`coach-progress-wellness`: PARTIAL / NO-GO for full certification.** The source and bounded test evidence justify continued engineering confidence in several local contracts, but the mandatory genuine native/provider/production/cross-device evidence is missing or blocked. No claim of complete certification, bug-free behavior, or launch readiness is supported at the inspected SHA.
