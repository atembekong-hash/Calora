# 241 — CAL-SCAN-ACCURACY-002 Engineering Report

**Starting evidence:** [Report 240](240_CALORA_MEAL_RECOGNITION_AND_NUTRITION_FORENSIC_REPORT.md)  
**Working branch:** `fix/scan-accuracy-002`  
**Base:** protected `origin/main` at `26d63aa173b0e76ed6675c54c9419351b6c11e4b`  
**Scope:** isolated source correction and local validation only. No merge, deployment, production configuration change, database mutation, native build, or device installation was performed.

## Baseline

The existing architecture was reproduced from source and tests:

`image -> managed vision identification/portion/nutrition estimate -> editable review -> local component recalculation -> diary save`

Ordinary image-only meals do not pass through USDA, FatSecret, Open Food Facts, or TheMealDB. Barcode capture remains a separate exact-GTIN chain. Existing report 240 found no authorized benchmark image set with independently measured portions and reference nutrition.

### Baseline measurement status

No numerical accuracy baseline is reported. The repository contains no authorized, independently labeled image corpus, and no user meal images were accessed. Recognition precision/recall, ingredient omission rate, portion error, calorie/macro error, repeatability, latency, and cost per scan are therefore **NOT MEASURED**, not zero. Inventing a before/after accuracy score would invalidate the mission.

## Confirmed root causes addressed in this stage

1. The visual model was allowed to return arbitrary `provenance` and `sourceLabel` values. Although the prompt said not to call image nutrition verified, a model response could still claim `USDA verified` or another authoritative label. The server normalization boundary did not own this contract.
2. Photo components did not guarantee a clear review question about food identity and portion size when the model omitted one.
3. The food-photo prompt did not explicitly separate visible evidence from hidden ingredients, sauces, toppings, sides, and preparation assumptions.
4. Nutrition arithmetic itself was already deterministic and covered by client tests; it is not an evidence-based fix to replace model nutrition with fabricated defaults.

## Changes made

### Server-side provenance hardening

`artifacts/api-server/src/routes/capture.ts`

- `parseVisionResponse()` now accepts the caller-declared provenance and source label.
- `ensureComponent()` now overwrites model-supplied provenance/source labels with the caller-owned values.
- Food, text, and receipt estimates cannot upgrade themselves to verified nutrition.
- Nutrition-label extraction retains the explicit `Nutrition label` / `Label extract` classification.
- Receipt extraction retains `Receipt estimate` / `Receipt line-item estimate`.
- Photo estimates automatically receive the assumption: `Nutrition is a visual estimate and was not verified against a nutrition database.`
- Photo estimates automatically receive the review question: `Confirm the food identity and portion size before saving.`

### Vision instruction hardening

The photo prompt now requires the model to:

- Never invent unseen ingredients or claim certainty from appearance alone.
- Return visually distinct food components and separately identify visible sauces, toppings, and sides when material.
- State important preparation assumptions.
- Keep nutrition explicitly estimated rather than verified.
- Ask high-impact questions about uncertain identity, portion, preparation, hidden ingredients, and consumed quantity.

### Regression coverage

`artifacts/api-server/src/__tests__/capture.test.ts` adds a regression proving that a model response claiming `USDA verified` is returned as `Photo estimate` / `Managed vision estimate` and includes the mandatory estimate assumption and review question.

Barcode routing and serving behavior were not changed in this stage; those findings remain separately tracked as required by the mission.

## Validation evidence

- API capture regression suite: **66/66 passed**.
- Client food-memory suite: **74/74 passed**.
- Client capture-review suite: **76/76 passed**.
- Combined client nutrition/review evidence: **150/150 passed**.
- `git diff --check`: passed.
- API-server TypeScript validation: **BLOCKED by pre-existing repository package/type drift**, not by a reported error in the changed logic. The compiler reports missing `CaloraDatabase` / `createDatabaseFromClient` exports from `@workspace/db` and cascading implicit-any/unknown errors across untouched account-deletion, coach, database-identity, referral, diary, profile, saved-state, and sync files. This baseline issue was not expanded into unrelated work.

## What is not yet implemented

A full post-vision nutrition reconciliation stage—user-confirmed ingredient identity matched to USDA/FatSecret or another verified record—was not added in this bounded stage. Implementing it without a reference benchmark, product-level matching contract, and UI acceptance semantics would risk silently converting uncertain visual guesses into false precision and could introduce recurring provider cost. The current correction establishes the safe provenance boundary needed before that stage.

The current app still uses model-generated photo calories/macros until the user edits or confirms them. The original estimate is traceable as a photo estimate, but a separately reconciled nutrition snapshot does not yet exist.

## Benchmark blocker and next measurable step

The mission's accuracy proof remains blocked until the owner supplies or authorizes a test corpus containing:

- Food identity and component labels.
- Weighed grams/ml or a defensible serving reference.
- Preparation context.
- Reference calories, protein, carbohydrate, and fat.
- Permission to use the images for local/non-production testing.

The corpus should include simple foods, mixed meals, African foods, restaurant meals, packaged items, sauces/toppings, cooked/raw ambiguities, and repeated captures. The same corpus must be run before and after any reconciliation implementation. Barcode-verified rows and photo-estimate rows must be scored separately.

## Release recommendation

**CONDITIONAL — do not merge or release from this branch yet.**

The implemented changes are safe, narrow, and validated by focused tests. They improve honesty and review safety but do not establish improved real-world recognition or nutrition accuracy. Keep the branch isolated pending:

1. An authorized benchmark corpus and measured baseline.
2. Resolution of the repository-wide `@workspace/db` type/export drift or an approved clean CI environment.
3. A reviewed product decision for post-vision reconciliation and its cost ceiling.
4. Same-corpus before/after measurement and supported-platform runtime validation.

No accuracy percentage, cost claim, or full certification verdict is made by this report.
