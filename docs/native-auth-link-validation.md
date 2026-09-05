# Native authentication-link validation

**Scope:** Calora sign-in, email verification, and password recovery  
**Canonical callback:** `https://calorie-coach-pie35449.replit.app/auth/callback`  
**Native identifiers:** `com.etiendem.caloraapp` / `com.etiendem.caloraapp`  
**Status:** Source validation, production association publishing, and Supabase
Auth redirect cleanup complete. Native-device execution was attempted on
2026-09-05 but is **BLOCKED** in this workspace because neither an iOS
simulator host nor an Android device/emulator is available. This is not a
native release pass.

## What is shipped in source

- `artifacts/calora/lib/auth.ts` sends Google OAuth, email verification,
  resend, and password-reset redirects to the HTTPS callback.
- `artifacts/calora/app.json` keeps `caloraapp` for referral deep links, while
  adding a verified Android HTTPS intent filter for `/auth/callback`.
- `artifacts/api-server/src/routes/universal-links.ts` and the live association
  contract claim `/auth/callback` for the iOS bundle. The production API was
  redeployed and the Apple association CDN now serves the updated contract.
- `handleOAuthCallbackUrl()` accepts only the exact HTTPS origin and path. A
  `caloraapp://auth/callback` link, an attacker origin, a different path, or
  credentials on any of those URLs is rejected before Supabase is called.

The legacy custom scheme remains available for invite links. It is not an
authentication transport.

## Evidence matrix

| Check | Result | Evidence / remaining gate |
|---|---|---|
| Expo native config resolves | **PASS** | `expo config --json` shows the production host, iOS associated domain, and Android `/auth/callback` filter. |
| Callback parser fail-closed behavior | **PASS** | Unit coverage accepts the canonical HTTPS callback and rejects the old custom-scheme callback before `exchangeCodeForSession` or `setSession`. |
| Association response source | **PASS** | API tests cover the `/auth/callback` AASA component. |
| Production association response | **PASS** | Production `/api/version` reports commit `dc195ae7eed9af9d6103f346c94d8b64af9bc2bf` and source tree `c49a8254e30c0dea37528fa2009ce2428c761c96`; live AASA returns the `B5344GJRMT.com.etiendem.caloraapp` app ID with both `/invite/*` and `/auth/callback`. |
| Apple association checker | **PASS** | Apple’s association CDN returns HTTP 200 for the production host and includes the expected Calora app ID and `/auth/callback` component. |
| Google Digital Asset Links checker | **PASS** | Google’s `statements:list` response returns `delegate_permission/common.handle_all_urls` for `com.etiendem.caloraapp` with the published SHA-256 certificate fingerprint. |
| Android package and fingerprint alignment | **PASS** | Live asset links publish package `com.etiendem.caloraapp`; its certificate fingerprint matches the configured signing fingerprint and the Android native package identifier. |
| Supabase redirect allow-list | **PASS** | Supabase Management API readback contains only `https://calorie-coach-pie35449.replit.app/auth/callback`. A disposable generated recovery link preserved the canonical callback, while `caloraapp://auth/callback` and an unrelated HTTPS URL fell back to the configured Site URL. The initial Google authorize endpoint returns a handoff `302` even for unlisted `redirect_to` values, so that status alone is not a final redirect-allow-list assertion. |
| Disposable iOS build and three live auth flows | **BLOCKED** | Attempted on 2026-09-05. `xcrun simctl list devices booted` cannot run because `xcrun` is not installed; no signed IPA or simulator/device was available. Google sign-in, email verification, password recovery, cold launch, force-quit callback, and competing-app cases remain unexecuted. |
| Disposable Android build and three live auth flows | **BLOCKED** | Attempted on 2026-09-05. `adb devices` cannot run because `adb` is not installed; Maestro confirms zero connected devices. No signed APK or emulator/device was available. Google sign-in, email verification, password recovery, cold launch, force-quit callback, and competing-app cases remain unexecuted. |

## Competing-app / custom-scheme test

Run this on a disposable build and test account before release. Do not use a
real user's credentials.

### iOS

1. Install the Calora build and verify the app's associated domain is present
   in the signed entitlements.
2. Install a test competitor that claims `caloraapp` only. Tap a legacy
   `caloraapp://auth/callback?...` URL. It must not create a session in Calora;
   the parser must show the untrusted-callback error if Calora receives it.
   A chooser or competitor launch is the expected residual of retaining that
   scheme for invite compatibility.
3. Tap a fresh Google, verification, and recovery email link containing the
   HTTPS callback. Only Calora should receive it while installed.
4. Uninstall Calora and tap the same HTTPS link. It must remain in the browser
   or show the safe web fallback; it must not silently open the competitor.
5. Reinstall Calora, force-quit it, and repeat the callback from a cold launch.

### Android

1. Install the Calora APK and confirm
   `adb shell pm get-app-links com.etiendem.caloraapp` reports the production
   host as verified.
2. Install a test competitor claiming `caloraapp` only. Repeat the legacy
   custom-scheme test; no session may be created from that path.
