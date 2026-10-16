# Source-level forensic audit — Plan and planner logging

**Surface:** Plan / planner logging
**Repository:** `/home/ubuntu/calora-recipe-infinite-fix`
**Audit boundary:** source and existing tests only; no build, native execution, production mutation, or unrelated surface testing.
**Prior-report guard:** Reports [214](../214_CALORA_FULL_APPLICATION_CERTIFICATION_REPORT.md) and [220](../220_CALORA_PLAN_TODAY_AND_PROGRESS_VIEWPORT_REMEDIATION_REPORT.md) were used to avoid relabeling known/remediated findings as new defects.

## Executive assessment

The planner has a coherent source-level flow: week navigation and day selection feed a native adjacent-pane pager; all visible planner logging entry points converge on `addToDiary`; drafts are reviewed in a bottom sheet and accepted through the context; planner mutations are locally persisted through the context autosave path. Report 220's Plan-to-Today date repair is present in the current source (`createPlannerDraft(meal, dateKey())`) and should not be reported as a new defect. Report 214 already records native swipe physics, native feed scrolling, and keyboard behavior as unexecuted; those remain runtime verification items, not source-confirmed failures.

Two source-confirmed concerns remain for this surface:

1. **Planner mutations have no in-surface persistence failure feedback.** Planner actions enqueue autosave, but the screen only shows an optimistic “Saved locally” notice and does not consume `persistenceError` or offer retry. A failed durable write can therefore be presented as successfully saved until the user visits Profile.
2. **The planner save/toast notice is not exposed as an accessibility live announcement.** `LocalSaveNotice` renders transient status text but has no `accessibilityLiveRegion`, `accessibilityRole="status"`, or equivalent announcement path. A screen-reader user can miss logging, move/copy, remove, replace, and generation confirmations.

Other issues are responsive/functional risks requiring runtime testing, especially at narrow widths, large text, Android nested scrolling, and keyboard-visible states.

## Audited components

