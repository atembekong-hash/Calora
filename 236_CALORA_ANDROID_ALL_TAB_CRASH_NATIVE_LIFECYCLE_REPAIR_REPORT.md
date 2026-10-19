# 236 — Calora Android All-Tab Crash: Native Lifecycle Forensic and Repair

**Date:** 2026-10-19

**Scope:** Android process termination reported after a fresh manual installation when selecting any non-Home bottom tab.
**Release status at report creation:** IMPLEMENTED and locally validated; not yet merged or deployed. No Android/iOS/EAS/APK/AAB/IPA/TestFlight/App Store/Google Play build, submission, installation, cache clear, or device-data change was performed by this remediation.

## 1. User-visible incident

The supplied Android evidence establishes this repeatable symptom:

1. Calora launches successfully to **Today**.
2. Selecting any bottom tab immediately terminates the application and returns Android to the launcher.
3. Android presents its system “Clear cache for Calora?” crash dialog.
4. The same symptom recurred after a newly created manual build, and clearing the cache had already been attempted before the incident was reported.

This is a process-level Android failure, not an ordinary in-app error boundary, route fallback, failed network request, or stale web bundle.

## 2. Evidence and constraints

1. The installed package/device crash stack could not be collected because Manus Desktop’s authorized CaloraCertification workspace remains in the documented `target_unavailable` / “finishing cleanup of earlier work” state. Multiple bounded switch attempts were rejected; no claim of ADB, device-log, or physical-device pass is made here.
2. The last protected merge, PR #200 (`5bd8ca2ad7a906409b14d99da4efab005a14f6c8`), added a JavaScript `try/catch` around the Pedometer subscription `remove()` call. That protects only a JavaScript exception returned by the bridge; it cannot protect an Android process failure while the native bridge executes `SensorManager.unregisterListener`.
3. `Today` uses `useFocusEffect` to call `setLiveStepsDashboardFocused(false)` on every blur. A bottom-tab selection always blurs Today, independently of which destination tab is selected.
4. Before this repair, `setLiveStepsDashboardFocused(false)` called `reconcileLiveStepSubscription()`, whose non-eligible branch called `stopLiveStepSubscription()`, which invoked the native Pedometer subscription `remove()`.
5. The focus-driven Pedometer lifecycle entered the source lineage in commit `e1d263497aa822ff259d7ff90597b91f3dbbfe85` on 2026-09-27. It is a common execution path for the reported “any tab” trigger.
6. Expo Sensors documents that Pedometer callbacks do not run in the background. The application already owns an AppState lifecycle that can safely dispose the listener when the app actually backgrounds.

## 3. Reproduced source defect

A new mounted-provider regression test modeled 100 consecutive Dashboard blur/focus cycles.

### Before repair (red)

Command:

```sh
pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/liveStepTrackingLifecycle.integration.test.tsx --reporter=verbose
```

Result: **1 failed / 10 passed**. The new test showed `motion.remove()` was called **100 times** for 100 ordinary tab-like Dashboard blurs. This precisely proves the unsafe application-side lifecycle behavior. The first red assertion failed at `expect(motion.remove).not.toHaveBeenCalled()`.

This is not a fabricated native stack trace. It is direct, deterministic proof that the app exercised the native unsubscribe bridge once per tab transition—the only native Pedometer teardown common to the all-destination crash trigger.

## 4. Root-cause verdict

### Confirmed application root cause

The app treated a routine **Today visibility change** as an instruction to destroy and recreate the native foreground Pedometer subscription. Therefore every transition from Home to Recipes, Scan, Progress, Plan, or any other destination invokes native listener teardown. That lifecycle is both unnecessary and creates a universal native boundary at the exact reported crash trigger.

### Why PR #200 did not resolve the reported incident

PR #200 added a correct best-effort JavaScript catch, but the code still calls the same native `remove()` function on ordinary tab blur. A native Android process failure cannot reliably unwind into JavaScript, so the catch-only mitigation did not eliminate the crash-capable operation.

### Native-vendor certainty boundary

