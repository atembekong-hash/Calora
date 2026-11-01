# Mission 322 — Automatic Serving Recognition and Diary Serving Integrity

Date: 2026-11-01  
Repository: `atembekong-hash/Calora`  
Protected-main baseline: `2ccfefcfda8caa09215faae3ad004909508d0f2d`  
Status: implementation complete locally; protected PR delivery pending

## Final verdict

**PARTIAL PASS WITH EXPLICIT LIMITATIONS**.

The generic serving-resolution path, exact-barcode secondary-provider enrichment, diary serialization repair, and regression coverage are implemented and pass local validation. The live Open Food Facts record for barcode `076314300556` does not contain a manufacturer serving, so automatic Emergen-C packet selection cannot honestly be claimed from Open Food Facts alone. FatSecret exact-barcode enrichment is implemented only when the already-configured FatSecret credentials/gateway are available at runtime; that production configuration and the provider’s actual response for this barcode are **NOT VERIFIED** in this sandbox. No product-specific barcode exception was added.

## 1. Barcode provider forensic findings — PROVEN

The live Open Food Facts record for `076314300556` resolves to `0076314300556` and identifies Emergen-C Tangerine. It reports `nutrition_data_per: 100g`, approximately `372.3404 kcal/100 g` and `85.1064 g carbohydrate/100 g`, but has no `serving_size`, `serving_quantity`, `serving_quantity_unit`, or `_serving` nutrient values. Its `quantity` is only `"1"` and has no unit. Treating that as one packet would be unsafe.

The existing `offCandidate` behavior therefore correctly retains the explicit `100 g (reference quantity)` fallback when no trustworthy serving metadata exists. The request now includes all relevant OFF serving-basis fields rather than relying on a reduced response projection.

## 2. Provider comparison and coverage — PROVEN / NOT VERIFIED

Open Food Facts provides per-100 g/ml and optional serving fields, but the target record lacks the latter. Its terms and ODbL/database and image attribution obligations remain relevant to commercial reuse.

FatSecret is already configured in the repository for authenticated food lookup through the existing gateway/direct transport. Its barcode API documents serving descriptions, metric serving amounts/units, number of units, and per-serving nutrition. This mission adds only an exact-GTIN operation to that existing integration; it does not register a service, purchase a plan, expose credentials, or introduce name-based matching. Runtime credential availability and the target response remain NOT VERIFIED.

USDA FoodData Central remains the existing bounded exact-GTIN fallback after FatSecret. No new USDA credentials or production configuration were added.

## 3. Product identity and barcode relationships — PROVEN limitation

The manufacturer page and public retailer label evidence corroborate the product’s `1 packet (9.4 g)`, `35 kcal`, and `8 g carbohydrate` serving. That evidence is not used as a hardcoded product exception or silently inserted into the database. The code requires an exact barcode provider response with complete metric serving metadata and complete macros before selecting a secondary-provider serving.

No relationship between a single sachet barcode and outer-box barcode is assumed.

## 4. Serving-resolution architecture — IMPLEMENTED

`artifacts/api-server/src/routes/capture.ts` now:

- preserves an OFF candidate with a real serving when OFF supplies coherent serving metadata;
- retains an OFF per-100 reference candidate instead of immediately returning it as if it were manufacturer-serving data;
- performs one exact-barcode FatSecret lookup when the OFF result is only a reference fallback;
- accepts a FatSecret result only when a provider-designated serving has a positive metric amount in grams or millilitres and complete calories/protein/carbohydrate/fat values;
- records `nutritionBasis: per_serving`, `servingQuantity`, `servingUnit`, `servingWeightG`, and `servingMetadataSource`; and
- falls through to bounded USDA lookup and then the explicit OFF reference fallback without fabricating values.

`artifacts/api-server/src/lib/premiumRecipes.ts` preserves FatSecret metric serving fields and adds `lookupFatSecretFoodByBarcode`. `artifacts/fatsecret-gateway/src/app.ts` adds the authenticated `/fatsecret/foods/barcode` operation and requests FatSecret’s default-serving flag.

Conflicting or incomplete provider data is not combined.

## 5. Manufacturer-label fallback assessment — NOT VERIFIED / SAFE BY DESIGN

The existing label-capture path remains the appropriate route for user-visible label evidence. This mission does not promote OCR guesses into an authoritative barcode catalog and does not add a manufacturer-specific scrape. A future label-confirmation flow would need explicit validation, provenance, and user confirmation before becoming authoritative.

## 6. Diary serving persistence root cause — IMPLEMENTED

The primary sync path already persisted serving metadata inside the account-scoped sync metadata payload. The direct diary route, however, did not expose or persist the newly supported serving fields consistently. `artifacts/api-server/src/routes/diary.ts` now serializes and persists `servingQuantity`, `servingUnit`, `servingWeightG`, `nutritionBasis`, and `servingMetadataSource` for the normal diary create path.

