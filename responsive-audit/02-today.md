# Calora Today dashboard — source-level forensic audit

**Surface:** Today dashboard (`/(tabs)/index`)
**Scope:** Header actions, date navigation, calorie/meal cards, rhythm card, add-meal paths, recipe carousel, empty/loading/error states, scrolling, bottom spacing, modal/accessibility/keyboard behavior, and routes reachable from this surface.
**Audit basis:** Read-only inspection of the Today source, shared tab/sheet components, and existing tests. Reports **214** and **220** were used as historical context only; findings already described as fixed there are not re-raised as new defects. No build, native run, external mutation, or unrelated surface test was performed.

## Executive summary

The Today screen is implemented in `artifacts/calora/app/(tabs)/index.tsx` and is a single vertical `ScrollView` containing the header-adjacent date/hero card, nutrition cards, mood, diary log, rhythm card, and recipe widget. The principal source-level concern is not a recurrence of Report 220's Plan-to-Today date bug: Today correctly filters by `selectedDate`, and the Report 220 logging handoff is outside this surface. The source does, however, have a weak top-level loading/error contract: `hydrated` is consumed for intelligence/live tracking but there is no Today-level loading or error branch, so the screen can render zero-valued/empty content while context hydration is incomplete or after a data failure. This needs runtime/state-fixture verification before being classified as a user-visible defect.

The source has good baseline protections: labeled header actions and date controls, `useSafeAreaInsets`, bottom padding of `insets.bottom + 104`, a shared BottomSheet for modal safe-area handling, keyboard avoidance for the add-food sheet, and an explicit bounded horizontal recipe `FlatList`. Remaining responsive and functional items are mostly risks requiring device/runtime verification, especially large font sizes, very narrow widths, modal keyboard behavior, and carousel gesture interaction nested inside the vertical scroll.

## Audited source map

- `artifacts/calora/app/(tabs)/index.tsx` — Today screen, local cards, date navigation, add-food modal, calendar picker, edit-log and macro-goal modal invocation, rhythm/living action handlers, recipe carousel, all screen layout/styles.
- `artifacts/calora/components/BottomSheet.tsx` — shared modal/sheet safe-area and dismissal behavior used by local modal components.
- `artifacts/calora/app/(tabs)/_layout.tsx` — tab bar, centered Scan action, route registration and tab-level layout.
- `artifacts/calora/lib/__tests__/plannerDiaryLogging.test.ts`, `plannerCopyRetention.integration.test.tsx`, `intelligenceFoundation.test.ts`, `tabsLayout.test.ts`, `recipePagination.test.ts`, `nativeRecipePager.test.ts` — relevant existing behavioral/layout utility coverage.
- `214_CALORA_FULL_APPLICATION_CERTIFICATION_REPORT.md` and `220_CALORA_PLAN_TODAY_AND_PROGRESS_VIEWPORT_REMEDIATION_REPORT.md` — historical baseline and remediation boundary.

## Findings and evidence

### 1. Confirmed source defect: no screen-level loading or error state for Today data

`HomeScreen` reads `hydrated` and context collections at lines 1551–1583, but its render begins directly with the normal dashboard at lines 1781 onward. There is no `if (!hydrated)`, context error branch, retry UI, or skeleton for the dashboard. `selectedLogs` is derived immediately from `logs` (line 1576), and totals reduce to zero on an empty/unhydrated collection. The footer can say `Loading local diary…` only when `syncState === 'offline'` (lines 2005–2007); that is a status note, not a screen-level loading/error state and does not prevent misleading zero totals, empty cards, or an apparently completed dashboard.

**Classification:** confirmed source-level state-contract defect (the missing branches are directly visible in source); exact user-visible timing/appearance is a runtime concern.

**Repair:** add an explicit hydration/loading branch (preserving AppHeader if desired), an error branch with a retry/reload action tied to the context's recovery API, and a stable skeleton/placeholder for hero, macro, diary, rhythm, and recipe regions. Do not replace the existing empty-diary state: it is appropriate only after hydration succeeds and the selected date genuinely has no logs.

### 2. Confirmed source behavior: recipe failures and empty results are silently removed

`RecipeSwipeWidget` renders a loading card while `isLoading`, but returns `null` for `isError` or for a loaded empty result (shown in the widget implementation around lines 429–520). Thus the Today screen provides no retry, error copy, or empty explanation for recipe content; the entire Recipes section disappears. This is a confirmed source behavior, not necessarily a defect if intentional product policy, but it is a poor recoverability contract.

**Repair:** retain the section heading and show a compact empty/error state with retry (or a deliberate “Recipes unavailable” explanation). Add an accessibility announcement/status and test error, empty, loading, and recovery transitions.

