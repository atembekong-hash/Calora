# 240 â€” Calora Meal Recognition and Nutrition Accuracy Forensic Report

**Mission:** CAL-SCAN-FORENSIC-001
**Scope:** Read-only source, test, and architecture investigation.
**Evidence source:** Repository at `C:\Users\DynaBook\Calora`, inspected at commit `b623e0aacdaade56061d0a9ceca289d393565a41` on branch `fix/quick-add-manual-entry-visibility`.
**Safety:** No production provider calls, customer records, database mutations, deployments, native builds, or source fixes were performed. Existing tests were executed only against mocks/local pure functions.

## Executive verdict

Calora's ordinary meal-photo recognition path is **not yet reliable enough to claim commercial nutrition accuracy**. The principal cause is architectural and confirmed: an image-only meal scan sends the image to a managed vision model, accepts model-generated food identities, portions, calories, and macros, and does not reconcile those values against a nutrition database or measured user portion. The UI correctly labels the result as an estimate and requires review, but reviewability is not the same as accuracy.

The barcode path is materially stronger: it performs strict exact-GTIN matching through Open Food Facts, FatSecret, and USDA FoodData Central, then presents an editable review. However, three confirmed data-integrity risks remain in that path: Open Food Facts serving-quantity fields are fetched but ignored; incomplete nutrients can become zero while still being labeled per-serving; and USDA candidates are hard-coded as per-serving while only the first search result is examined. These findings can produce wrong serving semantics even when barcode identity is correct.

TheMealDB is confirmed as recipe discovery only and is not a meal-photo nutrition authority. Its recipe nutrition is estimated separately and must remain explicitly estimated or unavailable.

No representative image benchmark was available in the repository, and no authorized test-image set or live provider environment was used. Therefore recognition accuracy, portion error, calorie error, macro error, repeatability, and Android/iOS/web parity are **NOT VERIFIED**, not assumed to be good or bad.

## 1. Architecture map

### Capture entry points

1. `artifacts/calora/app/(tabs)/scan.tsx` is the primary native Scan surface. It supports Auto, Barcode, Food, Label, library photo selection, receipt selection, voice capture, and text entry.
2. `artifacts/calora/app/(tabs)/index.tsx` opens Quick Add and routes photo logging to `/(tabs)/scan` with the applicable mode/meal parameters.
3. `artifacts/calora/lib/captureRequest.ts` obtains a current Supabase session token, verifies account identity, and calls the generated `analyzeCapture` API client.
4. `artifacts/api-server/src/routes/capture.ts` authenticates the caller, validates image bytes and MIME type, applies the database-backed rate limit, dispatches by mode, persists review candidates, and returns editable analysis.
5. `artifacts/calora/lib/foodMemory.ts` converts the response into a local draft, calculates totals, tracks confidence/provenance, and applies serving/eaten-fraction edits.
6. `artifacts/calora/lib/captureReviewTransitions.ts` creates accepted diary logs and nutrition snapshots after explicit review approval.

### Image and audio lifecycle

- Camera/library image bytes are prepared in the native Scan screen and sent as base64 JPEG/PNG.
- The server validates the base64 syntax, byte size, and actual image signature before provider work.
- Food, label, and receipt images are sent as high-detail `image_url` data URLs to the managed OpenAI-compatible client.
- Voice is transcribed first; the transcript is then a separate text-estimate step. Raw audio is not retained by the capture response path.
- Successful photo/label/receipt responses are marked `delete_after_analysis`; persisted candidate evidence is server-scoped and does not retain the raw image by default.
- Analysis returns a review state. The user can include/exclude components, edit serving values, adjust eaten fraction, retry, or reject before diary persistence.

### Nutrition calculation boundaries

- For photo/text/receipt/label, the provider supplies the initial calories and macros per returned component.
- `parseVisionResponse()` and `ensureComponent()` clamp numeric values, limit components to eight, remove `Unidentified food`, normalize confidence, and synthesize a calorie range when the model omitted one. They do **not** derive calories from ingredients or validate macros against a database.
- `nutritionForComponents()` then calculates the review total as `component value Ã— serving multiplier Ã— eaten fraction` for included components. It rounds the total to whole calories/grams.
- Serving multipliers are deterministic for `per_100g`, `per_100ml`, `fl_oz`, and `per_serving` metadata. Tests cover fluid-ounce conversion and partial consumption.
- Thus, downstream arithmetic is test-covered, but it cannot correct an incorrect visual identity, portion estimate, preparation assumption, or model-provided nutrient value.

