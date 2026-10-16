# Responsive forensic audit 09 — Workout features

**Surface:** Workout features (the user-facing movement/health portion of the Insights/Progress tab)
**Repository snapshot audited:** `/home/ubuntu/calora-recipe-infinite-fix`
**Audit type:** source-level only; no build, runtime, native build, production-data access, or external mutation performed.

## Scope and important boundary

The repository does **not** contain a dedicated `/workout` route, workout screen, exercise-session model, or start/stop workout UI. The actual user-facing surface that exposes workout-adjacent functionality is the **Insights** tab's `Movement & hydration` section: daily movement chips, active minutes, Health/Health Connect-derived step and active-energy trend graphs, water trend, and the shared graph date-range picker. The audit therefore covers those actual controls and the routing/health plumbing they use, and records absent workout actions as a product-surface gap rather than inventing defects in a nonexistent screen.

Reports **214** and **220** were not present as identifiable files or git-log entries in this checkout. No finding below is presented as a newly introduced regression or as a claim that an issue previously called fixed by either report remains fixed. Findings are based only on the current source and existing tests.

## Files and components inspected

- `artifacts/calora/app/(tabs)/insights.tsx` — screen, movement check-in controls, active-minutes input, graph rendering, date-range integration, bottom sheets, chart modal, undo/delete controls, states, and styles.
- `artifacts/calora/components/GraphDateRangePicker.tsx` — preset/custom calendar modal, month navigation, date selection, accessibility/test IDs, and sizing.
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx` — native/web keyboard branch used by weight-entry/edit sheets on this surface.
- `artifacts/calora/components/BottomSheet.tsx` and `artifacts/calora/components/AppChrome.tsx` — shared sheet/chrome behavior relevant to overlays and tab-bar/safe-area composition.
- `artifacts/calora/app/(tabs)/_layout.tsx` and `artifacts/calora/app/_layout.tsx` — tab routing, tab bar, and SafeAreaProvider boundary.
- `artifacts/calora/context/CaloraContext.tsx` — activity/water/health types and actions, including live-step APIs exposed by context.
- `artifacts/calora/lib/activityMinutesInput.ts`, `weeklySignals.ts`, `steps/*`, `hydrationGuard.ts`, `hydrationReminders.ts`, `useHydrationEffect.ts` — validation, derived signals, platform step adapters, and hydration/error plumbing.
- Existing tests reviewed: `artifacts/calora/lib/__tests__/activityMinutesInput.test.ts`, `weeklySignals.test.ts`, `weightGoalEdit.test.ts`, `profileScreen.test.tsx`, `hydrationGuard.test.ts`, `hydrationRetryIntegration.test.tsx`, and related health/living-state tests.

## Source flow and interaction inventory

1. `insights.tsx` is a tab route; there is no workout-specific route or navigation target. The tab screen renders a vertically scrolling Insights dashboard (the source contains many graph and sheet scroll views; no dedicated workout list/FlatList exists).
2. The movement check-in offers four `SpringChip`/`Pressable`-backed choices (`Rest`, `Light`, `Moderate`, `High`) with selected state, accessibility labels, selected accessibility state, and test IDs `activity-*`. The handler calls `setActivity(todayKey, option.value)` and sets a save notice.
3. Active minutes uses a numeric `TextInput`, number-pad keyboard, `onEndEditing` and `onBlur` guarded by `isEditingMinutes`, whole-number normalization, validation, alert-role error text, and a save notice.
4. Steps and active calories are represented as `ProgressLineGraph` components. Their data is derived from the selected `graphRange`, and their subtitles distinguish Health Connect, Apple Health, or disconnected state. Empty messages explicitly instruct the user to sync Health.
5. Water is represented as a read-only `ProgressLineGraph`; the graph says to log water, but this surface contains no direct “add water” action or route. Water is read from `waterLogs`/`waterWeekPoints`.
6. `GraphDateRangePicker` opens a `BottomSheet` containing presets, previous/next month controls, a seven-column calendar, custom start/end selection, and Apply. Future dates are disabled. Calendar and Apply controls have accessibility labels/roles and test IDs.
7. Graphs use horizontal `ScrollView`s when their content width exceeds the measured viewport. Weight-chart dots expose 36px hit targets and a tooltip; expanded weight chart is a `Modal`/bottom-sheet with close, edit, delete, and undo actions. These are weight controls, not workout start/stop controls, but they are part of the same Insights surface and were checked for scroll/modal interference.
8. Weight forms use `KeyboardAwareScrollViewCompat`; its native branch uses `KeyboardAwareScrollView` and its web branch falls back to `ScrollView`. The movement active-minutes field is **not** inside a keyboard-aware scroll container because it is inline on the main page.
9. `CaloraContext` exposes `startLiveStepTracking`, `stopLiveStepTracking`, and `setLiveStepsDashboardFocused`, but `insights.tsx` does not reference or render these APIs. There is no user-facing start/stop action on this surface.

## Confirmed source findings

### F-01 — No workout start/stop action exists on the audited user-facing surface (confirmed)

- **Evidence:** `insights.tsx` has movement chips and active-minutes entry, but no `startLiveStepTracking`, `stopLiveStepTracking`, `Start workout`, `Stop workout`, exercise-session handler, or workout navigation. `CaloraContext.tsx` exposes live-step APIs, yet the screen does not wire them.
- **Impact:** A user looking for a workout session control cannot start, pause, or stop one from the workout-adjacent UI. This is a confirmed capability gap, not a responsive-only risk.
- **Recommendation:** Decide the product contract first. If live step tracking is intended as the workout feature, add an explicit session state machine (idle/running/paused/stopped), visible Start/Stop/Pause controls, persistence/recovery behavior, and route/accessibility contracts. If this surface is intentionally a manual movement check-in only, rename/copy the surface so it does not imply a workout tracker and document that Health graphs are passive sync data.

### F-02 — Hydration and step graphs are display-only and do not link to logging/sync actions (confirmed)

- **Evidence:** The screen renders `Water intake`, `Steps trend`, and `Calories burned` graph cards with `emptyMessage` strings (`Log water...`, `Sync Health...`) but no `onPress`, `router.push`, or action button around those graph cards. There is no direct hydration logging control in this section and no direct Health permission/sync control here.
- **Impact:** Empty-state copy tells the user what to do but does not provide a path to do it. This is especially problematic on a mobile surface where the user must discover another tab/settings sheet.
- **Recommendation:** Make the empty state actionable: provide an accessible “Log water” action routed to the existing logging flow and a “Connect/sync Health” action routed to the existing Health settings flow. Preserve provider-specific copy and show pending/error status after the action.

### F-03 — Inline active-minutes input has no keyboard-aware page container (confirmed source limitation; runtime severity requires testing)

- **Evidence:** `KeyboardAwareScrollViewCompat` is used for weight forms at lines around 2398–2522, but the movement check-in and active-minutes `TextInput` are rendered in the main Insights page. The screen source has no `KeyboardAvoidingView`/keyboard-aware wrapper around the page-level vertical content.
- **Impact:** On short phones or with a number keyboard open, the active-minutes field, validation alert, or subsequent controls may be obscured and require manual scrolling. The source confirms the missing keyboard-aware mechanism; exact occlusion is a runtime risk.
- **Recommendation:** Use a page-level keyboard-aware scroll strategy (or ensure the main vertical ScrollView has reliable automatic insets/scroll-to-focused-input behavior), while retaining `keyboardShouldPersistTaps="handled"` and platform-specific dismissal. Add a test that focuses the field on iOS/Android-sized viewports and asserts the field/error is visible above the keyboard.

### F-04 — The date picker’s custom range can be applied with only a start date (confirmed behavior; likely product defect)

- **Evidence:** `GraphDateRangePicker.tsx` disables Apply only when `!draftStart`; `apply()` is therefore allowed after selecting a start with no end. The UI says “choose an end date,” but the Apply button remains enabled and applies the draft range.
- **Impact:** A user can submit a one-sided custom range despite the stated two-date workflow. Downstream graph range calculations may interpret it as a single day or an incomplete range; the exact rendering consequence needs runtime/unit coverage.
- **Recommendation:** Require both `draftStart` and `draftEnd` for Apply, expose disabled state and an accessible hint, or explicitly define one-day semantics and change the copy. Add tests for start-only, same-day, reversed selection, future-day disabled, preset, and month-boundary ranges.

## Responsive risks requiring runtime verification

- **R-01 — Narrow-device header collision:** `healthTrendHeader` is a row with a text block and `GraphDateRangePicker`; it uses `flexWrap: 'wrap'`, which is a good safeguard, but the actual trigger has a long localized range label and the title/subtitle can still wrap into a tall or awkward layout. Verify 320/360dp widths, large text, and long localized dates.
- **R-02 — Dense movement chips:** `activityOptions` is a single row with four `flex: 1` options, `minHeight: 58`, horizontal gap 7, and 9px text. At 320dp or large accessibility font sizes, labels may become cramped/truncated or reduce touch clarity. Verify hit rectangles and text wrapping; consider wrapping or a two-column layout.
- **R-03 — Dense mood chips:** Mood controls use a wrapping row and very small text; while not workout-specific, they share the movement check-in block and can increase scroll height/keyboard displacement. Verify with large font settings.
- **R-04 — Horizontal graph scroll nesting:** Progress and macro graphs use horizontal `ScrollView`s inside the vertically scrolling Insights surface. Weight chart also has a horizontal scroll path. Verify directional locking, diagonal swipes, VoiceOver/TalkBack focus order, and that horizontal scrolling does not trap vertical gestures on iOS/Android.
- **R-05 — Graph width/content width assumptions:** Several graph components calculate content width from measured viewport and minimum point spacing. Verify first layout, rotation, split-screen/web resize, and a single-point/no-point dataset; no runtime test was run here.
- **R-06 — Date-sheet safe-area bottom padding:** `GraphDateRangePicker` sets `content.paddingBottom: 30` and `sheet.maxHeight: '88%'`, but does not consume `useSafeAreaInsets` itself. Shared `BottomSheet` behavior may compensate, but this must be verified on iPhone home-indicator devices and Android gesture navigation, especially when the calendar is near maximum height.
- **R-07 — Chart modal and sheet safe area:** Insights’ undo snackbar explicitly uses `bottom: insets.bottom + 90`, but the expanded chart’s internal sheet and date picker rely on shared sheet behavior. Verify that close/apply/undo controls remain above both home indicator and tab bar and are not covered by a modal backdrop.
- **R-08 — Small hit targets in date picker:** Month buttons are 34x34 and the close button is 34x34. They may be usable but are below common 44pt touch guidance. Verify with accessibility touch exploration and increase the hit area/hitSlop or dimensions if required.
- **R-09 — Large text and graph labels:** Graph labels use single-line text in places and legends/metric badges can sit beside section titles. Verify dynamic type/Android font scaling; source does not show an explicit font-scale clamp or accessibility layout test.
- **R-10 — Keyboard behavior for active minutes:** As above, source confirms no keyboard-aware parent; whether automatic OS panning saves the field varies by platform and must be tested on real/native-sized layouts.

## Functional risks requiring runtime or integration testing

- **K-01 — Health provider authorization freshness:** Steps/energy availability is gated by a “fresh for day” snapshot and provider/granted checks. Verify stale, partial, revoked, denied, and requested authorization states, including Health Connect missing Steps versus missing Active Calories.
- **K-02 — Health sync failure/empty behavior:** The graph copy distinguishes provider/disconnected state, but this screen has no sync retry control. Verify whether the existing Profile Health sheet updates the Insights graph after sync, and whether failure is surfaced without stale-success messaging.
- **K-03 — Date-range data alignment:** Verify that selecting presets and arbitrary ranges changes all movement, water, and nutrition graphs consistently, respects local date boundaries/DST, and does not mix the selected range with the fixed weekly derivation.
- **K-04 — Water-link discoverability:** Verify whether there is an existing global add-water action reachable from the tab chrome; if not, the graph’s empty message is functionally dead-end as described in F-02.
- **K-05 — Manual activity persistence:** Verify chip and minutes writes survive blur/end-edit races, screen unmount, hydration reset, account switch, and rapid repeated taps. Existing source guard prevents duplicate blur/end-edit commits, but no screen-level interaction test was found.
- **K-06 — Absent session semantics:** If the product expects live workout tracking, verify what the unused context APIs do on backgrounding, permission loss, duplicate start/stop, and app restart before implementing UI.
- **K-07 — Modal focus/back behavior:** Verify Android back, iOS swipe dismissal, focus restoration, and screen-reader announcements for GraphDateRangePicker and weight chart modal. Source has `onRequestClose`, but no workout-surface runtime test covers focus behavior.

## Existing test coverage found

- `activityMinutesInput.test.ts` covers whole-number acceptance, fractional rejection, intentional clearing semantics, and source assertions for `onEndEditing`, `onBlur`, and alert-role error feedback.
- `weeklySignals.test.ts` covers derived weekly activity minutes and water averages.
- `weightGoalEdit.test.ts` covers source presence/availability of goal editing independent of weight count.
- `profileScreen.test.tsx` covers Health settings actions, daily step-goal persistence, partial Health Connect permissions, opening native Health settings, sync success, and sync failure. This is profile/health-settings coverage, not Insights movement-screen coverage.
- Hydration guard/retry integration tests cover storage hydration failure/retry behavior, not graph/date/workout interactions.
- Living-state tests cover water/activity recommendation logic and related derived state, not mobile layout or controls.
- No dedicated Insights screen interaction test was found for graph presets/custom calendar, horizontal graph scrolling, active-minutes keyboard behavior, water/step empty-state actions, or start/stop workout behavior. No test was found for a workout route because no such route exists.

## Recommended repairs (priority order)

1. **Clarify/implement the workout contract.** Either add a real session UI wired to the existing live-step APIs and define lifecycle/persistence semantics, or explicitly label the current feature as movement check-in plus passive Health trends.
2. **Close hydration/Health empty-state loops.** Add accessible Log water and Connect/Sync Health actions to the relevant graph empty states, routing to existing flows and surfacing loading/error/success states.
3. **Fix custom date Apply validation.** Require a complete range or deliberately support one-day selection with matching copy and tests.
4. **Harden mobile keyboard handling.** Add a keyboard-aware page-level container or reliable focus scrolling for active minutes; test iOS, Android, web, small screens, and large text.
5. **Improve responsive controls.** Test and, if needed, wrap movement chips, increase 34px date controls to a 44px touch target/hitSlop, preserve accessible names/states, and test horizontal/vertical gesture arbitration.
6. **Verify safe-area ownership.** Make date-picker and chart-sheet bottom padding explicitly inset-aware, or document and test the shared `BottomSheet` guarantee on home-indicator and gesture-navigation devices.
7. **Add screen-level tests.** Cover movement chip persistence, active-minutes validation/keyboard visibility, Health disconnected/partial/loading/error/empty states, water action, date presets/custom ranges, modal back/close, and graph scroll behavior.

## Verification plan

1. Static: add/maintain route and source assertions that the chosen workout contract has visible accessible Start/Stop (or explicitly assert the feature is check-in-only), and that empty states expose actionable links.
2. Component: render `GraphDateRangePicker` and assert preset, start-only, complete-range, future-day, month navigation, Apply disabled/enabled states, accessibility labels, and test IDs.
3. Insights interaction: render with mocked Calora context for disconnected, authorized, partial, requested, stale, loading, failed, no-data, and populated health snapshots; assert copy and actions.
4. Input/keyboard: on iOS and Android simulators/devices at 320x568 and 360x800, focus active minutes with number pad, enter invalid/fractional/blank values, and assert the field/error/save notice remains visible and commits exactly once.
5. Responsive: test 320/360/390/430dp widths, portrait/landscape, large text/font scaling, RTL/localized date strings, and web resize. Confirm movement chips, header/date trigger, legends, and graph labels do not overlap or become unreachable.
6. Gestures/modals: verify vertical dashboard scrolling versus horizontal graphs, date-sheet scroll to Apply, Android back, iOS dismissal, focus restoration, and safe-area/tab-bar clearance.
7. Health lifecycle: test permission grant/revoke/partial, stale snapshot, sync success/failure/retry, app background/resume, and account switch. If workout sessions are added, test duplicate Start/Stop, interruption, restart recovery, and persistence.

## Conclusion

The current source implements a responsive-oriented Insights movement/health dashboard, not a workout-session surface. Several controls have thoughtful accessibility/test IDs and graph scrolling, but the source confirms two user-facing dead ends (no workout start/stop capability and no direct step/hydration action from empty graphs) plus a custom-range Apply validation defect. Keyboard, safe-area, gesture, and narrow-screen issues remain risks that require runtime verification rather than being overstated as confirmed defects.
