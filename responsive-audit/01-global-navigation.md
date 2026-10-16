# Global navigation, safe areas, tab bar, and shared controls — source-level forensic audit

**Surface audited:** Global navigation, safe areas, tab bar, shared controls

**Repository:** `/home/ubuntu/calora-recipe-infinite-fix`

**Scope boundary:** This is a source and existing-test audit of the app shell, bottom navigation, shared buttons/pressables, modals/bottom sheets, toast-like overlays, safe-area and keyboard handling, route registration, and the five primary tab screens only insofar as they interact with the shell. No build, native run, runtime interaction, production-data access, or source mutation was performed.

## Executive summary

The shell has several good defensive measures: `SafeAreaProvider` is installed at the root; protected route registration is gated by hydration/profile reconciliation; the tab navigator keeps sibling labels enabled when the custom Scan button is focused; primary tab screens reserve bottom space; `BottomSheet` centralizes home-indicator spacing and guarded dismissal; and keyboard dismissal is platform-aware through `KeyboardAwareScrollViewCompat`.

The main confirmed source-level issue is **incomplete accessibility semantics on shared interactive shell controls**: the `AppHeader` back `Pressable` and `BottomSheet` backdrop `Pressable` expose labels but no explicit button role. The custom Scan tab does provide a role and state forwarding, and `SettingRowPressable` correctly synchronizes `disabled` and `accessibilityState`, so those were not reported as defects.

The remaining findings are responsive/functional risks requiring device or accessibility-runtime verification rather than claims of a new defect. They center on absolute tab-bar geometry being manually compensated by per-screen `+104`/`+106` padding, the custom Scan button’s negative vertical offset and fixed 84px height, platform-dependent tab-bar height/insets, modal keyboard behavior, and fixed-position post-log overlay placement.

Reports **214** and **220** were used as regression context only. Report 220’s chart viewport remediation is treated as already fixed and is not re-reported. Report 214’s certification caveats around lack of independent native-device certification are treated as a reason to recommend runtime verification, not as a new source defect.

## Audited components

- Root `SafeAreaProvider`, protected Expo Router stack, hydration/profile access gate, bootstrap and error/retry states.
- Expo Router tab layout and routes: Home (`index`), Recipes, Scan, Progress (`insights`), Plan (`planner`), with Profile registered but hidden from the tab bar.
- Absolute tab-bar style, iOS blur background, web branch, custom Scan tab button, icon/label branches, and route labels.
- Shared `AppStatusBar` and `AppHeader`, including back handling and safe-area top padding.
- Shared `ScalePressable` and `SettingRowPressable` event/disabled/accessibility wiring.
- Shared `BottomSheet`/`BottomSheetFrame`: modal dismissal, backdrop, pan handle, max height, bottom safe-area spacing, and modal accessibility.
- `KeyboardAwareScrollViewCompat` native/web branch and keyboard dismissal policy.
- Primary tab-screen scroll owners and bottom content padding; tab-bar overlap avoidance.
- Root post-log notification card and screen-level modal/scroll patterns.
- Existing tests for tabs, root gate, bottom sheet, keyboard policy, error/retry, and shared pressable behavior.

## Confirmed source findings

### GN-001 — Shared header back control has an accessibility label but no explicit button role

**Evidence:** `artifacts/calora/components/AppChrome.tsx:47-50` renders a `Pressable` with `accessibilityLabel="Go back"`, `onPress={handleBack}`, and `hitSlop={10}`, but no `accessibilityRole="button"` and no explicit `accessibilityHint`. The same component is the shared header control, so this propagates to every screen using `AppHeader`.

**Why this is a defect:** A label alone does not provide an explicit control role in all React Native/native accessibility combinations. A screen reader can receive text without reliably announcing an actionable button. This is a source-confirmed semantics gap, not a visual/runtime hypothesis.

**Repair:** Add `accessibilityRole="button"`; consider a concise hint such as “Returns to the previous screen.” Preserve the current `canGoBack()`/`router.back()`/`router.replace('/(tabs)')` fallback. Add a rendering test that asserts role, label, and fallback handler behavior.

### GN-002 — Shared bottom-sheet backdrop close control has a label but no explicit button role

**Evidence:** `artifacts/calora/components/BottomSheet.tsx:66-71` renders the full-screen backdrop as a `Pressable` with `accessibilityLabel="Close sheet"` and `onPress={onBackdropPress}`, but no `accessibilityRole`. The sheet frame itself has `accessibilityViewIsModal` at lines 73-76, and the handle has an explicit role when dismissible at lines 85-90.

**Why this is a defect:** The backdrop is an actionable close control for every dismissible sheet. Its label does not consistently communicate button semantics to assistive technology. The handle path is better covered, but does not fix the backdrop path.

**Repair:** Add `accessibilityRole="button"` and an optional hint (“Closes this sheet”). Keep the existing guarded callback and non-dismissible behavior. Extend `bottomSheet.test.tsx` to assert the role and that `dismissOnBackdropPress={false}` does not expose an actionable close target.

## Responsive risks requiring runtime verification

