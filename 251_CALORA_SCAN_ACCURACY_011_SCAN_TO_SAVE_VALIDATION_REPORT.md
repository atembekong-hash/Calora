# CAL-SCAN-ACCURACY-011 — Complete Scan-to-Save Validation

## Verdict

**CONDITIONAL PASS for deterministic source-level Scan-to-Save behavior.** The reviewed meal can be reconciled against a complete FatSecret serving, adjusted in grams, partially consumed, and accepted into the diary without double scaling. Ambiguous and incomplete provider results remain user-correctable or fail closed. Physical Android/iOS execution, real camera capture, provider latency under live traffic, and offline native recovery remain unverified because this mission prohibited builds, paid calls, and device changes.

No vision benchmark evidence was modified. No paid AI calls, production access, database mutations, deployments, merges, or native builds occurred.

## Complete journey validation

The deterministic journey exercised the same pure transitions used by the Scan review/save flow:

1. A photo estimate enters review with editable serving and uncertainty metadata.
2. A FatSecret record with a verified 100 g basis is reconciled.
3. A confirmed 200 g portion is converted to 330 kcal, 62 g protein, 0 g carbohydrate, and 7.2 g fat at component level.
4. The reconciled component is stored as one logical serving, preventing FoodMemory from scaling it again.
5. The accepted diary log preserves 330 kcal, 62 g protein, 0 g carbohydrate, and the app's intentional whole-gram fat snapshot of 7 g.
6. A 50% eaten fraction produces 165 kcal, 31 g protein, 0 g carbohydrate, and the rounded diary fat snapshot of 4 g.
7. A mixed meal preserves the unrelated photo-estimate component while combining it with the provider-backed component.
8. Incomplete provider data fails closed and leaves the original photo estimate unchanged.

The app retains its quick path for clear matches: high-confidence, non-ambiguous provider matches are applied automatically. A lower-confidence or ambiguous result remains visible as a possible match with an explicit **Use top match** action. Users can still edit servings, include/remove components, adjust eaten fraction, or reject the meal.

## Provider matching and identity safety

Matching is token-ranked only and never proves that the photographed food is identical to a provider record. Automatic application requires a top score of at least 0.8 and a margin of at least 0.15 over the next result, plus complete provider calories and macros and a compatible serving basis. Ambiguous matches are not silently marked verified. The component retains provider provenance only after a concrete record is selected or safely auto-applied.

Provider-backed nutrition and visual identity remain distinct: FatSecret verifies the nutrition record and serving basis, not the visual identity of the photographed item.

## Request efficiency

The Scan card issues at most one bounded search per eligible component: included photo estimates with a name of at least two characters. Each request asks for five results, retries are disabled, and the query key is stable for React Query caching. Identical food names share the same cached key for five minutes, preventing repeated requests while the review sheet remains open. Barcode/provider-backed components do not trigger photo-estimate searches.

This is a source-level efficiency validation. No live provider calls were made in this mission, so real network latency, rate-limit behavior, and upstream availability remain unmeasured.

## Confirmed correction

One integration defect was corrected during this mission. The first implementation returned `null` whenever the match was not safe enough for automatic application, which made ambiguous provider results disappear from the UI. The Scan card now distinguishes:

- `Nutrition match applied automatically` for safe matches;
- `Possible nutrition match — review before using` with an explicit action for ambiguous but usable matches.

The correction does not force an extra screen or mandatory interaction for straightforward meals.

## Validation evidence

### Mobile deterministic validation

The focused suite was executed three consecutive times with identical results:

- `scanToSave.test.ts`: 4 passed
- `scanScreen.test.ts`: 16 passed
- `nutritionReconciliation.test.ts`: 3 passed
- `captureReview.test.ts`: 76 passed
- `foodMemory.test.ts`: 74 passed
- **Total: 173 tests passed per run; 519 successful test executions across three runs.**

Coverage includes complete provider reconciliation, gram scaling, partial consumption, mixed meals, incomplete provider data, no-double-scaling behavior, source-level request gating, ambiguity handling, existing review controls, and acceptance transitions.

### API validation

With the disposable localhost-only test database URL:

- Premium/provider regressions: 33 passed
- Capture regressions: 68 passed
- **Total: 101 API tests passed.**

Mobile and API TypeScript project validation both passed. `git diff --check` reported no whitespace errors in the new Scan changes.

## Remaining limitations

- No live provider calls were made; provider latency, rate limits, and transient failures require a separately authorized test-provider run.
- No real camera capture, Android UI automation, iOS execution, or offline native recovery was performed.
- The generated diary snapshot intentionally rounds macro grams to whole numbers; component-level values retain the more precise provider calculation.
- No new paid benchmark was run, and reports 247–249 plus both raw benchmark evidence files remain unchanged.

## Release recommendation

The Scan-to-Save source path is ready for protected review as a focused integration correction. Before release certification, run the existing same-image post-correction benchmark only if paid-call authorization is provided, then perform physical Android and iOS review/save validation using an authorized build. Do not claim full native Scan certification from this report alone.
