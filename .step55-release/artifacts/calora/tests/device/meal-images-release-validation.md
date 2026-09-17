# Meal-image release validation record

**Validation date:** 2026-09-01
**Flow:** `tests/device/meal-images.yaml`  
**Application ID:** `com.etiendem.caloraapp`  
**Maestro:** 1.40.0 (installed as a workspace Nix dependency)
**Overall result:** **BLOCKED — no native targets or signed build available**

## Selected targets

| Platform | Device ID | Result |
| --- | --- | --- |
| iOS | None — no booted iOS target exists in this Linux workspace | Not run |
| Android | None — no booted Android target exists in this Linux workspace | Not run |

No exact device ID can be recorded without fabricating native-device
evidence. The workspace is Linux and has no iOS simulator toolchain or Android
SDK/emulator. No signed Calora APK or IPA is present to install. The release
readiness report also records that manual EAS CLI builds are prohibited in this
environment and that no signed Android APK or iOS build was triggered.

## Attempts and observed host results

The following checks were run on 2026-08-31:

1. Maestro was provisioned successfully:

   ```text
   maestro --version
   1.40.0
   ```

2. The previously documented device-list command is not supported by Maestro
   1.40:

   ```text
   maestro devices
   Unmatched argument at index 0: 'devices'
   ```

   Device IDs must instead be selected with `xcrun simctl list devices booted`
   on the iOS host and `adb devices` on the Android host.

3. Maestro could not create local targets:

   ```text
   maestro start-device --platform android --os-version 33
   Could not detect Android home environment variable is not set.

   maestro start-device --platform ios --os-version 17
   Cannot run program "xcrun": No such file or directory
   ```

   The host also has no `adb`, `xcrun`, `emulator`, or `avdmanager` binary.

4. The prescribed meal-image flow was attempted once after Maestro
   provisioning, from `artifacts/calora`:

   ```text
   pnpm test:device:meal-images
   Want to use 0 devices, which is not enough to run 1 shards.
   Not enough devices connected (1) to run the requested number of shards (1).
   ```

   It exited with status 1 before starting the flow. The earlier pre-
   provisioning attempts are retained in the prior validation history; they
   exited before starting because `maestro` was not on PATH.

5. The dual-platform release gate was attempted without target IDs:

   ```text
   pnpm test:release:meal-images
   Missing required target selection: CALORA_IOS_DEVICE, CALORA_ANDROID_DEVICE
   ```

   It exited with status 1 before running either platform. No target IDs were
   supplied to force or simulate a native run.

6. Final signed-target preflight recheck on 2026-08-31:

   ```text
   Host: Linux x86_64
   xcrun simctl list devices booted
   /bin/bash: xcrun: command not found
   exit status: 127

   adb devices
   /bin/bash: adb: command not found
   exit status: 127

   Signed artifact search: no .apk, .aab, or .ipa found in the workspace

   CALORA_IOS_DEVICE= CALORA_ANDROID_DEVICE= pnpm test:release:meal-images
   Missing required target selection: CALORA_IOS_DEVICE, CALORA_ANDROID_DEVICE
   exit status: 1
   ```

   This final recheck confirms that no approved target IDs or signed builds are
   available in this workspace. The iOS and Android flows therefore remain
   unstarted rather than failed.

7. Current signed-target preflight recheck on 2026-09-01:

   ```text
   Host: Linux 6.18.48 x86_64

   xcrun simctl list devices booted
   /bin/bash: xcrun: command not found
   exit status: 127

   adb devices
   /bin/bash: adb: command not found
   exit status: 127

   Signed artifact search: no .apk, .aab, or .ipa found in the workspace

   CALORA_IOS_DEVICE= CALORA_ANDROID_DEVICE= pnpm test:release:meal-images
   Missing required target selection: CALORA_IOS_DEVICE, CALORA_ANDROID_DEVICE
   Meal-image release gate needs one booted target per platform.
   exit status: 1
   ```

   Maestro remains available at version 1.40.0, but there are no native
   platform tools or booted targets for it to use. The release gate therefore
   stopped before either platform flow started.

## Native assertions

The following native checks remain **unverified** because neither platform run
could start:

- fallback badge
- mismatch badge
- full fallback accessibility label
- audit status text

No platform-specific wording or timing issue was observed; the flow did not
reach the app.

The complete expected fallback and mismatch evidence remains defined by the
flow but is not observed on this host:

- Breakfast fallback badge: `Fallback image`
- Lunch mismatch badge: `Image mismatch · fallback`
- Breakfast full fallback accessibility label: `Overnight oats with berries meal image is using the fallback image. Fallback image active`
- Lunch full mismatch accessibility label: `Chicken harvest salad meal image is using the fallback image. Swapped image detected · expected harvest-salad · received berry-oats · fallback image active`
- Audit status text: `Fallback image active` and `Swapped image detected · expected harvest-salad · received berry-oats · fallback image active`

## Required external completion

On a macOS host with the signed Calora build installed under application ID
`com.etiendem.caloraapp`, select one booted iOS target and one booted Android
target, then run:

```sh
CALORA_IOS_DEVICE="<exact booted iOS device ID>" \
CALORA_ANDROID_DEVICE="<exact booted Android device ID>" \
  pnpm test:release:meal-images
```

Replace the pending target rows and assertion status above with the exact
device IDs and observed native results. The sign-off cannot be marked passed
from this workspace without that external device evidence.

## Final disposition for this workspace

The native sign-off remains **BLOCKED**. Continuing without a native-capable
host does not provide a valid substitute for device evidence:

- `xcrun simctl list devices booted` is unavailable on this Linux host.
- `adb devices` is unavailable on this host.
- No signed `.apk`, `.aab`, or `.ipa` is present to install.
- The release gate exits before Maestro when either exact target ID is absent.

Accordingly, the selected target IDs remain unrecorded, the fallback and
mismatch badges and accessibility labels remain unverified, and no
platform-specific timing or wording is claimed. This record is an explicit
environment blocker, not a native meal-image sign-off.