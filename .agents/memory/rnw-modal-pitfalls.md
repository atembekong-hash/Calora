---
name: React Native Web modal pitfalls
description: RNW-specific bugs found when nesting Modals and using ScrollView inside modals — causes and fixes.
---

## Rule
Never nest a `<Modal>` inside another `<Modal>`'s JSX children for sub-sheets that need independent button interaction on web. The outer modal's viewport/backdrop creates a stacking context that clips or intercepts events for inner modal content.

**Why:** On React Native Web, `Modal` renders via a React portal at document root. When a second `Modal` is nested inside the first Modal's JSX, both portals render at root — but the outer modal's backdrop `View` (flex:1, justifyContent:'flex-end') can create a layout stacking context that pushes inner modal content off-screen or intercepts pointer events.

**How to apply:** Wrap the component's return in a React Fragment (`<>`) and render sibling modals at the same Fragment level rather than nesting them inside each other's JSX.

## Rule
`maxHeight` on a `ScrollView` does not constrain rendered height on React Native Web.

**Why:** RNW's ScrollView may expand to full content height even with `maxHeight` set as a style prop, pushing buttons below a parent View's clipping boundary.

**How to apply:** Use `height: N, flexGrow: 0` (explicit, fixed height) instead of `maxHeight: N` when a ScrollView must be bounded within a modal sheet on web. This applies to any bottom-sheet modal that shows a scrollable list above action buttons.

## Rule
Disable `refetchOnWindowFocus` in the React Query `QueryClient` for mobile-first apps.

**Why:** On web preview, any user interaction (click) causes the browser to fire a focus event, triggering React Query to refetch all stale queries mid-click. This causes DOM node replacement (stale locators in tests, broken button presses in practice) especially inside modals.

**How to apply:** `new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })`. Individual queries can still set their own `staleTime` for freshness control.

## Rule
Never use `entry.date` as a React list `key` for daily entries.

**Why:** Users can log multiple entries on the same day. Using the date as a key creates duplicate keys within the same list, causing React rendering instability and inconsistent UI state.

**How to apply:** Use `entry.id` as the key. Fallback: `` `${entry.date}-${index}` `` if id is not guaranteed.
