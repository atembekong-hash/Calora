# 246 â€” CAL-SCAN-ACCURACY-005 Three-Image Smoke Assessment

**Evidence:** `benchmarks/cal-scan-accuracy-002-v1/runs/direct-openai-smoke-2026-11-12T07-26-12.301Z.json`
**Model:** `gpt-5.6-terra`
**Endpoint kind:** direct OpenAI
**Calls:** 3
**Additional paid calls:** 0

## Summary

The smoke test completed all three calls without an API error. The model identified the major meal structure reasonably well, but it also introduced unsupported ingredients in two cases and materially overestimated total visible food weight in all three cases. All three responses were correctly labeled as photo estimates, not verified nutrition. The references provide portion weights but no independent calories or macros, so nutrition accuracy and exact dollar cost are **not measurable from this run**.

## Per-image comparison

### VLM-002 â€” mixed salad

**Reference:** mixed salad with tomatoes, cucumbers, and radicchio; total published portion **160 g**. Published nutrition values are unavailable.

**AI identification:** leafy/cabbage salad greens, tomato, cucumber, shredded carrot, chicken breast, and a partially visible green-coated fried ball possibly falafel. Tomato and cucumber were correct. The response did not identify radicchio specifically, added carrot, and added chicken/falafel that are not present in the benchmark reference.

**AI estimated portions:** 110 g greens + 120 g tomato + 20 g cucumber + 15 g carrot + 28 g chicken + 30 g fried ball = **323 g**, approximately **102% above** the 160 g reference. The response exposed the weights only in serving text; structured `servingWeightG` fields were null.

**AI nutrition total:** 205 kcal, 15.5 g protein, 22.9 g carbohydrates, 6.4 g fat. These values cannot be scored because the reference has no nutrition labels. The lowest-confidence additions were chicken at 61% and the possible falafel at 43%. Review questions appropriately called out dressing/oil and uncertain protein/side-item identity.

**Latency:** 12,358 ms. **Usage/cost:** not recorded in the evidence JSON.

### VLM-004 â€” bread, salad, tuna, olives, mozzarella, banana

**Reference:** bread; mixed salad with lettuce, tomatoes, tuna, black olives, and mozzarella; banana. Published component weights: **59 g + 232 g + 116 g = 407 g**. Published nutrition values are unavailable.

**AI identification:** banana, bread roll, leafy greens, tuna, cherry tomatoes, black olives, and fresh mozzarella. This is a strong ingredient-list match. It changed the bread description to a roll and tomatoes to cherry tomatoes, but did not omit any major reference component.

**AI estimated portions:** 118 g banana + 65 g bread + 60 g greens + 85 g tuna + 90 g tomatoes + 20 g olives + 60 g mozzarella = **498 g**, approximately **22% above** the 407 g reference. Structured `servingWeightG` fields were null; weights were embedded in serving strings.

**AI nutrition total:** 579 kcal, 42.8 g protein, 68.2 g carbohydrates, 17.2 g fat. These values cannot be scored because the reference has no nutrition labels. Uncertainty was concentrated in bread, tuna packing medium, dressing/oil, and whether the full meal was eaten.

**Latency:** 13,882 ms. **Usage/cost:** not recorded in the evidence JSON.

### VLM-100 â€” bread, pasta, courgettes, potatoes

**Reference:** bread; pasta with tomato sauce; boiled courgettes and potatoes. Published component weights: **59 g + 179 g + 107 g = 345 g**. Published nutrition values are unavailable.

**AI identification:** baked penne with tomato sauce and cheese, cooked zucchini possibly with onion, and bread roll. Pasta and zucchini were broadly recognized, but the response omitted potatoes, added cheese, changed the cooking description to baked, and changed bread to a roll. It did not identify the expected boiled potato component.

**AI estimated portions:** 250 g pasta + 120 g zucchini + 55 g bread = **425 g**, approximately **23% above** the 345 g reference. Structured `servingWeightG` fields were null.

**AI nutrition total:** 650 kcal, 24 g protein, 98 g carbohydrates, 20 g fat. These values cannot be scored because the reference has no nutrition labels. Review questions correctly flagged possible extra cheese/oil/meat and asked for bread-label confirmation.

**Latency:** 9,062 ms. **Usage/cost:** not recorded in the evidence JSON.

## Aggregate assessment

- Calls completed: **3/3**.
- Provider/runtime errors: **none recorded**.
- Major-meal recognition: **3/3 broadly recognized**.
- Exact ingredient-set match: **0/3**; VLM-004 was closest, while VLM-002 and VLM-100 included unsupported or missing ingredients.
- Portion totals versus published weights: **323 vs 160 g (+102%)**, **498 vs 407 g (+22%)**, and **425 vs 345 g (+23%)**.
- Mean latency: **11,767 ms**; range **9,062â€“13,882 ms**.
- Independent calorie/macro accuracy: **not measurable**; all three references report nutrition unavailable.
- Exact API cost: **not measurable**; the smoke JSON records no prompt tokens, completion tokens, usage object, price, or billing amount.
- Remaining $8 capacity: **not confirmable from local evidence**. The project hard limit remains configured externally, but remaining tracked spend requires the OpenAI project Usage/Limits dashboard. The three calls should be counted against that projectâ€™s tracked usage; no additional calls were made here.

## Recommendation

**Conditional proceed, with a correction gate.** The smoke test is technically healthy enough to justify the full benchmark, but it exposes a meaningful portion/ingredient uncertainty issue. Proceed only after confirming the OpenAI dashboard shows sufficient remaining capacity under the enforced $8 limit and after ensuring the full run preserves usage metadata. The 68-meal benchmark should record token usage, request IDs only if non-sensitive, estimated cost, and per-case model output so cost and accuracy can be measured. Do not describe this smoke result as nutrition accuracy validation.
