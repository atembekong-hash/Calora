# Mission 322 — Provider Forensics and Serving Integrity Evidence

## Proven: live Open Food Facts record

Live request: https://world.openfoodfacts.org/api/v2/product/076314300556.json (retrieved 2026-11-01).

The record resolves to GTIN-13 `0076314300556` (lossless UPC/EAN representation of scanned UPC-A `076314300556`), product `Emergen-C Tangerine Flavored Fizzy Drink Mix`, brand `Emergen-C`. The relevant fields are:

- `quantity`: `"1"` (no unit)
- `serving_size`: `null`
- `serving_quantity`: `null`
- `serving_quantity_unit`: `null`
- `nutrition_data_per`: `"100g"`
- `energy-kcal_100g`: `372.3404`
- `carbohydrates_100g`: `85.1064`
- `proteins_100g`: `0`
- `fat_100g`: `0`
- all `_serving` nutrition fields inspected: absent

Therefore the current Open Food Facts record does **not** provide an authoritative 1-packet/9.4 g serving. Treating it as a 1-packet serving would fabricate metadata. The safe fallback is an explicit `100 g (reference quantity)` basis.

## Proven: external product evidence

- Manufacturer page: https://www.emergenc.com/products/everyday-products/original-formula/tangerine/ — confirms one packet daily and product identity, but the extracted page does not publish the 9.4 g nutrition panel.
- Public retailer label transcription: https://www.iherb.com/pr/emergen-c-vitamin-c-tangerine-1-000-mg-30-packets-0-33-oz-9-4-g-each/17811 — states `Serving Size: 1 Packet (9.4 g)`, `Calories 35`, and `Total Carbohydrate 8 g`. This is corroborating label evidence, not an authorized Calora provider record and is not used as a product-specific code exception.

## Provider findings

### Open Food Facts

API fields can represent `serving_size`, `serving_quantity`, `serving_quantity_unit`, `nutrition_data_per`, and serving/per-100 nutrition keys. The live target record has only per-100 g nutrition and no serving metadata. Open Food Facts terms (https://world.openfoodfacts.org/terms-of-use) state the database is ODbL/Database Contents licensed and product images are CC BY-SA; commercial reuse requires attribution and share-alike obligations for derivative databases, and third-party rights can still apply to packaging images. Calora must preserve attribution and avoid treating contributor data as guaranteed truth.

### FatSecret

FatSecret barcode documentation: https://platform.fatsecret.com/docs/v2/food.find_id_for_barcode. Its GTIN-13 barcode endpoint returns food identity plus serving records including `serving_description`, `metric_serving_amount`, `metric_serving_unit`, `number_of_units`, and per-serving calories/macros. Calora already has an authenticated FatSecret gateway and configured food-detail integration; no new account or paid service is introduced. Existing terms/licensing remain an owner/legal responsibility and provider responses must not be redistributed beyond the authorized application use.

### USDA FoodData Central

API guide: https://fdc.nal.usda.gov/api-guide. Branded records can include `gtinUpc`, `servingSize`, `servingSizeUnit`, and nutrient values. USDA data are CC0/public domain with requested attribution. The API requires a key and documents default rate limits; the repository currently falls back to `DEMO_KEY` when no configured key is present, so the fallback must remain bounded and must not be used as a high-volume primary lookup.

## Implementation decision

1. Preserve exact Open Food Facts serving data when it is present and nutritionally coherent.
2. If Open Food Facts only exposes a per-100 reference, query the already-authorized FatSecret barcode gateway when configured; use an exact barcode serving only when complete per-serving nutrition and valid serving metadata are returned.
3. Otherwise use the existing USDA exact-GTIN fallback when valid, then retain the explicit 100 g/100 ml reference fallback.
4. Never combine conflicting records, invent a weight, or hardcode Emergen-C/barcode values.
5. Preserve provider provenance in `servingMetadataSource`.
6. Repair direct diary serialization and signature/hydration coverage so serving metadata survives all paths.

Status: **PROVEN** provider gap; **IMPLEMENTED** only after the Mission 322 code changes and tests below are complete.
