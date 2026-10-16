# Programs and guided content — source-level forensic audit

**Surface audited:** Programs and guided content (the Programs selector/detail flow embedded in the Weekly Planner)

**Repository:** `/home/ubuntu/calora-recipe-infinite-fix`

**Audit boundary:** Source and existing tests only. No build, native run, production mutation, or unrelated-surface testing was performed.

## Executive summary

The Programs surface is implemented in `artifacts/calora/app/(tabs)/planner.tsx`, with a single `BottomSheet` reused for selector and detail states. The implementation has good source-level safeguards around truthful diet/program previews, preserving user-authored and logged meals, per-week application provenance, accessibility labels, and one-modal routing. Existing tests cover the pure state transitions, catalog/preview eligibility, generation merge semantics, and provenance rules.

Two **confirmed source defects/gaps** remain in the Programs action path:

1. The Apply action starts asynchronous generation but does not expose a loading/busy state in the rendered Programs modal. `generating` is set and guarded internally, but is never rendered or used to disable the Apply control. The sheet closes immediately, leaving no in-context acknowledgement that the action is running and making repeated taps appear inert.
2. The Program success celebration uses a hard-coded `bottom: 151` rather than safe-area/tab-bar-derived spacing. This is a source-level overlap risk on devices/configurations where the bottom tab bar or home-indicator inset differs from that fixed value.

Additional responsive and functional items below are explicitly marked **runtime risks** where source inspection cannot prove a visual or device-specific failure.

Report 214 is treated as the prior certification baseline, not as new evidence: it records native scrolling/keyboard behavior as unavailable and says the broad application suite passed. Report 220 is treated as prior remediation: its Plan logging date handoff and Progress chart viewport fixes are not re-reported here.

## Audited components and routes

- `artifacts/calora/app/(tabs)/planner.tsx`
  - Header action `Open meal programs` (line 936) opens the selector.
  - Selector and detail share one `BottomSheet` (lines 1288–1409), avoiding nested native modals.
  - Selector maps all 12 `PLAN_TYPES` entries to Pressable option cards (lines 1364–1405).
  - Selecting a card transitions to detail in the same sheet (`selectProgram`).
  - Detail shows description, a four-meal preview or unavailable state, plan-shaping copy, and `Apply to this week` (lines 1297–1349).
  - Apply closes the sheet and calls `generate(program.id)` (line 1346).
  - Main Planner uses a `ScrollView` with bottom padding `insets.bottom + 106` (line 946); day content is rendered through `SwipeableSectionPager` (lines 1024–1036).
  - Program feedback is rendered through `ProgramAppliedCelebration` and `generationMessage` (lines 1043–1054 and 1037).
- `artifacts/calora/components/BottomSheet.tsx`
  - Native `Modal`, modal accessibility flag, backdrop dismissal, Android request-close, pan-down dismissal, 96% max-height, and safe-area/home-indicator bottom padding.
- `artifacts/calora/components/ProgramAppliedCelebration.tsx`
  - Live alert, dismiss button, auto-dismiss, optional haptics/animation; fixed absolute bottom placement.
- `artifacts/calora/lib/programModalState.ts`
  - Selector/detail state machine and single-modal close/apply transitions.
- `artifacts/calora/lib/planType.ts`
  - Program catalog, selected primary preference, per-week application history, fallback/provenance decisions.
- `artifacts/calora/data/planner.ts`
  - Diet-filtered program catalog and truthful four-role preview generation.

No separate Expo Router route exists for Programs; the only route entry is the Planner tab. Recipe browsing from add/replace meal flows routes to `/(tabs)/recipes`, but that is outside the Programs surface and was not audited as a separate surface.

## Confirmed source findings

### P1 — Apply has no rendered loading/busy feedback or disabled state

**Evidence:** `planner.tsx:275` declares `generating`; `generate()` sets it at line 727 and clears it at 762/767/862, while duplicate calls are blocked only by `generationInFlightRef` at lines 720–721. The Programs Apply Pressable at lines 1346–1348 has no `disabled`, `accessibilityState={{busy: ...}}`, spinner, label change, or visual loading branch. A repository search shows `generating` is declared/set but never rendered.

**Why confirmed:** This is directly observable from source: the user-facing Apply control is always rendered in its normal state, while the handler starts async work and immediately closes the sheet. The internal ref prevents duplicate execution, but does not communicate progress. This fails the requested action-feedback requirement even if the underlying generation is correct.

**Impact:** A slow request, timeout, auth failure, or offline fallback looks like a no-op after the modal closes. Users can tap repeatedly (calls are silently ignored), cannot tell whether the program was accepted, and receive delayed status only in the Planner body. Accessibility users receive no busy announcement for the action.

**Repair recommendation:** Add a `programApplying`/`generating` presentation branch to the detail Apply Pressable: disable it while in flight, expose `accessibilityState={{disabled: true, busy: true}}`, show an `ActivityIndicator` or progress copy, and keep the sheet open until the request has a terminal result—or present an explicit immediate “Applying…” status before closing. Ensure the terminal error has a retry action that calls the same program-specific handler.

