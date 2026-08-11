# Universal / App Links for mycaloraapp.com/invite/<code>

Invite links in the referral share message use `https://mycaloraapp.com/invite/<CODE>`.
For those links to open the app directly (instead of the browser), two pieces are needed:

1. **App configuration** — already done in `artifacts/calora/app.json`:
   - iOS: `ios.associatedDomains: ["applinks:mycaloraapp.com"]`
   - Android: `android.intentFilters` with `autoVerify: true` for `https://mycaloraapp.com/invite`
   - The route `app/invite/[code].tsx` handles the link via expo-router
     (path `/invite/<code>` maps to it automatically).
   - These take effect in the next EAS build (they are native config, not OTA-updatable).

2. **Files hosted on mycaloraapp.com** — templates in this directory:

   | Template | Must be served at | Notes |
   |---|---|---|
   | `apple-app-site-association` | `https://mycaloraapp.com/.well-known/apple-app-site-association` | `Content-Type: application/json`, **no** file extension, no redirects |
   | `assetlinks.json` | `https://mycaloraapp.com/.well-known/assetlinks.json` | `Content-Type: application/json` |

## Placeholders to fill in before hosting

- `<APPLE_TEAM_ID>` in `apple-app-site-association`: the Apple Developer Team ID
  (Apple Developer → Membership, e.g. `AB12CD34EF`). The final appID is
  `<TEAM_ID>.com.etiendem.caloraapp`.
- `<ANDROID_APP_SIGNING_SHA256_FINGERPRINT>` in `assetlinks.json`: the SHA-256
  fingerprint of the **app signing key**. For Play App Signing, copy it from
  Play Console → Setup → App signing. For an EAS-managed keystore, run
  `eas credentials -p android` and use the SHA-256 fingerprint shown.
  You can list multiple fingerprints (e.g. upload + Play signing keys).

## Verifying

- iOS: after installing a build with associated domains, run
  `swcutil dl -d mycaloraapp.com` on macOS, or test with
  `https://app-site-association.cdn-apple.com/a/v1/mycaloraapp.com`.
  Apple caches AASA via its CDN; changes can take up to ~24h to propagate.
- Android: `adb shell pm get-app-links com.etiendem.caloraapp` should show
  `mycaloraapp.com: verified`. Google's checker:
  `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://mycaloraapp.com&relation=delegate_permission/common.handle_all_urls`
- End to end: tap `https://mycaloraapp.com/invite/TESTCODE` from Notes/Gmail on a
  device with the app installed — it should open the in-app invite screen, which
  stores the code and routes to sign-up (signed out) or Profile (signed in).

## Fallback for users without the app

Whatever serves `mycaloraapp.com` should render a landing page at `/invite/<code>`
that links to the App Store / Play Store (and optionally tries
`caloraapp://invite/<code>`), since universal links only fire when the app is
installed.
