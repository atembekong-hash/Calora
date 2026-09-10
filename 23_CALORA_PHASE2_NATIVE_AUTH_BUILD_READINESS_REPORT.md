# Calora Phase 2 Native Authentication and Deep-Link Build Readiness

**Date:** 2026-09-09  
**Scope:** Native authentication and deep-link certification preparation  
**Verdict:** **BLOCKED**

## Executive summary

The repository-side native authentication configuration is internally consistent
and the branded production association endpoints pass their read-only checks.
The native callback matrix is prepared for exact iOS and Android execution, but
no signed binary or exact native target is available in this workspace.

The read-only iOS signing preflight also reports an external EAS blocker:
**no App Store iOS build credentials are assigned to the app**. No EAS build,
production deployment, provider mutation, or GitHub release-protection change
was performed during this phase.

The correct next gate is to repair the EAS iOS credential assignment, produce
new signed binaries from the reviewed identity, and execute the matrix on exact
native targets. The current blocked result must not be interpreted as a native
provider or operating-system failure.

## Reviewed native identity

| Field | Required value | Result |
|---|---|---|
| App name | `Calora` | PASS |
| Expo scheme | `caloraapp` | PASS; retained for invite/deep-link compatibility only |
| Canonical auth callback | `https://mycaloraapp.com/auth/callback` | PASS |
| Callback path | `/auth/callback` | PASS |
| iOS bundle identifier | `com.etiendem.caloraapp` | PASS |
| iOS associated domain | `applinks:mycaloraapp.com` | PASS |
| Android package | `com.etiendem.caloraapp` | PASS |
| Android callback host | `mycaloraapp.com` | PASS |
| Android callback path | exact `/auth/callback` | PASS |
| Expo project ID | `1f202325-5b9a-4260-978f-abbd3252b9ee` | PASS |
| iOS build number | `1` | Reviewed; requires signed-artifact confirmation |
| Android version code | `24` | Reviewed; requires signed-artifact confirmation |

The legacy `caloraapp` scheme is not accepted as an authentication callback.
The Android intent filter is exact-path rather than a broad `pathPrefix`.

## Native callback matrix

The preflight generated 26 records: the following 13 cases on each platform.
Every record is currently `not-run` because the signed binary and target gates
are unavailable.

| Case | iOS | Android |
|---|---|---|
| `google-sign-in-warm-app` | NOT RUN | NOT RUN |
| `google-sign-in-cold-launch` | NOT RUN | NOT RUN |
| `email-verification-warm-app` | NOT RUN | NOT RUN |
| `email-verification-cold-launch` | NOT RUN | NOT RUN |
| `password-recovery-warm-app` | NOT RUN | NOT RUN |
| `password-recovery-cold-launch` | NOT RUN | NOT RUN |
| `force-quit-https-callback-relaunch` | NOT RUN | NOT RUN |
| `duplicate-browser-router-delivery` | NOT RUN | NOT RUN |
| `foreign-origin-rejected` | NOT RUN | NOT RUN |
| `legacy-caloraapp-auth-rejected` | NOT RUN | NOT RUN |
| `sign-out-clears-session` | NOT RUN | NOT RUN |
| `account-switch-clears-replay` | NOT RUN | NOT RUN |
| `relaunch-restores-current-session` | NOT RUN | NOT RUN |

The sanitized preflight evidence reported:

- Result: `blocked`
- Failure classes: `binary_unavailable`, `target_unavailable`
- iOS binary: not provided
- Android binary: not provided
- iOS target: not provided
- Android target: not provided
- Callback records: 26
- Callback records with observed failures: 0

No callback case was marked as a native failure.

## Authentication and routing controls reviewed

- `lib/auth.ts` enforces the exact HTTPS origin, hostname, path, port, and
  credential rejection for callback URLs.
- Supabase PKCE exchanges coalesce duplicate browser/router deliveries and keep
  bounded settled replay state.
