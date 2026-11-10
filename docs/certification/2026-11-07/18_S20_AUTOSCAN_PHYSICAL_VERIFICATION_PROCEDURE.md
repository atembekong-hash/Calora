# Samsung Galaxy S20 Auto Scan Verification Procedure

**Target device:** Samsung Galaxy S20 (`SM-G981U`)  
**Execution owner:** authorized Windows workstation operator  
**Scope:** Auto Scan camera recovery only  
**Native build rule:** this procedure does not authorize creating, submitting, or distributing a native build.

## Evidence prerequisites

Use an already installed Calora APK that contains PR #394's source commit, or stop and record **BUILD_REQUIRED**. Confirm the installed version/source identity from the owner’s release evidence before treating the result as evidence for this remediation. Do not use production credentials in logs or screenshots.

Required environment checks:

- Windows PowerShell 5.1.
- ADB sees exactly the intended S20 serial.
- Camera permission is granted for Calora.
- The app account is an authorized QA account with no customer data.
- Screen recording/screenshot output is written to a new evidence directory.

## Test sequence

1. Launch Calora and open **Today → Auto Scan**. Capture the initial screen showing the camera preview and the scan mode.
2. Confirm the preview reaches the ready state within the product’s normal startup window. Record the timestamp; do not interpret a static “Starting camera preview…” screen as PASS.
3. Put Calora in the background for at least five seconds, then return to it. Confirm the preview remounts and becomes ready without force-stopping, reinstalling, clearing data, or changing permissions.
4. Repeat the background/foreground transition once while the screen is in Auto mode and once while Barcode mode is selected. Confirm the selected mode and capture safety state remain intact.
5. To exercise the bounded failure path, use only a reversible QA condition approved by the owner (for example, temporarily deny camera access through Android settings, then restore it). Confirm the screen presents a recoverable error with **Retry** and **Settings**, rather than an indefinite spinner.
6. Tap **Retry** after restoring permission. Confirm the preview remounts and returns to the ready state.
7. Capture screenshots of the ready state, the recoverable error state, and the successful retry. Collect redacted logcat and the exact app/version identity.

## PASS criteria

- Preview becomes ready on initial entry.
- Returning from background remounts/restarts the preview and does not leave a stale camera state.
- Timeout/error is bounded and actionable.
- Retry recovers after the reversible permission condition is restored.
- No unrelated data, authentication, barcode, or analysis behavior changes.

## BLOCKED/FAIL criteria

- **BUILD_REQUIRED:** installed artifact does not contain the remediation commit or source identity cannot be established.
- **BLOCKED:** device, permission, account, or camera hardware prevents execution.
- **FAIL:** preview remains indefinitely stuck, retry does not recover, or any destructive operation is required.

## Evidence record

Record device model/serial in the owner’s private evidence directory only, plus timestamps, screenshots, app version/source SHA, test outcomes, and redacted logs. Do not paste raw serials, tokens, or account identifiers into the repository or chat.
