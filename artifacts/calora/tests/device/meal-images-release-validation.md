# Meal-image release validation record

**Validation date:** 2026-08-31  
**Flow:** `tests/device/meal-images.yaml`  
**Application ID:** `com.etiendem.caloraapp`  
**Overall result:** **BLOCKED — native device run pending**

## Selected targets

| Platform | Device ID | Result |
| --- | --- | --- |
| iOS | Not available in this workspace | Not run |
| Android | Not available in this workspace | Not run |

No booted native targets were discoverable. `maestro devices` could not be
run because the Maestro binary is not installed, and neither `adb` nor
`xcrun` is available in the workspace.

## Attempts

The prescribed flow command was attempted once for the intended iOS run and
once for the intended Android run from `artifacts/calora`:

```text
pnpm test:device:meal-images
```

Both attempts exited with status 1 before starting the flow:

```text
sh: 1: maestro: not found
```

The dual-platform release gate was also attempted without fabricated target
IDs. It exited with status 1 as expected because
`CALORA_IOS_DEVICE` and `CALORA_ANDROID_DEVICE` were not set.

## Native assertions

The following checks remain **unverified** until the flow runs on one selected
booted target per platform:

- fallback badge
- mismatch badge
- full fallback accessibility label
- audit status text

## Required completion

Install Maestro, install the signed Calora build with application ID
`com.etiendem.caloraapp` on one selected booted iOS target and one selected
booted Android target, then record the exact IDs and run:

```sh
CALORA_IOS_DEVICE="<exact iOS ID>" \
CALORA_ANDROID_DEVICE="<exact Android ID>" \
  pnpm test:release:meal-images
```

Replace the pending target rows and assertion status above with the observed
native results.