3. Tap fresh Google, verification, and recovery links from Gmail/Chrome.
   `https://.../auth/callback` must resolve to Calora without a chooser.
4. Run `adb shell am start -W -a android.intent.action.VIEW -d
   'https://calorie-coach-pie35449.replit.app/auth/callback?code=invalid'`.
   The app may show a controlled invalid/expired-code state, but must not
   accept a malformed or foreign callback.
5. Disable/uninstall Calora and repeat the HTTPS tap. The competitor must not
   receive it; Android should use the browser or a normal chooser.

## Legacy-link policy and residual

Old email messages that still contain `caloraapp://auth/callback` are
intentionally fail-closed after this migration. Ask the user to request a new
verification or recovery message; never re-enable token acceptance on the
claimable scheme. Supabase now retains only the canonical HTTPS callback in
the Auth allow-list; legacy and unrelated recovery links fall back to the
configured Site URL.

Until a signed build is installed and exercised on each platform, production
association files and the cleaned Supabase allow-list prove the server-side
contract but cannot prove OS handoff or provider delivery on a real device.

## 2026-09-05 disposable-matrix run record

This run deliberately did not create a disposable Auth account. Without a
signed native build, an iOS/Android target, and an inbox capable of receiving
the provider messages, creating an account would leave an untestable
provider-side artifact rather than produce evidence for this gate.

### Checks that ran successfully

All commands below were run from `artifacts/calora` unless noted otherwise:

```sh
pnpm exec expo config --json
# PASS — iOS associatedDomains contains
# applinks:calorie-coach-pie35449.replit.app
# Android contains an autoVerify HTTPS filter for /auth/callback
# package/bundle ID: com.etiendem.caloraapp
# legacy scheme: caloraapp

CI=1 pnpm exec expo install --check
# PASS — Dependencies are up to date

pnpm dlx expo-doctor@latest
# PASS — 18/18 checks passed. No issues detected!

pnpm run typecheck
# PASS

pnpm test
# PASS — 77 test files, 1,146 Vitest tests
# PASS — server security suite: 6 tests, 0 failures
```

Production association checks also ran on 2026-09-05:

```sh
curl -sS https://calorie-coach-pie35449.replit.app/.well-known/apple-app-site-association
# PASS — app ID B5344GJRMT.com.etiendem.caloraapp claims /auth/callback

curl -sS https://calorie-coach-pie35449.replit.app/.well-known/assetlinks.json
# PASS — package com.etiendem.caloraapp and the configured SHA-256
# certificate fingerprint are published

curl -sS 'https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https%3A%2F%2Fcalorie-coach-pie35449.replit.app&relation=delegate_permission%2Fcommon.handle_all_urls'
# PASS — Google returns handle_all_urls for com.etiendem.caloraapp

curl -sS https://app-site-association.cdn-apple.com/a/v1/calorie-coach-pie35449.replit.app
# PASS — Apple CDN returns HTTP 200 with the same Calora app ID and
# /auth/callback component
```

### Native execution blockers

```sh
adb devices
# BLOCKED — adb: command not found (exit 127)

xcrun simctl list devices booted
# BLOCKED — xcrun: command not found (exit 127)

MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  maestro test tests/device/nutrition-goals.yaml
# BLOCKED — “Not enough devices connected (1) to run the requested number of
# shards (1).” (exit 1)
```

The Expo project does have `development-device` and internal APK profiles in
`artifacts/calora/eas.json`, but this workspace has no signed native output
and the supported Expo workflow does not expose a device target here. Direct
EAS CLI invocation was not used. The existing
`artifacts/calora/static-build/{ios,android}/manifest.json` files are Expo
update manifests, not installable native binaries; they were generated before
the current Android `/auth/callback` intent filter and must not be used as
evidence for this matrix.

### Required completion run on a native host

The following is the exact remaining matrix. Use a disposable account and
disposable targets only; do not use a personal production install.

| Platform | Google sign-in | Email verification | Password recovery | Cold launch + force-quit HTTPS callback | `caloraapp`-only competitor |
|---|---|---|---|---|---|
| iOS | **PENDING** | **PENDING** | **PENDING** | **PENDING** | **PENDING** |
| Android | **PENDING** | **PENDING** | **PENDING** | **PENDING** | **PENDING** |

On the native host, install a newly built binary containing the current
`app.json`, then capture the exact device IDs and run the platform-specific
steps above. For Android, the first preflight must be:

```sh
adb devices
adb shell pm get-app-links com.etiendem.caloraapp
```

It must report the production host as verified before testing the three live
email/provider flows. For iOS, verify the signed entitlements contain
`applinks:calorie-coach-pie35449.replit.app`. Repeat each callback with the
app running, force-quit, and cold-launched. Install a competitor that claims
only `caloraapp`, verify that a legacy custom-scheme callback never creates a
Calora session, then uninstall/disable Calora and verify the HTTPS callback
falls back to the browser rather than opening the competitor. Replace the
`PENDING` cells with dated PASS/FAIL results and attach the build/device
identifiers before release.
