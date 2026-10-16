# Surface Forensic Audit 06 — Progress, Trends, and Weight

**Repository:** `/home/ubuntu/calora-recipe-infinite-fix`
**Surface:** Progress tab (`Overview`, `Trends`, `Weight`)
**Audit type:** source-level forensic audit; no build, native run, production mutation, or unrelated-surface testing performed.
**Reference boundary:** Reports **214** and **220** were used only to distinguish already-reported/remediated behavior from new findings.

## Executive summary

The Progress surface is implemented in the `insights` tab route and is generally well defended against the specific Trends overflow recorded in Report 220: daily labels are compact, chart content is placed in card-bounded horizontal scroll views, section-header copy can shrink/wrap, and the date-range trigger ellipsizes. The outer panes also reserve safe-area plus tab-bar space (`insets.bottom + 104`).

I found **one confirmed source-level accessibility defect** in the in-scope Weight flow: the Weight goal `TextInput` has no `accessibilityLabel` or `accessibilityHint`, unlike the weigh-in input. A screen reader therefore receives no explicit field purpose and must infer it from surrounding visual text. This is distinct from the fixed Trend viewport issue in Report 220.

The remaining observations are **runtime verification risks**, not claims of confirmed defects. The most important are large-font behavior across dense chart legends/labels and weight-chart tooltip/action reachability, calendar navigation into future months, and actual native paging/tab-bar occlusion. Existing tests are strong on data derivation and source contracts but do not exercise the full rendered native surface, screen-reader traversal, Dynamic Type/large accessibility font sizes, keyboard focus, or physical scroll/paging.

## Scope and route map

- User-facing route: `artifacts/calora/app/(tabs)/insights.tsx`.
- Tab registration: `artifacts/calora/app/(tabs)/_layout.tsx:113-122`, route name `insights`, title `Progress`.
- Progress sections: `ProgressView = 'overview' | 'trends' | 'weight'` and `PROGRESS_VIEWS` in `insights.tsx:40-41`; rendered through `SwipeableTabList`/`SwipeableSectionPager` around the main screen render.
- Shared date picker: `artifacts/calora/components/GraphDateRangePicker.tsx`.
- Shared sheet/keyboard infrastructure: `artifacts/calora/components/BottomSheet.tsx` and `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx`.

## Audited components

1. **Overview pane:** section tabs, pager, weekly pattern/logging rhythm/mood/nutrient cards, local-save notice, insight/coach and navigation affordances.
2. **Trends pane:** macro, calorie, steps, active-calorie, and water charts; chart summaries; empty-state copy; chart legends; selected date range.
3. **Date-range picker:** preset buttons, custom calendar, previous/next month, disabled future days, Apply and Close behavior.
4. **Weight pane:** current value, delta badge, goal badge/edit, Log action, chart/expand affordance, recent weigh-ins, edit/delete/undo flow, goal celebration.
5. **Chart containers:** SVG sizing, shared content widths, horizontal `ScrollView` containment, labels, badges, legends, and weight-chart scrolling.
6. **Interaction/accessibility:** `Pressable`/`ScalePressable` handlers, labels/roles/states, tooltip dot actions, modal close paths, error alerts.
7. **Layout/system boundaries:** safe-area inset and absolute tab bar, keyboard-aware forms, platform branch in keyboard scrolling, font-scale style factory, loading/hydration behavior.

## Confirmed source finding

### F-01 — Weight goal input has no accessible name or hint (confirmed)

**Evidence:** `artifacts/calora/app/(tabs)/insights.tsx:2434-2441` renders the goal `TextInput` with `value`, `onChangeText`, number-pad keyboard, placeholder, style, and `autoFocus`, but no `accessibilityLabel` or `accessibilityHint`. The adjacent weigh-in field at `insights.tsx:2402-2412` explicitly supplies both (`Weight in ...` and a validation hint), demonstrating the inconsistency. The goal save action is labeled at `insights.tsx:2444+`, but that does not name the input itself.

