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

const PLANNER_MEAL_IMAGE_NAMES: Record<string, PlannerImageKey> = {
  'overnight oats with berries': 'berry-oats',
  'eggs on sourdough': 'egg-toast',
  'mango yogurt parfait': 'yogurt-parfait',
  'blueberry smoothie bowl': 'smoothie-bowl',
  'smoked salmon rye toast': 'smoked-salmon-rye-toast',
  'banana oat pancakes': 'banana-pancakes',
  'chia seed pudding': 'chia-pudding',
  'chicken harvest salad': 'harvest-salad',
  'salmon quinoa bowl': 'salmon-quinoa',
  'lemon lentil soup': 'lentil-soup',
  'turkey hummus wrap': 'turkey-hummus-wrap',
  'greek salad with feta': 'greek-salad',
  'tuna poke bowl': 'tuna-poke',
  'roasted chickpea grain bowl': 'chickpea-bowl',
  'tofu vegetable stir-fry': 'tofu-stir-fry',
  'mediterranean tomato pasta': 'med-pasta',
  'herby chicken rice plate': 'chicken-rice',
  'thai coconut curry': 'thai-curry',
  'thai green curry': 'thai-curry',
  'spaghetti bolognese': 'spaghetti-bolognese',
  'beef taco plate': 'beef-tacos',
  'beef and veggie tacos': 'beef-tacos',
  'prawn veggie stir-fry': 'prawn-stirfry',
  'garlic prawn stir-fry': 'prawn-stirfry',
  'apple almond crunch': 'apple-almond',
  'apple with almond butter': 'apple-almond',
  'sea salt edamame': 'edamame',
  'mixed nuts and dried fruit': 'trail-mix',
  'hummus with veggie sticks': 'hummus-veggies',
  'banana with peanut butter': 'banana-peanut-butter',
};

export function plannerImageKeyForMealName(mealName: string): PlannerImageKey | undefined {
  return PLANNER_MEAL_IMAGE_NAMES[mealName.trim().toLowerCase()];
}

export function plannerImageKeyForMealId(mealId: string, mealName?: string): PlannerImageKey | undefined {
  const direct = PLANNER_MEAL_IMAGE_IDENTITIES[mealId as PlannerMealIdentityId];
  if (direct) return direct;

  const embedded = Object.entries(PLANNER_MEAL_IMAGE_IDENTITIES)
    .find(([identityId]) => mealId.includes(`-${identityId}-`));
  if (embedded) return embedded[1];

  return typeof mealName === 'string' ? plannerImageKeyForMealName(mealName) : undefined;
}

/**
 * Resolve the photo shown beside a visible meal name.
 *
 * The name is authoritative because edited or restored meals can retain an old
 * catalog-shaped id. An unknown/custom name must not inherit that stale photo.
 */
export function plannerImageKeyForMeal(_mealId: string, mealName: string): PlannerImageKey | undefined {
  return plannerImageKeyForMealName(mealName);
}