# 237 — Calora Android Tab Crash: Fabric Pager Ref Root-Cause Report

**Status:** IMPLEMENTED; source and JavaScript-bundle validation passed. Physical-device verification remains required on a newly installed user-authorized build. No native build, APK installation, data reset, or permission change was initiated in this remediation.

## 1. Incident statement

On 2026-10-19, the Samsung device running Calora `1.0.1` / version code `26` crashed immediately after a tab selection. The visible Android system dialog was a consequence of a real process-fatal Fabric exception, not an Android cache issue, network failure, authentication failure, or a recoverable screen error.

The earlier step-listener lifecycle hypotheses were not sufficient. Those previous corrections did not remove the actual JavaScript exception captured in this incident.

## 2. Primary evidence

The owner-provided diagnostic files established the following timeline and causality:

1. `Calora-package.txt` records `com.etiendem.caloraapp`, version `1.0.1` / code `26`, manually installed at `2026-10-19 12:02:19`.
2. `Calora-device.txt` scopes the evidence to the supplied Samsung Galaxy S21 Ultra-class device running Android 15 / API 35 on arm64.
3. At `12:33:59.499`, `Calora-tab-crash.txt` records `ReactNativeJS: TypeError: undefined is not a function`.
4. The JavaScript component stack puts the failure at `SwipeableSectionPager`, inside `SwipeMenuHighlightProvider`, while `RecipesScreen` mounts.
5. Thirty milliseconds later, Fabric reports `addViewAt: cannot insert view … View already has a parent`; the Android main thread then throws a fatal `IllegalStateException` and terminates `com.etiendem.caloraapp`.

The Fabric error is therefore a **secondary mount failure after the JavaScript exception**, not an independent first cause.

## 3. Confirmed root cause

`artifacts/calora/components/SwipeableTabList.tsx` synchronized native pager position after mount or tab selection with:

```ts
nativePagerRef.current?.getNode().scrollTo({ x, animated: false });
```

This was introduced in commit `3e6a5db58868f07c999f54837663049c1aadc8f7` (PR #198, “use non-obscuring swipe menu indicators”), when the pager moved from a standard React Native `ScrollView` to `Animated.ScrollView`.

The installed runtime is Expo SDK 54 / React Native `0.81.5` / Reanimated `4.1.7` with Fabric. Reanimated’s TypeScript declaration still advertises `getNode()` on the animated scroll view type, so TypeScript accepted the call. The actual mounted Fabric ref on the device does **not** implement that legacy bridge. Its call produces precisely the observed `TypeError: undefined is not a function` in the `useEffect` that executes when the native pager mounts.

React Native documents `ScrollView.scrollTo(options)` as the direct imperative-ref method. Reanimated documents its separate `scrollTo(animatedRef, x, y, animated)` function for UI-thread worklets; it is not required for this normal React effect.

## 4. Affected scope

The defective shared component is used with `nativePaging` by these surfaces:

- Recipes: Discover / Plus / Create section pager.
- Progress: Overview / Trends / Weight section pager.
- Plan: daily pager.
- Settings & Profile: You / Membership / Account pager.

All four surfaces could execute the same invalid post-mount effect. The supplied crash stack specifically proves the Recipes route. Scan has no `SwipeableSectionPager` consumer, so the supplied log does not independently prove its route failed from this same call. The owner’s broader “any tab” observation is treated as a real symptom report, but only the shared-pager routes are source-proven for this root cause.

## 5. Repair

The shared native pager now calls the documented direct method:

```ts
nativePagerRef.current?.scrollTo({ x: activeIndex * surfaceWidth, animated: false });
```

The repair deliberately does **not** change:

- the native directional paging approach;
- retained adjacent pane rendering;
- the direct gesture behavior;
- the synchronized bold menu indicator;
- page-selection state; or
- user data, authentication, subscription, Plus-access, API, or image behavior.

Only the incompatible `getNode()` bridge is removed.

## 6. Deterministic regression protection

A new `nativeRecipePager.test.ts` contract failed against the unmodified source because it contained `.getNode().scrollTo(`. It passes after the repair and asserts both of the following:

1. no legacy `getNode().scrollTo` bridge exists in `SwipeableSectionPager`; and
2. native pager synchronization uses the direct `nativePagerRef.current?.scrollTo(...)` API.

Additional source and generated-bundle checks reject the legacy production bridge outside test files.

## 7. Validation results

| Validation | Result | Evidence |
|---|---:|---|
| Captured baseline regression | PASS (expected red) | New pager-ref test failed on the exact old `getNode()` call. |
| Focused pager/navigation suite | PASS | 7 files, 110 tests. Existing Profile test `act(...)` warnings were non-fatal and pre-existing in scope. |
| Full mobile suite | PASS | 162 files, 1,802 tests. |
| Workspace library + mobile TypeScript | PASS | `pnpm typecheck:libs` and `pnpm --filter @workspace/calora exec tsc --noEmit`. |
| Expo Doctor | PASS | 17/17 checks. |
| Generated Android JavaScript bundle preflight | PASS | Android JS export completed; generated bundle did not contain `.getNode().scrollTo`. This is a JavaScript bundle validation, **not** an Android native build. |
| Production-source audit | PASS | no production `getNode().scrollTo` call remains. |
| Physical Samsung retest | NOT YET RUN | Requires a new user-authorized Android build and installation. |

## 8. Why cache clearing could not solve it

Clearing cache removes locally cached application state. The failing method was compiled into the JavaScript bundle contained by the installed app. It would execute again whenever a native pager mounted, so cache clearing could not correct it.

## 9. Release and device-verification plan

1. Commit this narrow repair and its regression test.
2. Push a protected pull request, wait for required checks, and squash-merge only after they pass.
3. Verify protected-main checks and the automatic Railway source deployment. The server deployment does not replace the installed Android bundle.
4. Do **not** trigger a native build. The owner may create the next Android build manually after source is merged.
5. On that build, verify non-destructively on the same device: Home → Recipes, Progress, Plan, and Profile; repeated tab changes; native section/day swipes; cancelled and rapid swipes; then Scan independently. Capture a fresh filtered logcat window and confirm no `SwipeableSectionPager` TypeError, Fabric parent-conflict exception, or Android process death.

## 10. Verdict

**ROOT CAUSE CONFIRMED.** The immediate crash is caused by an invalid legacy `getNode()` call on the mounted Fabric `Animated.ScrollView` ref. The direct documented `scrollTo` ref repair is implemented and fully validated in source, type, configuration, full-suite, and generated-JavaScript-bundle checks.

**DEVICE CERTIFICATION REMAINS INCOMPLETE** until the owner manually builds and installs the merged source, because no native build is authorized by this mission.
