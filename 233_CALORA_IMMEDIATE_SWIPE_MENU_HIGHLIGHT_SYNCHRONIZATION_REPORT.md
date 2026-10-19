# Report 233 — Calora Immediate Swipe Menu Highlight Synchronization

**Date:** 2026-10-19
**Scope:** Shared swipe navigation behavior across Recipes, Progress, Profile, and Plan.
**Release type:** Client source and regression-test remediation only. No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered by this work.

## User-reported behavior

During a horizontal swipe, the page content followed the finger while the corresponding menu/submenu highlight lagged, often not changing until the gesture was well underway or settled. The intended behavior is direct manipulation: as the page begins moving toward an adjacent section, the adjacent menu item becomes orange immediately; if the gesture returns or is cancelled, the committed menu item remains selected; and the actual page selection is still committed only by a valid completed swipe.

## Forensic finding

All four section/page surfaces use `SwipeableSectionPager`:

| Surface | Menu state | Pager state | Native paging |
|---|---|---|---|
| Recipes | `sectionPreview ?? activeSection` | `activeSection` | Yes |
| Progress | `progressPreview ?? progressView` | `progressView` | Yes |
| Profile | `profilePreview ?? profileTab` | `profileTab` | Yes |
| Plan | `selectedDayPreview ?? selectedDay` | `selectedDay` | Yes |

The shared pager previously withheld its preview callback until a swipe passed **20% of the page width**. Page content began moving immediately in the native horizontal `ScrollView`, so this hard preview gate created the visible desynchronization. Progress and Profile also use `SwipeableTabList` for swipes started on the menu strip itself; that shared list had no move-time preview callback and could only update after release.

This was not a data, entitlement, or provider problem. It was a shared gesture-preview timing defect.

## Implemented remediation

### 1. Immediate shared destination preview

`lib/workspaceSwipe.ts` now provides `getWorkspaceSwipePreviewIndex` and a `0.5`-point sub-pixel epsilon. It returns the valid adjacent page from the first meaningful horizontal displacement, without committing navigation. It returns `null` at rest, for invalid gesture state, and at first/last-page edges so menus never wrap incorrectly.

### 2. Shared pager synchronization

`components/SwipeableTabList.tsx` now routes both native `ScrollView.onScroll` and direct-manipulation gesture updates through the immediate shared preview calculation. Preview is cleared when a gesture reverses to rest, is terminated, or finishes. Existing release-only commit rules are unchanged:

- ordinary page commits still require the established distance/velocity criteria;
- cancelled or partial swipes do not change the committed page;
- first/last page overscroll does not preview an invalid destination;
- adjacent panes remain retained and move with the finger.

### 3. Menu-strip gesture synchronization

`SwipeableTabList` now supports optional `onPreviewChange` and emits a deduplicated destination preview during `onPanResponderMove`, clearing it on release or termination. Progress and Profile now wire their existing preview state to this shared callback. Therefore, swiping on either the page body or those menu strips drives the same immediate orange preview state.

### 4. Coverage expanded across every current pager consumer

Regression coverage now explicitly proves the contract for Recipes, Progress, Profile, and Plan, including the Plan day strip. The test suite also validates immediate preview boundaries, reversal/rest behavior, invalid state handling, and no-wrap edges.

## Files changed

- `artifacts/calora/lib/workspaceSwipe.ts`
- `artifacts/calora/components/SwipeableTabList.tsx`
- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/app/(tabs)/profile.tsx`
- `artifacts/calora/lib/__tests__/workspaceSwipe.test.ts`
- `artifacts/calora/lib/__tests__/retainedSectionPager.test.ts`

## Validation evidence

| Validation | Result |
|---|---|
| Focused swipe, Recipes, Progress, Profile, and Plan suite | PASS — 7 files / 192 tests |
| Calora client TypeScript | PASS — `tsc --noEmit` |
| Diff whitespace/integrity | PASS — `git diff --check` |
| Complete Calora client suite | PASS — 161 files / 1,782 tests |

Expected pre-existing test output remained non-failing: React `act(...)` warnings from the Profile test suite and deliberately simulated network/diary error logs from resilience tests. No test failures occurred.

## Certification boundary

Automated source, gesture-state, and full client regression validation is complete. The Windows-to-Galaxy device bridge remains unavailable because of the previously recorded Manus workstation cleanup lock, so this report does not claim a new physical-device PASS for the changed JavaScript bundle. Once the bridge is restored and a user-authorized native build/install contains this source, the remaining physical checks are:

1. Slow, fast, partial, cancelled, and reverse swipes on Recipes, Progress, Profile, and Plan.
2. Confirm immediate orange destination preview while page content follows the finger.
3. Confirm no committed section/day change for a cancelled or partial swipe.
4. Confirm menu-strip swipes in Progress and Profile preview and commit consistently with page-body swipes.
5. Verify actual Android frame pacing and accessibility selection announcements.

No native build was requested or initiated for this remediation.
