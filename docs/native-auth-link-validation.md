# Native authentication-link validation

**Scope:** Calora sign-in, email verification, and password recovery  
**Canonical callback:** `https://calorie-coach-pie35449.replit.app/auth/callback`  
**Native identifiers:** `com.etiendem.caloraapp` / `com.etiendem.caloraapp`  
**Status:** Source validation, production association publishing, and Supabase
Auth redirect cleanup complete; native-device execution remains a release gate.

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
| Disposable iOS build and three live auth flows | **NOT RUN** | This environment has no physical iOS device and the Expo guidance forbids invoking EAS CLI directly; run the `development-device`/internal native build through the supported Expo build flow. |
| Disposable Android build and three live auth flows | **NOT RUN** | Same environment limitation; run an internal APK on a clean Android device or emulator with Play Services. |

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
