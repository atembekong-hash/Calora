# 227 — Calora Auto Barcode Capture Remediation and Release Report

**Date:** 2026-10-16
**Scope:** Correct the native Scan **Auto** mode so a barcode decoded by the camera is acted on immediately, while preserving the safe verified-provider and photo-review paths.
**Native-build policy:** No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered for this source release.

## Executive verdict

| Area | Verdict | Evidence |
|---|---|---|
| Root cause | **CONFIRMED** | Auto-mode camera callbacks saved a barcode only as an in-memory hint. They did not submit it or take a photo, so the user had to press the shutter after a successful decode. |
| Auto barcode behavior | **REMEDIATED** | Auto now immediately claims the existing sequence lock, captures the current frame, and submits the decoded barcode plus image through the established `auto` contract. |
| Duplicate/race safety | **PRESERVED** | The pre-React `barcodeLockRef` still blocks repeated native callbacks; the CameraX-safe shutter ordering remains unchanged. |
| Verified match behavior | **PRESERVED** | A verified provider result yields the existing Barcode review sheet. |
| Unknown-product behavior | **PRESERVED, fail-safe** | With no verified barcode record, the captured image goes to the existing reviewable photo-estimate path; Calora never fabricates a branded product, nutrition record, or food image. |
| Protected source release | **PASS** | PR #187 was validated and squash-merged into `main` as `8aef7e13b6714d03eefba25612fc72be9b9fa523`. |
| Production deployment | **PASS** | All three Railway services are online with no pending work; the public API version attests the merged commit. |
| Fresh physical Auto test | **BLOCKED — expected** | The installed Galaxy APK contains an older JavaScript bundle. This client-side change requires a newly authorized Android build/install before it can be physically certified. |

## Root cause

The native camera was already configured to decode UPC, EAN, Code 128, and QR values while in Auto mode. However, `onBarcodeScanned` treated an Auto result differently from Barcode mode:

1. It stored the decoded value in `autoBarcodeHintRef`.
2. It returned without an API request or capture.
3. A user then had to manually press the shutter for the hint to be included with a new photo.

Therefore, a successfully decoded barcode in **Auto** appeared inert. This was an application control-flow defect, not a camera permission, decoder, provider, or production-connectivity failure.

## Implemented remediation

PR #187 changes the Scan flow as follows:

1. Every usable Auto or Barcode decode first obtains the same monotonic sequence and `barcodeLockRef` used to prevent duplicate native callbacks.
2. In **Auto**, the handler invokes `takePhoto(barcode, sequence)` immediately.
3. The image is captured with the existing CameraX-safe timing (no view reconfiguration before `takePictureAsync` resolves), prepared, and submitted as `mode: 'auto'` with the exact decoded barcode.
4. The API checks authoritative barcode providers first. A verified record retains the Barcode review behavior; an unmatched identifier with a captured image may use the established photo-estimate review flow.
5. Camera readiness and permission failures clear the claimed Barcode lock so the user can retry. The existing terminal-result, abort, and sequence checks still reject stale callbacks.

This design avoids a false choice between barcode automation and photo fallback: a user gets immediate action after a decode, while unknown items retain a reviewable path rather than being silently discarded or mislabeled.

## Validation evidence

| Validation | Result |
|---|---:|
| Focused Scan and review contracts | **87 passed** |
| New Auto contract | **Passed** — asserts no second shutter tap is required and the decoded barcode is submitted with the captured frame |
| Calora TypeScript check | **Passed** after generating the workspace API-client declarations required by the isolated worktree |
| Full Calora client/UI suite | **157 files / 1,760 tests passed** |
| `git diff --check` | **Passed** |
| PR #187 required release validation | **Passed** |
| PR #187 account-deletion fence checks | **Passed** |
| Main Release Validation `38941436174` | **Passed** — test suite, production artifacts, source-only provenance, and release attestation gate all completed |
| Railway production | **3/3 services online; no pending work; no recent failures** |
| `https://mycaloraapp.com/health` | **`{"status":"ok"}`** |
| `https://mycaloraapp.com/api/version` | **Attests `8aef7e13b6714d03eefba25612fc72be9b9fa523`** |

The full suite emits its pre-existing React `act(...)` notices and deliberate offline/deadline test diagnostics; no test failed.

## Release record

| Item | Value |
|---|---|
| Pull request | [#187 — fix: process barcodes in Auto capture mode](https://github.com/atembekong-hash/Calora/pull/187) |
| Merge commit | `8aef7e13b6714d03eefba25612fc72be9b9fa523` |
| Merge time | 2026-10-16T17:40:01Z |
| Production API release ID | `calora-api-8aef7e13b671-20261016174054240` |
| Production source tree | `64e8b7581b922a7549d8b41d0aabbd12845aec5a` |
| Related provider-identifier repair | [#185](https://github.com/atembekong-hash/Calora/pull/185) — safe UPC-A/EAN-13 equivalence |
| Related physical Barcode evidence | [Report 226](./226_CALORA_GALAXY_BARCODE_PHYSICAL_RETEST_AND_PROVIDER_COVERAGE_REPORT.md) |

## Remaining physical-device boundary

The current Galaxy S21 Ultra APK cannot prove this newly merged JavaScript behavior because its bundle predates PR #187. After a **fresh explicit authorization naming the next Android build/install**, install that new artifact and run one non-destructive Auto test with a real packaged UPC/EAN item:

1. Open **Scan → Auto** and frame the barcode.
2. Confirm that Calora automatically enters processing without tapping the shutter.
3. Confirm a verified item reaches the review sheet, or that an unsupported product enters the clearly labeled photo-estimate/unavailable review path.
4. Do not approve the review during certification, so no diary entry is created.

No native build was started in this mission.
