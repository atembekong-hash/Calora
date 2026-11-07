# Calora Physical Android QA Lab V2 Report

**Mission:** Continue the existing physical Android QA lab without rebuilding or deploying Calora.

**Protected-main baseline:** `79ecc85d` at mission start.

## 1. Verified baseline

The owner supplied verified Windows PowerShell 5.1 evidence from a Samsung Galaxy S20 (`SM-G981U`) at `C:\CaloraEvidence\20261107T144127Z`. The evidence confirms device health, installation inspection, screenshot capture, logcat capture, crash/ANR scan, performance snapshot, application smoke launch, and the Windows regression harness. This report does not claim independent access to that directory.

## 2. Reusable toolkit delivered

- `tools/windows/Invoke-CaloraAndroidQa.ps1` — low-level safe ADB collection.
- `tools/windows/Test-Invoke-CaloraAndroidQa.ps1` — Windows PowerShell 5.1 regression harness.
- `tools/windows/Invoke-CaloraQa.ps1` — one entry point with `QuickSmoke`, `FeatureRegression`, and `FullCertification` levels.
- `tools/windows/Test-Invoke-CaloraQa.ps1` — level selection, serial targeting, evidence, opt-in, and safety contracts.
- `tools/windows/README.md` — execution and interpretation guidance.

The levelled wrapper never installs, uninstalls, resets, clears data, submits data, builds, or deploys. Feature flows require both an exact serial and explicit `-RunMaestro` opt-in.

## 3. Test levels

### Level 1 — Quick Smoke

Collects device facts, installation metadata, a screenshot, redacted logs, crash/ANR markers, performance, and optional foreground launch. The `-AllowLaunch` switch remains explicit.

### Level 2 — Feature Regression

Prepares a feature checklist and can explicitly invoke one existing Maestro flow: `nutrition-goals`, `meal-images`, `plus-recipes`, or `encrypted-recovery`. It targets `CALORA_ANDROID_DEVICE` with the exact supplied serial and does not invent a new framework.

### Level 3 — Full Certification

Creates a complete current-surface checklist and optionally performs the Level 1 baseline collection. It reports feature, visual, lifecycle, reliability, and release-candidate work as separate outcomes; a baseline collection cannot be mistaken for full certification.

## 4. Current coverage and reliability artifacts

- [Current Android coverage matrix](CALORA_ANDROID_QA_COVERAGE_MATRIX_V2.md)
- [Reliability plan and defect register](CALORA_ANDROID_QA_RELIABILITY_AND_DEFECT_REGISTER_V2.md)
- [Existing machine-readable coverage ledger](../../qa/calora-qa-coverage-ledger.json)

## 5. Status

| Scope | Status |
|---|---|
| S20 Level 1 physical baseline | PASS by owner evidence |
| S20 smoke launch | PASS by owner evidence |
| Windows regression contracts | Prepared and protected-main validated; final execution belongs on Windows |
| S21 discovery/certification | BLOCKED until physically connected and authorized |
| Level 2 feature flows | Prepared; physical execution required per feature |
| Level 3 full certification | NOT RUN; requires repeated physical functional/visual/reliability sessions |
| Camera/scan checks | BLOCKED without physical camera session |
| Network interruption recovery | BLOCKED without isolated controllable environment |
| Native release-candidate certification | NOT RUN; no native build was authorized |

## 6. Safety and boundaries

No native build, installation, deployment, reset, data deletion, production configuration change, or customer-account testing was performed. A USB-connected personal phone is not made a CI dependency. Raw serials and raw device logs must remain on the owner’s Windows machine.

## 7. Final verdict

**QA infrastructure continuation: PASS for deliverables and protected integration.**

**Commercial Android release certification: NOT CERTIFIED.** The remaining work is physical feature, visual, lifecycle, and reliability execution, plus optional S21 certification. The toolkit and evidence vocabulary are ready for those sessions.

## 8. One-command owner workflow

For the already verified S20 smoke baseline:

```powershell
cd <Calora checkout>\tools\windows; git pull --ff-only origin main; .\Test-Invoke-CaloraAndroidQa.ps1; .\Invoke-CaloraQa.ps1 -Level QuickSmoke -Serial "<S20 serial>" -DeviceRole CALORA_PRIMARY_ANDROID -AllowLaunch -OutputRoot C:\CaloraEvidence
```

For a specific feature flow on a disposable approved device:

```powershell
.\Invoke-CaloraQa.ps1 -Level FeatureRegression -Feature meal-images -Serial "<exact serial>" -DeviceRole CALORA_PRIMARY_ANDROID -RunMaestro -OutputRoot C:\CaloraEvidence
```
