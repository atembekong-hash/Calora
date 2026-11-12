# 247 â€” CAL-SCAN-ACCURACY-006 Nutrition5k Measured Accuracy Baseline

## Scope and provenance

This report analyzes the completed 10-call baseline only. No additional provider calls were made, and the raw evidence was not modified.

- Evidence: `benchmarks/cal-scan-accuracy-002-v1/runs/direct-openai-nutrition5k-baseline.json`
- Evidence SHA-256: `9DA33E5FED47BF289BDF89E7EC4EB7F44C745B0349423E8E89E15DA868EB20EF`
- Model: `gpt-5.6-terra`
- Calls: 10/10 successful, HTTP status 200
- Recorded estimated cost: **$0.07224**
- Recorded usage: **6,480 prompt tokens; 4,940 completion tokens; 11,420 total tokens**
- Structured `servingWeightG`: null for every response. Portion comparisons below therefore parse the first gram estimate from each component's human-readable `serving` string and sum those estimates. This is an analysis workaround, not a change to the baseline.

Percentage error is `abs(predicted - reference) / abs(reference) Ã— 100`. No reference metric in these 10 rows is zero. If a future reference is zero, a predicted zero is reported as 0% and a nonzero prediction is reported as undefined rather than using division by zero.

## Per-meal results

| Case | Reference foods | Model foods | Calories predicted / reference | Protein g predicted / reference | Carbs g predicted / reference | Fat g predicted / reference | Portion predicted / reference | Latency |
|---|---|---|---:|---:|---:|---:|---:|---:|
| N5K-1556572657 | olives | dark cured olives, likely Kalamata | 52 / 41.4 (**25.6%**) | 0.4 / 0.288 (**38.9%**) | 2.7 / 2.268 (**19.0%**) | 4.9 / 3.852 (**27.2%**) | 45 / 36 g (**25.0%**) | 8,036 ms |
| N5K-1556575558 | celery, olives, Brussels sprouts | Brussels sprouts, dark beans, celery | 164 / 103.3 (**58.8%**) | 11 / 2.868 (**283.5%**) | 31 / 10.618 (**192.0%**) | 2 / 6.882 (**70.9%**) | 230 / 154 g (**49.4%**) | 11,369 ms |
| N5K-1557861837 | eggplant, Caesar salad, fish | leafy salad, eggplant cubes, eggplant slice | 160 / 61.884 (**158.5%**) | 3.5 / 8.698 (**59.8%**) | 18 / 4.46 (**303.6%**) | 8.5 / 5.827 (**45.9%**) | 170 / 123 g (**38.2%**) | 11,443 ms |
| N5K-1557936555 | eggs | scrambled eggs | 144 / 149.28 (**3.5%**) | 13 / 12 (**8.3%**) | 1 / 1.152 (**13.2%**) | 10 / 10.08 (**0.8%**) | 100 / 96 g (**4.2%**) | 4,989 ms |
| N5K-1557937715 | raspberries | raspberries | 21 / 20.67 (**1.6%**) | 0.5 / 0.468 (**6.8%**) | 4.8 / 4.68 (**2.6%**) | 0.3 / 0.273 (**9.9%**) | 40 / 39 g (**2.6%**) | 5,126 ms |
| N5K-1558028007 | potatoes | cooked potato pieces | 70 / 54.67 (**28.0%**) | 1.6 / 1.42 (**12.7%**) | 16 / 12.07 (**32.6%**) | 0.1 / 0.071 (**40.8%**) | 80 / 71 g (**12.7%**) | 6,234 ms |
| N5K-1558029278 | bacon | cooked bacon | 85 / 146.07 (**41.8%**) | 6 / 9.99 (**39.9%**) | 0 / 0.378 (**100.0%**) | 7 / 11.34 (**38.3%**) | 18 / 27 g (**33.3%**) | 5,772 ms |
| N5K-1558030724 | **deprecated reference label** | watermelon | 45 / 18.3 (**145.9%**) | 0.9 / 0.366 (**145.9%**) | 11.4 / 4.636 (**145.9%**) | 0.2 / 0.061 (**227.9%**) | 150 / 61 g (**145.9%**) | 5,506 ms |
| N5K-1558031526 | yam | orange and purple sweet potato | 90 / 76.942 (**17.0%**) | 1.7 / 0.992 (**71.4%**) | 21 / 18.228 (**15.2%**) | 0.1 / 0.124 (**19.4%**) | 100 / 62 g (**61.3%**) | 6,901 ms |
| N5K-1558110297 | berries | raspberries and blackberries | 21 / 29.07 (**27.8%**) | 0.6 / 0.357 (**68.1%**) | 4.7 / 7.14 (**34.2%**) | 0.3 / 0.153 (**96.1%**) | 45 / 51 g (**11.8%**) | 5,666 ms |

## Aggregate results

### Nutrition

| Metric | Mean absolute error | Mean absolute percentage error | Aggregate signed-total error |
|---|---:|---:|---:|
| Calories | **29.925 kcal** | **50.9%** | **21.4%** over reference total |
| Protein | **2.013 g** | **73.5%** | **4.7%** over reference total |
| Carbohydrates | **5.091 g** | **85.8%** | **68.5%** over reference total |
| Fat | **1.339 g** | **57.7%** | **13.6%** below reference total |

The mean percentage errors are dominated by very small reference quantities. Aggregate signed-total error is included to show meal-set-level bias and should not replace per-meal error.