- Foreign origins and legacy custom-scheme auth callbacks fail closed.
- Account switching clears replay state and session-scoped data.
- The callback route reconstructs Android parameters, routes recovery to the
  reset-password flow, and has a bounded timeout.
- Auth state restoration is authoritative through Supabase auth events.
- Local sign-out clears the local session without depending on a remote sign-out
  mutation.

## EAS profiles reviewed

The reviewed profiles are:

- `development`
- `development-device`
- `preview`
- `production`
- `production-apk`

The native matrix needs a newly signed iOS binary and a newly signed Android
APK whose identity matches the values above. The existing Expo update manifests
are not installable native binaries and were not used as evidence.

## External requirements and blockers

### Blocking

1. **EAS iOS signing credentials:** the read-only signing preflight returned
   `EAS_RECORD` with no App Store iOS build credentials assigned to
   `com.etiendem.caloraapp`.
2. **Signed artifacts:** a new installable iOS binary and Android APK are
   required. Neither is present in the workspace.
3. **Exact targets:** an exact booted iOS simulator/device and exact connected
   Android emulator/device are required. Neither is present.
4. **Native execution tools:** the current workspace cannot provide the native
   host/device evidence needed to certify the 26 cases.

### Manual dashboard/provider confirmation still required

Before signed-build certification, an owner must read back the Supabase Auth
configuration and confirm:

- `https://mycaloraapp.com/auth/callback` is in the redirect allow-list.
- Google provider configuration uses the project’s current Supabase callback
  contract and does not authorize the legacy `caloraapp` scheme.
- Email confirmation and password recovery redirects return to the canonical
  branded callback.

The repository and live association monitor do not substitute for this
dashboard readback.

### Already verified

- The branded Apple association endpoint and Apple CDN evidence contain the
  signed iOS app identity and exact `/auth/callback`.
- The branded Android association endpoint and Google Digital Asset Links
  evidence contain the signed Android package and configured fingerprint.
- Provider freshness policy passed with the configured default warning
  threshold.

## Validation results

| Validation | Result |
|---|---|
| Workspace typecheck | PASS |
| API-server typecheck | PASS |
| Calora typecheck | PASS |
| Full Calora suite | PASS — 88 files, 1,224 tests |
| Calora server security checks | PASS — 6 checks |
| Focused auth logic and sign-out tests | PASS — 14 tests |
| Native auth preflight unit tests | PASS — 7 tests |
| Association monitor tests | PASS — 13 tests |
| Expo resolved configuration validation | PASS |
| OpenAPI code generation | PASS |
| Generated-file drift check | PASS — no generated output drift |
| `git diff --check` | PASS |
| Live branded association monitor | PASS — Apple and Google evidence |
| iOS signing preflight | BLOCKED — missing EAS App Store credentials |
| Native auth execution preflight | BLOCKED — no binaries or targets |

## Release-facing documentation alignment

Current release-facing authentication and product metadata now use
`mycaloraapp.com` for the public origin, legal/support routes, association
files, API mount, and canonical auth callback. Historical reports may retain
the retired Replit-hosted origin as historical evidence; those references are
not current runtime configuration.

## Required exit criteria

This report can change to `READY FOR SIGNED BUILDS` only after the EAS iOS
credential blocker is repaired and the build inputs are otherwise approved.
The final native release gate still requires:

1. Signed iOS and Android artifacts with the exact reviewed identity.
2. Signed iOS entitlements containing `applinks:mycaloraapp.com`.
3. Android App Links reporting `mycaloraapp.com` as verified for the exact
   package and signing certificate.
4. All 26 callback records populated with observed evidence rather than
   `not-run`.
5. Duplicate delivery, foreign-origin rejection, legacy-scheme rejection,
   sign-out, account switching, and relaunch restoration all explicitly
   observed.
6. Supabase redirect/provider settings read back and confirmed manually.
7. Sanitized evidence attached without tokens, credentials, callback contents,
   or raw command output.