### RR-001 — Absolute tab bar relies on duplicated, hard-coded per-screen bottom padding

`artifacts/calora/app/(tabs)/_layout.tsx:40-47` sets `tabBarStyle.position = 'absolute'`; native branches do not provide an explicit height or bottom inset, while web alone gets `height: 84`. Each primary tab independently adds `insets.bottom + 104` or `+106` to its scroll content: `index.tsx:1815`, `recipes.tsx:2042`, `scan.tsx:801`, `insights.tsx:1863`, `planner.tsx:946`, and `profile.tsx:1288`.

This is a fragile geometry contract: a platform/theme/navigation-version change, Android gesture-vs-three-button navigation inset, larger font scale, or tab-bar height change can leave too much blank space or let the final control sit under the bar. It is not confirmed from static source alone because the effective native tab-bar height must be measured on representative devices.

**Recommendation:** Establish one shell-owned tab-bar height/inset token or use navigator-provided insets consistently; keep screen content padding derived from that value. Verify final list items and focused controls on iOS safe-area devices, Android gesture and 3-button navigation, web narrow widths, and large text.

### RR-002 — Custom Scan tab geometry may collide with content or safe-area boundaries

`_layout.tsx:95-109` replaces the native tab button with a `Pressable`; `styles.scanTabButton` at lines 144-150 uses fixed `height: 84`, `minWidth: 72`, and `marginTop: -18`; the circle is fixed at 62px. The tab bar itself has no explicit native height. This can visually clip or shift the elevated Scan control on short screens, large text, or differing native tab-bar metrics.

The custom button correctly forwards `onPress`, `onLongPress`, `accessibilityState`, `testID`, label, and role, so no handler defect is claimed. Device verification is needed for hit target, clipping, and overlap.

### RR-003 — iOS transparent tab-bar background and Android/web branches need device verification

`_layout.tsx:42-62` uses a transparent iOS bar with `BlurView`, a colored Android bar, and a web full-size colored background. The branch is source-valid, but the effective contrast, blur coverage through the bottom safe area, and interaction with the absolute bar cannot be proven without iOS/Android/web runtime checks. Verify dark/light mode, reduced transparency, bottom home indicator, and scroll-to-end behavior.

### RR-004 — Root post-log overlay uses a fixed `bottom: 98` offset

`artifacts/calora/app/_layout.tsx` styles `postLogWrap` with `position: 'absolute'`, `left/right: 16`, and `bottom: 98`. It is not derived from `useSafeAreaInsets()` or the actual tab-bar height. On a device with a larger bottom inset, different tab-bar metrics, or a keyboard/short viewport, the card may overlap the tab bar or cover a primary control. This is a responsive risk requiring screenshots/runtime measurement, not a confirmed overlap.

**Recommendation:** Anchor the overlay to a shared shell inset/notification slot, or calculate `bottom` from safe-area bottom plus the measured tab-bar clearance; verify while keyboard is open and on all tab routes.

### RR-005 — Modal keyboard avoidance is delegated to scroll behavior, not a shared modal contract

`KeyboardAwareScrollViewCompat.tsx:11-43` correctly selects `KeyboardAwareScrollView` on native and `ScrollView` on web, with platform-specific `keyboardDismissMode`. However, shared `BottomSheet` deliberately owns no scroll view (`BottomSheet.tsx:31-34`), so each modal/sheet must correctly supply its own keyboard-aware scroll owner. Several tab screens use ordinary `ScrollView` for sheet/modal content while other profile flows use `KeyboardAwareScrollViewCompat` (for example `profile.tsx:4055` and `4611`). Static inspection cannot prove whether every text input remains visible.

**Recommendation:** Inventory every modal containing `TextInput`; require one keyboard-aware scroll owner or a documented non-input exception, and run iOS/Android tests with the keyboard open, focus transitions, submit/dismiss, and `keyboardShouldPersistTaps` behavior.

### RR-006 — Modal accessibility is only partially standardized

`BottomSheetFrame` marks the sheet view `accessibilityViewIsModal`, and profile’s larger modals also use that property (for example `profile.tsx:3779`, `3918`, `3969`, `4245`). Other screen-level `Modal` instances and their close controls are implemented inline. This creates a risk of inconsistent focus trapping, close announcements, or missing roles/labels across modal types. Confirm by accessibility-runtime testing rather than treating every inline modal as defective.

## Functional risks requiring runtime verification

