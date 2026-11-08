# Calora Final Authenticated Production and Android Recovery Certification

**Date:** 2026-10-28  
**Repository:** `atembekong-hash/Calora`  
**Protected main:** `2453583b2e2c70fc3413b43bc0e949e60440b3fb`  
**Live API baseline:** `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`

## Executive verdict

**API_RELEASE_VERIFIED:** PASS  
**CLIENT_TEST_CERTIFICATION:** PASS  
**PRODUCTION_AUTH_VERIFIED:** BLOCKED  
**ANDROID_BUILD_READY:** BLOCKED pending the authenticated production gate and EAS authentication  
**ANDROID_DEVICE_VERIFIED:** NOT PERFORMED

The API does not require another deployment: its source tree is identical between the live API commit and protected main. The protected startup-liveness repair is already merged to main. The complete client suite passes when run under a supported Node runtime. The only unresolved mandatory gate is the authorized authenticated production verification, because this sandbox does not have the approved Supabase service-role credential or QA password and no credential values were requested or exposed.

## Phase 1 — release baseline

The protected main commit is `2453583b2e2c70fc3413b43bc0e949e60440b3fb`.

The live API release endpoint on both domains reports `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`. The API source tree hashes are equal:

- `efe059a...:artifacts/api-server` → `2900436d53965b733ddf881e13e1f8ddb7dfdee3`
- `2453583...:artifacts/api-server` → `2900436d53965b733ddf881e13e1f8ddb7dfdee3`

Therefore no API-only deployment was performed. Deploying again would be unnecessary and would not deliver the client-side startup repair.

Both public domains returned the same API release attestation:

- `https://mycaloraapp.com/health` → HTTP 200, `{"status":"ok"}`
- `https://app.mycaloraapp.com/health` → HTTP 200, web health response
- Both `/api/version` responses identify `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`
- Both unauthenticated `/api/v1/profile` requests → HTTP 401, `Please sign in to view your profile.`

The Supabase project origin is reachable over HTTPS. An unauthenticated `/auth/v1/health` request returns HTTP 401, which is expected without an API key and is not evidence of a project outage.

## Phase 2 — authenticated production verification

This phase is **BLOCKED**, not passed.

The master mission requires one isolated disposable QA identity and authenticated checks for sign-in, access-token acceptance, identity mapping, profile GET/initialization, profile synchronization, expired-token handling, and cross-account isolation.

The existing approved provisioning script requires:

- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CALORA_SIGNUP_TEST_PASSWORD`

The sandbox contains none of these credential values in its environment or approved local secret file. No service-role credential, password, bearer token, private profile content, or production secret was retrieved, printed, or written. No production account or QA record was created, changed, or deleted.

The exact owner-controlled action needed is to make the approved QA credential source available to the authorized execution environment through the existing secret manager, or to run the approved provisioning/authentication procedure from the owner-controlled environment and provide only sanitized results. Do not send credentials in chat or commit them to the repository.

Until this action is completed, it is not valid to claim `PRODUCTION_AUTH_VERIFIED`.

## Phase 3 — client test certification

The client test worker failure was reproduced and isolated to the sandbox runtime, not application source:

- Default sandbox Node: `v22.13.0`
- Pinned `jsdom`: `30.0.1`
- Pinned jsdom dependency: `undici@8.12.2`
- Failure: `createZstdDecompress.bind` is unavailable in Node 22.13 during worker startup

No dependency or application workaround was committed. The configured EAS base uses Node 20.19.4, which is also unsuitable for this exact jsdom/undici path because Supabase Realtime requires native WebSocket support in Node 22+. The supported local validation runtime used was Node `22.16.0`, which provides both the required zstd and WebSocket APIs.

Under Node 22.16.0, the complete client suite passed:

- **177 test files passed**
- **1,891 tests passed**
- No test files remained unexecuted

Additional checks passed:

- API offline regression: **43 files / 547 tests passed** with synthetic database and provider configuration
- API TypeScript validation: **PASS**
- Client server/web/Expo configuration/security tests: **28 tests passed**
- Focused startup tests include session restoration deadlines, profile-sync deadlines, local hydration deadlines, retry/recovery behavior, and root access gating.

## Phase 4 — Android build

No Android build was started. The master mission requires all mandatory release gates to pass first; the authenticated production gate is currently blocked. EAS CLI authentication is also not available in this sandbox session.

When the owner-controlled credential gate is complete, the exact authorized build is:

```text
cd artifacts/calora
pnpm dlx eas-cli@latest build --platform android --profile production-apk --non-interactive
```

The build must be run from protected main `2453583b2e2c70fc3413b43bc0e949e60440b3fb` (or its exact verified descendant), and the resulting build ID, source commit, versionCode, APK SHA-256, and artifact URL must be recorded. No iOS build or store submission is authorized.

## Phase 5 — physical-device verification

No physical-device verification was performed in this sandbox. After the owner installs the APK as an upgrade without clearing application data, verify:

1. Existing installation opens without repeated onboarding.
2. Session restoration completes.
3. Existing profile loads.
4. Historical meals and progress remain present.
5. Synchronization completes or presents bounded recovery UI.
6. The app reaches Today without an indefinite spinner.
7. Offline/slow-network recovery and retry work.
8. Relaunch after termination preserves the same state.

Do not uninstall the existing application or clear its storage.

## Preserved safeguards

No production credentials were exposed. No existing customer records were modified. No database reset, migration, storage mutation, image generation, mobile-store submission, or extra Android build occurred. The API source was not redeployed because it is already equivalent to protected main.

## Remaining owner action

Provide the approved Supabase QA credential source to the authorized execution environment without placing values in chat, source, logs, or reports. Then rerun only the bounded authenticated verification and, if it passes, the single authorized Android `production-apk` build. The owner must perform the final physical-device verification.