## 2. Provider findings

| Provider | Actual role | Classification | Key conclusion |
|---|---|---|---|
| Managed OpenAI-compatible vision (`gpt-5.6-terra`) | Ordinary food-photo, label, and receipt analysis | **CONFIRMED** | It receives the image and returns model-generated identity, components, portions, calories, macros, confidence, assumptions, and review questions. No nutrition-database reconciliation follows. |
| Open Food Facts | Exact barcode product lookup and final reference fallback | **CONFIRMED** | Strict code matching is used. Structured serving quantity fields are requested but not consumed. |
| FatSecret | Exact barcode secondary lookup; Plus recipes; restaurant food/catalog routes | **CONFIRMED** | Not used by ordinary meal-photo analysis. Complete metric servings are copied directly; no model-to-provider reconciliation occurs. |
| USDA FoodData Central | Exact barcode fallback | **CONFIRMED** | Only `foods[0]` is considered; missing nutrients become zero; `nutritionBasis` is hard-coded to `per_serving`. |
| TheMealDB | Recipe discovery and recipe content | **CONFIRMED** | Not used by Scan. It is not a nutrition authority; nutrition is estimated separately or remains unavailable. |

### Managed vision: confirmed limitations

- `analyzeFoodPhoto()` asks the model to identify every visible food/drink and estimate one serving per component.
- The model is instructed to make a best estimate even when the food is unfamiliar. This is useful for recall but increases the risk of confident misidentification.
- The prompt requests confidence dimensions, assumptions, and review questions, but there is no deterministic requirement that a low-confidence result be blocked.
- Model values are accepted after nonnegative/clamped normalization. No ingredient decomposition, weighed portion measurement, food database match, cooked/raw conversion, or independent calorie-macro consistency check is performed.
- A provider timeout, invalid JSON, empty content, or provider failure returns a generic error; there is no alternate image-analysis provider or deterministic offline nutrition fallback.
- A successful analysis can return HTTP 200 even if capture-session persistence fails; in that degraded case `captureSessionId` is absent, weakening server-side audit/retry continuity.

### Open Food Facts: confirmed findings

- Exact barcode matching and the restricted UPC-A/EAN-13 leading-zero equivalence are correctly enforced.
- The server requests `serving_quantity` and `serving_quantity_unit` but `offCandidate()` does not consume them. A product can therefore fall back to a 100 g/100 ml reference basis despite having structured serving metadata.
- `per_serving` is selected if any one serving nutrient exists. Missing companion nutrients are converted to zero by `numberOrZero()`.
- A reference fallback is reviewable and not necessarily the package serving actually eaten.

### FatSecret: confirmed findings

- FatSecret is not in `analyzeFoodPhoto()` and cannot currently validate a visually recognized meal.
- Barcode lookup uses exact GTIN forwarding and selects the provider default complete metric serving, otherwise the first complete serving.
- Complete calories, protein, carbohydrate, and fat values are copied directly; there is no independent recomputation.
- When FatSecret is attempted but all barcode providers fail, the unavailable response labels only Open Food Facts + USDA, omitting FatSecret from diagnostic provenance. This is a confirmed provenance-label defect, not evidence of wrong nutrition.
- Gateway/direct-credential activation and live provider availability were not tested.

### USDA FoodData Central: confirmed findings

- USDA search requests up to five results but only inspects `foods[0]`; a later exact GTIN is ignored.
- Nutrients are mapped by exact nutrient-name strings. Missing/invalid values become numeric zero rather than unavailable.
- The candidate is labeled `per_serving` regardless of the upstream response's actual nutrient basis.
- USDA is not used for ordinary meal-photo analysis.

### TheMealDB: confirmed scope

- TheMealDB supplies recipe IDs, names, ingredients, instructions, categories, areas, tags, and trusted thumbnails through recipe routes.
- Its direct recipe records initialize primary nutrition as null. Separate AI/cache estimation may populate recipe nutrition.
- It is not a barcode or photo-scan fallback and must not be described as verified nutrition.

