/**
 * Preferred meal pools keep each Program visually and nutritionally
 * recognizable. The client and API both use these IDs so an authenticated
 * refresh cannot undo the Program-specific local preview.
 *
 * Pools are intentionally preferred rather than permanently exclusive:
 * dietary filters and calorie targets still have the final say.
 */
export const PROGRAM_MEAL_POOLS = {
  'balanced-nutrition': [
    'berry-oats', 'egg-toast', 'yogurt-parfait', 'smoothie-bowl',
    'harvest-salad', 'salmon-quinoa', 'lentil-soup', 'greek-salad',
    'stir-fry', 'chicken-rice', 'med-pasta', 'prawn-stirfry',
    'apple-almond', 'trail-mix', 'hummus-veggies', 'banana-pb',
  ],
  'high-protein-power': [
    'egg-toast', 'avo-toast-egg', 'yogurt-parfait',
    'harvest-salad', 'salmon-quinoa', 'tuna-poke', 'hummus-wrap',
    'chicken-rice', 'prawn-stirfry', 'beef-tacos', 'stir-fry',
    'edamame', 'banana-pb', 'trail-mix',
  ],
  'low-carb-living': [
    'egg-toast', 'avo-toast-egg', 'yogurt-parfait',
    'tuna-poke', 'greek-salad', 'hummus-wrap', 'harvest-salad',
    'prawn-stirfry', 'chicken-rice', 'beef-tacos', 'stir-fry',
    'apple-almond', 'edamame', 'hummus-veggies',
  ],
  'mediterranean-diet': [
    'berry-oats', 'yogurt-parfait', 'chia-pudding',
    'salmon-quinoa', 'lentil-soup', 'greek-salad', 'chickpea-bowl',
    'med-pasta', 'prawn-stirfry', 'chicken-rice',
    'apple-almond', 'hummus-veggies', 'edamame',
  ],
  'plant-based-week': [
    'smoothie-bowl', 'yogurt-parfait', 'banana-pancakes', 'chia-pudding',
    'lentil-soup', 'greek-salad', 'chickpea-bowl', 'stir-fry', 'med-pasta',
    'apple-almond', 'edamame', 'hummus-veggies', 'banana-pb', 'trail-mix',
  ],
  'keto-kickstart': [
    'egg-toast', 'yogurt-parfait', 'chia-pudding',
    'tuna-poke', 'greek-salad', 'hummus-wrap',
    'prawn-stirfry', 'chicken-rice', 'stir-fry',
    'apple-almond', 'hummus-veggies', 'banana-pb',
  ],
  'intermittent-fasting': [
    'smoothie-bowl', 'chia-pudding', 'yogurt-parfait',
    'tuna-poke', 'harvest-salad', 'greek-salad', 'chickpea-bowl',
    'chicken-rice', 'med-pasta', 'prawn-stirfry',
    'trail-mix', 'edamame', 'banana-pb',
  ],
  'budget-friendly': [
    'berry-oats', 'egg-toast', 'banana-pancakes',
    'lentil-soup', 'hummus-wrap', 'chickpea-bowl', 'greek-salad',
    'stir-fry', 'med-pasta', 'chicken-rice',
    'apple-almond', 'trail-mix', 'hummus-veggies', 'banana-pb',
  ],
  'quick-and-easy': [
    'smoothie-bowl', 'egg-toast', 'banana-pancakes', 'chia-pudding',
    'tuna-poke', 'hummus-wrap', 'greek-salad',
    'stir-fry', 'med-pasta', 'prawn-stirfry',
    'hummus-veggies', 'edamame', 'banana-pb', 'trail-mix',
  ],
  'athletic-performance': [
    'berry-oats', 'egg-toast', 'avo-toast-egg', 'banana-pancakes',
    'salmon-quinoa', 'harvest-salad', 'tuna-poke', 'chickpea-bowl',
    'chicken-rice', 'beef-tacos', 'spaghetti-bol', 'prawn-stirfry',
    'banana-pb', 'trail-mix', 'edamame',
  ],
  'anti-inflammatory': [
    'chia-pudding', 'berry-oats', 'smoothie-bowl', 'yogurt-parfait',
    'salmon-quinoa', 'lentil-soup', 'greek-salad', 'chickpea-bowl',
    'prawn-stirfry', 'med-pasta', 'chicken-rice',
    'apple-almond', 'edamame', 'trail-mix', 'hummus-veggies',
  ],
  'healthy-habits-week': [
    'berry-oats', 'egg-toast', 'yogurt-parfait', 'banana-pancakes',
    'harvest-salad', 'lentil-soup', 'greek-salad', 'chickpea-bowl',
    'chicken-rice', 'med-pasta', 'stir-fry',
    'apple-almond', 'hummus-veggies', 'trail-mix',
  ],
} as const;

export type PlannerProgramId = keyof typeof PROGRAM_MEAL_POOLS;

/**
 * The chooser/detail hero is a deliberate visual anchor, not a nutrition
 * decision. Each ID stays inside its Program pool while keeping the 12
 * Program entry points visually distinct.
 */
export const PROGRAM_HERO_MEAL_IDS: Record<PlannerProgramId, string> = {
  'balanced-nutrition': 'berry-oats',
  'high-protein-power': 'chicken-rice',
  'low-carb-living': 'edamame',
  'mediterranean-diet': 'salmon-quinoa',
  'plant-based-week': 'smoothie-bowl',
  'keto-kickstart': 'hummus-veggies',
  'intermittent-fasting': 'yogurt-parfait',
  'budget-friendly': 'lentil-soup',
  'quick-and-easy': 'prawn-stirfry',
  'athletic-performance': 'beef-tacos',
  'anti-inflammatory': 'chia-pudding',
  'healthy-habits-week': 'apple-almond',
};