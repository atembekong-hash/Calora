# 248 â€” CAL-SCAN-ACCURACY-007 Correction Report

## Status

**Implementation complete for the offline, evidence-backed correction slice.** The source remains unmerged and undeployed as required. No native build, production change, database mutation, or paid benchmark rerun was performed.

The frozen 10-meal baseline remains unchanged:

- Evidence: `benchmarks/cal-scan-accuracy-002-v1/runs/direct-openai-nutrition5k-baseline.json`
- SHA-256: `9DA33E5FED47BF289BDF89E7EC4EB7F44C745B0349423E8E89E15DA868EB20EF`
- All 10 records remain preserved, including the deprecated reference row.
- Primary scoring continues to exclude the deprecated row from valid semantic interpretation.

The prior report's signed fat-bias wording was corrected from â€œaboveâ€ to **13.6% below the reference total**. The raw evidence was not changed.

## Confirmed defects addressed

The frozen baseline demonstrated five directly actionable defects in the photo-analysis boundary:

1. Gram estimates appeared only in free-text serving descriptions while structured `servingWeightG` remained null.
2. Low-confidence or hedged identities could receive precise-looking nutrition without an explicit identity-confirmation warning.
3. Exact duplicate components could be counted twice.
4. Large total portions had no conservative review warning.
5. The vision prompt did not sufficiently constrain unsupported substitutions, duplicate components, or unsupported splitting of one item into multiple varieties.

## Exact engineering changes

### `artifacts/api-server/src/routes/capture.ts`

- Added conservative `servingWeightG` extraction from explicit `g`/`grams` values in the serving description when the provider omits the numeric field.
- Rejects invalid, nonpositive, or implausibly large extracted weights instead of inventing a value.
- Preserves unknown weights as `null` and keeps the original serving text unchanged.
- Adds identity-uncertainty assumptions and review questions when confidence is low or the name contains uncertainty language such as â€œlikelyâ€, â€œpossibleâ€, â€œorâ€, or â€œunknownâ€.
- Removes only exact duplicate components: normalized same name, same structured weight, and identical nutrition values. Components with different weights or nutrition remain separate.
- Adds a review warning when the normalized total known portion exceeds a conservative threshold.
- Strengthens the existing food-photo prompt to require structured weights when defensible, avoid unsupported substitutions and duplicate counting, and preserve uncertainty.
- Exposed `parseVisionResponse` for deterministic offline testing only; route behavior and authentication boundaries are unchanged.

### `artifacts/api-server/src/__tests__/capture.test.ts`

Added deterministic tests covering:

- Explicit gram extraction.
- Uncertain identity warnings.
- Exact duplicate removal.
- Preservation of genuinely separate portions with different weights/nutrition.

## Validation results

- Focused recognition-safeguard tests: **2/2 passed**.
- Full API capture regression suite: **68/68 passed**.
- API/database TypeScript build validation: **passed**.
- Diff whitespace check: **passed**; only line-ending normalization warnings were reported by Git.
- Raw baseline hash verification: **passed**; unchanged SHA-256 is `9DA33E5FED47BF289BDF89E7EC4EB7F44C745B0349423E8E89E15DA868EB20EF`.
- Paid provider calls during this mission: **0**.

## Before-and-after accuracy

A new paid before/after benchmark was intentionally **not run** in this phase. Therefore, no measured accuracy improvement is claimed. The 10-meal baseline in report 247 remains the only measured accuracy result.

The implemented changes are expected to improve defensibility and downstream nutrition safety, but they cannot prove improved visual recognition accuracy without rerunning the same nine valid reference cases through the secure launcher. The deprecated row remains traceable but must remain excluded from primary semantic scoring.

## Nutrition reconciliation status

The current change establishes the structured and review-safe boundary needed for reconciliation but does not claim a new database match. USDA/FatSecret reconciliation must remain a distinct, user-confirmed step that:

- Uses the confirmed candidate and structured quantity.
- Validates serving basis and units.
- Retains the original photo estimate and provenance.
- Marks database-derived values as verified only when the match is reliable.
- Falls back to editable estimates when matching is unavailable.

No production provider or database calls were introduced by this report.

## Remaining limitations

- Portion weights inferred from free text are still estimates; the provider should emit `servingWeightG` directly whenever possible.
- Exact duplicate protection does not solve semantic duplicates with different wording; a future reconciliation layer should use controlled food identities and confidence-aware matching.
- No live before/after accuracy measurement exists yet.
- Mixed-meal component recall and preparation recognition remain unproven beyond the frozen baseline.
- The benchmark contains one deprecated reference row and should be scored with the nine valid cases as the primary set.
- Existing working-tree changes and benchmark artifacts from prior missions remain outside this focused source change; no unrelated files were intentionally modified here.

## Release recommendation

**Do not merge or release yet.** The correction is ready for protected CI review and a secure paid rerun, but the success condition of measurable improvement has not yet been satisfied. The next authorized validation should use the same original reference images, the same model and prompts, the same secure launcher, and the existing cumulative spending safeguards. Compare the nine valid cases before and after, report regressions honestly, and only then consider merge/release review.