- **Back routing:** `AppHeader` correctly prefers `onBack`, then `router.canGoBack()`/`router.back()`, then `router.replace('/(tabs)')` (`AppChrome.tsx:32-42`). Verify direct deep-link entry, cold load, and history-empty cases on web and native; static source cannot validate router history.
- **Protected route bootstrap:** Root stack registration and tab bootstrap are gated in `_layout.tsx` and `(tabs)/_layout.tsx`; `rootAccessGate.test.ts` covers state transitions. Verify no flash of protected content and correct recovery UI when hydration fails or profile reconciliation stalls.
- **Tab route reachability:** `index`, `recipes`, `scan`, `insights`, and `planner` are visible; `profile` is registered with `href: null` (`_layout.tsx:135`) and is reached through in-app navigation. Verify deep links and back behavior to hidden Profile.
- **Press event propagation:** `ScalePressable` calls haptics before the supplied `onPress` (`ScalePressable.tsx:64-79`) and forwards press-in/out. Verify disabled controls do not produce haptics or invoke handlers on each target platform; no source defect is claimed because disabled behavior is inherited from `Pressable` and not exhaustively rendered here.
- **Bottom-sheet dismissal races:** `BottomSheet` uses guarded backdrop and pan callbacks and a stable ref for the pan responder. Verify rapid backdrop/handle gestures during pending saves; existing tests cover the basic callback policy only.
- **Loading/error/empty states:** Root hydration retry is covered by existing tests, but shell-level visual placement of retry controls and empty states relative to the absolute tab bar remains unverified. Test each tab’s loading, error, empty, and populated terminal state with bottom padding and accessibility focus.

## Existing test coverage

- `artifacts/calora/lib/__tests__/tabsLayout.test.ts` checks that Scan keeps sibling labels enabled, the custom Scan label exists, and Home/Recipes/Progress/Plan titles remain present. It does not test platform-specific height/insets, actual hit targets, focus, or safe-area overlap.
- `artifacts/calora/lib/__tests__/rootAccessGate.test.ts` covers protected-route gating, onboarding review, and invite destinations; it does not render the full stack or validate no-flash/runtime navigation.
- `artifacts/calora/lib/__tests__/bottomSheet.test.tsx` covers guarded backdrop dismissal, non-dismissible pan behavior, handle activation, and caller-specific backdrop callbacks. It does not assert accessibility roles, keyboard behavior, max-height on device, or focus restoration.
- `artifacts/calora/lib/__tests__/keyboardDismissPolicy.test.ts` covers iOS `interactive` versus `on-drag` on Android/web/desktop. It does not render `KeyboardAwareScrollViewCompat` or verify focused inputs remain visible.
- `artifacts/calora/lib/__tests__/exportRowPressable.test.tsx` and related profile tests cover the extracted `SettingRowPressable` disabled/accessibility-state contract.
- `artifacts/calora/lib/__tests__/errorScreenActions.test.ts` and hydration retry tests cover action logic, not shell placement or screen-reader semantics.
- There is no focused rendering test for `AppHeader`, the custom Scan tab button, tab-bar safe-area geometry, root post-log overlay, or cross-platform modal keyboard avoidance.

## Recommended repairs (priority order)

1. Add explicit `accessibilityRole="button"` to `AppHeader` back and `BottomSheet` backdrop controls; add focused rendering tests for label, role, disabled/non-dismissible behavior, and handler invocation.
2. Replace duplicated `+104`/`+106` bottom padding and root `bottom: 98` with a shell-owned spacing contract derived from safe-area and tab-bar metrics; preserve sufficient clearance for the elevated Scan button.
3. Define and test a platform matrix for tab-bar height, bottom inset, transparent/blur background, dark mode, gesture navigation, three-button navigation, web narrow viewport, and large text.
4. Audit all modal content with inputs and either standardize on `KeyboardAwareScrollViewCompat` or document/test an explicit exception; test keyboard-open layouts and focus visibility.
5. Add an AppHeader/TabLayout integration test covering direct route entry, back fallback, hidden Profile route, Scan focus label preservation, and accessibility state forwarding.
6. Add accessibility-runtime checks for modal focus isolation/restoration and root post-log overlay placement relative to the tab bar.

## Verification plan

1. Static regression pass: confirm only the two role additions and shell spacing abstraction are made; ensure Reports 214/220 fixes remain intact.
2. iOS: small and large iPhone safe-area devices, light/dark mode, dynamic type, keyboard open in every input modal, scroll to last item on all five tabs, Scan focus and tap target.
3. Android: gesture and 3-button navigation, small-height device, large font scale, keyboard open, back button/history behavior, modal dismissal and bottom home-area clearance.
4. Web: narrow and tall viewports, browser zoom, keyboard/tab focus, direct deep links, absolute tab bar at scroll end, and not-found recovery.
5. Accessibility: VoiceOver/TalkBack/NVDA or browser accessibility tree; verify back, close sheet, Scan, tab selected state, disabled controls, modal isolation, and focus restoration.
6. Automated tests: add the focused component tests listed above, then run only the relevant existing test files plus the new tests; no native build is required for the source audit.

## Files inspected

- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/_layout.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/_layout.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/index.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/recipes.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/scan.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/insights.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/planner.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/profile.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/AppChrome.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/BottomSheet.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/ScalePressable.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/SettingRowPressable.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/tabsLayout.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/rootAccessGate.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/bottomSheet.test.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/keyboardDismissPolicy.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/214_CALORA_FULL_APPLICATION_CERTIFICATION_REPORT.md`
- `/home/ubuntu/calora-recipe-infinite-fix/220_CALORA_PLAN_TODAY_AND_PROGRESS_VIEWPORT_REMEDIATION_REPORT.md`
