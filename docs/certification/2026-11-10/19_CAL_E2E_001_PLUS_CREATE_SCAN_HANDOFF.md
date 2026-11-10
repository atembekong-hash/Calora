# 19 — CAL-E2E-001 Plus/Create Runtime Evidence and Android Scan Handoff

**Assessment date:** 2026-11-10 12:28–12:33 UTC  
**Repository baseline:** `b7ca9d5a` (branch `mission/cal-e2e-final-plus-create-recovery`, aligned with `origin/main`)  
**Runtime:** authenticated Calora web session at `https://app.mycaloraapp.com`  
**Test identity:** owner-authorized synthetic QA account; credentials are intentionally not recorded.

## Executive verdict

**CAL-E2E-001 remains BLOCKED / NOT CERTIFIED.** The Plus journey reached genuine provider-backed recipe detail and saved-recipe persistence. Create Recipes reached its real input screen, but the session expired before generation and the subsequent sign-in attempt did not establish a session. Physical Android Scan certification remains unavailable in this sandbox because ADB is not installed and no USB device is attached.

## Plus journey — executed evidence

| Stage | Result | Evidence |
|---|---|---|
| Authenticated Recipes route | PASS | Live browser runtime at `/recipes`; authenticated Today shell and saved counter were present. |
| Plus provider catalogue | PASS | Provider-backed cards were mounted, including `Apple Frangipan Tart`, `Cream Cheese Tart`, `Beetroot latkes`, and others. The DOM reported no Plus sign-in guard while the session was active. |
| Plus detail | PASS | `Apple Frangipan Tart` opened from the provider catalogue. Live detail contained TheMealDB image, cuisine/category, nutrition (`~2200 kcal`, protein/carbs/fat), ingredient list, and seven method steps. |
| Save action | PASS | Save options opened for the Plus recipe; the full `Save recipe` action completed. Saved-recipes counter changed from `1 saved` to `2 saved`. |
| Saved shelf persistence | PASS | Live route `/saved-recipes` showed `Apple Frangipan Tart` with its provider image and `Saved` state. The saved shelf reported `All saved 2`, `Discover 2`, `Plus 0`, `Create 0`; the classification label is inconsistent with the provider origin and is recorded as a follow-up defect rather than treated as failed persistence. |
| Reopen detail | PASS | The saved recipe reopened in the saved-recipe sheet with the same provider image, ingredients, nutrition, and method content. |
| Extended/deep scroll and recovery | PARTIAL | The provider catalogue contained many cards and the detail included 12 recommendations. A full controlled pagination/recovery rehearsal was not completed in this runtime pass. |

### Important runtime rendering note

The sandbox browser reported a CSS viewport of `5120×4400` with `devicePixelRatio=0.25`. The RN-Web pager therefore rendered panes at the 5120-CSS-pixel window width; the captured screenshots are genuine runtime screenshots but are visually scaled and are not suitable for narrow-device visual-parity certification. This is a sandbox rendering-scale limitation, not evidence of a production layout defect.

## Create journey — executed evidence

| Stage | Result | Evidence |
|---|---|---|
| Create tab/input screen | PASS | Live Create screen exposed pantry shortcuts, ingredient checkboxes, add-ingredient input, selected-ingredients textarea, meal/serves/minutes preferences, and `Generate 5 ideas`. |
| AI generation | BLOCKED | The Create screen simultaneously displayed `Sign in for Plus recipes` and `Your session ended. Sign in again.` No generation was invoked while unauthenticated, avoiding unapproved provider cost. |
| Auth recovery form | OBSERVED | Sign-in form rendered at `/auth/sign-in` with email/password fields and submit control. Browser-native form fill accepted the owner-authorized test values. |
| Session restoration | BLOCKED | The submit target was covered by the runtime's close-sheet overlay during the native click attempt; no authenticated transition or auth network request followed. A direct event attempt also produced no session. The exact boundary is therefore browser interaction/overlay plus session state; no application auth defect is declared from this pass. |
| Generated result/save/reopen | NOT RUN | Requires a stable authenticated session and approved cost-controlled provider path. |

## Android Scan handoff audit

The repository toolkit is present at `tools/windows/Invoke-CaloraAndroidQa.ps1` and `tools/windows/Test-Invoke-CaloraAndroidQa.ps1`. Source inspection confirms:

- `discover` uses `adb devices -l`, preserves `device`, `offline`, and `unauthorized` states, and redacts serials in evidence.
- `collect` is non-destructive and includes health, package inspection, screenshot, redacted logcat, crash scan, performance, and opt-in smoke launch.
- Smoke launch requires explicit `-AllowLaunch` and constructs a typed complete argument array: `shell monkey -p com.etiendem.caloraapp 1`.
- The regression harness includes coverage for PowerShell 5.1 scalar/array behavior, missing properties, crash-marker attribution, and destructive ADB AST safety.
- The sandbox has no `adb` executable and no attached `/dev/bus/usb` device. Physical S20 identity, authorization state, installed package/version, and UI automation are therefore **UNVERIFIED here**.

### Smallest owner-assisted step

On the Windows machine with the Samsung Galaxy S20 connected and USB debugging authorized, run the existing read-only discovery/collection workflow from the current protected-main checkout. Do not report Scan PASS from this sandbox. The required physical follow-up covers Auto Scan, Nutrition Label, Barcode, Library/Photo Scan, and Voice Logging with screenshots, logs, persistence, and recovery evidence.

## Remaining blockers

1. Stable authenticated runtime session for Create Recipes.
2. Approved cost-controlled AI generation execution and evidence.
3. Create save, navigate-away, reopen, and failure/retry verification.
4. Narrow-scale screenshots suitable for visual certification; current browser scale is `0.25`.
5. Physical Windows/ADB execution for S20 Scan flows.
6. Full cross-platform Android/iOS certification remains unproven; no native build or store action was initiated by this pass.

## Security and cost boundary

No entitlement was bypassed, no production customer record was accessed, no subscription was changed, no AI generation was invoked while the session was unauthenticated, and no native build, deployment, database mutation, installation, reset, or device modification was performed.
