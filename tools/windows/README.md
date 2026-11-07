# Calora Physical Android QA Toolkit for Windows

This toolkit provides a repeatable, non-destructive ADB workflow for the Calora Android application. It is designed for the owner's Windows PC, where the two Samsung devices are physically connected. It does **not** install, uninstall, update, reset, or clear application data by default.

## Current execution status

The Manus cloud sandbox cannot access the owner's Windows PC, PowerShell session, USB bus, or ADB devices. No physical-device test was claimed or executed here. The mission status is therefore **READY FOR LOCAL EXECUTION**, not PASS.

## Prerequisites on Windows

Install and expose these commands in PowerShell:

- Android SDK Platform Tools (`adb.exe`)
- PowerShell 5.1 or PowerShell 7+
- A signed Calora APK installed on each approved disposable test device
- A controlled test account; do not use a customer account

Enable Developer options and USB debugging on each Samsung device. When prompted, authorize the Windows computer. Do not connect a personal production installation for flows that clear state.

## Device discovery

The discovery parser is covered by a Windows PowerShell 5.1-compatible regression harness. Run it from the toolkit directory before using a new copy of the script:

```powershell
.\Test-Invoke-CaloraAndroidQa.ps1
```

The test uses deterministic ADB output fixtures, confirms authorized/offline/unauthorized parsing, verifies that device facts carry the inventory `state` field, and checks that strict-mode filtering cannot read a missing property. It does not contact a device or modify application state.

The safety assertion uses the Windows PowerShell AST rather than a broad text regex. The previous regex incorrectly treated the harmless error text `ADB_NOT_FOUND: install Android Platform Tools` as an executable `adb install` command. The AST check inspects only actual PowerShell command nodes whose command name is `adb` or `adb.exe`, then evaluates literal ADB argument tokens in that node. Comments, quoted strings, and unrelated diagnostic text are tested explicitly as non-destructive references. A fixture containing an executable `adb shell pm clear ...` command must still be rejected, and any future match reports its source line, column, rule, and command extent before failing.

The findings collection deliberately uses the name `$findings`, not `$matches`: PowerShell exposes an automatic, case-insensitive `$Matches` variable for `-match`, which can overwrite a user-defined `$matches` collection under strict mode. The regression harness also checks empty finding collections and safely formats objects with missing diagnostic properties.

The collection action also wraps the `pm path` result in `@(...)`. A single installed APK path is otherwise unwrapped by PowerShell 5.1 into a scalar string, making `$package.Count` fail under strict mode. The regression harness includes a one-item package-path contract for this case.

Crash scanning is package-aware. Each marker is retained in `crash-scan.txt` with `calora`, `other`, or `unknown` attribution based on nearby `Process:`, `Cmdline:`, or `ANR in` evidence. Unrelated process markers do not fail Calora's scan; ambiguous markers produce `NOT RUN` rather than being falsely attributed. The smoke launch now binds the complete `shell monkey -p <package> 1` argument array explicitly, avoiding Windows PowerShell 5.1 native-argument binding ambiguity.

From PowerShell, run:

```powershell
Set-Location .\tools\windows
.\Invoke-CaloraAndroidQa.ps1 -Action discover -OutputRoot C:\CaloraEvidence
```

This writes a timestamped inventory containing manufacturer, model, Android version/API level, ABI, display size/density, memory, storage, and a redacted serial hash. Raw serial numbers are not written to the evidence files.

When both devices are connected, the command must show two records with state `device`. If more than one device is ready, every targeted command requires an exact `-Serial` value; the toolkit never chooses an arbitrary device.

Use the local `serialHash` values to maintain a private owner-only mapping:

```text
CALORA_PRIMARY_ANDROID   -> <private local serial>
CALORA_SECONDARY_ANDROID -> <private local serial>
```

Do not commit that mapping or paste serial numbers into reports.

## Test levels

### Level 1: Quick smoke preparation

The safe default collects device health, installation metadata, a screenshot, redacted logcat, crash markers, and a performance snapshot:

```powershell
.\Invoke-CaloraAndroidQa.ps1 -Action collect `
  -Serial '<exact adb serial>' `
  -DeviceRole CALORA_PRIMARY_ANDROID `
  -OutputRoot C:\CaloraEvidence
```

The launch step is intentionally `NOT RUN` unless the owner explicitly selects an approved disposable device and controlled account:

```powershell
.\Invoke-CaloraAndroidQa.ps1 -Action smoke `
  -Serial '<exact adb serial>' `
  -DeviceRole CALORA_PRIMARY_ANDROID `
  -AllowLaunch `
  -OutputRoot C:\CaloraEvidence
```

`-AllowLaunch` launches the already-installed package only. It does not authenticate, install, clear state, or submit data.

### Level 2: Feature regression

Use the same exact serial for a focused feature session, capture evidence at the relevant checkpoints, and run the existing Maestro flow from `artifacts\calora` when the approved test build and disposable test account are ready:

```powershell
$env:CALORA_ANDROID_DEVICE = '<exact adb serial>'
Set-Location .\artifacts\calora
pnpm test:device:meal-images
# or: pnpm test:device:nutrition-goals
# or: pnpm test:device:plus-recipes
# or: pnpm test:device:encrypted-recovery
```

The existing flows may clear app state. Use only a disposable target and never a personal production installation.

### Level 3: Full release certification

Run the release-specific gates only after the signed release candidate, exact device serial, controlled test account, and owner approval are available. The repository already provides release-gate commands and protected CI contracts. Physical devices remain complementary evidence; they are not a mandatory GitHub CI dependency.

## Evidence and privacy

Each run creates:

- `device-inventory.json` or `target-device.json`
- `qa-results.json` with PASS, FAIL, BLOCKED, or NOT RUN outcomes
- `health.txt`
- `application.txt`
- `screen.png`
- `logcat.txt` with common token patterns redacted
- `crash-scan.txt`
- `performance.txt`

Review raw screenshots and logs locally. Do not commit raw device serials, personal notifications, customer data, authentication tokens, or unredacted logs.

## Interpretation

- **PASS:** The command actually ran and the assertion passed.
- **FAIL:** The command actually ran and found a defect.
- **BLOCKED:** A prerequisite or access condition prevented execution.
- **NOT RUN:** Deliberately skipped because an explicit safety or owner authorization was not present.

A captured screenshot alone is not a visual PASS. The reviewer must inspect clipping, safe areas, contrast, touch targets, loading states, and the requested reference behavior.

## Current mission verdict

**READY FOR LOCAL EXECUTION — BLOCKED HERE BY ENVIRONMENT ACCESS.**

The cloud sandbox verified that it has no PowerShell, `adb`, USB devices, or direct access to the owner's Windows PC. Execute the toolkit on that PC, retain the timestamped evidence directory, and provide the sanitized `qa-results.json` plus selected screenshots for review.
