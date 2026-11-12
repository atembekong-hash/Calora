# 249 â€” CAL-SCAN-ACCURACY-008 Final Before/After Analysis

## Verdict

**The corrections improved recognition and safety behavior, but did not improve overall nutrition accuracy or establish usable numeric portion accuracy.** The result is a measurable mixed outcome, not a release-grade accuracy pass.

The prompt and normalization changes produced better conservative behavior: fewer unmatched/invented components, higher recognition recall and precision, no duplicate components, and more explicit uncertainty. However, aggregate calorie, carbohydrate, and fat absolute error increased; protein error improved. `servingWeightG` remained unavailable for every scored component because the model did not return defensible numeric gram weights in these nine runs. The implementation correctly preserved those values as unavailable rather than inventing weights from vague serving text.

## Evidence integrity

Both raw evidence files were read-only inputs and remain unchanged:

- Frozen baseline: `benchmarks/cal-scan-accuracy-002-v1/runs/direct-openai-nutrition5k-baseline.json`
- Baseline SHA-256: `9DA33E5FED47BF289BDF89E7EC4EB7F44C745B0349423E8E89E15DA868EB20EF`
- Post-correction: `benchmarks/cal-scan-accuracy-002-v1/runs/direct-openai-nutrition5k-post-correction.json`
- Post-correction SHA-256: `1B052D1ACBA7B610FB462EA081A5B27B53178DAE8BE9EFA63E783B5605CC35AA`

The deprecated case `N5K-1558030724` is excluded from primary scoring. The comparison therefore covers the same nine valid meals in both runs, with the same model (`gpt-5.6-terra`) and reference data.

## Aggregate recognition results

Recognition uses conservative token matching against the independent `known_items` references. Both macro-average recall and micro totals are shown because meals contain different numbers of reference items.

| Metric | Baseline | Post-correction | Change |
|---|---:|---:|---:|
| Macro-average identity recall | 55.6% | 63.0% | +7.4 pp |
| Micro identity recall | 53.8% (7/13) | 69.2% (9/13) | +15.4 pp |
| Micro identity precision | 46.7% (7/15) | 64.3% (9/14) | +17.6 pp |
| Reference items omitted | 6 | 4 | âˆ’2 |
| Unmatched/invented predicted components | 8 | 5 | âˆ’3 |
| Duplicate components | 0 | 0 | unchanged |

The largest recognition gains were on `N5K-1556575558` (recall 67% to 100%; beans were corrected from dark beans to dark olives) and `N5K-1557861837` (33% to 67%, although fish was still missed). Eggs, bacon, and raspberries retained full recognition. Olives, potatoes, yams, and berries remained difficult or only partially matched depending on the reference wording.

## Nutrition error comparison

Values below are mean absolute error across the nine scored meals, using component totals compared with the independent Nutrition5k reference totals.

| Nutrient | Baseline MAE | Post-correction MAE | Change |
|---|---:|---:|---:|
| Calories | 30.28 kcal | 46.10 kcal | +15.82 kcal worse |
| Protein | 2.18 g | 1.11 g | âˆ’1.06 g better |
| Carbohydrates | 4.91 g | 5.19 g | +0.28 g worse |
| Fat | 1.47 g | 2.37 g | +0.90 g worse |

Mean absolute percentage errors, which are more sensitive to small reference values, were calories 40.3% to 69.2%, protein 65.5% to 43.0%, carbohydrates 79.1% to 92.4%, and fat 38.8% to 50.3%. These percentages should not be treated as a production accuracy score; they are diagnostic summaries of this small, visually challenging sample.

The strongest nutrition improvement occurred on `N5K-1556575558`: protein MAE fell from 8.13 g to 2.13 g, carbohydrate MAE from 20.38 g to 7.38 g, and fat MAE from 4.88 g to 3.12 g. The largest regression was `N5K-1557861837`, where the post-correction response added or retained multiple vegetable interpretations while still missing the reference fish: calorie MAE rose from 98.12 to 203.12 kcal, carbohydrate MAE from 13.54 to 21.54 g, and fat MAE from 2.67 to 10.17 g.

## Portion and structured weights

Numeric portion accuracy could not be measured in either run. Every scored component in both raw evidence files had `servingWeightG: null`; therefore a gram-level MAE would be fabricated if calculated from the textual serving descriptions.

- Baseline structured numeric weights: 0 components.
- Post-correction structured numeric weights: 0 components.
- Portion MAE: **not measurable**.
- Textual descriptions sometimes mention approximate units or portions, but those are not numeric `servingWeightG` values and were not converted into weights.

