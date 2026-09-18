# Calora Phase 2 Pre-Build Native Authentication Reconciliation

**Date:** 2026-09-09  
**Scope:** Read-only reconciliation of external authentication/signing
configuration against the Calora repository  
**Final verdict:** **READY FOR SIGNED BUILDS**

## Executive summary

The supplied EAS/Expo, Supabase, and Google OAuth confirmations match the
repository's expected production identity and authentication callback contract.
The read-only EAS credential check now passes for the Calora App Store profile,
and all repository-side authentication, configuration, association, typecheck,
and test validations pass.

No EAS build, deployment, provider mutation, production infrastructure change,
or GitHub release-protection change was performed.

The signed-build gate is now ready to be started. The native callback matrix is
not certified yet: it still requires newly signed binaries, exact native
targets, and observed callback evidence.

## External configuration evidence supplied

The following facts were supplied as manually verified external evidence. This
report records them for reconciliation; it does not claim to have mutated or
independently changed those services.

### EAS / Expo iOS

- Bundle ID: `com.etiendem.caloraapp`
- Distribution: App Store
- iOS distribution certificate: assigned and shown as valid
- Calora-specific App Store provisioning profile: created in Apple Developer,
  uploaded to Expo, assigned to `com.etiendem.caloraapp`, and shown as valid
- Push key: intentionally not configured; not required for this authentication
  pre-build gate
- App Store Connect API key for EAS Submit: intentionally not configured; not
  required because submission is out of scope
- No build was triggered

The repository-side read-only EAS check independently returned:

- App Store distribution certificate ready
- Provisioning profile ready
- No build started

The first check exposed a repository defect: the EAS API returned provisioning
profile status `active`, while the preflight only accepted uppercase `ACTIVE`.
The preflight now normalizes the status case-insensitively, and a regression
test covers the lowercase API value. This was the only repository defect found
during reconciliation.

### Supabase production authentication

- Site URL: `https://mycaloraapp.com`
- Production redirect URL:
  `https://mycaloraapp.com/auth/callback`
- Google provider: enabled
- Email provider: enabled
- Email confirmation: enabled
- Confirm-sign-up template uses `{{ .ConfirmationURL }}`
- Reset-password template uses `{{ .ConfirmationURL }}`

### Google OAuth

- Calora Google Cloud project was inspected
- The Calora Supabase OAuth web client was confirmed
- Its authorized redirect URI matches the Supabase Google OAuth callback shown
  by Supabase
- No Google OAuth credentials were changed

## Repository configuration findings

| Contract | Repository value | Finding |
|---|---|---|
| App identity | `Calora` | PASS |
| iOS bundle ID | `com.etiendem.caloraapp` | PASS |
| Android package | `com.etiendem.caloraapp` | PASS |
| Expo scheme | `caloraapp` | PASS; retained for invite/deep-link compatibility |
| Canonical callback | `https://mycaloraapp.com/auth/callback` | PASS |
| iOS associated domain | `applinks:mycaloraapp.com` | PASS |
| Android App Link host | `mycaloraapp.com` | PASS |
| Android App Link path | exact `/auth/callback` | PASS |
| Expo Router origin | `https://mycaloraapp.com/` | PASS |
| Expo project ID | `1f202325-5b9a-4260-978f-abbd3252b9ee` | PASS |
| iOS build number | `1` | PASS; signed artifact still needs confirmation |
| Android version code | `24` | PASS; signed artifact still needs confirmation |

The Android auth intent filter uses an exact `path`, not a broad
`pathPrefix`. The invite route retains its separate `/invite` path handling.

## Authentication-flow reconciliation

### Google OAuth

`lib/auth.ts` calls Supabase OAuth with:

- Provider: `google`
- `redirectTo`: `https://mycaloraapp.com/auth/callback`
- `skipBrowserRedirect: true`
- Expo `WebBrowser.openAuthSessionAsync` using the same callback URI

The callback accepts only the canonical HTTPS origin, host, path, and port. It
rejects credentials embedded in the callback URL.

### Email verification

- Signup sends `emailRedirectTo` to the canonical callback.
- Verification resend sends `emailRedirectTo` to the canonical callback.
- The supplied Supabase confirmation template uses `{{ .ConfirmationURL }}`.
- The callback supports both PKCE code delivery and the legacy implicit token
  shape required by existing email-link compatibility tests.

### Password recovery

- Password reset requests use `redirectTo` set to the canonical callback.
- The supplied reset-password template uses `{{ .ConfirmationURL }}`.
- Supabase `PASSWORD_RECOVERY` state is tracked by `AuthContext`.
- Successful recovery callbacks route to `/auth/reset-password`.
- Normal successful callbacks route to `/(tabs)`.

### Warm/cold launch and callback routing

- The callback screen consumes the Expo linking URL when available.
- On Android, it reconstructs callback parameters from local route params
  when the intent delivery does not preserve the complete URL.
