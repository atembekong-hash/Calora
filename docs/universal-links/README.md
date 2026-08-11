# Universal / App Links for mycaloraapp.com/invite/<code>

Invite links in the referral share message use `https://mycaloraapp.com/invite/<CODE>`.
For those links to open the app directly (instead of the browser), two pieces are needed:

1. **App configuration** — already done in `artifacts/calora/app.json`:
   - iOS: `ios.associatedDomains: ["applinks:mycaloraapp.com"]`
   - Android: `android.intentFilters` with `autoVerify: true` for `https://mycaloraapp.com/invite`
   - The route `app/invite/[code].tsx` handles the link via expo-router
     (path `/invite/<code>` maps to it automatically).
   - These take effect in the next EAS build (they are native config, not OTA-updatable).

2. **Files hosted on mycaloraapp.com** — served dynamically by the API server
   (`artifacts/api-server/src/routes/universal-links.ts`):

   | Path | Notes |
   |---|---|
   | `/.well-known/apple-app-site-association` | `Content-Type: application/json`, no redirects |
   | `/.well-known/assetlinks.json` | `Content-Type: application/json` |
   | `/invite/<code>` | Fallback landing page with App Store / Play Store links |

   The template files in this directory (`apple-app-site-association`,
   `assetlinks.json`) are kept as reference; the live endpoint builds the
   JSON from the environment variables below.

## Required environment variables (set as Replit secrets)

| Secret | Where to find it |
|---|---|
| `APPLE_TEAM_ID` | Apple Developer → Membership (e.g. `AB12CD34EF`) |
| `ANDROID_SHA256_FINGERPRINT` | Play Console → Setup → App signing **or** `eas credentials -p android`. Comma-separate multiple fingerprints (upload key + Play signing key). |
| `APPLE_APP_STORE_ID` | App Store Connect → App Information → Apple ID (numeric, e.g. `1234567890`) |

Until these are set, the `/.well-known/` endpoints return HTTP 503; the
`/invite/<code>` page always renders (store links fall back gracefully).

## Placeholders in template files

The `docs/universal-links/` files still contain the original placeholders
for reference only — the live server reads from the env vars above:

- `<APPLE_TEAM_ID>` in `apple-app-site-association`
- `<ANDROID_APP_SIGNING_SHA256_FINGERPRINT>` in `assetlinks.json`

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

`GET /invite/<code>` renders an HTML landing page that:

1. Shows App Store and Play Store download buttons.
2. On mobile, attempts `caloraapp://invite/<code>` via a short JS delay —
   the OS will hand off to the app if installed, and silently fail otherwise.