Without ADB `logcat` or an Android tombstone from the currently installed binary, this report cannot prove which Android framework/vendor method terminates the process. The repair removes the unnecessary application trigger rather than asserting an unsupported vendor-stack diagnosis.

## 5. Durable repair

`artifacts/calora/context/CaloraContext.tsx` now has two deliberately distinct lifecycle operations:

1. **`pauseLiveStepSubscription`** — used only for an ordinary Dashboard blur. It clears reconciliation timers, clears queued milestones, marks the UI session suspended, and preserves the one existing native listener. The listener callback already rejects events unless the Dashboard is focused.
2. **`disposeLiveStepSubscription`** — used when native disposal is appropriate: app backgrounding, explicit user stop, counter-reset rebasing, provider unmount/account switch, local-day rollover, and destructive data clear.

The result is a single foreground listener across tab changes. It does not display off-screen activity, does not create repeated listeners, and promptly resumes the existing stream when Today returns. It still disposes on background, satisfying the Expo Pedometer foreground-only contract.

## 6. Deterministic prevention coverage

The modified mounted-provider integration test now verifies all of the following with device I/O mocked only at the adapter boundary:

1. The active Today stream receives initial steps.
2. **100** Dashboard blur/focus transitions invoke native `remove()` **zero** times.
3. Those 100 transitions create only **one** `watchSteps()` subscription.
4. A Pedometer event emitted while Today is unfocused is ignored.
5. Refocusing Today reuses the same listener and processes the next valid cumulative step event.
6. Existing coverage retains native cleanup on actual backgrounding, counter reset, local-day rollover, and stale-callback rejection after background/foreground transitions.

## 7. Validation completed

| Validation | Result | Evidence |
|---|---|---|
| New lifecycle test against prior implementation | PASS (red baseline captured) | 1 failure shows 100 native removes across 100 tab blurs |
| Focused lifecycle suite after repair | PASS | 12/12 tests |
| Full Calora mobile suite | PASS | 162 test files, 1,801 tests |
| Workspace libraries TypeScript build | PASS | `pnpm typecheck:libs` |
| Calora TypeScript validation | PASS | `pnpm --filter @workspace/calora exec tsc --noEmit` |
| Expo dependency/configuration validation | PASS | Expo Doctor: 17/17 checks passed |
| `git diff --check` | PASS | no whitespace errors |
| Native build | NOT RUN | prohibited without fresh explicit authorization |
| Device/ADB crash-stack capture | BLOCKED | Manus Desktop task-to-device cleanup lock |
| Physical Galaxy tab-navigation retest | BLOCKED | requires recovered bridge and a user-authorized build that contains this JavaScript source |

The full suite includes pre-existing React `act(...)` and React Native DOM-prop warnings in unrelated existing tests; the command completed successfully with all 1,801 tests passing.

## 8. Change boundary

Only two source-controlled files are changed:

1. `artifacts/calora/context/CaloraContext.tsx`
2. `artifacts/calora/lib/__tests__/liveStepTrackingLifecycle.integration.test.tsx`

There are no unrelated navigation, recipe, backend, subscription/Plus-policy, image, API, credential, native configuration, or build-profile changes.

## 9. Deployment and physical-verification plan

1. Commit this two-file repair and this report to an isolated branch.
2. Open a protected PR; wait for all required GitHub checks.
3. Squash-merge only after protection passes, then verify the merged `main` commit and Railway web/API health. This change is mobile-client source and does not alter production API behavior.
4. Do not initiate any native build.
5. When the device bridge is actually available and the owner elects to create/install a fresh build, obtain `adb devices`, installed package/version identity, and filtered crash logs; then execute non-destructive Home → every-tab, rapid back-and-forth, background/resume, Today revisit, and step-tracking checks.

## 10. Current verdict

**IMPLEMENTED, VALIDATED IN SOURCE AND CONTROLLED RUNTIME; PHYSICAL ANDROID VERIFICATION INCOMPLETE.**

The universal app-side trigger for native Pedometer removal has been removed. This is the appropriate immediate remediation for a crash on every exit from Home. The remaining evidence gap is a real Android crash stack and post-build device retest, both blocked by the Manus Desktop task-to-device cleanup state and by the standing no-native-build policy.
