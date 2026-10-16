# 228 — Calora Galaxy Progress Trends Viewport Remediation Report

**Mission window:** 2026-10-16
**Scope:** Physical Galaxy S21 Ultra regression evidence, native Progress Trends viewport repair, protected release, and production attestation.
**Native-build policy:** No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was started for this remediation.

## Executive result

| Area | Verdict | Evidence |
|---|---|---|
| Galaxy device access | PASS | ADB connected to Samsung Galaxy S21 Ultra (`SM-G998U1`, Android 15); installed Calora package `com.etiendem.caloraapp`, version `1.0.1` / code `26` was launched. |
| Today date navigation | PASS | Previous-day and return-to-today controls changed the active diary day and restored it without writing data. |
| Today Add lunch entry | PASS | The visible native Add lunch control opened the food-selection sheet; it was closed without logging a meal. |
| Core tab navigation | PASS | Recipes, Progress, and Plan native tabs rendered through their accessible tab targets. |
| Planner retained pager | PASS for observed settled states | Partial/cancelled, slow forward, and fast return gestures retained visible Planner content; no captured blank/remount state. Frame-rate certification remains device-observation work, not a screenshot claim. |
| Progress seven-day nutrition bar viewport before repair | FAIL / reproduced | The final Friday bar/value/label was visibly clipped on the right of the Galaxy Trends card. |
| Source remediation | PASS | The nutrition bar chart now measures its real card viewport and only introduces horizontal scrolling when a selected range actually exceeds it. |
| Client regression | PASS | `pnpm --filter @workspace/calora test -- --reporter=dot`: **157 files, 1,761 tests passed**. |
| Type safety and diff hygiene | PASS | `pnpm --filter @workspace/calora exec tsc --noEmit` and `git diff --check` passed. |
| Protected pull request | PASS | PR [#189](https://github.com/atembekong-hash/Calora/pull/189) passed Release Validation and Account-deletion fence validation, then squash-merged. |
| Production rollout | PASS | Railway reports API server, Calora web proxy, and Calora client all **Online** with no pending work; public health endpoints return `{"status":"ok"}`. |
| Deployed source attestation | PASS | `/api/version` reports commit `4fceac065e1fba510fea18e3b6ff50e6487057ac` and tree `0faf2b941879639c19e381cc4e159ef7aab00af3`, matching `origin/main`. |
| Post-fix native visual retest | BLOCKED by native-build policy | The installed Galaxy APK predates PR #189. The repair is client JavaScript and needs a newly authorized Android build/install before a physical PASS can be claimed. No build was requested or triggered. |

## Reproduced defect

On the connected Galaxy, **Progress → Trends → Nutrition trends** was opened with the default seven-day range. The chart displayed the final day only partially: the Friday bar and its top value/label were cut at the right edge of the rounded card.

This was a genuine native rendering defect, not a content/data issue:

- The physical result contained seven date points and normal calorie values.
- The horizontal chart content was sized as `points.length * 48` (336 logical points for seven days), regardless of the actual available card viewport.
- The card’s interior viewport on the device was narrower than that minimum after margins, padding, and bar gaps were applied.
- The existing horizontal `ScrollView` avoided page-level overflow but started at the left edge, leaving the final default-range item clipped. A seven-day weekly view should fit without requiring a horizontal nudge.

## Implemented repair

Merged commit: **`4fceac065e1fba510fea18e3b6ff50e6487057ac`**
Pull request: [#189 — Fix native Progress seven-day trend viewport](https://github.com/atembekong-hash/Calora/pull/189)

The change in `artifacts/calora/app/(tabs)/insights.tsx`:

1. Measures the actual Nutrition chart card viewport with `onLayout`.
2. Uses the measured width for the default seven-day chart, so every day occupies the visible card area.
3. Retains a 40-point minimum per entry for longer custom ranges, so 14-day and larger ranges remain horizontally scrollable **inside a clipped card viewport** rather than extending beyond the device screen.
4. Adds a `chartViewport` boundary (`width: '100%'`, `overflow: 'hidden'`) around the horizontal chart.
5. Adds a regression contract proving the seven-day measured-width behavior and preventing reintroduction of the former fixed `48`-point minimum.

No nutrition values, graph aggregation, date-range behavior, user logs, database records, or provider controls were changed.

## Physical-device evidence retained privately

The following evidence remains only in the authorized Windows certification workspace and was deliberately not committed because it contains real account display/data context:

- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\launch.png`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\today-previous-day.xml`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\today-add-lunch-open.xml`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\recipes-tab.png`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\progress-overview.png`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\progress-trends.png`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\plan-pager-before.xml`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\plan-pager-partial.xml`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\plan-pager-forward.png`
- `C:\Users\DynaBook\Desktop\CaloraCertification\.work\final-cleanroom-device\plan-pager-back.xml`

The reported screenshot is the **pre-fix** native APK result. It substantiates reproduction, not post-fix native certification.

## Validation detail

### Local automated validation

```text
pnpm --filter @workspace/calora exec vitest run lib/__tests__/progressScreen.test.ts --reporter=dot
3 tests passed

pnpm --filter @workspace/calora exec tsc --noEmit
passed

git diff --check
passed

pnpm --filter @workspace/calora test -- --reporter=dot
157 test files passed / 1,761 tests passed
```

Expected pre-existing test output remains limited to React `act(...)` warnings in Profile screen tests and intentional network-error output from deadline tests; neither caused a failure.

### GitHub validation

PR #189 required checks passed:

- Release validation — success; full repository typecheck, client/API test suite, native configuration checks, static builds, image governance, and release-attestation fixtures all completed.
- Account-deletion fence validation — success.
- Release-attestation gate — completed successfully on the merge run.

The run emitted platform-maintenance annotations about GitHub Actions Node 20 action runtime deprecation and the forthcoming `ubuntu-latest` image migration. These are runner notices, not Calora check failures.

### Production attestation

At the end of the rollout:

```text
GET https://mycaloraapp.com/health      -> {"status":"ok"}
GET https://mycaloraapp.com/api/healthz -> {"status":"ok"}
GET https://mycaloraapp.com/api/version -> commit 4fceac065e1fba510fea18e3b6ff50e6487057ac
```

The deployed API source tree exactly matched the merge commit tree. Railway production had all three services online and no staged or applying work.

## Native build and verification boundary

The Galaxy currently runs the earlier signed QA APK built from commit `e46a225c766e2de42d66b75bb6ec7c02776b93ea`. That artifact enabled real defect reproduction, but it cannot contain source merged later in PR #189.

> A post-fix physical PASS requires a fresh explicitly authorized Android build/install that includes commit `4fceac0`. This report does **not** request, dispatch, or imply authorization for that build.

When a future Android build is explicitly authorized, verify on the same Galaxy:

1. Open **Progress → Trends** with the default seven-day range and confirm all seven bars, values, and day labels are visible within the card at initial render.
2. Select **14 days**, **30 days**, and a custom range; confirm the chart scrolls horizontally within its rounded card with no page-edge spill or clipped rightmost content.
3. Repeat with large display text and after device rotation if supported by the test plan.
4. Confirm existing calorie, macro, steps, active-energy, and water graphs still render and respond to the shared date-range selector.

## Conclusion

The live Galaxy run found and reproduced a remaining responsiveness issue in the default Progress Trends bar chart. It was repaired at the measured-viewport layer, protected by regression coverage, merged through branch protection, and deployed with matching source attestation. The only remaining limitation is the intentionally deferred physical retest of the new client code, which requires a new Android build expressly authorized by the owner.
