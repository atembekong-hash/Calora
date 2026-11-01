# Mission 315 — Nutrition Integrity Final Report

## 1. Confirmed defect and root cause

Barcode `076314300556` was identified correctly, but the capture normalizer fell back to the provider's per-100-gram values and emitted a `100 g` serving when the Open Food Facts serving metadata was absent or not carried into the candidate model. The review and diary paths then treated the provider reference values as already serving-scaled. The reproduced provider values are mathematically consistent with the label: `372 × 9.4 / 100 = 34.968 kcal` and `85 × 9.4 / 100 = 7.99 g carbohydrate`.

The repair is generic and does not hardcode Emergen-C or this barcode. Declared provider serving metadata is parsed when reliable; otherwise the result is explicitly labeled as a reference quantity (`100 g (reference quantity)` or `100 ml (reference quantity)`).

## 2. Provider data and serving normalization

Open Food Facts candidates now carry `servingQuantity`, `servingUnit`, `servingWeightG`, `nutritionBasis`, and `servingMetadataSource`. The parser supports per-serving, per-100-g, and per-100-ml reference values, including packet/sachet-style declared units and gram weights. USDA candidates receive the same metadata model. No fabricated packet weight is generated when metadata is missing or malformed.

The live Open Food Facts response checked on 2026-11-01 returns `nutrition_data_per: "100g"`, `energy-kcal_100g: 372.3404`, and `carbohydrates_100g: 85.1064`, but `serving_size: null`, `product_quantity: null`, and an ambiguous `quantity: "1"`. The official Emergen-C FAQ confirms packet-based use, but does not provide the exact 9.4 g weight in the retrieved page. Therefore the production response does not currently provide enough machine-readable metadata to select 1 packet safely. The implementation correctly falls back to an explicitly labeled 100 g reference rather than inventing 9.4 g. A generic improvement also accepts `quantity` when it explicitly includes a unit; bare numeric quantities remain rejected as ambiguous.

The client applies the selected quantity exactly once. Packet counts multiply the declared packet weight; explicit gram and milliliter quantities use their declared reference units. Internal calculation retains decimal precision and rounds only the nutrition snapshot/display result.

## 3. System-wide repair

Serving metadata is carried through capture candidates, FoodMemory drafts, Scan review editing, accepted FoodLog records, diary sync payloads, server sync validation, persisted `sync_metadata`, and sync hydration. Existing database columns are reused; no migration or historical-data mutation was introduced. The existing review-before-log flow remains intact.

The existing reference-verification semantics were not weakened: provider nutrition confidence does not by itself claim that the user's portion is correct, and the review flow still asks the user to confirm quantity.

## 4. Regression evidence

- Barcode capture suite: **62 passed**, 1 integration test skipped because the isolated database integration environment is unavailable.
- Client serving and review suites: **147 passed**.
- Full Calora client CI: **186 test files, 1,938 tests passed**; web-server checks included **29 passed**.
- API offline suite: **536 tests passed**; two unrelated suites (`admin.test.ts`, `health.test.ts`) were blocked during local import because the sandbox lacks `AI_INTEGRATIONS_OPENAI_BASE_URL`. This is an environment prerequisite, not a failure in the serving changes.
- API server and Calora TypeScript checks: **passed**.
- Library typecheck and generated-client regeneration: **passed**.
- Source safety check: no product-specific barcode or Emergen-C special case exists in production source.

Focused calculations cover one packet (approximately 35 kcal and 8 g carbohydrate), two packets, half a packet, explicit 100 g selection (372 kcal and 85 g carbohydrate), missing metadata fallback, review totals, and accepted-log metadata propagation.

## 5. Historical data safety

No existing diary records were modified, migrated, or bulk-corrected. Existing incorrect records remain auditable with their original values. Future corrections remain user-controlled through the normal diary/edit flows.

## 6. Physical-device and production limitations

This environment did not run a native Android build or execute the final flow on the Samsung device. The required physical acceptance journey—scan the barcode on-device, approve it, retrieve the saved record, and confirm Today totals—therefore remains **not verified here**. No production deployment, database operation, native build, or store release was initiated.

The isolated database-backed capture persistence test was skipped because no isolated test database was available. Protected CI is required to provide the final database-backed evidence before merge.

## 7. Release readiness

PR #314 contains only the serving-integrity implementation, generated contract artifacts, focused tests, and this numbered report. Its protected checks are green. The portable PostgreSQL integration job actually executed and passed; the account-deletion job's diagnostic/upload steps were skipped but its database fence validation passed. The release validation suite also passed. However, the live provider response cannot satisfy the exact 9.4 g acceptance case without an additional authoritative machine-readable serving source. The PR must not be merged or deployed until that gap is resolved without hardcoding or fabricating metadata.

## Final verdict

**PARTIAL PASS WITH EXPLICIT LIMITATIONS** — the generic calculation, review, serialization, sync, generated-contract, and database-backed CI layers are validated. The exact live barcode still lacks machine-readable 9.4 g serving metadata, so protected merge and production deployment were correctly withheld. Physical Samsung execution also remains pending.

## References

[1]: https://world.openfoodfacts.org/api/v2/product/076314300556.json?fields=code,product_name,brands,serving_size,product_quantity,quantity,nutriments "Open Food Facts current product response"
[2]: https://www.emergenc.com/faqs/ "Official Emergen-C FAQ"
