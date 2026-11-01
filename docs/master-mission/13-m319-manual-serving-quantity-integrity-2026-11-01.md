# Mission 319 — Manual Serving Quantity Integrity Repair

**Date:** 2026-11-01
**Repository:** `atembekong-hash/Calora`
**Last confirmed merged Auto Scan repair:** `70aea9e0c40c0ef082794d45aaf7be05c42e6eae`

## 1. Physical-device reproduction

The Samsung evidence reproduces a P1 integrity defect for barcode `076314300556`:

- Product: Emergen-C Tangerine Flavored Fizzy Drink Mix
- Manufacturer serving: 1 packet / 9.4 g
- Manufacturer nutrition: approximately 35 kcal / 8 g carbohydrates
- Reference nutrition: approximately 372 kcal / 85 g carbohydrates per 100 g

The review field initially shows `100 g (reference quantity)`, `372 kcal`, and `85 g carbohydrates`. The minus control changes the eaten fraction and correctly recalculates to approximately 186 kcal and 43 g carbohydrates. However, manually typing `9.4 g` changes only the visible text; the nutrition row, review total, and enabled approval action remain based on 100 g.

The same evidence confirms that the Mission 318 Auto Scan repair works on the Samsung device: Auto recognizes the barcode and the Scan preview no longer shakes. The Auto pipeline was not reopened or rewritten.

## 2. Confirmed root cause

The API contract already returns the serving metadata required for scaling:

- `servingQuantity`
- `servingUnit`
- `servingWeightG`
- `nutritionBasis`
- `servingMetadataSource`

The client conversion function `componentFromCapture()` in `artifacts/calora/lib/foodMemory.ts` copied the serving label and base nutrition but dropped all five metadata fields. Therefore the review draft had no `per_100g` basis or verified 100 g weight.

The old Scan-local text handler only updated `servingWeightG` when `component.nutritionBasis === 'per_100g'`. Because that basis had been dropped, typing `9.4 g` changed the label but could not update the authoritative multiplier. Plus/minus worked because it changed `eatenFraction`, which was independent of serving metadata.

This explains the physical mismatch without assuming a backend or provider defect.

## 3. Authoritative quantity model repair

Added shared helpers in `foodMemory.ts`:

- `parseServingInput()` parses decimal quantities, comma decimals, supported units, and partial/invalid values.
- `updateComponentServing()` applies the exact TextInput value to the authoritative component state.
- `servingInputErrorForComponent()` supplies a visible validation message and approval guard.

Supported units are deliberately limited to units that can be calculated safely:

- `g`, `gram`, `grams`
- `ml`, `milliliter`, `milliliters`
- `packet`, `packets`
- `sachet`, `sachets`
- `serving`, `servings`

Unknown units are not silently interpreted as grams. Packet/sachet quantities require verified packet weight. Volume/weight mismatches are rejected. Empty, zero, negative, non-numeric, and excessively large values are rejected.

The Scan TextInput now invokes the shared update helper directly. Nutrition rows and review totals continue to derive from `nutritionForComponents()`. Approval and Save as meal are disabled while an included component has an unresolved serving value.

## 4. Metadata preservation

`componentFromCapture()` now preserves all provider serving metadata when creating a FoodMemory draft. This ensures a reference fallback remains explicitly `per_100g` or `per_100ml`, and manufacturer metadata remains available for packet scaling.

No product barcode, Emergen-C value, or product-specific branch was added.

## 5. Expected calculations

The repaired model produces:

| Entry | Expected result |
|---|---:|
| 100 g | approximately 372 kcal / 85 g carbs |
| 50 g | approximately 186 kcal / 42.5 g carbs |
| 9.4 g | approximately 35 kcal / 8 g carbs |
| 18.8 g | approximately 70 kcal / 16 g carbs |

`buildAcceptResult()` receives the same updated draft and persists the selected serving label, quantity, unit, weight, nutrition basis, metadata source, and recalculated nutrition snapshot.

## 6. Diary persistence and synchronization path

Source tracing confirms the accepted path:

1. Scan review updates the FoodMemory draft.
2. `updateDraftComponents()` recalculates the draft nutrition snapshot.
3. `buildAcceptResult()` copies the updated quantity and nutrition into the FoodLog and accepted memory.
4. `acceptFoodMemory()` commits the local snapshot and creates the synchronization outbox mutation.
5. Existing diary sync serializes serving metadata and nutrition snapshot fields.

No production or historical diary record was modified during this mission. The automated persistence test uses disposable in-memory fixtures only.

## 7. Red-to-green regression evidence

Added tests that would fail against the defective implementation:

- Capture-to-draft metadata preservation.
- Simulated exact TextInput handler call with `9.4 g`.
- Recalculated 35 kcal / 8 g carbohydrates.
- Supported and unsupported unit parsing.
- Empty, negative, and unsafe quantities.
- Visible TextInput wiring to the shared update helper.
- Approval blocking for invalid included quantities.
- Accepted FoodLog and memory persistence with 9.4 g, 35 kcal, and 8 g carbohydrates.

Executed results:

- Focused quantity/review/Scan tests: **163 passed**.
- API capture and provider metadata tests: **62 passed**.
- TypeScript check: **passed with zero errors**.
- Full Calora client validation: **186 test files, 1,942 tests passed**.
- Web/server/security/configuration checks: **29 passed**.

Database-backed integration checks remain part of the protected GitHub validation workflow; they were not represented as locally executed production-data tests.

## 8. Preserved behavior and scope

Preserved without modification:

- Mission 318 Auto barcode recognition and stable camera preview.
- Dedicated Barcode mode and photo fallback.
- Food, Label, and Library capture modes.
- Provider barcode matching and reference fallback behavior.
- Authentication, request cancellation, review approval, diary synchronization, privacy, and account safeguards.
- Existing plus/minus controls.

Changed only the shared capture-draft metadata conversion, serving input model, Scan review wiring, approval guard, and focused tests/reporting.

## 9. Physical acceptance plan

A new Android build is required after the protected merge because the manual quantity repair is client-side. Do not claim physical acceptance before execution on that repaired build.

Use a disposable QA diary record and verify:

1. Scan barcode `076314300556`.
2. Confirm the reference fallback and initial 372 kcal / 85 g display.
3. Type `9.4 g` into the serving field.
4. Confirm the row and review total update to approximately 35 kcal / 8 g carbs.
5. Confirm the approval control remains enabled only for valid input.
6. Approve and retrieve the new diary record.
7. Confirm stored serving `9.4 g`, quantity `9.4`, weight `9.4`, 35 kcal, and 8 g carbs.
8. Restart the app and verify the same record remains account-scoped.
9. Verify synchronization and offline recovery with the disposable record.
10. Repeat 50 g, 18.8 g, packet, empty, invalid-unit, and rapid-edit cases.
11. Confirm Auto barcode recognition and Scan stability remain unchanged.

## 10. Final verdict

**PARTIAL PASS WITH EXPLICIT LIMITATIONS**

The confirmed source defect is repaired, the quantity model is authoritative, invalid values cannot be approved, diary serialization is covered, and all local validation passes. Protected PR delivery is ready. Physical Samsung acceptance, database-backed CI evidence for this new branch, and a new Android artifact remain pending until the PR completes protected checks and a separately authorized native build is produced.

No Railway deployment, production change, APK/EAS build, app-store submission, or historical-data modification was initiated.
