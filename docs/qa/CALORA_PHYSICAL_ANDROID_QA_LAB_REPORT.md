# Calora Physical Android QA Lab Report

**Mission:** Establish a repeatable physical-device Android QA path for two Samsung devices.

**Date:** 2026-11-07

## 1. Execution environments

The repository investigation and deterministic checks were performed in the Manus cloud sandbox. Physical-device collection was performed by the owner on the authorized Windows PC.

### Sandbox boundary

- Operating system: Linux sandbox
- Windows PowerShell access: **Unavailable**
- Android Debug Bridge (`adb`): **Unavailable**
- USB device access: **Unavailable**
- Owner's connected Samsung devices: **Not accessible from this environment**

These are environment limitations, not physical-device failures. No physical-device result was fabricated from sandbox checks.

### Owner Windows verification

- Host: Owner's Windows PC with Windows PowerShell 5.1
- Device: Samsung Galaxy S20, model `SM-G981U`
- Device state: Authorized and recognized by ADB
- Evidence directory: `C:\CaloraEvidence\20261107T135244Z`
- Collection result: **PASS — all six non-smoke collection checks passed**
- Application smoke launch: **Intentionally not run**

## 2. Repository baseline

- Repository: `atembekong-hash/Calora`
- Protected-main source inspected: current repository checkout
- Android package: `com.etiendem.caloraapp`
- Existing native automation: Maestro flows under `artifacts/calora/tests/device`
- Existing Android internal-build workflow: `.github/workflows/calora-android-internal-build.yml`
- Existing QA ledger: `qa/calora-qa-coverage-ledger.json`

No native build, installation, deployment, data reset, or production modification was performed for this QA-lab setup.

## 3. Toolkit delivered

The Windows toolkit is located at:

- `tools/windows/Invoke-CaloraAndroidQa.ps1`
- `tools/windows/README.md`

It supports read-only discovery and targeted collection for:

- ADB device discovery with explicit serial targeting
- Device health and display facts
- Calora installation inspection
- Screenshot capture
- Redacted logcat capture
- Crash/ANR marker scanning
- Memory and CPU snapshots
- Optional launch smoke check, gated behind `-AllowLaunch`
- Timestamped evidence directories and sanitized result statuses

### PR #387 discovery fix

The reported discovery failure was caused by an incomplete inventory object contract. `Get-ConnectedDevices` produced device objects with `State`, while `Get-DeviceFacts` produced inventory objects without any `state` property. `Invoke-Discovery` then evaluated the inventory state under `Set-StrictMode -Version Latest`, causing PowerShell to stop with a missing-property error after a valid Samsung device had already been parsed.

The fix extracts ADB parsing into `ConvertFrom-AdbDevicesOutput`, adds `state = $Device.State` to every device-facts inventory record, and keeps inventory filtering consistently on the serialized `state` field. It also adds `-SkipExecution` for safe dot-sourced testing and `tools/windows/Test-Invoke-CaloraAndroidQa.ps1`, a Windows PowerShell 5.1-compatible regression harness covering authorized/offline/unauthorized parsing, state propagation, strict-mode filtering, and the no-destructive-command safety contract.

### PR #387 safety-test false positive

The first regression harness used a line-based expression beginning with `adb`. It falsely matched the harmless missing-tool message `ADB_NOT_FOUND: install Android Platform Tools`; that text is not an executable ADB operation and the toolkit contains no install command. The harness now parses the toolkit with the Windows PowerShell AST, examines only executable command nodes named `adb` or `adb.exe`, ignores comments and quoted strings, and includes a fixture proving that an actual `adb shell pm clear ...` command is rejected.

The subsequent Windows PowerShell 5.1 failure exposed a second harness defect: the AST collector stored findings in `$matches`, which collides case-insensitively with PowerShell's automatic `$Matches` regex hashtable. A later `-match` operation replaced the collection, so failure formatting enumerated objects without `.line`. The collector now uses `$findings`, and the harness tests empty collections plus safe handling of missing finding properties.

The Samsung Galaxy S20 collection then reached the health pass and failed during app inspection because a successful `pm path` response usually contains exactly one line. PowerShell unwrapped that result to a scalar before `$package.Count` was read under strict mode. The collection path now assigns `@(Invoke-AdbSafe ...)`, and the regression harness verifies the one-item package-path shape.

