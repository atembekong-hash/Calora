# 234 — Calora non-obscuring swipe-indicator remediation

**Date:** 2026-10-19
**Scope:** Plan day rail; Recipes, Progress, and Profile section menus; shared swipe pager.
**Status:** Validated on the release branch; protected review and production attestation pending.

## User requirement

The previous orange swipe preview was to be removed. The replacement had to be visually distinctive and bold without covering menu labels, and it had to follow the page immediately during a swipe. The initial validation focus was Plan; the approved follow-on scope was all shared swipe-menu consumers.

## Forensic finding

The existing treatment used React-state preview flags (`selectedDayPreview`, `sectionPreview`, `progressPreview`, and `profilePreview`) to replace the destination tab/day surface with an orange fill and white text. That work crossed the JS state/render path while the native pager moved independently. It created both the observed visual lag and the possibility that the fill would obscure or reduce contrast for labels.

The native pager's `onScroll` handler also crossed into the JS preview callback for every scroll update. Although previous work removed the deliberate preview dead zone, the visible highlight still depended on React render timing.

## Remediation

1. Added `SwipeMenuHighlightProvider` and `SwipeMenuHighlight` to the shared pager module.
   - The provider owns one Reanimated shared `visualIndex` for the paired menu and pager.
   - Native pagers now use `Animated.ScrollView` plus `useAnimatedScrollHandler`; each scroll offset updates the indicator index on the UI thread.
   - The existing non-native/custom pan path sets the same shared value directly during gesture updates, then restores the settled position on completion or cancellation.
2. Replaced the orange preview fills with a 4 dp, high-contrast green (`accentForeground`) rail inset 10 dp from each menu item's horizontal edges.
   - The rail is absolutely positioned in a reserved lower lane, uses `pointerEvents="none"`, and cannot intercept controls.
   - The selected item retains the card surface and standard readable text; menu text is not painted over or recolored by the in-progress swipe state.
3. Applied the rail to the Plan day selector, Recipes, Progress, and Profile.
   - Plan's day cells reserve bottom space for the indicator and retain the existing logged/planned coverage dots and Today label.
   - Recipes, Progress, and Profile retain their existing tab semantics and active-card treatment.
4. Updated shared pager and screen regression contracts for the UI-thread scroll path, cancellation behavior, native vertical-scroll negotiation, and non-obscuring rail presence.

## Validation evidence

| Check | Result |
|---|---|
| Shared swipe math, retained pager, Plan, Recipes, Progress, and Profile focused contracts | PASS |
| Native-pager contract with animated scroll tracking | PASS |
| `pnpm --filter @workspace/calora exec tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| `pnpm --filter @workspace/calora test -- --reporter=dot` | PASS — 161 test files, 1,782 tests |
| Calora static/server checks invoked by the client package | PASS — 28 checks |

The client suite emitted pre-existing, expected test-only console output for deliberate network/diary failure fixtures and pre-existing React `act(...)` warnings in Profile render tests. No test failed.

## Physical-device boundary

The authorized Windows/Galaxy bridge remains unavailable with the Manus task-to-device cleanup lock (`target_unavailable: still finishing cleanup of earlier work`). Therefore no Android visual or frame-rate claim is made for this new implementation. The prior live Plan test proved the earlier behavior only; it is not evidence for this unbuilt change.

When the bridge is available, test Plan first with slow, fast, partial, cancelled, and reversed day swipes, then repeat the same matrix for Recipes, Progress, and Profile. Confirm that the green rail moves continuously with the content, labels remain fully visible, and the rail returns to the committed item after a cancelled gesture.

## Release boundaries

This change is client source and does not trigger a native build. The installed Android artifact cannot contain it until a separately authorized native build is made. Protected CI, merge, Railway rollout, and deployed-web verification remain required before claiming production release status.