## 3. Confirmed defects and risks

| ID | Finding | Classification | Affected surface | Severity |
|---|---|---|---|---|
| F-01 | Photo nutrition is model-generated without independent ingredient/database reconciliation. | **CONFIRMED architectural limitation** | Food/photo scans on native and any client using `/v1/capture/analyze` | P0 for any claim of accurate commercial nutrition; P1 if clearly labeled estimate and reviewed |
| F-02 | Open Food Facts structured serving quantity/unit is fetched but ignored. | **CONFIRMED defect** | Barcode scans | P1 |
| F-03 | Open Food Facts can mark `per_serving` with incomplete nutrients represented as zero. | **CONFIRMED defect/risk** | Barcode scans | P1 |
| F-04 | USDA maps missing nutrients to zero, hard-codes `per_serving`, and checks only the first search result. | **CONFIRMED defect/risk** | Barcode scans | P1 |
| F-05 | Barcode-unavailable provider label can omit an attempted FatSecret lookup. | **CONFIRMED provenance defect** | Barcode error/recovery UI and diagnostics | P2 |
| F-06 | No alternate vision provider or deterministic image-only fallback exists. | **CONFIRMED resilience gap** | Food/photo scans | P1 |
| F-07 | A 200 review response may lack a server-issued capture session if persistence fails. | **CONFIRMED degraded-audit behavior** | Capture retry/referral/audit continuity | P1 |
| F-08 | TheMealDB recipe nutrition is estimated separately and may remain null. | **CONFIRMED product boundary** | Recipes only | P2; not a scan defect |

## 4. Claims investigated but not verified

The following cannot be honestly quantified from the available evidence:

- Food identification accuracy for recognizable, mixed, culturally diverse, restaurant, packaged, or visually similar meals.
- Ingredient recall for sauces, oils, toppings, and side dishes.
- Cooked-versus-raw classification accuracy.
- Portion-estimation error and whether displayed portions are systematically biased.
- Calorie, protein, carbohydrate, and fat absolute or percentage error.
- Repeatability for the same image across runs.
- Android versus iOS versus web parity in live scanning.
- Current production provider credentials, provider traffic, model availability, latency, rate limits, retention, or billing.
- Current deployed backend behavior versus the inspected source.
- Any claim that different photos currently produce nearly identical nutrition because of a hardcoded default. No such hardcoded photo default was found in the inspected path; the stronger confirmed issue is unverified model estimation without independent validation.
- Downstream behavior after all possible UI correction combinations beyond the existing unit coverage.

## 5. Existing validation evidence

Executed locally with mocked providers and no production access:

- `artifacts/api-server/src/__tests__/capture.test.ts`: **65/65 passed**. Covers image/text/voice/receipt/label dispatch, managed-vision calls, provider failures, barcode matching, Open Food Facts, FatSecret and USDA fallback behavior, and Auto-mode routing.
- `artifacts/calora/lib/__tests__/foodMemory.test.ts`: **74/74 passed**. Covers serving multipliers, fluid-ounce conversion, eaten fraction, provenance, draft construction, and recalculation.
- `artifacts/calora/lib/__tests__/captureReview.test.ts`: **76/76 passed**. Covers review approval/rejection, accepted snapshots, partial consumption, serving edits, and persisted diary values.

These results prove code-path contracts and arithmetic behavior under fixtures. They do **not** prove provider quality, production configuration, or real-world recognition accuracy.

## 6. Benchmark status and required measurement

No authorized benchmark image set with independently verified ingredients, weighed portions, and reference nutrition was present in the inspected repository. No user meal photos were accessed, and no external images were downloaded. Accordingly, sample size and error metrics are **N/A**, not zero.

A proper non-production benchmark should contain at minimum:

- Simple single-food images.
- Mixed meals with separately weighed components.
- African and other culturally diverse dishes.
- Restaurant plates and sauces/oils/toppings.
- Packaged foods with a visible barcode or nutrition label.
- Cooked/raw look-alikes and visually similar foods with different nutrition.
- Repeated captures of the same image across at least two runs and available platforms.