### Follow-up: crash attribution and smoke argument handling

The owner’s subsequent evidence directory was `C:\CaloraEvidence\20261107T140156Z`. The reported crash scan marker cannot be attributed from the sandbox because that Windows evidence directory is not accessible here; the previous scanner also treated all global logcat markers as Calora failures and counted companion `AndroidRuntime` lines as separate events. The scanner now counts only primary `FATAL EXCEPTION`, `SIGSEGV`, and `ANR in` markers, preserves each event with nearby process evidence, and classifies it as `calora`, `other`, or `unknown`. An unrelated process no longer fails Calora’s scan, while an ambiguous marker remains `NOT RUN` instead of being falsely classified.

The collection also stopped at the optional smoke step because the `shell monkey -p <package> 1` argument sequence was passed positionally through the PowerShell wrapper. The smoke invocation now constructs a typed string array and uses explicit `-TargetSerial` and `-Arguments` binding; the Windows regression harness captures and verifies every token. The smoke test remains unverified until the owner reruns it on the physical Galaxy S20 with `-AllowLaunch`.

The subsequent Windows regression failure was a fixture-contract error: `ANR in com.example.unknown` contains an explicit non-Calora process name, so the scanner correctly classified it as a second `other` event. The fixture now uses an unattributed `SIGSEGV` line for the `unknown` case and separately asserts that a package-bearing ANR is classified as `other`. No crash-detection rule was weakened.

The toolkit defaults to non-destructive behavior. It does not install, uninstall, update, clear, reset, or submit data.

## 4. Physical-device results

| Check | Owner Windows — Galaxy S20 (`SM-G981U`) | Sandbox |
|---|---:|---:|
| ADB discovery | **PASS** — device recognized | NOT EXECUTABLE — ADB unavailable |
| Device health and display facts | **PASS** | NOT EXECUTABLE — ADB unavailable |
| Calora installation inspection | **PASS** | NOT EXECUTABLE — ADB unavailable |
| Screenshot capture | **PASS** | NOT EXECUTABLE — ADB unavailable |
| Redacted logcat capture | **PASS** | NOT EXECUTABLE — ADB unavailable |
| Crash/ANR marker scan | **PASS** | NOT EXECUTABLE — ADB unavailable |
| Performance snapshot | **PASS** | NOT EXECUTABLE — ADB unavailable |
| Application smoke launch | **INTENTIONALLY NOT RUN** | NOT EXECUTABLE — ADB unavailable |

## 5. Owner-side execution

On the Windows PC, open PowerShell and run:

```powershell
Set-Location <Calora checkout>\tools\windows
.\Invoke-CaloraAndroidQa.ps1 -Action discover -OutputRoot C:\CaloraEvidence
```

If two devices are connected, target each one by its exact serial:

```powershell
.\Invoke-CaloraAndroidQa.ps1 -Action collect `
  -Serial '<primary exact serial>' `
  -DeviceRole CALORA_PRIMARY_ANDROID `
  -OutputRoot C:\CaloraEvidence

.\Invoke-CaloraAndroidQa.ps1 -Action collect `
  -Serial '<secondary exact serial>' `
  -DeviceRole CALORA_SECONDARY_ANDROID `
  -OutputRoot C:\CaloraEvidence
```

Do not place serial numbers in committed reports. Do not use a personal production account or a device whose data may be harmed by a resettable test flow.

## 6. Acceptance status

**PASS for the requested Windows physical-device collection scope.**

The reusable toolkit and workflow documentation are present. PR #387's discovery, safety, scalar-array, and strict-mode contracts are covered by deterministic Windows PowerShell 5.1-compatible tests. The owner then verified the actual collection path on a Samsung Galaxy S20 (`SM-G981U`): all six non-smoke collection checks passed and evidence was written to `C:\CaloraEvidence\20261107T135244Z`. The smoke launch remains intentionally unrun and is not represented as a pass. The sandbox cannot independently reproduce the Windows or physical-device run.

## 7. Recommended next actions

1. Run `-Action discover` on the Windows PC.
2. Confirm both Samsung devices report state `device`.
3. Run `-Action collect` separately with exact serial targeting.
4. Review screenshots and logs locally for sensitive data before sharing.
5. Run the relevant existing Maestro flow against the approved disposable test device.
6. Attach sanitized `qa-results.json` and selected screenshots to the release review.