### 3. Header and route audit — no confirmed handler defect

`AppHeader` is configured with title `Today` (lines 1783–1814). The Coach icon is labeled `Open Calora Coach` and routes to `/coach`; the avatar is labeled `Profile shortcut` and routes to `/(tabs)/profile`. The profile photo itself has an accessibility label. Date navigation is labeled `Previous diary day`, `Next diary day`, `Open calendar for …`, and `Back to today` (lines 1831–1845), with a calendar test ID. The burned statistic conditionally routes to `/profile?tab=account&open=health` (lines 1850–1855); the rhythm/health cards use the same recovery destination where appropriate.

**Responsive risk:** the header action comment acknowledges crowding at large accessibility scales, but source uses a fixed action layout and icon sizing. Verify title/action collision at 200% font scale and narrow Android widths. The action icon is labeled but has no test ID, so automated regression targeting is weaker than the calendar/macro controls.

### 4. Meal cards and add-meal paths — source is coherent, but coverage is thin

The diary card has an `Add meal` button (lines 1981–1987) and the empty state says “No meals yet” with “Add a meal. It stays here offline.” Existing log rows are grouped by `mealOrder`, and each `MealRow` receives `onEdit`, so the edit path is wired. `openAdd()` sets the capture mode and opens `AddFoodModal` (lines 1658–1662). The quick logging action area is labeled `Quick food logging actions` (line 1916), and living-state action can also resolve to `open_add_food` (lines 1712–1717). Within the sheet, search, saved meals, photo, barcode, voice/text routes, and manual name/calorie inputs are labeled; manual submission is wired to `addManual` and uses a number-pad keyboard.

The direct capture handlers navigate to Scan with `date: selectedDate` (lines 1665–1669), and restaurant logging routes with the selected date. The modal is wrapped in `KeyboardAvoidingView` with `behavior="padding"` (around lines 1279–1379), while the shared BottomSheet supplies safe-area treatment. No source defect is confirmed in these paths.

**Functional risks requiring runtime tests:** verify every capture mode preserves a past/future selected date; verify modal close after scan/voice/barcode return; verify double-tap/manual validation; verify editing a row updates the selected date and totals; verify the sheet remains dismissible with the keyboard open. Report 220's historical Plan-to-Today date handoff is explicitly not re-reported here; this audit found no evidence that Today itself reintroduces it.

### 5. Rhythm card and insight ordering — source wiring is present

The optional Today insight is rendered with `accessibilityRole="summary"` and a composed label (lines 2009–2022). `LivingRhythmCard` receives `livingState`, water amount, selected date, meal count, and `onAddMeal` (lines 2025–2032). The living action handler distinguishes open-add-food, add-water, and route effects; water uses a module-level deadline to guard same-frame double taps (lines 1712–1732). This is a good functional safeguard.

**Functional risk:** verify that every `livingState.action.route` is registered and that health/progress/planner routes land with the expected selected-date context. The route is cast at compile time (`effect.route as Parameters<typeof router.navigate>[0]`), so an invalid runtime route cannot be ruled out by this screen alone.

### 6. Scrolling and bottom spacing — deliberate implementation, device verification still needed

The entire body is one vertical `ScrollView` with hidden vertical indicator and `contentContainerStyle` padding `{ paddingTop: 14, paddingBottom: insets.bottom + 104 }` (lines 1815–1819). The extra 104 is a deliberate tab-bar/center-Scan clearance and `insets.bottom` handles the safe area. The tab layout has a custom 84 px Scan button raised by `marginTop: -18`, so the bottom clearance is materially relevant (`artifacts/calora/app/(tabs)/_layout.tsx`, scan button styles).

**Responsive risks:** `104` is a magic constant rather than derived from actual tab-bar height; verify on iPhone with a home indicator, Android gesture/navigation modes, tablets, and changed tab-bar metrics. Check that the final footer note and recipe carousel can be fully scrolled above the floating Scan button, with no excessive dead space. The nested horizontal recipe `FlatList` uses `pagingEnabled`, `snapToInterval={pageWidth}`, `nestedScrollEnabled`, directional lock, and momentum callbacks. Verify horizontal swipes do not steal vertical scrolling, especially on Android and at narrow widths. `getItemLayout` assumes `pageWidth` exactly matches each item; verify the measured width and padding/border do not create snap drift.

### 7. Recipe carousel — bounded but needs accessibility and gesture verification

