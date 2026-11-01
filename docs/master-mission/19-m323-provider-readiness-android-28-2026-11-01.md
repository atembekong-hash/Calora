# Mission #323 — Provider Readiness Review and Android VersionCode 28 Preparation

**Date:** 2026-11-01
**Repository:** `atembekong-hash/Calora`
**Protected-main baseline:** `89e6c7b7311d5d5ec4645cf60ed4eaf5a6f1c71b`
**Preparation branch:** `chore/android-version-code-28`
**Status:** Prepared for protected review; no native build or deployment initiated.

## 1. Scope and safety boundary

This mission reviewed the production provider topology and serving-integrity readiness, preserved the existing generic barcode and diary behavior, prepared Android `versionCode` 28, and ran focused plus complete regression validation. No production data, subscriptions, credentials, environment variables, databases, or customer records were modified. No APK, AAB, EAS, Play Store, TestFlight, or native build was started. No Railway deployment was triggered.

The supplied Samsung screenshots show the desired behavior for a verified manufacturer serving: a packet-level quantity such as `9.4 g`, approximately `35 kcal` and `8 g` carbohydrate for one packet, and a clearly labeled `100 g (reference quantity)` only when a manufacturer serving is unavailable. The implementation remains generic and contains no product- or barcode-specific exception.

## 2. Production topology and deployment evidence

Railway project: `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`), production environment `0ba409c4-5b32-4b75-8c33-e76d5c6e55db`.

All three Calora services were reported **Online**, with no staged work and no recent service failures:

| Service | Role | Deployment | Status | Serving source |
|---|---|---|---|---|
| `@workspace/api-server` | Calora API | `35a6ccce-7728-4959-91c2-63afb0d4b35b` | SUCCESS / Online | `89e6c7b` (`PR #319` documentation merge; code includes Mission 322) |
| `Calora` | FatSecret gateway (`@workspace/fatsecret-gateway`) | `33b71063-6e2f-487c-b8c2-820740ebe0e3` | SUCCESS / Online | `89e6c7b` |
| `@workspace/calora` | Web client | `20d95702-9287-492c-8e83-10ed423baa49` | SUCCESS / Online | `bdb7ea3` (`PR #318` serving-integrity merge; docs-only PR #319 deployment was skipped) |

The API release-attestation endpoint returned:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "89e6c7b7311d5d5ec4645cf60ed4eaf5a6f1c71b",
  "releaseId": "calora-api-89e6c7b7311d-20261101132838570"
}
```

The web service remains on the immediately preceding code-equivalent serving-integrity deployment because the docs-only PR produced a skipped web deployment. This does not omit any Mission 322 application code.

## 3. Health and gateway verification

Read-only HTTP checks passed:

- API `/health`: HTTP 200, `{"status":"ok"}`.
- API `/api/healthz`: HTTP 200, `{"status":"ok"}`.
- API `/api/version`: HTTP 200 with the attested API commit above.
- FatSecret gateway `/health`: HTTP 200, `{"status":"ok"}`.
- Calora web root and the authenticated browser Today screen loaded successfully.

The FatSecret gateway is correctly configured as a separate Railway service. The API service has the expected gateway URL and secret variable names configured; the gateway has its provider credential and timeout variable names configured. Secret values were not read, printed, or serialized.

A direct unauthenticated gateway barcode request for `076314300556` and its GTIN-13 form was correctly rejected with HTTP 401 (`Unauthorized gateway request`). A direct unauthenticated API capture request was correctly rejected with HTTP 401 (`Please sign in to analyze a capture`). These results confirm the authentication boundary and do not constitute a provider lookup result.

## 4. Authenticated provider verification limitation

The sandbox browser loaded an existing locally hydrated Today session and displayed the expected Emergen-C diary entries, including 372 kcal and 35 kcal entries. However, the session did not have a usable authenticated capture authorization at the time of this mission: the real production `/api/v1/capture/analyze` request returned HTTP 401. The browser session was not re-authenticated because this mission permits use of existing authorized sessions only; no credentials were requested, exposed, or stored.

Therefore, a live end-to-end FatSecret response for barcode `076314300556` could not be independently verified in this run. This is **NOT VERIFIED**, not a failure of the provider implementation. The gateway was online, its health endpoint passed, its authentication boundary passed, and production logs show successful authenticated FatSecret recipe and food traffic in the same service. A fresh authorized capture session is still required to prove the exact barcode response and source-selected manufacturer serving in production.

## 5. Code-readiness finding

Protected main contains the generic provider chain and serving normalization required by the repair:

1. Open Food Facts is queried with the serving-basis fields needed for trustworthy normalization.
2. A complete manufacturer serving is preserved when available.
3. An incomplete or missing serving falls back to `100 g (reference quantity)` or `100 ml (reference quantity)` according to the nutrition basis.
4. An exact secondary-provider lookup is attempted when Open Food Facts only provides a reference fallback.
5. FatSecret exact-barcode serving selection uses provider metadata and strict completeness checks.
6. Diary edit and sync paths preserve the selected serving metadata and nutrition basis.
7. No product name, barcode, or Emergen-C-specific conditional exists in the serving implementation.

No additional provider fallback was added in Mission 323. A new generic conversion from per-100-g nutrition to a manufacturer serving was not justified without a live provider payload demonstrating both an authoritative per-100-g nutrient basis and a valid manufacturer serving weight. The existing strict behavior avoids fabricated metadata and avoids silently converting an incompatible basis.

## 6. Android versionCode 28 preparation

Only these two files were changed on `chore/android-version-code-28`:

- `artifacts/calora/app.json`: Android `versionCode` `27` → `28`.
- `scripts/ci/validate-expo-config.mjs`: validator expectation `27` → `28`.

The following remained unchanged:

- Android package: `com.etiendem.caloraapp`.
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`.
- App version: `1.0.1`.
- iOS bundle identifier and build number.
- Deep-link scheme and auth callback configuration.
- Health permissions and camera configuration.
- EAS profiles and signing configuration.

