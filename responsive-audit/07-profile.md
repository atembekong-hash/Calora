# Profile and Settings — Source-Level Forensic Audit

**Surface:** Profile and Settings
**Repository:** `/home/ubuntu/calora-recipe-infinite-fix`
**Scope:** Profile/Settings sections, profile editing, preferences, reminder controls, lists/inbox, keyboard behavior, save/feedback states, menus, sign-out/deletion, routes, safe-area and tab-bar spacing.
**Prior-report boundary:** Reports 214 and 220 were consulted. Their already-reported Today/Plan date and Progress viewport defects are excluded from this audit; no such issue is counted as a new Profile/Settings defect.

## Executive result

The surface is substantially implemented and has good state/error handling, but source review found two confirmed accessibility defects and one confirmed tab-state defect. Several responsive and native-behavior items remain runtime risks because this audit did not run a build or device execution.

## Audited components and routes

- `artifacts/calora/app/(tabs)/profile.tsx` — `/profile` tab route; three sections (`you`, `membership`, `account`), profile header/edit sheet, appearance, text size, units, reminders, health sheet, saved meal list/create/delete sheets, notification inbox sheet, billing flows, export/local deletion, trust/privacy and external-link menus.
- `artifacts/calora/components/ProfileYouSettings.tsx` — personal details, activity/diet/goal choices, automatic/custom nutrition goals, validation and save/recommendation flows.
- `artifacts/calora/components/auth/AccountSection.tsx` — signed-out sign-in affordance; signed-in email/provider, sign-out confirmation, server account deletion and local cleanup.
- `artifacts/calora/components/BottomSheet.tsx` — modal sheet frame, backdrop, pan dismissal, max-height and safe-area bottom spacing.
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx` — native keyboard-controller branch and web ScrollView fallback.
- `artifacts/calora/components/SwipeableTabList.tsx` — native paging and web translated track behavior for Profile section navigation.
- `artifacts/calora/components/SettingRowPressable.tsx` — shared setting-row pressable wrapper.
- `artifacts/calora/app/(tabs)/_layout.tsx` — absolute tab bar and Profile route registration (`href: null`).

## Confirmed findings

### P1 — Profile section tab highlight can become stale after a swipe preview

**Evidence:** `artifacts/calora/app/(tabs)/profile.tsx:1248-1254`. Each tab’s selected visual state is based on `(profilePreview ?? profileTab)`, but the tab `Pressable` handler calls only `setProfileTab(tab.key)`. It does not clear `profilePreview`. `SwipeableSectionPager` can set a preview while a swipe is in progress; tapping a tab afterward can therefore update the content state while the old preview continues to control the selected styling until another pager change clears it. This is a confirmed source state inconsistency, not merely a visual-device risk.

**Repair:** Use one callback for tab taps, e.g. `setProfilePreview(null); setProfileTab(tab.key)`, matching the pager `onChange` callback at lines 1281-1282. Add a regression test that sets a preview, taps another tab, and asserts selected state and content agree.

### P1 — Numeric settings fields are not programmatically labelled/associated

**Evidence:** `artifacts/calora/components/ProfileYouSettings.tsx:138-177,185-186`. The reusable `Field` renders a visible `Text` label followed by `TextInput`, but the input has no `accessibilityLabel`, `accessibilityHint`, or test identifier. This affects Age, Height, Current weight, Target weight, Calories, Protein, Carbs, and Fat. Native screen readers do not reliably infer a semantic label from a neighbouring unassociated `Text` node, especially inside a bottom sheet. The daily step field in `profile.tsx:5003-5013` is correctly labelled, showing the gap is specific and actionable.

**Repair:** Pass an explicit label into `TextInput` (`accessibilityLabel={label}`), add appropriate hints/invalid state where validation fails, and expose stable test IDs. Verify VoiceOver/TalkBack focus announcements in both personal and nutrition sheets.

### P2 — Several settings action controls omit explicit accessibility semantics

**Evidence:** `ProfileYouSettings.tsx:152,160-161,169,177-178` has Continue, Apply updated recommendations, Keep current targets, Save custom targets, and Reset to recommendations without explicit `accessibilityRole`, labels, disabled/loading state, or live feedback. `OptionGroup` at lines 188-189 does provide radio role/state, but its controls still lack explicit labels beyond child text. The controls are likely discoverable from visible text, but the source does not guarantee a stable, localized semantic contract or announce save failures/successes. This is a confirmed accessibility/feedback implementation gap.

**Repair:** Add `accessibilityRole="button"` (or radio for mode/choice controls), explicit labels, `accessibilityState`, and `accessibilityLiveRegion="polite"` for validation/save feedback. Add a busy guard or visible saving state around async `finishPersonal`, `saveCustomTargets`, and `resetRecommendations` to prevent repeated taps while an update is pending.

## Responsive risks requiring runtime verification

- `artifacts/calora/app/(tabs)/profile.tsx:1284-1293` uses a nested vertical `ScrollView` inside the swipe pager with `nestedScrollEnabled`, while `SwipeableSectionPager` also arbitrates horizontal gestures. Verify Android vertical scrolling and horizontal section swipes do not steal taps from switches/chips, especially at small widths.
- `profile.tsx:1288-1289` adds `insets.bottom + 104` bottom content padding. The tab bar is absolute in `app/(tabs)/_layout.tsx:40-47`; confirm 104 px is sufficient and not excessive across iOS home-indicator, Android gesture, Android 3-button, and web layouts. No Profile-specific `useBottomTabBarHeight` calculation is used.
- `ProfileYouSettings.tsx:139,166` uses keyboard-aware sheets, and `KeyboardAwareScrollViewCompat` correctly branches native vs web. However, `AccountSection.tsx:410-555` uses a centered plain `Modal` with a `TextInput` for deletion and no keyboard-aware scroll container. On short devices or large text settings, the confirmation input/buttons may be covered by the keyboard. This is a runtime responsive risk; verify before calling it a confirmed visual defect.
- The AccountSection modal card has `padding` and `maxWidth: 420` but no max-height or scroll owner (`AccountSection.tsx:741-746`). Large accessibility font sizes can push the destructive and cancel buttons below the visible window.
- `profile.tsx:5495-5510` gives each of three tabs `flex: 1` and only 6 px horizontal padding. At narrow widths and enlarged font scale, “Membership” may wrap or clip. Verify at the app’s largest supported font scale and narrow Android viewport.
- Reminder rows combine long status copy with switches and nudge controls (`profile.tsx:1769-1885`, `2026-2345`). Verify no overlap at large font scales; many labels use fixed-size horizontal rows rather than wrapping containers.
- Notification sheet list is capped at `maxHeight: 430` (`profile.tsx:5396-5397`) and has an inner ScrollView. Verify the sheet remains reachable and the action footer remains above the keyboard/home indicator with long notification bodies.
- Saved meal and notification collections use mapped children in ScrollViews rather than FlatList virtualization. This is acceptable for expected small lists, but verify performance and memory if inbox/history grows.
- Profile edit photo picker invokes `Alert.alert` (`profile.tsx:1054-1074`) and then native camera/library permission flows. Verify cancel, denied permission, and repeated staging/cleanup on iOS and Android; no build/device execution was performed here.

## Functional risks requiring runtime or integration verification

- Account deletion calls `${getApiBaseUrl()}/api/v1/account` with the session access token (`AccountSection.tsx:146-171`), then clears local data and signs out. Source handling is careful (timeout, 202 acceptance, cleanup/sign-out warnings), but server 401/403/500, expired JWT, 202 completion semantics, and retry behavior need authorized integration testing.
- Sign-out clears the local profile photo before calling auth sign-out (`AccountSection.tsx:107-130`). The code intentionally ignores local photo cleanup failure; verify that an account switch cannot display a stale photo under the next identity.
- Profile edit saves the name before committing the staged photo URI (`profile.tsx:1083-1131`). If local photo cleanup or persistence fails in edge orderings, verify cancel/reopen and account switch do not retain orphaned or cross-account files.
- Reminder preference updates persist first and reconcile native schedules asynchronously (`profile.tsx:498-530`). Verify rapid toggles, permission denial, schedule failure, and retry do not lose desired preferences or leave stale schedules.
- Notification inbox refresh uses request IDs and account-scoped subscription (`profile.tsx:374-404`), but mark-read and clear-history handlers are fire-and-forget with Alert-only errors (`425-447`). Verify stale rows cannot be acted on after account changes and that UI refreshes after successful mark/clear operations.
- External About/support/legal rows call `Linking.openURL` without a catch (`profile.tsx:3693-3746`). Verify malformed/unavailable URLs do not produce an unhandled rejection; consider a user-visible fallback.
- `ProfileYouSettings` async actions have no in-flight lock. Verify repeated taps cannot submit overlapping profile updates or produce out-of-order automatic/custom target modes.

## Existing test coverage

- `artifacts/calora/lib/__tests__/profileScreen.test.tsx` covers rendered tab switching, billing purchase/restore/error gates, health deep-link/access/sync states, daily step goal saving, saved-meal opening, notification inbox unread state, and local persistence retry.
- `artifacts/calora/lib/__tests__/accountSection.test.tsx` covers account deletion timeout recovery and truthful post-server-deletion local sign-out failure reporting.
- `artifacts/calora/lib/__tests__/profileTargets.test.ts` covers adult gating, metric/imperial conversion and validation, recommendation behavior, and target-mode migration.
- `artifacts/calora/lib/__tests__/profilePhotoComponent.test.tsx`, `profilePhotoFlash.test.ts`, `profilePhotoStorage.test.ts`, and `profileSync.test.ts` cover photo/storage/sync helpers.
- `artifacts/calora/lib/__tests__/tabsLayout.test.ts` covers tab-layout contracts, but there is no dedicated Profile safe-area/keyboard/pager visual test.
- Coverage gaps: Profile tab preview-to-tap state, all ProfileYouSettings field accessibility labels, large-font/narrow-width layout, keyboard-obscured AccountSection deletion modal, repeated async target saves, external-link failures, and native notification scheduling behavior.

## Recommended repair and verification plan

1. Clear `profilePreview` in direct tab presses and add a focused regression test for swipe-preview followed by tab tap.
2. Add explicit labels/IDs and invalid/live-region semantics to all ProfileYouSettings fields and actions; add tests asserting accessible names and radio/button states.
3. Add async in-flight state to personal/nutrition saves, disable action buttons while saving, and expose a truthful “Saving…”/success/error feedback state.
4. Wrap AccountSection deletion confirmation in a keyboard-aware bounded ScrollView or use a bottom sheet; test short Android viewport, iOS keyboard, and largest supported text size.
5. Add Profile viewport tests for bottom padding against safe-area/tab-bar variants, narrow-width tab labels, large font scale, reminder rows, notification footer, and nested pager gestures.
6. Add integration tests with mocked API responses for account deletion 401/403/500/202, expired sessions, retry after timeout, and account-switch photo isolation.
7. Add tests for notification mark-read/clear success and failure, schedule denial/failure/retry, and stale account refresh cancellation.
8. Add a caught `Linking.openURL` failure path with an actionable alert or support fallback.
9. Runtime verification on authorized iOS and Android devices: VoiceOver/TalkBack focus order, keyboard dismissal/scrolling, safe-area/home-indicator spacing, tab swipe/tap arbitration, large accessibility text, camera/library permission cancellation, and destructive-flow recovery.

## Verification boundary

No source was modified, no build/native build was run, no production data was touched, and no external mutation was triggered. Findings above are based on source and existing tests only. Report 214’s certification boundary and Report 220’s Plan/Progress repairs were respected; neither is reclassified as a new Profile/Settings defect.