The recipe `FlatList` has hidden horizontal indicator, fixed page layout, previous/next labeled controls, momentum/drag state, auto-advance every five seconds when interaction is inactive, and a labeled `View details` action per recipe. The `onOpen` route is `/(tabs)/recipes` with `recipeId`. This is source-level positive coverage.

**Risks:** auto-advance may continue while the user is visually reading or while accessibility focus is on a card; no pause control or live position announcement is present. Verify screen-reader discoverability of current position and controls. Verify one-item behavior (nav controls are hidden), image loading/fallback, long recipe names, and large text. Add `accessibilityRole="adjustable"`/position semantics or a non-visual “Recipe n of m” label if product accessibility standards require it.

### 8. Modal, keyboard, and platform branches

The Today file has platform branches for web and Android/iOS behavior in health/steps and capture presentation, and uses `KeyboardAvoidingView` for the add-food sheet. Local modal content has `flexShrink: 1`/`minHeight: 0` and scroll styles, while `BottomSheet` uses `useSafeAreaInsets`. This is appropriate structurally.

**Risks:** `behavior="padding"` needs verification on iOS and Android with keyboard, especially when the sheet is 96% height (`addFoodModalCard: { height: '96%' }`). Verify the manual row (name + kcal + add button) at 320 dp width and with large font. Confirm the close affordance remains reachable when the keyboard is open and that focus returns sensibly after dismissal. No keyboard-specific Today test exists in the inspected suite.

## Existing test coverage

- `intelligenceFoundation.test.ts` covers Today arithmetic/facts and target semantics, not the rendered Today screen, loading/error branches, or interaction accessibility.
- `plannerDiaryLogging.test.ts` and `plannerCopyRetention.integration.test.tsx` cover the Report 220 Plan-to-diary date/provenance repair; this is historical protection, not Today UI coverage.
- `tabsLayout.test.ts` covers tab layout contracts; it does not prove Today bottom clearance on physical devices.
- `recipePagination.test.ts` and `nativeRecipePager.test.ts` cover recipe pagination/pager utilities, not this screen's nested FlatList, auto-advance, or route action.
- No focused rendered Today screen test was found for header actions, date picker, rhythm action, add-meal modal modes, diary empty state, recipe error/empty/loading, keyboard avoidance, or bottom spacing.

## Recommended repairs and tests

1. Add Today screen state branches for hydration, data error, and retry; distinguish those from the post-hydration no-meals empty state.
2. Replace silent recipe `null` on error/empty with an accessible, retryable inline state; add tests for loading → success, empty, error, and retry.
3. Add a rendered Today interaction suite covering Coach/profile, previous/next/calendar/back-to-today, burned-health route, rhythm add-meal, diary Add, edit row, and recipe details routes.
4. Add date-preservation tests for search/manual/saved/photo/barcode/voice/restaurant paths for today, past, and future selected dates; retain Report 220's Plan-to-Today tests as regression coverage rather than duplicating its defect claim.
5. Add modal/keyboard tests (iOS and Android behavior where test environment permits), including 320 dp width and large font scale; assert all controls remain reachable and labeled.
6. Add a device matrix check for iOS home indicator, Android gesture and three-button navigation, tablet width, and the custom raised Scan tab. Assert the last content/footer is scrollable above the tab bar and that `insets.bottom + 104` is neither clipped nor excessive.
7. Add carousel tests for one/multiple recipes, auto-advance cancellation on touch, nested vertical/horizontal gesture arbitration, long titles, image failure, and screen-reader position/action semantics.

## Verification plan (runtime only; not performed in this audit)

- Cold launch before hydration completes; induce local sync/data failure; confirm loading/error/retry states do not masquerade as zero nutrition.
- Use 320 dp, common Android narrow width, iPhone safe-area, tablet, and 200% accessibility text. Check header actions, hero/date nav, meal rows, rhythm, macro controls, and manual-entry row for clipping/overlap.
- Select past/current/future diary dates and exercise every add-meal mode; return from each route and confirm date/totals.
- Empty diary, one meal, many meal rows, and long names; verify grouping, edit, and final footer/recipe scroll position.
- Recipe loading, empty, error, one recipe, six recipes; test arrows, swipe, auto-advance, View details, and vertical scrolling.
- Open add-food and edit/macro sheets with keyboard visible; verify safe-area, dismissal, focus, and submit behavior on iOS/Android.

## Historical boundary

Report 214 is treated as the prior certification baseline. Report 220's confirmed Plan-to-Today date handoff and Progress viewport fixes are treated as already fixed and are not claimed as new Today defects. The only Today-specific confirmed defect identified here is the absence of an explicit top-level hydration/data-error rendering contract; recipe silent omission is separately documented as confirmed source behavior and a repair recommendation.