### P1 — Success celebration is positioned with a hard-coded bottom offset

**Evidence:** `ProgramAppliedCelebration.tsx:110–116` sets `position: 'absolute'`, `left: 20`, `right: 20`, and `bottom: 151`. It does not call `useSafeAreaInsets` and receives no bottom offset prop. Planner’s main content correctly derives scroll clearance from `insets.bottom` at `planner.tsx:946`, but the celebration does not share that geometry.

**Why confirmed:** The component’s placement is fixed in source, independent of device safe-area inset, tab-bar height, font scaling, or any navigation chrome configuration. It is therefore a confirmed layout robustness defect (the exact overlap manifestation needs runtime/device confirmation).

**Impact:** The alert can overlap the bottom tab bar, sit too high leaving excess dead space, or collide with other transient notices on devices with different inset/tab-bar geometry. The celebration is the primary success feedback for offline/local Program application, so a clipped or obscured alert weakens confirmation.

**Repair recommendation:** Pass a computed bottom offset from Planner based on the actual tab-bar/navigation spacing and `insets.bottom`, or make the component use safe-area insets and a shared bottom-notice constant. Add a layout contract/test for small/large bottom insets and simultaneous `LocalSaveNotice` visibility.

## Responsive/layout risks requiring runtime testing

These are not claimed as confirmed visual defects without device/rendered execution:

- **Program selector card height at large font scale:** `planTypeOptionRow` is a horizontal row (`planner.tsx:1706`) with icon, flexible copy, and optional check. The copy includes label, subtitle, preview row, unavailable text, and sometimes expanded description. It should wrap vertically, but the combination of `alignItems: 'center'`, fixed 42 px icon, and optional check needs testing at large accessibility font sizes and narrow widths.
- **Two-column preview images:** `programPreviewGrid` uses `flexWrap: 'wrap'` and each image is `width: '50%'` (`planner.tsx:1524–1526`). Verify no fractional-pixel seam/crop or image/text ordering issue on narrow Android widths and landscape.
- **Detail title and close button:** `SheetHeader` places a flexible title column beside a fixed 34 px close button. Long localized/large-font Program names need testing for clipping and hit-target retention.
- **Detail sheet scroll ownership:** Program detail has one `ScrollView` (`planner.tsx:1300`) inside `BottomSheet`, while `BottomSheet` itself is non-scrolling and applies max height/safe-area padding. Test very small viewports, landscape, and large text to ensure Apply remains reachable and the final `planDetailContent` padding is sufficient.
- **Selector list scroll ownership and bottom reachability:** The selector uses a `ScrollView` with `planTypeList.paddingBottom = 28` (`planner.tsx:1364`, `1704`) in a max-height sheet. Verify the last Program can be fully scrolled above the home indicator and that pan-down gestures do not steal vertical scroll gestures.
- **Tab-bar clearance of main Planner:** The main `ScrollView` uses `insets.bottom + 106` (`planner.tsx:946`). This is better than a fixed value, but the fixed additional 106 still needs runtime verification against the actual tab bar and transient celebration/notice stacking.
- **Program inline label:** `dayProgramInline` is absolutely centered with `maxWidth: 126` (`planner.tsx:1535–1538`). Verify long selected labels do not collide with day title or right-aligned total at narrow widths/large fonts.
- **Action tiles adjacent to Programs continuation:** Generic meal action sheets use `actionTile: width: '48%'` (`planner.tsx:1590–1593`). This is not the Program selector itself, but should be regression-tested because continuation from a Program-generated meal enters these cards and labels can wrap at narrow widths.

## Functional risks requiring runtime testing

- **Slow apply / request cancellation:** Apply closes the Program sheet before the async request resolves. Test backgrounding, network loss, timeout, and returning to the Planner tab while generation is pending. Confirm the latest request cannot overwrite user edits; source guards revision/epoch, but this was not runtime-tested.
- **Terminal error discoverability:** `generate()` maps errors to `generationMessage` (`planner.tsx:849–856`), but the message says “try again” without an adjacent retry control. Verify how a user retries after the modal has closed; likely they must reopen Programs and reselect the card. Consider a dedicated Retry action retaining the selected Program.
- **Offline/local enrollment semantics:** `prepareOfflineProgram()` mutates the week and records `offline-fallback` before `finishOfflineProgram()` sets the message (`planner.tsx:420–464`). Test that the success celebration and body status are both visible, that the displayed selected Program matches the viewed week, and that logged/user-authored meals remain protected.
- **Diet-unavailable behavior:** The detail Apply control is disabled when `plannerProgramPreview` is unavailable (`planner.tsx:1303–1347`). Test every supported diet/program combination, including large text and screen readers, to ensure the disabled reason is announced and the user can navigate back to choose another Program.
- **Continuation/provenance across weeks:** `selectedProgramLabel` prefers `appliedProgramForViewedWeek`, then the primary preference (`planner.tsx:405–409`). Runtime-test moving between past/current/future weeks after changing the primary Program so labels and generated meals do not imply that a future selection reshaped an older week.
- **Accessibility modal focus/announcement:** `BottomSheet` sets `accessibilityViewIsModal` (`BottomSheet.tsx:73–76`) and labels the close/backdrop controls, but there is no explicit initial focus management or `accessibilityRole="dialog"`. Test VoiceOver/TalkBack traversal, selector-to-detail transition, disabled unavailable Apply, and escape/back behavior.
- **Keyboard avoidance:** Programs itself has no text inputs, so keyboard avoidance is not directly needed. However, the shared sheet and nearby Planner edit/custom-meal sheets use different scroll owners. Runtime-test reopening Programs after a keyboard-driven edit flow to ensure no stale keyboard or modal presentation state affects sheet height.
- **Concurrent notices:** Planner can render both `ProgramAppliedCelebration` and `LocalSaveNotice` (`planner.tsx:1043–1054`). Test simultaneous or near-simultaneous feedback to ensure alerts do not overlap or obscure tab navigation.