### Portion and recognition

- Mean absolute portion error: **28.8 g**.
- Mean absolute percentage portion error: **38.4%**.
- Portion direction: **8 of 10** cases were overestimated; one was underestimated (bacon), and one was underestimated (mixed berries).
- Mean latency: **7,104 ms**; range **4,989â€“11,443 ms**.
- Token usage: **648 prompt tokens per request**, **4,940 completion tokens total**, **11,420 total tokens**.
- Estimated cost: **$0.07224 total**, approximately **$0.007224 per scan**.

Using conservative synonym-aware matching of reference food labels to model components, 10 of 14 reference items were recovered (**71.4% micro recall**). The model returned 16 components, of which approximately 10 matched a reference item (**62.5% micro precision**). The deprecated-label row is not a valid semantic recognition target; excluding it improves the valid-reference recall denominator but does not change the recorded nutrition errors. These identity numbers are benchmark-label matching metrics, not claims of visual ground truth beyond the published references.

## Missing, incorrect, and invented ingredients

- **N5K-1556572657:** olives were recognized; variety was uncertain but not materially wrong. No obvious invented ingredient.
- **N5K-1556575558:** celery and Brussels sprouts were recognized. The reference contains olives, but the model invented/replaced them with dark beans. This substitution caused the major protein and carbohydrate overestimate.
- **N5K-1557861837:** eggplant was recognized twice, but fish was omitted and Caesar salad was only described generically. A second eggplant component was likely a duplicate/misclassification.
- **N5K-1557936555:** scrambled eggs was a good semantic match for eggs.
- **N5K-1557937715:** raspberries were correctly identified.
- **N5K-1558028007:** potatoes were correctly identified with a preparation uncertainty.
- **N5K-1558029278:** bacon was correctly identified, but portion and nutrition were undercalled.
- **N5K-1558030724:** the published label is `deprecated`, so this row is not a valid ingredient-recognition target. The model called it watermelon; the reference nutrition fields should not be treated as a reliable semantic truth for this row.
- **N5K-1558031526:** yam was rendered as two sweet-potato components. This is a plausible visual synonym but an unsupported split that inflated the portion estimate.
- **N5K-1558110297:** the generic reference `berries` was rendered as raspberries and blackberries. The split is plausible but not directly supported by the reference label; total fruit weight was slightly low.

## Largest outliers and root causes

1. **N5K-1557861837:** 158.5% calorie error and 303.6% carbohydrate error. The model failed to identify fish, duplicated eggplant, and assigned generic salad/eggplant estimates. This is primarily a component-count and identity failure, not just a calorie arithmetic problem.
2. **N5K-1556575558:** 283.5% protein and 192.0% carbohydrate error. The model substituted high-protein/high-carbohydrate beans for reference olives. This demonstrates that visual uncertainty is not being sufficiently gated before nutrition is assigned.
3. **N5K-1558030724:** 145.9% calorie error and 227.9% fat percentage error, but the published reference label is deprecated. This is a benchmark-quality limitation and should be excluded from model-quality ranking after preserving it in the raw baseline.
4. **N5K-1558031526:** 61.3% portion error caused by splitting one generic yam reference into two sweet-potato components.
5. **N5K-1558029278:** 41.8% calorie error despite correct bacon identity; the model under-estimated the visible portion and therefore the nutrition.

The recurring causes are: portion weights emitted only in free text; lack of structured gram output; visual substitutions between nutritionally dissimilar foods; duplicate components; unsupported decomposition of generic reference labels; and photo-only nutrition estimates that are not reconciled to a verified food database.

## Smallest evidence-based engineering corrections

1. **Make portion weight structured:** require a numeric `servingWeightG` in the response schema and reject or flag responses where grams appear only in prose. Preserve the prose serving for user review, but use the structured value for calculations and evaluation.
2. **Add an uncertainty gate before nutrition assignment:** when identity confidence is low or the candidate conflicts with a visually plausible alternative, return a review-required candidate with a nutrition range rather than a precise point estimate.
3. **Prevent unsupported component duplication/splitting:** deduplicate near-identical components and require explicit visual evidence before splitting a generic item into multiple varieties or preparations.
4. **Separate recognition from nutrition lookup:** map confirmed or user-approved candidates to USDA/FatSecret records using normalized identity and portion grams; retain the original photo estimate as an editable fallback and provenance record.
5. **Add a component reconciliation pass:** compare total predicted component weights with the image-level edible-portion estimate and flag large deviations before saving.
6. **Curate benchmark labels:** retain the raw `deprecated` case but exclude it from semantic accuracy scoring in future evaluations; document this exclusion rather than deleting the row.
7. **Improve evaluator matching:** use controlled synonyms and label normalization for plural/singular terms such as `berries`, `yam`, `eggs`, and `olives`, while separately reporting exact-label and synonym-aware scores.

These are recommendations only. No model settings, prompts, production code, deployment, or baseline evidence were changed during this analysis.

## Verdict

**Baseline established, accuracy insufficient for unattended nutrition logging.** The scanner recognized simple single foods well in several cases, but mixed or visually ambiguous meals produced large component substitutions and nutrition errors. The strongest immediate correction is structured portion output plus a verified database reconciliation and a hard review gate for low-confidence identities. This report and the raw JSON should be used as the frozen before-state for any later correction benchmark.