**User impact:** VoiceOver/TalkBack may announce an unlabeled editable control or only a generic “text field”; users cannot reliably discover that it is the target-weight field or which unit/range is expected. `autoFocus` makes this especially important because focus lands directly on the unlabeled control when the modal opens.

**Repair recommendation:** Add a dynamic label such as `Weight goal in kilograms` / `Weight goal in pounds` using the same `weightUnitLabel`/unit source as the weigh-in input, plus a hint stating that a positive target is required before saving. Give the error a stable association if the platform layer supports it; retain `accessibilityRole="alert"` on the visible error.

**Regression test:** Add a source/component test requiring the goal input to contain `accessibilityLabel` and `accessibilityHint`, and a runtime accessibility test that opens Weight → goal edit, verifies focus announcement, invalid input announcement, and successful save/cancel.

## Responsive and layout risks requiring runtime verification

### R-01 — Large accessibility font sizes may still crowd dense chart legends and labels

Report 220’s fixed issue must not be re-reported: the remediation added compact daily labels, card-bounded chart viewports, shared content widths, 48 px trend-point allocation, shrinkable section headers, and truncating date controls. Those contracts are present in `insights.tsx` and covered by tests.

However, the source still has dense fixed layout assumptions that need native runtime checks at the largest supported `fontScale`: chart legend rows use horizontal layouts (`chartLegend`, `lineGraphLegend`) and `justifyContent: 'space-between'`; trend labels use one-line text; several chart badges and stat labels are compact. Styles are generated with `makeStyles(fontScale)` (`insights.tsx:1407-1408`), which is good, but increased text can still overlap, clip, or force unexpected card height. Verify 7/30/90-day and custom ranges on narrow Android/iOS widths with large accessibility text. If confirmed, allow legend wrapping/vertical stacking and/or make chart labels selectable/thinned at larger scale.

### R-02 — Weight expanded chart tooltip/actions need native clipping and focus verification

`WeightLineChart` uses absolute 36 px dot hit targets and a fixed 148 px tooltip (`insights.tsx:528-543`, `546-634`). The tooltip clamps its horizontal position, and expanded data is horizontally scrollable (`697-742`), but there is no source-level native visual test proving that tooltip text/action buttons remain inside the visible sheet/card at the first/last point, after horizontal scroll, or at large font scale. Verify VoiceOver/TalkBack focus order from dot → Edit/Delete and that the fixed tooltip does not cover or clip actions. This is a runtime risk, not a confirmed defect.

### R-03 — Absolute tab bar and pager occlusion needs device verification

The tab navigator uses `position: 'absolute'` for the tab bar (`artifacts/calora/app/(tabs)/_layout.tsx:40-47`). Progress pane content reserves `paddingBottom: insets.bottom + 104` (`insights.tsx:1863`), and the tab bar is registered correctly. This is a sensible source contract, but actual Android gesture inset, iOS home indicator, web height 84, and pager/native scroll behavior should be verified on narrow devices. Check that the last Overview/Trends/Weight card, Weight undo snackbar, and modal controls are not hidden behind the tab bar. No confirmed occlusion is claimed.

### R-04 — Calendar can navigate to future months even though future days are disabled

`GraphDateRangePicker.tsx:222-249` always enables Previous and Next month. `chooseDay` rejects future dates (`99-101`) and future cells are disabled (`269-276`), so this is not an invalid-date data defect. It is a usability risk: users can page indefinitely into months containing no selectable dates and receive no explicit boundary feedback. Verify expected product behavior. If undesired, disable Next at the current month and add an accessibility state/label explaining the boundary.

## Functional risks requiring runtime or integration verification

### FR-01 — Hydration/loading/error presentation is not visibly modeled in this screen

