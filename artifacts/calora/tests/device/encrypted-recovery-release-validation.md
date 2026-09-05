# Encrypted-recovery release validation record

**Validation date:** 2026-09-05
**Flow:** `tests/device/encrypted-recovery.yaml`  
**Application ID:** `com.etiendem.caloraapp`  
**Maestro:** 1.40.0 (installed as a workspace Nix dependency)
**Overall result:** **BLOCKED — no native targets or signed build available**

## Selected targets

| Platform | Device ID | Result |
| --- | --- | --- |
| iOS | None — no booted iOS target exists in this Linux workspace | Not run |
| Android | None — no booted Android target exists in this Linux workspace | Not run |

No exact device ID can be recorded without fabricating native-device
evidence. This workspace is Linux and has neither the iOS simulator toolchain
nor the Android SDK/emulator. No signed Calora APK, AAB, or IPA is present to
install.

## Attempts and observed host results

The following checks were run on 2026-09-05:

1. Maestro is available:

   ```text
   maestro --version
   1.40.0
   ```

2. The required native device-list commands are unavailable on this host:

   ```text
   xcrun simctl list devices booted
   .../bash: xcrun: command not found
   exit status: 127

   adb devices
   .../bash: adb: command not found
   exit status: 127
   ```

   Consequently, there are no approved values for
   `CALORA_IOS_DEVICE` or `CALORA_ANDROID_DEVICE`.

3. The exact release gate was attempted from `artifacts/calora` without
   inventing target IDs:

   ```text
   CALORA_IOS_DEVICE= CALORA_ANDROID_DEVICE= pnpm test:release:encrypted-recovery
   Missing required target selection: CALORA_IOS_DEVICE, CALORA_ANDROID_DEVICE
   Encrypted-recovery release gate needs one booted target per platform.
   exit status: 1
   ```

   The gate stopped before Maestro started either platform flow. This is an
   environment blocker, not a native assertion failure.

4. A workspace artifact search found no signed `.apk`, `.aab`, or `.ipa` to
   install. The release build requirement therefore could not be satisfied
   before the device gate.

## Native assertions

All native assertions remain **unverified** because neither platform run could
start:

- `Legacy migration passed`
- `Tamper recovery passed`
- `Encrypted envelope export passed`
- `Account switching passed`
- `Clear-all isolation passed`
- `NATIVE ENCRYPTED RECOVERY SMOKE PASSED`
- negative assertion: `Encrypted recovery failed:`

No platform-specific assertion failure, timing issue, or wording issue was
observed; the flow did not reach the app on either target.

## Required external completion

On a macOS host with a signed Calora build installed under application ID
`com.etiendem.caloraapp` on one disposable iOS target and one disposable
Android target, obtain the exact IDs and run:

```sh
xcrun simctl list devices booted
adb devices

CALORA_IOS_DEVICE="<exact booted iOS device ID>" \
CALORA_ANDROID_DEVICE="<exact booted Android device ID>" \
  pnpm test:release:encrypted-recovery
```

Replace the pending target rows and assertion status above with the exact
device IDs and observed native results. The sign-off cannot be marked passed
from this workspace without that external device evidence.

## Final disposition for this workspace

The native encrypted-recovery sign-off remains **BLOCKED**:

- `xcrun simctl list devices booted` is unavailable on this Linux host.
- `adb devices` is unavailable on this host.
- No signed `.apk`, `.aab`, or `.ipa` is present to install.
- The release gate exits before Maestro when either exact target ID is absent.

Accordingly, the target IDs and all migration, tamper-recovery, encrypted
export, account-isolation, and clear-all assertions remain unverified. This
record is an explicit environment blocker, not a native encrypted-recovery
sign-off.
