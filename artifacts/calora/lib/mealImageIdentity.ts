export {
  PLANNER_IMAGE_KEYS,
  PLANNER_MEAL_IMAGE_IDENTITIES,
  plannerImageKeyForMealId,
} from '@workspace/api-zod/planner-image-identity';
export type {
  PlannerImageKey,
  PlannerMealIdentityId,
} from '@workspace/api-zod/planner-image-identity';

export const FOOD_IMAGE_KEYS = [
  'greek-yogurt-plain',
  'salmon-rice-bowl',
  'eggs-sourdough',
  'avocado-toast',
  'overnight-oats',
  'berry-protein-smoothie',
  'chicken-rice-bowl',
  'turkey-avocado-wrap',
  'lentil-quinoa-salad',
  'tomato-basil-soup',
  'grilled-chicken-vegetables',
  'shrimp-tacos',
  'tofu-vegetable-stir-fry',
  'whole-wheat-pasta-primavera',
  'beef-bean-chili',
  'cottage-cheese-berries',
  'apple-almond-butter',
  'hummus-vegetables',
  'trail-mix',
  'tuna-cucumber-crackers',
] as const;

export type FoodImageKey = (typeof FOOD_IMAGE_KEYS)[number];