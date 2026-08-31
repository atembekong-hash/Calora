/**
 * Stable planner meal-to-image identities shared by the API and clients.
 *
 * Keep this module dependency-free and outside generated/ so API codegen can
 * safely regenerate its outputs without changing the identity contract.
 */
export const PLANNER_MEAL_IMAGE_IDENTITIES = {
  'berry-oats': 'berry-oats',
  'egg-toast': 'egg-toast',
  'yogurt-parfait': 'yogurt-parfait',
  'smoothie-bowl': 'smoothie-bowl',
  'avo-toast-egg': 'smoked-salmon-rye-toast',
  'banana-pancakes': 'banana-pancakes',
  'chia-pudding': 'chia-pudding',
  'harvest-salad': 'harvest-salad',
  'salmon-quinoa': 'salmon-quinoa',
  'lentil-soup': 'lentil-soup',
  'hummus-wrap': 'turkey-hummus-wrap',
  'greek-salad': 'greek-salad',
  'tuna-poke': 'tuna-poke',
  'chickpea-bowl': 'chickpea-bowl',
  'stir-fry': 'tofu-stir-fry',
  'med-pasta': 'med-pasta',
  'chicken-rice': 'chicken-rice',
  'thai-curry': 'thai-curry',
  'spaghetti-bol': 'spaghetti-bolognese',
  'beef-tacos': 'beef-tacos',
  'prawn-stirfry': 'prawn-stirfry',
  'apple-almond': 'apple-almond',
  edamame: 'edamame',
  'trail-mix': 'trail-mix',
  'hummus-veggies': 'hummus-veggies',
  'banana-pb': 'banana-peanut-butter',
} as const;

export type PlannerMealIdentityId = keyof typeof PLANNER_MEAL_IMAGE_IDENTITIES;
export type PlannerImageKey = (typeof PLANNER_MEAL_IMAGE_IDENTITIES)[PlannerMealIdentityId];

export const PLANNER_IMAGE_KEYS = Object.values(PLANNER_MEAL_IMAGE_IDENTITIES) as PlannerImageKey[];

export function plannerImageKeyForMealId(mealId: string): PlannerImageKey | undefined {
  return PLANNER_MEAL_IMAGE_IDENTITIES[mealId as PlannerMealIdentityId];
}