For each item, record expected components, grams/ml, preparation, reference calories/macros, model output, confidence dimensions, user correction, final saved values, provider latency, and whether a server capture session was persisted. Report component precision/recall, portion MAE/MAPE, calorie and macro MAE/MAPE, severe outliers, repeatability, and fallback frequency. Do not mix barcode-verified rows with photo-estimate rows in one accuracy score.

## 7. Root-cause conclusion

The main inaccuracy mechanism is not a single arithmetic bug. It is a missing verification stage:

`image -> managed vision identity/portion/nutrition estimate -> client review -> diary`

The current production-design boundary is not:

`image -> identity -> ingredient/portion verification -> authoritative nutrition lookup -> reviewed result`.

Therefore, visually plausible but nutritionally wrong output can survive unless the user recognizes and corrects it. Confidence and review questions improve transparency but do not establish correctness. Barcode scans have an independent, more defensible provider chain, but their serving-basis and completeness defects can still misstate totals.

## 8. Recommended permanent accuracy strategy

### Priority 0 â€” preserve honesty and prevent silent overclaiming

- Keep photo results explicitly `Photo estimate` / `Managed vision estimate`.
- Never label photo-derived calories or macros as verified.
- Require visible uncertainty for low identity/portion/nutrition-source confidence and require correction or confirmation before saving.
- Expose assumptions and high-impact review questions in the review UI.

### Priority 1 â€” harden deterministic nutrition paths

- Consume and validate Open Food Facts `serving_quantity` and `serving_quantity_unit`.
- Require a coherent complete nutrient set before using `per_serving`; represent missing nutrients as unavailable rather than zero.
- For USDA, scan all returned records for an exact GTIN, preserve the actual nutrient basis, and reject or mark incomplete records instead of hard-coding `per_serving`.
- Return structured attempted-provider provenance including FatSecret.
- Treat missing `captureSessionId` as a degraded persistence state with a retry/recovery affordance, not indistinguishable success.

### Priority 1 â€” add a reviewed post-vision reconciliation stage

For image-only meals, use a staged, cost-bounded design:

1. Vision proposes components, preparation, portion range, and confidence.
2. The user confirms or corrects names, portions, and components.
3. Only confirmed components are matched to a nutrition database or curated ingredient catalog using normalized names and preparation context.
4. Nutrition is calculated from matched ingredient records and confirmed quantities, with an explicit estimate when no reliable match exists.
5. Keep the original visual estimate alongside the reconciled result for auditability; never silently replace one with the other.
6. Offer barcode/label capture for packaged or uncertain items instead of fabricating precision.

This is preferable to automatically trusting model-generated macros or adding TheMealDB to the scan path.

### Priority 2 â€” resilience and measurement

- Provide a manual/text fallback when vision is unavailable.
- Add deterministic test fixtures for ambiguous, incomplete, cooked/raw, mixed, and culturally diverse meals.
- Add end-to-end non-production benchmark execution before launch claims.
- Measure model/provider cost per scan and set explicit timeouts, rate limits, and retry budgets.

## 9. Launch-readiness criteria

Meal-recognition certification should remain **CONDITIONAL/FAIL for commercial accuracy claims** until all of the following are met:

1. A versioned benchmark exists with independent reference values and licensed/test-owned images.
2. Photo and barcode results are scored separately.
3. Photo results show measured component recall, portion error, calorie/macro error, severe outliers, and repeatability.
4. Low-confidence results cannot silently appear as verified nutrition.
5. Barcode serving basis and nutrient completeness are corrected and covered by regression tests.
6. Vision-to-database reconciliation or an explicitly approved estimate-only product position is implemented and validated.
7. Capture persistence degradation is visible and recoverable.
8. Authorized Android, iOS, and web runtime evidence confirms the same review, correction, and save semantics.

## Final classification

**Overall:** `CONFIRMED DEFECTS + NOT VERIFIED ACCURACY; NOT READY FOR A FULL COMMERCIAL NUTRITION-ACCURACY CLAIM.`

Calora has a functioning, well-tested capture/review pipeline and a stricter barcode provider path, but source-level tests cannot substitute for measured recognition accuracy. The next mission should be a bounded non-production benchmark plus deterministic provider-serving corrections, followed by a reviewed post-vision nutrition reconciliation design. No implementation was performed under CAL-SCAN-FORENSIC-001.