This is an important safety result, not a silent failure: the revised logic avoids asserting a gram weight when the model did not provide a defensible one. The next engineering step must make portion capture an explicit user-confirmed interaction or a separate calibrated estimation path; it should not infer grams from phrases such as â€œabout a cupâ€ without a verified conversion basis.

## Safety and review behavior

Low-confidence components increased from 6 to 7 under the reportâ€™s conservative flagging rule. This is acceptable and expected: the new response more often marks uncertain alternatives such as â€œpossibly,â€ â€œlikely,â€ or â€œcould be another.â€ It indicates improved uncertainty disclosure rather than improved certainty. Duplicate components remained zero in both runs.

No raw response claimed verified nutrition. The responses continued to label results as managed vision estimates, preserved editable values, and added review questions around identity, preparation, oil, and eaten amount. These safeguards improved reviewability but do not by themselves establish nutrition accuracy.

## Latency, usage, and cost

| Metric | Baseline, nine scored cases | Post-correction | Change |
|---|---:|---:|---:|
| API calls | 9 | 9 | unchanged |
| Mean latency | 7,281.8 ms | 7,872.2 ms | +590.4 ms (+8.1%) |
| Estimated run cost | $0.066960 | $0.072732 | +$0.005772 (+8.6%) |
| Total baseline evidence cost including deprecated case | $0.072240 | n/a | preserved |
| Cumulative local ledger after both runs | n/a | $0.144972 | under $8 ceiling |
| Local budget remaining | n/a | $7.855028 | available, no further call authorized here |

The post-correction run cost and latency were modestly higher, consistent with the expanded prompt and response structure. No additional paid calls were made for this analysis.

## Per-meal summary

| Case | Recall before â†’ after | Calorie MAE before â†’ after | Protein MAE before â†’ after | Main finding |
|---|---:|---:|---:|---|
| N5K-1556572657 | 100% â†’ 100% | 10.6 â†’ 23.6 kcal | 0.11 â†’ 0.21 g | Olives remained recognized, but nutrition estimate worsened. |
| N5K-1556575558 | 67% â†’ 100% | 60.7 â†’ 56.7 kcal | 8.13 â†’ 2.13 g | Beans corrected to olives; broad nutrition improvement. |
| N5K-1557861837 | 33% â†’ 67% | 98.1 â†’ 203.1 kcal | 5.20 â†’ 1.70 g | Fish still omitted; vegetable over-segmentation caused major calorie/carbohydrate error. |
| N5K-1557936555 | 100% â†’ 100% | 5.3 â†’ 5.3 kcal | 1.00 â†’ 0.60 g | Stable eggs result; small protein improvement. |
| N5K-1557937715 | 100% â†’ 100% | 0.3 â†’ 2.7 kcal | 0.03 â†’ 0.07 g | Stable raspberry identity; small nutrition regression. |
| N5K-1558028007 | 0% â†’ 0% | 15.3 â†’ 40.3 kcal | 0.18 â†’ 0.58 g | Potato identity still missed; portion remains unavailable. |
| N5K-1558029278 | 100% â†’ 100% | 61.1 â†’ 60.1 kcal | 3.99 â†’ 3.99 g | Bacon identity stable; calorie nearly unchanged. |
| N5K-1558031526 | 0% â†’ 0% | 13.1 â†’ 13.1 kcal | 0.71 â†’ 0.51 g | Yam versus sweet potato remains unresolved. |
| N5K-1558110297 | 0% â†’ 0% | 8.1 â†’ 10.1 kcal | 0.24 â†’ 0.24 g | Generic berries remain difficult to map to references. |

## Recommended next engineering action

Implement a **portion-and-identity confirmation step backed by a curated nutrition lookup**, rather than another prompt-only iteration. For each uncertain visual component, present the user with the top one-to-three candidate identities, ask for a measurable portion unit or grams, and resolve the confirmed item against USDA/FatSecret data with explicit provenance. Keep the original photo estimate, uncertainty flag, and editable review state. This directly addresses the dominant remaining risks: zero numeric weights, wrong ingredient substitutions, hidden preparation calories, and over-segmentation of ambiguous plates.

## Final status

**Measured improvement: PASS for recognition/review safeguards; FAIL for overall nutrition-accuracy improvement and portion measurement.** The correction is valuable and safer, but the scanner is not ready to claim reliable autonomous nutrition logging from meal photos. No deployment, merge, native build, or additional paid call was performed.