## Existing test coverage

- `artifacts/calora/lib/__tests__/programModalState.test.ts` covers selector → detail without nested modal state, detail close back to selector, and apply closing the state machine.
- `artifacts/calora/lib/__tests__/plannerProgramEligibility.test.ts` covers plant-based ingredient constraints, Quick & Easy preparation limits, rejection explanations, and deterministic eligible-choice rotation.
- `artifacts/calora/lib/__tests__/planner.test.ts` covers generated-week merging, protection of custom/edited/logged meals, catalog identity, diet-compatible starter weeks, unavailable combinations, and deterministic four-image previews.
- `artifacts/calora/lib/__tests__/planType.test.ts` covers the 12-entry catalog, metadata shape, preference normalization, selected-program precedence, per-week provenance, in-flight preference updates, fallback detection, and recording decisions.
- `214_CALORA_FULL_APPLICATION_CERTIFICATION_REPORT.md` records the broad deterministic UI/API suite as green but explicitly says native scrolling, native keyboard behavior, and several authenticated/native journeys were unavailable; it does not constitute Programs runtime coverage.
- `220_CALORA_PLAN_TODAY_AND_PROGRESS_VIEWPORT_REMEDIATION_REPORT.md` covers prior Plan/Today date handoff and Progress chart viewport remediation. Those fixed issues are intentionally not reported as new Programs defects.

**Coverage gap:** No existing test renders `planner.tsx`’s Program selector/detail, asserts Pressable disabled/busy behavior, verifies Apply feedback, checks safe-area placement of `ProgramAppliedCelebration`, or exercises accessibility tree/focus and modal back behavior.

## Recommended repairs (ordered)

1. Wire `generating` into the Program detail Apply control: disable, busy state, spinner/label, and an accessible announcement.
2. Define a single terminal-result path for Apply that retains selected Program context and offers Retry on error; avoid silently closing before the user can understand the result.
3. Replace `ProgramAppliedCelebration`’s `bottom: 151` with safe-area/tab-bar-derived positioning, and coordinate its offset with `LocalSaveNotice`.
4. Add component-level tests for selector/detail render states at available/unavailable previews, Apply disabled/busy/success/error, and one-modal routing.
5. Add layout/accessibility tests or deterministic snapshots at narrow width, large font scale, zero/large bottom inset, and a short viewport; then run authorized Android/iOS runtime checks for scroll reachability, TalkBack/VoiceOver focus, and notice/tab-bar overlap.

## Verification plan

1. Unit/component test the modal state machine and rendered selector/detail transitions.
2. Assert Apply calls generation once, becomes disabled/busy during an unresolved promise, and exposes an accessible busy state.
3. Resolve success, offline fallback, 401, 429, timeout, and generic error; verify visible status and retry behavior without data loss.
4. Render celebration with multiple safe-area bottom insets and verify it clears the tab bar and does not overlap `LocalSaveNotice`.
5. Run narrow portrait, landscape, large accessibility font, and very short viewport checks for selector and detail ScrollViews; verify the last card and Apply button are reachable.
6. On an explicitly authorized native device run, test TalkBack/VoiceOver modal focus, Android back, backdrop/pan dismissal, unavailable Program explanation, continuation after changing weeks, and apply feedback.

## Exact files inspected

- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/app/(tabs)/planner.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/BottomSheet.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/components/ProgramAppliedCelebration.tsx`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/programModalState.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/planType.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/data/planner.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/programModalState.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/plannerProgramEligibility.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/planner.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/artifacts/calora/lib/__tests__/planType.test.ts`
- `/home/ubuntu/calora-recipe-infinite-fix/214_CALORA_FULL_APPLICATION_CERTIFICATION_REPORT.md`
- `/home/ubuntu/calora-recipe-infinite-fix/220_CALORA_PLAN_TODAY_AND_PROGRESS_VIEWPORT_REMEDIATION_REPORT.md`