- `artifacts/calora/app/(tabs)/planner.tsx`: Planner route, week/day controls, native pager integration, meal cards, all logging handlers, action/detail/review/program/custom/edit sheets, toasts, safe-area padding, keyboard-aware forms, loading/error messages, and navigation to Recipes.
- `artifacts/calora/components/SwipeableTabList.tsx`: native paging branch, web branch, gesture thresholds, adjacent-pane retention, vertical-scroll arbitration, preview/commit behavior, accessibility labels.
- `artifacts/calora/components/BottomSheet.tsx`: modal presentation, backdrop, pan dismissal, max-height, home-indicator spacing, handle accessibility.
- `artifacts/calora/components/LocalSaveNotice.tsx`: transient persistence/undo notice and absolute bottom offset.
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx`: keyboard avoidance used by edit/custom meal sheets.
- `artifacts/calora/context/CaloraContext.tsx`: planner draft creation, diary acceptance, planner mutation persistence/revision, hydration and persistence error state.
- `artifacts/calora/app/(tabs)/_layout.tsx`: Plan tab route, tab-bar presentation, platform branches.
- Planner tests under `artifacts/calora/lib/__tests__/`, especially `plannerDiaryLogging.test.ts`, `plannerAck.test.ts`, `planner.test.ts`, `plannerCopyRetention.integration.test.tsx`, `plannerReplace.test.ts`, `plannerIntegrityEvidence.test.ts`, and `tabsLayout.test.ts`.

## Navigation and day controls

### Confirmed source behavior

- The Plan tab is registered at `artifacts/calora/app/(tabs)/_layout.tsx:124-133` with title `Plan` and calendar icon. The route is admitted only after the shared root access/hydration gate.
- Week arrows call `shiftWeek(-1|1)` (`planner.tsx:466-472`). The handler advances by seven days, carries the selected weekday index into the new week, and closes the week overview.
- The horizontal day rail (`planner.tsx:1001-1023`) exposes seven labeled `Pressable`s with `accessibilityState.selected`, meal/log counts, and a Today tag. Empty slots are separately actionable and set the selected day before opening the add sheet.
- Day content uses `SwipeableSectionPager` (`planner.tsx:1024-1036`) with `nativePaging`, `renderWindow={1}`, `accessibilityLabel="Planned meal days"`, and a swipe hint. `SwipeableTabList.tsx` uses native `ScrollView` paging on non-web platforms and a direct-manipulation Reanimated track on web (`:179-185`, `:311-360`, `:366-395`). The pager deliberately retains adjacent panes because each pane contains vertical content.
- `selectedDayPreview` is used while dragging and cleared on commit; `setPlannerViewedDay` is updated from the committed selected day for recipe slot targeting.

### Responsive/runtime risks

- The native pager contains each day's full meal list inside an outer horizontal `ScrollView`, while the screen itself is inside a vertical `ScrollView` (`planner.tsx:946`, `:1024`; `SwipeableTabList.tsx:321-360`). The source enables `nestedScrollEnabled`, `directionalLockEnabled`, and `disableScrollViewPanResponder`, but Android gesture arbitration and vertical scrolling inside a pane still require device testing. This is specifically within Report 214's deferred native swipe/scroll boundary.
- The pager's `onLayout` width is used as each page width. Rotation, split-screen, keyboard resize, and web layout changes should be runtime-tested for stale page offsets and clipped panes.
- The day header uses a relative row with an absolutely centered program label (`planner.tsx:1535-1538`) and an absolutely right-aligned total (`:1544`). At large accessibility font scale or a narrow viewport, the left day/open copy, centered program, and right calories can overlap. This is a source-visible layout risk, not confirmed without runtime dimensions.
- The day rail uses fixed 44 px columns (`planner.tsx:1500`) and horizontal scrolling; verify the selected day remains visible after a week swipe and at large text.

## Meal cards and logging actions

### Confirmed source behavior

- `MealCard` (`planner.tsx:88-140`) has separate Pressables for opening detail, more actions, and direct Log. It exposes labels, disabled state, and a Logged pill based on `logs[].plannerMealId`.
- The focus card's primary action (`:179-182`) logs the next unlogged meal or routes to Today when all are logged. The source does not itself navigate to Today; the label says “View today” but `PlannerFocusCard` is not rendered in the current route body, so this appears to be dead/legacy component code rather than an active action. Treat any expected focus-card behavior as unverified, not as an active defect.
- The active direct-log path is `addToDiary` (`planner.tsx:866-872`): `createPlannerDraft(meal, dateKey())`, then opens detail and stores the review draft ID. This is the Report 220 repair: current local date is used for diary placement while the scheduled day remains provenance in the draft assumptions.
- Detail-sheet Add to diary (`:1112-1147`) and action-sheet Log to diary (`:1160-1172`) both converge on `addToDiary`; action logging is disabled once a matching plannerMealId is already logged.
- Review acceptance (`:879-897`) passes the visible draft directly to `acceptFoodMemory`, rejects/keeps the sheet open on a null result, catches errors, and only closes/announces success after a log is returned.
- Context draft API is explicitly `createPlannerDraft(meal, loggedDate?)` (`CaloraContext.tsx:597`) and acceptance is `acceptFoodMemory(draftId, draftOverride?)` (`:600`), matching the screen's race-safe direct-object acceptance.

### Functional risks requiring runtime testing

- The “already logged” guard is keyed only by `plannerMealId`; if a user intentionally wants to log a second serving of the same planned meal, the UI blocks it. This may be intended single-log semantics, but the source has no explicit explanation or alternate “log again” action. Confirm product behavior.
- The detail sheet changes from meal detail to review state while retaining the same `detail` state. Back/drop dismissal calls `dismissPlannerReview()` and clears detail; verify Android back, backdrop tap, swipe-down, and hardware back do not accidentally discard an in-progress portion edit without an explicit confirmation.
- The review total displays `plannerReviewDraft.nutrition`, while component portion controls update components through context. Verify derived nutrition and displayed review total recompute synchronously after multiple +/- taps.
- The acceptance path's error is delivered through a transient acknowledgement (`acknowledge(error.message)`), not an inline error in the review sheet. Verify it remains visible long enough and is announced, especially with VoiceOver/TalkBack.
- `weekOverviewVisible` is a generated-week review mode. Its meals have open-detail and more-actions controls but no direct Log button; confirm this intentional parity gap does not violate the requirement that all visible meal-card logging affordances be available in the overview.

## Detail, action, confirmation, and program sheets

- All sheets use the shared `BottomSheet`, a transparent native `Modal`, `maxHeight='96%'`, and bottom padding `max(insets.bottom + 16, 32)` (`BottomSheet.tsx:36-46`, `:127-143`). This is a sound safe-area baseline and includes a 28 px handle target; the frame exposes modal semantics through `accessibilityViewIsModal`.
- Detail/review, actions/move-copy, add meal, replace, edit, program selector/detail, and custom meal are separate sheet instances in `planner.tsx:1055-1433`. The program selector and program detail intentionally share one native modal to avoid nested native modals (`:1288-1295`).
- The action sheet contains Log, Move, Copy, Replace, Portions, Shopping, and Remove. Move/copy disables the current day and the context rejects occupied destinations rather than silently replacing. These are good source-level safeguards.
- Add/replace catalog sheets have scrolling catalog content plus fixed Browse recipes, Custom meal, and Leave open/Cancel controls. Verify the fixed controls remain reachable when the catalog is long and when the keyboard is open in custom forms.
- Edit and custom sheets use `KeyboardAwareScrollViewCompat` with `bottomOffset={28}` (`planner.tsx:1269-1286`, `:1413-1432`). No keyboard avoidance is applied to the review/detail/action/program sheets because they contain no TextInput; runtime-test custom/edit fields on iOS and Android with number-pad and multiline input.

## Toast visibility and persistence feedback

### Confirmed source defect — no planner retry/error feedback

Every planner mutation ultimately calls context methods such as `updatePlannerMeals`, `setPlannerMeals`, `movePlannerMeal`, or diary acceptance. Those methods patch the export snapshot, update in-memory state, and call `queueMutation`/autosave (`CaloraContext.tsx` planner mutation region around `2740-2825`; autosave effect around `1712-1770`). The context exposes `persistenceError` and `retryPersistence` (`:439`, `:1900`), but `planner.tsx` does not destructure either. The only visible feedback is local optimistic acknowledgement and `LocalSaveNotice`:

```tsx
<LocalSaveNotice
  visible={saveMessage !== null}
  message={saveMessage ?? ''}
  ...
  bottomOffset={132}
