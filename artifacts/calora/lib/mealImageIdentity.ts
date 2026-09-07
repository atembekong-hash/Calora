export {
  PLANNER_IMAGE_KEYS,
  PLANNER_MEAL_IMAGE_IDENTITIES,
  plannerImageKeyForMeal,
  plannerImageKeyForMealId,
  plannerImageKeyForMealName,
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

const FOOD_IMAGE_NAMES: Record<string, FoodImageKey> = {
  'greek yogurt, plain': 'greek-yogurt-plain',
  'salmon rice bowl': 'salmon-rice-bowl',
  'eggs on sourdough': 'eggs-sourdough',
  'avocado toast': 'avocado-toast',
  'overnight oats': 'overnight-oats',
  'berry protein smoothie': 'berry-protein-smoothie',
  'chicken rice bowl': 'chicken-rice-bowl',
  'turkey avocado wrap': 'turkey-avocado-wrap',
  'lentil quinoa salad': 'lentil-quinoa-salad',
  'tomato basil soup': 'tomato-basil-soup',
  'grilled chicken with vegetables': 'grilled-chicken-vegetables',
  'shrimp tacos': 'shrimp-tacos',
  'tofu vegetable stir-fry': 'tofu-vegetable-stir-fry',
  'whole wheat pasta primavera': 'whole-wheat-pasta-primavera',
  'beef and bean chili': 'beef-bean-chili',
  'cottage cheese and berries': 'cottage-cheese-berries',
  'apple with almond butter': 'apple-almond-butter',
  'hummus and vegetables': 'hummus-vegetables',
  'trail mix': 'trail-mix',
  'tuna cucumber crackers': 'tuna-cucumber-crackers',
};

export function foodImageKeyForName(foodName: string): FoodImageKey | undefined {
  return FOOD_IMAGE_NAMES[foodName.trim().toLowerCase()];
}