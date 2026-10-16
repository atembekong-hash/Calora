# 226 — Calora Galaxy Barcode Physical Retest and Provider-Coverage Report

**Date:** 2026-10-16
**Scope:** Galaxy S21 Ultra physical Barcode Scan retest, UPC/EAN provider-identifier remediation, protected release, and production verification.
**Native-build policy:** No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was started for this remediation.

## Executive verdict

| Area | Verdict | Evidence |
|---|---|---|
| Galaxy camera Barcode decoding | **PASS** | A real packaged Almond Bark item was detected by the Galaxy S21 Ultra Barcode mode and produced a Calora Barcode result sheet. |
| Device-to-production request path | **PASS** | Railway recorded `POST /api/v1/capture/analyze → 200` requests during the physical scan window. |
| UPC-A/EAN-13 representation handling | **PASS — remediated** | Main commit `8a1a121507322bf5027529f1e0180fb1aebd819f` accepts only the lossless 12-digit UPC-A / leading-zero 13-digit EAN pairing for Open Food Facts and USDA provider identifiers. |
| Exact identity/nutrition result for the Almond Bark item | **NOT FOUND — safe behavior** | Production contacted both configured food authorities, Open Food Facts and USDA FoodData Central, then returned the controlled “Barcode not found” review state. No food, nutrition, image, or diary entry was fabricated. |
| Production release | **PASS** | Protected PR #185 merged; GitHub release validation passed; all three Railway production services were online with no pending work; `/health` was healthy and `/api/version` attested `8a1a121`. |

> **Key distinction:** “Barcode not found” after a successful camera detection is not a CameraX, decoder, connectivity, or crash failure. It means the packaged product has no verified match from the two configured authoritative data sources. Under Calora’s food-image and nutrition-integrity policy, returning no match is correct until a verified source record exists.

## Physical-device evidence

### Device and app state

- **Device:** Samsung Galaxy S21 Ultra, Android device serial `R5CRB2FDNGK`.
- **Application:** the existing signed Calora Android QA APK installed in place; no uninstall or user-data reset was performed.
- **Test safety:** the review sheet was not approved, so this test created no meal, diary, nutrition, or user-data record.

### Retest execution

1. Launched Calora and opened **Scan**.
2. Selected **Barcode**; physical screenshot confirmed the Barcode segment was active.
3. Positioned the real Almond Bark package with its barcode inside the live camera frame.
4. Waited for native analysis and captured accessibility hierarchy, screenshot, and logcat evidence.
5. The app displayed:
   - `BARCODE MATCH`
   - `Barcode not found`
   - `We could not match this barcode yet. Search for the product or enter its nutrition manually.`
6. The captured review sheet proves the native analyzer decoded an identifier and handed it to the app. A camera that had not decoded any code would remain on `Point at a barcode or food` and would not present that result sheet.

### Production correlation

Railway production HTTP, DNS, and network-flow evidence during the physical scan showed:

- Multiple `POST /api/v1/capture/analyze → 200` responses from **17:24:38Z through 17:25:05Z**.
- Successful DNS resolution and outbound HTTPS calls to:
  - `world.openfoodfacts.org`
  - `api.nal.usda.gov`
- Normal Supabase identity/session and database connections.
- No failed Railway deployment, no API 5xx response, and no provider transport outage during the scan.

The exact barcode digits were intentionally not copied into logs or this report. Retaining them is unnecessary to establish the behavior and would weaken Calora’s privacy-preserving diagnostics posture.

## Root cause and source repair

### Confirmed historical defect

The API formerly required literal equality between the scanner’s identifier and the provider’s identifier in three paths:

1. Open Food Facts response-code verification;
2. Open Food Facts candidate construction;
3. USDA `gtinUpc` verification.

That rejected a valid provider result when a device decoded a **12-digit UPC-A** and the provider returned the identical trade item as its **13-digit EAN-13 representation with one leading zero**, or vice versa. GS1 describes UPCs as 12-digit codes and EANs as 13-digit codes; the repair permits only this narrow, lossless relationship. It does **not** permit suffix, substring, general zero-stripping, or fuzzy matching.

Reference: [GS1 US — EAN Numbers and UPCs](https://www.gs1us.org/upcs-barcodes-prefixes/ean-vs-upc)

### Implemented repair

PR #185 added a `barcodeMatches` comparison that accepts only:

- exact digit equality; or
- a 12-digit value and its exact `0`-prefixed 13-digit counterpart.

It preserves the originally scanned identifier for candidate IDs and provenance, preserves both existing provider order and failure behavior, and continues to reject all other non-exact identifiers. This satisfies the rule that a wrong food is worse than no food.

## Validation

| Validation | Result |
|---|---:|
| Focused capture route regression | **61 passed** |
| New Open Food Facts UPC-A/EAN-13 equivalence test | **Passed** |
| New USDA UPC-A/EAN-13 equivalence test | **Passed** |
| API TypeScript check | **Passed** |
| Offline API regression with inert local test configuration | **506 passed** |
| `git diff --check` before commit | **Passed** |
| Protected PR #185 required `Run release validation suite` | **Passed** |
| Account-deletion fence validations | **Passed** |
| Main release validation | **Passed** (all release-gate and source-only provenance attestation jobs completed) |
| Railway production services | **3/3 online; no pending work; no recent failures** |
| `https://mycaloraapp.com/health` | **`{"status":"ok"}`** |
| `https://mycaloraapp.com/api/version` | **Attested Git commit `8a1a121507322bf5027529f1e0180fb1aebd819f`** |

## Release record

| Item | Value |
|---|---|
| Pull request | [#185 — fix: accept equivalent UPC and EAN barcode codes](https://github.com/atembekong-hash/Calora/pull/185) |
| Merge commit | `8a1a121507322bf5027529f1e0180fb1aebd819f` |
| Merge time | 2026-10-16T17:10:48Z |
| Production API release ID | `calora-api-8a1a12150732-20261016171148499` |
| Production source tree | `7aa75dfd3364ce366c61a389352a3fa314dc0a79` |

## Follow-up boundaries

1. **No fabricated fallback:** This product will continue to show the safe no-match result until it is present in Open Food Facts or USDA with a verified matching identifier. Calora must not synthesize a branded product, nutrition panel, or food image from the package appearance.
2. **Provider-coverage expansion requires a deliberate product/data decision:** adding another licensed barcode authority or a governed first-party catalog needs its provenance, licensing, update cadence, image-validation, and nutrition-authority model reviewed first. It was not added merely to force a match for a single item.
3. **Existing recovery is functional:** users can use the existing product/nutrition search or type a food description, then review before any diary logging. The physical test did not exercise those alternate methods because its purpose was Barcode scanning and source-authority verification.
4. **No native build is required for the merged server-side comparison repair.** The installed QA APK exercised the deployed API immediately. A future Android build is still required only to put separately merged native/JS interface changes into a distributable APK.