/>
```

(`planner.tsx:1054`). `LocalSaveNotice` always titles the notice “Saved locally” (`LocalSaveNotice.tsx:46-48`) and has no error mode. If `enqueueAutosave` fails, the planner can still tell the user “Week saved.”, “Added to diary.”, “Meal removed.”, etc. The durable error is only rendered in Profile (`artifacts/calora/app/(tabs)/profile.tsx:1399-1445`). This is a confirmed source-level feedback gap, not evidence of data loss in every failure.

**Repair:** expose `persistenceError`/`retryPersistence` in Planner; render an error-state notice/banner that says the change is in memory but waiting to save, includes an accessible Retry action, and suppresses or replaces the success title when the error is active. Add a test that forces the autosave rejection and verifies planner feedback and retry.

### Confirmed source defect — transient notices are not live announcements

`LocalSaveNotice` is an absolutely positioned `Animated.View` with pointer events only when Undo is available (`LocalSaveNotice.tsx:39-43`). Its title/message are ordinary `Text`; there is no `accessibilityLiveRegion`, `accessibilityRole="status"`, `accessibilityRole="alert"`, or explicit `AccessibilityInfo.announceForAccessibility`. The planner uses it for generation, add/remove/move/copy/replace, undo, and diary success/error messages. A screen reader may not discover a notice that appears after a Pressable event.

**Repair:** add a status/alert mode and live-region semantics to `LocalSaveNotice` (or use an explicit announcement utility), preserve the Undo button's accessible name, and test success/error/Undo announcements on iOS and Android.

### Responsive risks

- The notice uses `left:20`, `right:20`, `bottom:132`, `zIndex:20`; the component itself defaults to 91 (`LocalSaveNotice.tsx:53`, `:72`). The planner's 132 px offset is a fixed estimate above the absolute tab bar, not derived from safe-area insets or measured tab-bar height. It may float too high on web/tablet or overlap the keyboard/home indicator on devices with unusual insets. Runtime-test iPhone home indicator, Android gesture navigation, Android 3-button navigation, web, and keyboard-visible custom forms.
- Long acknowledgement strings have no `numberOfLines`/ellipsis or explicit shrink policy (`LocalSaveNotice.tsx:48`), while the notice also reserves space for Undo. At large font scale or narrow width, message text may push the action outside a comfortable width. Verify with long meal names and large text.
- Notices are `pointerEvents="none"` unless Undo is present. This is appropriate for nonblocking status but means no tap-to-dismiss; verify this is intentional.

## Empty/loading/error states

- Planner generation has explicit loading state (`generating`), success/error message state, request timeout, auth/429/400 handling, and stale-revision protection (`planner.tsx:719-864`). The generated status view has `accessibilityLiveRegion="polite"` and `accessibilityRole="alert"` (`:1037`), unlike the generic save notice.
- Empty meal slots are explicit Pressables with “Add a meal, browse recipes, or leave open” (`:922-925`). Empty weekly overview days say “No meals planned.” (`:985`).
- There is no planner-specific loading skeleton for hydration; the shared root gate blocks tab shell until hydration is admitted. Hydration failures are handled at the app-level error route, not inside Planner.
- There is no planner-specific persistence-error/empty-state presentation, which is covered by the confirmed feedback defect above.

## Existing test coverage

- `artifacts/calora/lib/__tests__/plannerDiaryLogging.test.ts`: verifies current-day draft date, direct draft passed to acceptance, and no success/close on null acceptance.
- `artifacts/calora/lib/__tests__/plannerAck.test.ts`: covers stale planner acknowledgements, stale swap undo, occupied/same-day/missing move outcomes, and exact ID matching.
- `artifacts/calora/lib/__tests__/planner.test.ts`: broad pure-helper coverage for generated-week merging, program/diet eligibility, images, dates, shopping attribution and week-scoped checks; includes source-contract checks for program previews and planner identity.
- `artifacts/calora/lib/__tests__/plannerCopyRetention.integration.test.tsx`: real-provider copy retention and occupied-copy behavior.
- `artifacts/calora/lib/__tests__/plannerReplace.test.ts`: slot/identity replacement and duplicate prevention.
- `artifacts/calora/lib/__tests__/plannerIntegrityEvidence.test.ts`: catalog/program integrity evidence.
- `artifacts/calora/lib/__tests__/tabsLayout.test.ts`: Plan tab title/icon registration and sibling tab labels.
- Coverage is primarily helper/source-contract/integration logic. There is no focused rendered Planner screen test for Pressable hit targets, sheet transitions, accessibility announcements, safe-area offsets, large-font layout, native pager interaction, keyboard avoidance, or persistence failure/retry.

## Recommended repairs

1. Add planner-local persistence error state/notice using `persistenceError` and `retryPersistence`; distinguish “in-memory/local change” from “durably saved,” and do not announce “Week saved” as durable success after autosave failure.
2. Add accessible live-region/announcement semantics to `LocalSaveNotice`; cover success, failure, and Undo.
3. Replace fixed planner toast offset 132 with a safe-area/tab-bar-aware shared offset or a root notice host that measures the tab bar and keyboard.
4. Make the day summary header non-overlapping: use a flex layout with `flexShrink`, `minWidth:0`, wrapping/truncation, and no competing absolute center/right labels.
5. Add a rendered Planner test harness with mocked `useCalora`, safe-area insets, router, and pager to exercise every logging entry point: card Log, detail Add to diary, action-sheet Log, review approve/cancel, already-logged disabled state, and acceptance error.
6. Add deterministic tests for pager day commit/preview and week shift selection carryover; then perform authorized device tests for Android nested vertical/horizontal scrolling and iOS swipe/backdrop behavior.
7. Add large-font/narrow-width snapshot or layout assertions for meal macro row, action grid, day header, notice with Undo, program previews, and week overview.
8. Confirm product semantics for repeated logging of the same planned meal; if allowed, change the current `plannerMealId`-only disabling rule to support another serving/log event.

## Verification plan

1. Run only the focused planner/UI test files after repairs; do not use a full build or native build for this audit.
2. Unit-test `addToDiary` for past/current/future viewed days and assert diary date is local today while scheduled provenance remains in assumptions (the Report 220 contract).
3. Render-test all three active log entry points and verify review open/close, portion +/- updates, approval, null acceptance, thrown acceptance error, and already-logged disabled state.
4. Mock autosave rejection; verify the planner presents a non-success error, retains in-memory state, exposes Retry, and changes to success only after retry succeeds.
5. Test accessibility tree/live announcements for day rail, pager, meal card, more actions, sheets, review controls, and save/undo/error notices.
6. On authorized iOS and Android runtime sessions, verify week arrows, day rail, left/right swipe, vertical meal scrolling, adjacent-pane retention, Android back, backdrop tap, swipe-down dismissal, and no gesture starvation of card Pressables.
7. Verify safe-area and notice positions on iPhone home-indicator devices, Android gesture and 3-button navigation, web, rotation, split-screen, and keyboard-visible edit/custom sheets.
8. Verify 1.2 font scale (and the largest supported setting), long meal/program names, narrow widths, and long toast strings do not overlap, clip, or escape the viewport.

## Findings classification

### Confirmed source defects

- Planner has no in-surface persistence failure/retry feedback; optimistic “Saved locally”/success acknowledgements can coexist with an autosave failure. Files: `artifacts/calora/app/(tabs)/planner.tsx:232`, `:847`, `:1054`; `artifacts/calora/context/CaloraContext.tsx:439`, `:1900`; `artifacts/calora/app/(tabs)/profile.tsx:1399-1445`.
- `LocalSaveNotice` transient save/undo/error messages have no live-region or announcement semantics. File: `artifacts/calora/components/LocalSaveNotice.tsx:39-56`.

### Responsive risks needing runtime testing

- Fixed 132 px notice offset versus actual tab-bar/safe-area/keyboard geometry.
- Long save messages plus Undo action at large text/narrow width.
- Absolute day-header labels competing for horizontal space.
- Meal macro/log/edit row compression and action-grid wrapping.
- Native horizontal pager versus vertical child ScrollViews and Android gesture arbitration.
- Sheet fixed controls and keyboard-aware form reachability across platforms/insets.

### Functional risks needing runtime/product verification

- Whether one `plannerMealId` should permit multiple diary events/servings.
- Whether Android back, backdrop, and swipe-down dismissal should require confirmation during an edited review draft.
- Whether generated overview's lack of direct Log button is intentional.
- Whether review totals update immediately after repeated portion changes.
