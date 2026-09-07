# Calora Mission 03 planner integrity validation sample

This checked-in sample uses the fixed week **2026-08-03 through 2026-08-09**
and the 28-meal catalog.
`lib/validation/plannerIntegrityEvidence.ts` is the authority: it derives the
machine-readable inventory, this deterministic output, role metrics, and the
complete pairwise cross-program metrics from `data/planner.ts` and the shared
`programEligibility` helper. Run its `plannerIntegrityMarkdownReport()` export
to render the complete, current Markdown report (including all 66 program
pairs) without hand-maintaining a second catalog.

Each sequence is Monday to Sunday; each token is a canonical catalog ID.

| Program | Breakfast | Lunch | Dinner | Snack |
| --- | --- | --- | --- | --- |
| balanced-nutrition | berry-oats, egg-toast, yogurt-parfait, smoothie-bowl, avo-toast-egg, banana-pancakes, chia-pudding | salmon-quinoa, lentil-soup, greek-salad, hummus-wrap, tuna-poke, chickpea-bowl, harvest-salad | med-pasta, prawn-stirfry, thai-curry, spaghetti-bol, beef-tacos, keto-chicken-zucchini, keto-salmon-olive | banana-pb, edamame, apple-almond, trail-mix, hummus-veggies, banana-pb, edamame |
| high-protein-power | egg-toast, avo-toast-egg, yogurt-parfait, berry-oats, smoothie-bowl, banana-pancakes, chia-pudding | salmon-quinoa, tuna-poke, hummus-wrap, lentil-soup, chickpea-bowl, harvest-salad, salmon-quinoa | beef-tacos, stir-fry, med-pasta, thai-curry, spaghetti-bol, keto-chicken-zucchini, keto-salmon-olive | banana-pb, edamame, banana-pb, edamame, banana-pb, edamame, banana-pb |
| low-carb-living | egg-toast, avo-toast-egg, yogurt-parfait, smoothie-bowl, chia-pudding, egg-toast, avo-toast-egg | greek-salad, hummus-wrap, harvest-salad, salmon-quinoa, tuna-poke, greek-salad, hummus-wrap | thai-curry, keto-chicken-zucchini, keto-salmon-olive, prawn-stirfry, beef-tacos, thai-curry, keto-chicken-zucchini | trail-mix, banana-pb, apple-almond, edamame, hummus-veggies, trail-mix, banana-pb |
| mediterranean-diet | berry-oats, chia-pudding, egg-toast, avo-toast-egg, berry-oats, chia-pudding, egg-toast | lentil-soup, greek-salad, chickpea-bowl, hummus-wrap, tuna-poke, salmon-quinoa, lentil-soup | beef-tacos, keto-chicken-zucchini, keto-salmon-olive, med-pasta, chicken-rice, beef-tacos, keto-chicken-zucchini | hummus-veggies, edamame, banana-pb, hummus-veggies, edamame, banana-pb, hummus-veggies |
| plant-based-week | smoothie-bowl, banana-pancakes, chia-pudding, berry-oats, egg-toast, smoothie-bowl, banana-pancakes | chickpea-bowl, lentil-soup, chickpea-bowl, lentil-soup, chickpea-bowl, lentil-soup, chickpea-bowl | stir-fry, med-pasta, stir-fry, med-pasta, stir-fry, med-pasta, stir-fry | edamame, hummus-veggies, trail-mix, edamame, hummus-veggies, trail-mix, edamame |
| keto-kickstart | egg-toast, chia-pudding, avo-toast-egg, egg-toast, chia-pudding, avo-toast-egg, egg-toast | harvest-salad, greek-salad, harvest-salad, greek-salad, harvest-salad, greek-salad, harvest-salad | keto-salmon-olive, prawn-stirfry, keto-chicken-zucchini, keto-salmon-olive, prawn-stirfry, keto-chicken-zucchini, keto-salmon-olive | edamame, trail-mix, apple-almond, hummus-veggies, banana-pb, edamame, trail-mix |
| intermittent-fasting | smoothie-bowl, chia-pudding, yogurt-parfait, berry-oats, egg-toast, avo-toast-egg, banana-pancakes | harvest-salad, greek-salad, chickpea-bowl, salmon-quinoa, lentil-soup, hummus-wrap, tuna-poke | prawn-stirfry, stir-fry, thai-curry, spaghetti-bol, beef-tacos, keto-chicken-zucchini, keto-salmon-olive | apple-almond, hummus-veggies, trail-mix, edamame, banana-pb, apple-almond, hummus-veggies |
| budget-friendly | banana-pancakes, smoothie-bowl, banana-pancakes, smoothie-bowl, banana-pancakes, smoothie-bowl, banana-pancakes | hummus-wrap, lentil-soup, hummus-wrap, lentil-soup, hummus-wrap, lentil-soup, hummus-wrap | chicken-rice, thai-curry, stir-fry, med-pasta, chicken-rice, thai-curry, stir-fry | banana-pb, hummus-veggies, banana-pb, hummus-veggies, banana-pb, hummus-veggies, banana-pb |
| quick-and-easy | smoothie-bowl, egg-toast, banana-pancakes, chia-pudding, berry-oats, yogurt-parfait, avo-toast-egg | hummus-wrap, greek-salad, harvest-salad, tuna-poke, hummus-wrap, greek-salad, harvest-salad | prawn-stirfry, beef-tacos, prawn-stirfry, beef-tacos, prawn-stirfry, beef-tacos, prawn-stirfry | trail-mix, apple-almond, hummus-veggies, edamame, banana-pb, trail-mix, apple-almond |
| athletic-performance | berry-oats, egg-toast, avo-toast-egg, berry-oats, egg-toast, avo-toast-egg, berry-oats | harvest-salad, tuna-poke, chickpea-bowl, hummus-wrap, salmon-quinoa, harvest-salad, tuna-poke | spaghetti-bol, prawn-stirfry, stir-fry, med-pasta, thai-curry, keto-chicken-zucchini, keto-salmon-olive | apple-almond, banana-pb, trail-mix, edamame, apple-almond, banana-pb, trail-mix |
| anti-inflammatory | chia-pudding, berry-oats, smoothie-bowl, egg-toast, avo-toast-egg, chia-pudding, berry-oats | lentil-soup, greek-salad, chickpea-bowl, hummus-wrap, tuna-poke, salmon-quinoa, lentil-soup | stir-fry, keto-chicken-zucchini, keto-salmon-olive, prawn-stirfry, med-pasta, stir-fry, keto-chicken-zucchini | apple-almond, edamame, banana-pb, apple-almond, edamame, banana-pb, apple-almond |
| healthy-habits-week | berry-oats, egg-toast, yogurt-parfait, banana-pancakes, smoothie-bowl, avo-toast-egg, chia-pudding | lentil-soup, greek-salad, chickpea-bowl, salmon-quinoa, hummus-wrap, tuna-poke, harvest-salad | stir-fry, thai-curry, spaghetti-bol, beef-tacos, prawn-stirfry, keto-chicken-zucchini, keto-salmon-olive | edamame, banana-pb, apple-almond, hummus-veggies, trail-mix, edamame, banana-pb |