`InsightsScreen` reads hydrated context state (`insights.tsx:1392-1408`) and computes charts from current context, but the Progress render has no screen-local loading indicator or error state. A cold mount while local state is hydrating, or a failed health provider snapshot, must therefore be validated to ensure the surface does not briefly show misleading zero/empty content and then jump. Existing chart empty messages are intentional measured-data states (for example “Log food to start my macro graph.” and health sync messages), not generic loading/error handling. Verify hydration transitions and provider failure behavior; if a blank/false-empty state is observed, add an explicit loading/error presentation.

### FR-02 — Health availability and stale-day behavior need native/provider testing

The screen gates health history through freshness/authorization checks (`insights.tsx:1393-1406`) and derives measured series rather than default data. Existing tests cover derivation and intentional zero vs missing values. They do not prove provider permission-denial, stale snapshot, permission-requested, or day-boundary UI behavior on device. Verify all three health charts for authorized, partial, requested, denied, stale, and no-history states, including the exact empty copy and accessibility summary.

### FR-03 — Weight edit/delete/undo race and persistence need interaction testing

Weight dots expose Edit/Delete labels and handlers (`insights.tsx:528-628`); deletion is lifted into pending state with an undo timer, and the expanded modal receives `pendingDeleteId`/`onUndo` (`insights.tsx:2524-2533`). Source comments and state guards address rapid calls, but no inspected test renders the complete sequence. Verify rapid double-delete, delete then close modal, undo after navigation between Weight and another Progress section, edit while pending deletion, and persistence after relaunch. Confirm that visible counts, delta badge, goal progress, chart stats, and snackbars remain synchronized.

### FR-04 — “All actions” need route-level verification

Audited actions include: Progress tab entry; section tab/pager changes; Graph date-range trigger; preset ranges; calendar day selection; month navigation; Apply/Close; Overview navigation affordances; Log weight; Save/Cancel weigh-in; Edit weight goal; Save/Cancel goal; expand chart; tap weight point; Edit/Delete point; Undo deletion; dismiss goal celebration; and any coach/plan/diary affordances rendered by Overview. Source handlers are present, but no end-to-end test in the inspected Progress-focused tests verifies every action’s navigation target and disabled/close behavior. Verify that each action is reachable by keyboard/screen reader and that modal back, backdrop, swipe-down, and Android back all close without stale state.

## Accessibility review

### Positive source contracts

- Progress pager has `accessibilityLabel="Progress section content"` and a test ID (`insights.tsx:2393-2395`).
- Chart summaries use `accessibilityRole="summary"` and include “No data yet”/measured series text; weekly graph tests assert this.
- Weight dots have descriptive labels including date and localized unit value (`insights.tsx:541-543`); Edit/Delete tooltip buttons are labeled (`602`, `621`).
- Date picker trigger, presets, month navigation, calendar days, Apply, and Close have labels; presets expose `accessibilityState={{ selected: active }}` (`GraphDateRangePicker.tsx:125-143`, `186-197`, `223-249`, `271-312`).
- Validation errors for weight and goal are `accessibilityRole="alert"` (`insights.tsx:2414`, `2443`, and later edit form).
- Font scaling is injected into `makeStyles(fontScale)` rather than ignored globally.

### Gaps/risks

- Confirmed F-01: goal input lacks label/hint.
- Many icon-only or visual affordances should be checked for useful focus order and spoken context in the rendered tree, particularly chart expand/close and Overview cards.
- Chart summaries are text-composed from data, but a screen reader may encounter the underlying decorative SVG/individual controls as well; verify whether duplicate announcements occur on native.
- `Text` labels use `numberOfLines={1}` in several chart/date areas. This is appropriate for bounded chart strips but may truncate meaningful dates/legend text at large font scale; verify that accessible labels expose the full value.

## Keyboard, modal, and platform branches