This is configuration preparation only. It does not build or distribute an Android artifact. A protected PR must merge this change before an owner-authorized Android build can be started.

## 7. Validation evidence

All completed validations passed:

- Expo config validator: PASS; reports Android `versionCode: 28` and the unchanged Calora identity.
- Release workflow contract tests: PASS, 16/16.
- Android native auth/package preflight tests: included in the 16/16 passing Node test run.
- Focused Calora serving, capture, scan, diary, sync, and offline tests: PASS, 229/229 across 7 files.
- API capture, diary, and sync tests: PASS, 123/123 across 3 files.
- FatSecret gateway tests: PASS, 8/8, including exact GTIN forwarding, default-serving selection, authentication rejection, provider error sanitization, and timeout behavior.
- API, gateway, and Calora typechecks: PASS.
- Complete Calora client suite: PASS, 186 test files and 1,942 tests.
- Web/runtime contract tail of the complete validation: PASS, 29/29.

Expected stderr from diary-sync tests represented deliberate quarantine and retry-path assertions; it did not cause failures.

## 8. Final verdict

**PARTIAL PASS — Android versionCode 28 is prepared and validation is green; production provider end-to-end lookup remains NOT VERIFIED.**

The production services are healthy, the generic serving implementation is present, authentication boundaries are working, and all code/configuration regression suites pass. The remaining evidence gap is an authenticated production barcode capture response from the existing provider chain. The safe next step is to push this focused branch, open the protected PR, wait for protected checks, and merge only after review. After merge, a separate fresh explicit authorization is required before any EAS/APK/AAB/native build. A fresh authorized QA session should then perform one bounded barcode lookup for `076314300556` and verify manufacturer serving selection, fallback labeling, 1×/2× packet calculations, and diary sync round-trip without modifying historical records.