## Role recurrence / adjacent-repeat metrics

Metric format is `role: eligible candidates / unique meals / reused slots /
adjacent repeats`.

| Program | Metrics |
| --- | --- |
| balanced-nutrition | Breakfast 7/7/0/0; Lunch 7/7/0/0; Dinner 9/7/0/0; Snack 5/5/2/0 |
| high-protein-power | Breakfast 7/7/0/0; Lunch 6/6/1/0; Dinner 9/7/0/0; Snack 2/2/5/0 |
| low-carb-living | Breakfast 5/5/2/0; Lunch 5/5/2/0; Dinner 5/5/2/0; Snack 5/5/2/0 |
| mediterranean-diet | Breakfast 4/4/3/0; Lunch 6/6/1/0; Dinner 5/5/2/0; Snack 3/3/4/0 |
| plant-based-week | Breakfast 5/5/2/0; Lunch 2/2/5/0; Dinner 2/2/5/0; Snack 3/3/4/0 |
| keto-kickstart | Breakfast 3/3/4/0; Lunch 2/2/5/0; Dinner 3/3/4/0; Snack 5/5/2/0 |
| intermittent-fasting | Breakfast 7/7/0/0; Lunch 7/7/0/0; Dinner 9/7/0/0; Snack 5/5/2/0 |
| budget-friendly | Breakfast 2/2/5/0; Lunch 2/2/5/0; Dinner 4/4/3/0; Snack 2/2/5/0 |
| quick-and-easy | Breakfast 7/7/0/0; Lunch 4/4/3/0; Dinner 2/2/5/0; Snack 5/5/2/0 |
| athletic-performance | Breakfast 3/3/4/0; Lunch 5/5/2/0; Dinner 9/7/0/0; Snack 4/4/3/0 |
| anti-inflammatory | Breakfast 5/5/2/0; Lunch 6/6/1/0; Dinner 5/5/2/0; Snack 3/3/4/0 |
| healthy-habits-week | Breakfast 7/7/0/0; Lunch 7/7/0/0; Dinner 9/7/0/0; Snack 5/5/2/0 |

## Inventory exceptions

There are no one-candidate role exceptions. Every Program/role has at least two
eligible catalog candidates, and every adjacent-repeat metric is zero.

## Cross-program overlap metrics

`crossProgramOverlapMetrics()` produces all **66** pairwise metrics from the
same deterministic output above. Each metric contains the two program IDs,
the sorted shared canonical IDs, shared count, union count, and three-decimal
Jaccard similarity. This deliberately keeps the checked-in overview compact
while retaining a complete human-readable rendering in
`plannerIntegrityMarkdownReport()` and structured values for automated review.