- Weigh-in, goal, and edit forms use `KeyboardAwareScrollViewCompat` with `bottomOffset={72}` (`insights.tsx:2399`, `2431`, and edit modal later). The compatibility component branches to regular `ScrollView` on web and `KeyboardAwareScrollView` on native (`components/KeyboardAwareScrollViewCompat.tsx`).
- Shared `BottomSheet` supplies modal accessibility isolation, safe-area bottom space, backdrop close, and swipe-down close (`components/BottomSheet.tsx`).
- Verify native keyboard behavior with number-pad, auto-focused goal input, error text appearing, and keyboard dismissal on Android/iOS. No source defect is asserted from static inspection.

## Existing test coverage inspected

- `artifacts/calora/lib/__tests__/progressScreen.test.ts`: source contracts for removal of old hero content, section tabs/pager, bounded line graph viewport, compact labels, shrinkable header, and wrapping health header.
- `artifacts/calora/lib/__tests__/progressWeeklyGraphs.test.ts`: chart titles, data sources, provider/account scoping, empty copy, summary accessibility, shared date picker and ellipsis behavior.
- `artifacts/calora/lib/__tests__/progressTrends.test.ts`: missing vs zero semantics, seven-day and custom ranges, yearly month bucketing, macro aggregation/alignment, compact labels.
- `artifacts/calora/lib/__tests__/weightInput.test.ts`: unit conversion, supported range rejection, whole-number formatting.
- `artifacts/calora/lib/__tests__/weightGoalEdit.test.ts`: unconditional goal button, prefill, positive-value save guard, save with fewer than three weigh-ins.
- `artifacts/calora/lib/__tests__/weightTrend.test.ts`: 28-day trend thresholds, same-day median, invalid/future/nonpositive/nonfinite suppression, timezone boundaries, fail-closed insight delivery.

**Coverage limitation:** these are mostly pure-function or source-string contracts. They do not render the native Progress tree or exercise actual screen-reader focus, font-size settings, gesture/paging physics, safe-area/tab-bar overlap, modal keyboard behavior, or provider permission transitions.

## Recommended repair priority

1. **P0/P1 accessibility:** label and hint the Weight goal `TextInput`; add a regression test.
2. **P1 runtime QA:** native matrix for narrow Android/iOS, 7/30/90/custom ranges, largest accessibility font, all three panes, and last-card/tab-bar visibility.
3. **P1 interaction QA:** complete weight edit/delete/undo and modal/backdrop/back-button sequences; verify persistence and no stale pending state.
4. **P2 usability:** decide whether the date picker’s Next-month control should be bounded at the current month; if yes, disable and label it.
5. **P2 state QA:** verify hydration and health-provider denial/staleness states; add explicit loading/error UI only if runtime shows misleading transient emptiness.
6. Preserve Report 220’s existing viewport repairs; do not regress the bounded shared-width chart architecture while addressing accessibility or large-font behavior.

## Verification plan

1. Static: add goal-input accessibility contract test; retain existing Report 220 regression assertions.
2. Native layout: Android and iOS narrow viewport; physical tab bar/gesture insets; Overview → Trends → Weight; scroll to bottom of each pane.
3. Typography: system largest accessibility font and intermediate font scales; light/dark themes; metric and imperial units; long custom date range.
4. Trends: 7, 14, 30, 90, 6-month, 1-year, and custom ranges; missing values, explicit zeros, no data, stale health data, partial permissions.
5. Date picker: open/close, every preset, same-day range, reversed range, month transitions, future-day rejection, Android back, backdrop and swipe-down.
6. Weight: zero/one/two/three-plus entries; log validation, goal validation, edit, delete, undo, chart expand, first/middle/last point, horizontal chart scroll, relaunch persistence.
7. Accessibility: VoiceOver/TalkBack traversal and announcements for all buttons, fields, chart summaries, badges, errors, modal close controls, and tooltip actions; ensure no unlabeled editable control remains.

## Conclusion

Apart from **F-01**, this source review found no new confirmed Progress defect beyond the already documented/fixed Report 220 Trends viewport issue. The surface has substantial source-level defenses and focused derivation tests. Native rendering, large-font behavior, accessibility traversal, provider transitions, and complete action/persistence journeys remain verification work rather than confirmed defects.
