# 220 — Calora Plan-to-Today & Progress Viewport Remediation Report

**Scope:** Correct the reported Plan logging visibility defect and native Progress Trends screen overflow.  
**Status at report creation:** Source remediation validated locally and awaiting protected GitHub review. No Android/iOS/EAS/APK/AAB/IPA/TestFlight build was requested or triggered.

## 1. Findings

| Reported issue | Forensic finding | Verdict |
|---|---|---|
| A meal logged from Plan did not appear on Today | Planner drafts inherited `meal.day`, the scheduled slot date. Today filters diary entries by the current local date. Logging a meal from a non-today Plan page therefore created a valid diary row on the planned date, rather than an eaten-today row visible on Today. | **Confirmed defect** |
| Progress Trends content extended beyond Android viewport | Daily labels contained full weekday and numeric dates (for example `Sat, 10/10`), while graph plots, labels, header badges, and range controls were not consistently bounded to one shared native scroll viewport. On narrow screens this allowed labels, cards, badges, or controls to visually extend past the card/screen edge. | **Confirmed defect** |

## 2. Plan-to-Today repair

### Behavioral rule

> A Plan item retains its scheduled date as planning provenance, but once the user explicitly logs it as eaten, its diary entry belongs to the local current day.

### Implemented changes

- Extended `plannerMealToDraft` with an optional `loggedDate` separate from the planner slot date.
- Passed the current local date (`dateKey()`) from the Plan screen’s shared `addToDiary` route.
- Preserved the original scheduled date in the draft assumptions: `Planned for YYYY-MM-DD. Logged portion may differ from plan.`
- Confirmed each visible Plan logging entry point routes through `addToDiary`, including:
  - Meal-card **Log**
  - Detail-sheet **Add to diary**
  - More-actions **Log to diary**
  - Their shared review-and-approve flow

This preserves the plan while ensuring accepted diary records are immediately eligible for Today’s date-filtered dashboard.

## 3. Progress Trends native viewport repair

### Implemented changes

- Shortened daily chart labels to compact weekday labels (`Sat`, `Sun`, etc.); the selected date range remains available via the range control.
- Gave line and macro charts an explicit card-bounded viewport (`overflow: hidden`) containing a horizontal `ScrollView`.
- Ensured each chart’s SVG and labels use one shared calculated content width, preventing labels from escaping independently of the graph.
- Allocated a minimum 48 px per trend point; longer ranges scroll **inside** the card rather than extending the page width.
- Bounded the calorie-bar chart with the same horizontal-scroll approach.
- Made section headers wrap safely; their text uses a shrinkable copy container.
- Made graph badges and date-range controls shrink/truncate safely instead of overflowing.
- Added one-line ellipsis behavior to long custom date-range labels.

## 4. Automated validation

| Validation | Result |
|---|---:|
| Focused Plan, diary, Progress, and graph tests | **PASS — 173 tests / 6 files** |
| Calora TypeScript validation | **PASS** |
| Diff whitespace/integrity check | **PASS** |
| Complete Calora client suite | **PASS — 1,747 tests / 156 files** |

Added regression coverage for:

1. Planner-to-Today diary date selection while retaining scheduled-day provenance.
2. The Plan screen’s explicit current-day handoff.
3. Bounded Trend viewports, compact daily labels, and shrinkable Trend headers.
4. Long date-range control truncation.

## 5. Physical-device verification boundary

The source repair is ready for the user’s next explicitly authorized Android build. The installed Galaxy application cannot contain this new source until that build is installed; therefore, native visual retesting of this particular patch is **not yet executed**. No build was started in accordance with the project’s native-build restriction.

When a fresh Android build is explicitly authorized and installed, the required confirmation sequence is:

1. Log a meal from a past, current, and future Plan page; approve each draft and confirm it appears immediately in Today.
2. Verify the original planned date remains represented as provenance, not as the diary date.
3. Open Progress → Trends with 7-, 30-, and custom-date ranges.
4. Verify all content stays inside cards/screen bounds and horizontally scrollable chart content moves only inside its card.
5. Verify the date-range control and chart badges do not escape the viewport at large accessibility font sizes.

## 6. Remaining blockers

| Item | Status | Required action |
|---|---|---|
| Protected source review, merge, and automatic deployment | Pending at report creation | Complete the repository’s required GitHub checks and protected merge workflow. |
| Native visual verification of this source change | Intentionally deferred | Owner must explicitly authorize a new Android build; no build is authorized by this mission. |

