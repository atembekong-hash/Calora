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
   | `/invite` | Fallback landing page (no code — omits badge, skips deep-link) |
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

## Automated tests

`artifacts/api-server/src/__tests__/universal-links.test.ts` covers:

- `GET /invite/TESTCODE` → 200 HTML with code badge, App Store button, Google
  Play button, and `caloraapp://invite/TESTCODE` deep-link anchor.
- `GET /invite` (no code segment) → 200 HTML without the code badge; the
  inline JS early-returns so no `window.location` assignment fires.
- Code sanitisation — non-alphanumeric characters are stripped before the
  code appears in the page or the JS variable.
- App Store URL uses a direct `/app/id<APPLE_APP_STORE_ID>` link when the env
  var is set; falls back to search when it is absent.
- `/.well-known/apple-app-site-association` → 503 when `APPLE_TEAM_ID` unset,
  200 with correct `applinks` JSON (covering `/invite/*`) when set.
- `/.well-known/assetlinks.json` → 503 when fingerprint unset, 200 with
  correct package + fingerprint array (including comma-separated multi-key).

Run locally with:

```
pnpm --filter @workspace/api-server test
```

## Verifying live behaviour

### Browser / no-app path (primary concern for this route)

1. Open `https://mycaloraapp.com/invite/TESTCODE` in a **desktop** browser.
   - Expected: landing card with the 🥗 logo, "TESTCODE" badge, "Open in
     Calora" button, and App Store / Google Play buttons.
   - No JS errors in the browser console (desktop UA skips the deep-link
     attempt).

2. Open the same URL on a **mobile browser** (iOS Safari or Android Chrome)
   on a device **without** the app.
   - Expected: same card, plus the browser may briefly switch to the
     `caloraapp://` scheme (harmlessly fails) before settling on the landing
     page.  Store buttons are the manual fallback.

3. Visit `https://mycaloraapp.com/invite` (no code).
   - Expected: the same card without a code badge; no JS errors.

### Deep-link path (device with app installed)

Tap `https://mycaloraapp.com/invite/TESTCODE` from Notes or Gmail on a device
with the app installed — the OS should hand off to the app's
`app/invite/[code].tsx` screen.

### Universal-link verification files

- iOS: after installing a build with associated domains, run
  `swcutil dl -d mycaloraapp.com` on macOS, or test with
  `https://app-site-association.cdn-apple.com/a/v1/mycaloraapp.com`.
  Apple caches AASA via its CDN; changes can take up to ~24 h to propagate.
- Android: `adb shell pm get-app-links com.etiendem.caloraapp` should show
  `mycaloraapp.com: verified`. Google's checker:
  `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://mycaloraapp.com&relation=delegate_permission/common.handle_all_urls`

## Fallback for users without the app

`GET /invite/<code>` renders an HTML landing page that:

1. Shows App Store and Play Store download buttons.
2. On mobile, attempts `caloraapp://invite/<code>` via a short JS delay —
   the OS will hand off to the app if installed, and silently fail otherwise.
3. If `code` is absent or reduces to an empty string after sanitisation, the
   badge is omitted and the deep-link JS early-returns safely.
