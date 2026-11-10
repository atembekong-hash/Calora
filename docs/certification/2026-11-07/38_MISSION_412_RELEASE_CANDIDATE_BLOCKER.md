# Mission 412 — Android APK and iOS TestFlight Release Candidates

**Assessment date:** 2026-11-08
**Mission authorization:** One signed Android `production-apk` build and one signed iOS `production` build with internal TestFlight upload. No public store submission, Google Play upload, Railway deployment, database change, or native build outside this mission was authorized.
**Verdict:** **BLOCKED — external App Store Connect credential and release-source decision required**

## Executive result

No native build or TestFlight upload was started. The mandatory preflight found two independent release-safety blockers:

1. The latest protected main is `31ebd95eafdedc1377a34d6b30bdce4c02ad6bb9`, and PR #394 is an ancestor of that commit. The currently deployed Railway release branch is `eefba459c190605a63eb9db874556ddf9bebb5c6`, which does **not** contain PR #394. Building from the release branch would produce an obsolete candidate. Building from protected main is the only source choice that includes the approved PR #394 repairs, but it must be explicitly selected as the frozen release source because it is not the currently deployed release branch.
2. EAS authentication and Expo project access succeeded, but the App Store Connect API private key supplied through secure entry is not cryptographically parseable. The first PEM value arrived as a one-line non-parseable key. A second base64 value decoded to no valid PEM/key material. The lightweight authenticated App Store Connect test therefore could not proceed to the API request.

Mission 412 correctly stopped before spending EAS build credits.

## Source provenance

| Item | Result |
|---|---|
| Protected `main` | `31ebd95eafdedc1377a34d6b30bdce4c02ad6bb9` |
| PR #400 | Merged into main; merge commit `31ebd95eafdedc1377a34d6b30bdce4c02ad6bb9` |
| PR #394 | Merged; merge commit `ef7de6348922b83af14a5e8ad00cc648bd8b88fa` |
| PR #394 in protected main | Yes; ancestor check passed |
| Production release branch | `eefba459c190605a63eb9db874556ddf9bebb5c6` |
| PR #394 in production release branch | No; ancestor check failed |
| Recommended candidate source | Protected main `31ebd95…`, pending explicit release-source freeze |
| Dependency lockfile | Root `pnpm-lock.yaml`; SHA-256 `883ee1e0d97da7b379e181827c6983faf19e0023a17d993f6297806fd605019f` |

The source-level application differences between the deployed release branch and protected main include the PR #394 API and mobile repairs for premium authorization, camera recovery, calorie recommendations, and iOS signing fixtures. The obsolete release branch must not be used for the candidate.

## EAS preflight

EAS access was validated without starting a build:

- EAS owner: `vvault07`
- Expo project: `@vvault07/calora`
- EAS project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- `eas whoami`: authenticated
- Project API access: HTTP 200
- Credential role reported by EAS: Owner account with current credential-limited Developer access

No EAS build was submitted.

## App configuration

| Field | Value |
|---|---|
| Application version | `1.0.1` |
| Android package | `com.etiendem.caloraapp` |
| Android version code | `28` |
| Android minimum SDK | `26` |
| iOS bundle identifier | `com.etiendem.caloraapp` |
| iOS build number | `17` |
| iOS Team ID | `B5344GJRMT` |
| App Store Connect app ID | `6800321660` |
| Android profile | `production-apk` — signed internal APK |
| iOS profile | `production` — store distribution |
| EAS CLI requirement | `>=16.17.4` |
| EAS project | `1f202325-5b9a-4260-978f-abbd3252b9ee` |

Source-only preflight passed:

- Expo project authority/configuration tests: **6/6 passed**.
- Health Connect privacy prebuild contract: **1/1 passed**.
- iOS build-number, signing-preflight, and signing-evidence tests: **37/37 passed**.

These are source/configuration tests only and do not prove signed artifact readiness.

## App Store Connect credential blocker

EAS token validation succeeded. App Store Connect validation did not.

The secure credential test attempted to create a short-lived ES256 token and call:

```text
GET https://api.appstoreconnect.apple.com/v1/apps/6800321660
```

The supplied private-key values failed before the API request because OpenSSL/Node could not decode them as an EC private key:

```text
error:1E08010C:DECODER routines::unsupported
```

Non-secret format checks showed:

- First value: PEM header present, zero line breaks, non-parseable.
- Replacement base64 value: decoded payload length zero and non-parseable.

No private-key content was printed, committed, or included in this report. No App Store Connect upload was attempted.

### Required owner action

Provide a valid App Store Connect API key through secure entry:

- API key ID corresponding to the `.p8` key.
- Issuer ID for Team `B5344GJRMT`.
- Complete original `.p8` private key, preferably as a verified base64 encoding of the complete file if the secure field cannot preserve line breaks.
- Confirm the key has App Manager or equivalent upload permission for app `6800321660`.

After secure re-entry, the lightweight App Store Connect API test must pass before any iOS build or TestFlight upload.

## Android signing status

The Android build was not started because the synchronized two-platform release was blocked before build-credit expenditure. EAS account/project access is valid, but remote Android signing credential inspection was not completed: the interactive EAS credential command reached its profile-selection prompt and was stopped without changing credentials.

Before the Android build, verify the remote Android keystore through the `production-apk` profile and record signing provenance. Do not generate an AAB or submit to Google Play.

## Release-source decision required

The owner must confirm that the synchronized candidates should both be built from protected main:

```text
31ebd95eafdedc1377a34d6b30bdce4c02ad6bb9
```

That is the only inspected source containing PR #394 while also including the merged PR #400 certification corrections. The release branch currently serving Railway remains intentionally separate and must not be modified or promoted as part of Mission 412 without a separate release-branch authorization.

## Safety boundary observed

- No Android APK/AAB build started.
- No iOS IPA build started.
- No TestFlight upload started.
- No public App Store submission.
- No Google Play upload.
- No Railway deployment, restart, or source-branch change.
- No Supabase migration or customer-data operation.
- No production credential was changed.
- No unrelated PR was merged.

## Final verdict

# BLOCKED

Mission 412 cannot safely deliver synchronized Android and iOS candidates until:

1. Protected-main commit `31ebd95…` is confirmed as the frozen candidate source; and
2. A valid App Store Connect API private key is securely supplied and passes the lightweight target-app API test; and
3. Remote Android signing credentials are verified for `production-apk`.

Once those conditions pass, the authorized sequence is one Android `production-apk` build and one iOS `production` build/upload from the same frozen SHA, with no public store submission or Railway deployment.