`artifacts/calora/lib/diarySync.ts` now includes those fields in `diaryLogSignature`, so a metadata-only edit cannot be incorrectly treated as unchanged.

`artifacts/calora/app/(tabs)/index.tsx` now repairs the visible Edit Entry label when stored numeric serving metadata is present but the legacy text still says `(reference quantity)`. A verified packet displays as `1 packet (9.4 g)`; a selected gram quantity displays as its actual quantity. A genuine 100 g reference record remains labeled as a reference. Unrelated Edit Entry changes preserve the existing serving metadata through the existing patch merge.

No historical customer records were rewritten.

## 7. Implementation and regression evidence — TESTED

Focused API and gateway tests:

- `pnpm --filter @workspace/api-server exec vitest run src/__tests__/capture.test.ts src/__tests__/diary.test.ts src/__tests__/sync.test.ts` — **123 passed**.
- `pnpm --filter @workspace/fatsecret-gateway test` — **8 passed**.
- Added generic tests for complete exact-barcode serving selection, incomplete/unitless rejection, and GTIN-13 gateway forwarding.

Full client validation:

- `pnpm --filter @workspace/calora test:ci` — **1,942 passed across 186 test files**.

TypeScript:

- API server typecheck — passed.
- FatSecret gateway typecheck — passed.
- Calora client typecheck — passed.

The local full validation also passed the existing web-serving/security contract tests: 29 passed. React Native-on-web warnings in the existing suite were non-failing test-environment warnings.

A database-backed `premiumRecipes.test.ts` run was attempted but could not execute because this sandbox has no `DATABASE_URL`; its 24 failures are environment bootstrap failures, not serving-resolution assertions. Therefore database-backed provider integration is **NOT VERIFIED** here and must not be described as passed.

## 8. Licensing and compliance — PROVEN constraints / OWNER REVIEW REQUIRED

No paid provider was added, no provider credentials were printed or committed, and no scraping was introduced. FatSecret use remains subject to the existing account/API agreement. Open Food Facts reuse remains subject to ODbL, attribution, share-alike, image, and third-party-rights review. These legal/commercial obligations are documented but are not a substitute for owner/legal approval.

## 9. Protected GitHub delivery — PENDING

The working tree contains only the intended Mission 322 source, tests, and reports plus pre-existing untracked historical reports. The implementation is on the existing local branch `chore/android-version-code-27`, whose HEAD is the previously merged Android preparation commit `0427eb141ad59a6e54bf4ec0c45fe5c4e45ff26f`.

The next protected workflow is:

1. Create a focused branch from protected main.
2. Commit only the eight modified source/test files and this Mission 322 report plus the prior provider-forensics report.
3. Push and open a protected PR.
4. Wait for all required checks, including database-backed checks where configured.
5. Merge only after branch protection reports green.
6. Do not deploy Railway until separately authorized because this change includes API and gateway code.

No commit, push, PR, deployment, native build, EAS build, or version-code increment was performed during this continuation.

## 10. Final Android acceptance plan — OWNER CONTROLLED

A new Android build is required for the client-side Edit Entry display repair and automatic provider-selection behavior to reach the installed app. Build 27 cannot receive these source changes through an OTA path because the application architecture does not have a confirmed OTA update channel for this repair. The owner must trigger the next native build manually; this mission does not increment `versionCode`, start EAS, install an APK, or submit to a store.

After the owner builds the next APK, validate on Samsung with a disposable QA record:

1. Auto-scan `076314300556`.
2. If FatSecret runtime configuration returns a complete exact-barcode serving, verify the review defaults to `1 packet (9.4 g)`, approximately 35 kcal and 8 g carbohydrate.
3. If the provider is unavailable or incomplete, verify the honest `100 g (reference quantity)` fallback.
4. Approve a disposable diary entry.
5. Restart, synchronize, open Edit Entry, and verify the selected serving remains visible.
6. Change an unrelated field, save, reopen, and verify serving and nutrition remain unchanged.

Physical Samsung acceptance is **NOT VERIFIED** until that owner-controlled build is run.

## 11. Final mission status — PARTIAL PASS WITH EXPLICIT LIMITATIONS

**IMPLEMENTED:** generic exact-barcode FatSecret enrichment, strict serving validation, safe provider fallback order, direct diary metadata serialization, metadata-aware sync signatures, and Edit Entry display repair.

**TESTED:** 123 focused API tests, 8 gateway tests, 1,942 client tests, and all three package typechecks.

**NOT VERIFIED:** production FatSecret credentials/gateway availability, actual FatSecret response for `076314300556`, database-backed premium provider tests without `DATABASE_URL`, protected PR checks/merge, Railway deployment, and physical Samsung acceptance.

**BLOCKED:** claiming automatic Emergen-C packet recognition before an authorized provider actually returns verified exact-barcode serving data.

The safe 100 g/100 ml reference fallback remains intact and no product-specific value was hardcoded.