- It has a 10-second callback timeout and a duplicate-processing guard.
- The route is registered under the nested auth stack at `/auth/callback`.
- The root layout restores the persisted Supabase session before mounting
  account-scoped application providers.
- Auth state changes remain authoritative through
  `supabase.auth.onAuthStateChange`.

### Duplicate callback protection

PKCE code exchanges are protected by:

- In-flight exchange coalescing
- Bounded exchange capacity
- Settled-success replay keyed by a digest of the code
- Current-user validation before replay success
- Expiration and cleanup of replay entries
- Clearing replay state on sign-out and account changes

### Rejection and session-boundary behavior

- Foreign HTTPS origins are rejected before credentials are consumed.
- `caloraapp://auth/callback` is rejected as an authentication callback.
- Local sign-out clears the local Supabase session and settled replay state.
- Account changes clear replay state and remount account-scoped providers.
- Relaunch session restoration is covered by the native matrix and existing
  session bootstrap implementation.

## Native callback matrix status

The preflight generated 26 records: 13 cases on each platform. The current
workspace still has no signed binary or exact device target, so all records are
`not-run`. This is an execution prerequisite, not an observed authentication
failure.

| Case | iOS | Android |
|---|---|---|
| Google sign-in — warm app | NOT RUN | NOT RUN |
| Google sign-in — cold launch | NOT RUN | NOT RUN |
| Email verification — warm app | NOT RUN | NOT RUN |
| Email verification — cold launch | NOT RUN | NOT RUN |
| Password recovery — warm app | NOT RUN | NOT RUN |
| Password recovery — cold launch | NOT RUN | NOT RUN |
| Force-quit HTTPS callback relaunch | NOT RUN | NOT RUN |
| Duplicate browser/router delivery | NOT RUN | NOT RUN |
| Foreign-origin rejection | NOT RUN | NOT RUN |
| Legacy `caloraapp` auth callback rejection | NOT RUN | NOT RUN |
| Sign-out clears session | NOT RUN | NOT RUN |
| Account switch clears replay state | NOT RUN | NOT RUN |
| Relaunch restores current session | NOT RUN | NOT RUN |

The latest sanitized native preflight result was:

- Result: `blocked`
- Failure classes: `binary_unavailable`, `target_unavailable`
- Callback records: 26
- Callback records not run: 26
- Callback records with observed native failures: 0
- Identity checks: passed

## Tests and validations executed

| Validation | Result |
|---|---|
| Read-only EAS iOS signing preflight | PASS; no build started |
| iOS signing preflight unit tests | PASS — 13 tests |
| Native auth preflight unit tests | PASS — 7 tests |
| Association monitor tests | PASS — 13 tests |
| Focused auth, sign-out, and real-auth simulation | PASS — 15 tests |
| Full Calora suite | PASS — 88 files, 1,224 tests |
| Calora server security checks | PASS — 6 checks |
| Workspace typecheck | PASS |
| Calora typecheck | PASS |
| Expo resolved configuration validation | PASS |
| JavaScript syntax checks for changed preflight/monitor scripts | PASS |
| Live branded Apple association monitor | PASS |
| Live branded Google Digital Asset Links monitor | PASS |
| `git diff --check` | PASS |

The real-auth simulation intentionally receives Supabase's expected
invalid-request response when no real code/verifier pair is supplied; it
passed by confirming that the error is surfaced safely.

## Remaining signed-build and native-test prerequisites

These are the remaining execution prerequisites, not external configuration
contradictions:

1. Produce a newly signed iOS App Store artifact using the reviewed bundle ID,
   associated domain, and now-valid EAS credentials.
2. Produce a newly signed Android artifact using package
   `com.etiendem.caloraapp` and the reviewed App Link configuration.
3. Perform the Apple macOS signing rehearsal before treating Apple-side signing
   acceptance as proven. The EAS record check alone does not prove Apple has
   accepted the credentials.
4. Install the exact iOS artifact on one explicitly selected booted simulator
   or device.
5. Install the exact Android artifact on one explicitly selected connected
   emulator or device.
6. Confirm Android App Links reports `mycaloraapp.com` verified for the exact
   package and signing certificate.
7. Execute all 26 callback records with disposable accounts and targets.
8. Capture sanitized evidence containing build identity, artifact hashes,
   exact target IDs, association state, and observed callback outcomes.
9. Do not configure the push key or App Store Connect Submit API key as part of
   this authentication certification; both remain intentionally out of scope.

## Final verdict

**READY FOR SIGNED BUILDS**

The external production auth/deep-link configuration and repository
expectations reconcile successfully. The repository-side signing preflight
passes after the demonstrated API-status normalization fix. No build was
triggered. Native callback certification remains a required post-build step,
with all cases correctly held at `NOT RUN` until signed artifacts and exact
targets are available.