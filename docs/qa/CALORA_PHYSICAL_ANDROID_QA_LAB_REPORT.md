# Calora Physical Android QA Lab Report

**Mission:** Establish a repeatable physical-device Android QA path for two Samsung devices.

**Date:** 2026-11-07

## 1. Execution environment

The investigation was performed in the Manus cloud sandbox, not on the owner's Windows PC.

- Operating system: Linux sandbox
- Windows PowerShell access: **Unavailable**
- Android Debug Bridge (`adb`): **Unavailable**
- USB device access: **Unavailable**
- Owner's connected Samsung devices: **Not accessible from this environment**

No physical-device result is fabricated from these checks.

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

The toolkit defaults to non-destructive behavior. It does not install, uninstall, update, clear, reset, or submit data.

## 4. Physical-device results

| Check | Primary Samsung | Secondary Samsung |
|---|---:|---:|
| ADB discovery | BLOCKED — Windows/USB unavailable here | BLOCKED — Windows/USB unavailable here |
| Device certification | NOT RUN | NOT RUN |
| Calora installation inspection | NOT RUN | NOT RUN |
| Launch smoke test | NOT RUN | NOT RUN |
| Screenshot evidence | NOT RUN | NOT RUN |
| Logcat/crash evidence | NOT RUN | NOT RUN |
| Performance snapshot | NOT RUN | NOT RUN |
| Full feature regression | NOT RUN | NOT RUN |

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

**READY FOR LOCAL EXECUTION — NOT PASS.**

The reusable toolkit and workflow documentation are present, but the final mission acceptance criteria requiring two certified physical devices and one authorized successful smoke test cannot be satisfied from the cloud sandbox. Those checks require the owner's Windows PC, connected Samsung devices, an approved installed build, and an owner-authorized controlled test session.

## 7. Recommended next actions

1. Run `-Action discover` on the Windows PC.
2. Confirm both Samsung devices report state `device`.
3. Run `-Action collect` separately with exact serial targeting.
4. Review screenshots and logs locally for sensitive data before sharing.
5. Run the relevant existing Maestro flow against the approved disposable test device.
6. Attach sanitized `qa-results.json` and selected screenshots to the release review.
