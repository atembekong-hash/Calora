import { type ImageSource } from 'expo-image';
export { FOOD_IMAGE_KEYS, PLANNER_IMAGE_KEYS } from './mealImageIdentity';
export type { FoodImageKey, PlannerImageKey } from './mealImageIdentity';
import type { FoodImageKey, PlannerImageKey } from './mealImageIdentity';

const plannerImages: Record<PlannerImageKey, ImageSource> = {
  'berry-oats': require('../assets/images/meals/berry-oats.jpg'),
  'egg-toast': require('../assets/images/meals/egg-toast.jpg'),
  'yogurt-parfait': require('../assets/images/meals/yogurt-parfait.jpg'),
  'smoothie-bowl': require('../assets/images/meals/smoothie-bowl.jpg'),
  'smoked-salmon-rye-toast': require('../assets/images/meals/smoked-salmon-rye-toast.jpg'),
  'banana-pancakes': require('../assets/images/meals/banana-pancakes.jpg'),
  'chia-pudding': require('../assets/images/meals/chia-pudding.jpg'),
  'harvest-salad': require('../assets/images/meals/harvest-salad.jpg'),
  'salmon-quinoa': require('../assets/images/meals/salmon-quinoa.jpg'),
  'lentil-soup': require('../assets/images/meals/lentil-soup.jpg'),
  'turkey-hummus-wrap': require('../assets/images/meals/turkey-hummus-wrap.jpg'),
  'greek-salad': require('../assets/images/meals/greek-salad.jpg'),
  'tuna-poke': require('../assets/images/meals/tuna-poke.jpg'),
  'chickpea-bowl': require('../assets/images/meals/chickpea-bowl.jpg'),
  'tofu-stir-fry': require('../assets/images/meals/tofu-stir-fry.jpg'),
  'med-pasta': require('../assets/images/meals/med-pasta.jpg'),
  'chicken-rice': require('../assets/images/meals/chicken-rice.jpg'),
  'thai-curry': require('../assets/images/meals/thai-curry.jpg'),
  'spaghetti-bolognese': require('../assets/images/meals/spaghetti-bolognese.jpg'),
  'beef-tacos': require('../assets/images/meals/beef-tacos.jpg'),
  'prawn-stirfry': require('../assets/images/meals/prawn-stirfry.jpg'),
  'apple-almond': require('../assets/images/meals/apple-almond.jpg'),
  edamame: require('../assets/images/meals/edamame.jpg'),
  'trail-mix': require('../assets/images/meals/trail-mix.jpg'),
  'hummus-veggies': require('../assets/images/meals/hummus-veggies.jpg'),
  'banana-peanut-butter': require('../assets/images/meals/banana-peanut-butter.jpg'),
};

const foodImages: Record<FoodImageKey, ImageSource> = {
  'greek-yogurt-plain': require('../assets/images/foods/greek-yogurt-plain.jpg'),
  'salmon-rice-bowl': require('../assets/images/foods/salmon-rice-bowl.jpg'),
  'eggs-sourdough': require('../assets/images/foods/eggs-sourdough.jpg'),
  'avocado-toast': require('../assets/images/foods/avocado-toast.jpg'),
  'overnight-oats': require('../assets/images/foods/overnight-oats.jpg'),
  'berry-protein-smoothie': require('../assets/images/foods/berry-protein-smoothie.jpg'),
  'chicken-rice-bowl': require('../assets/images/foods/chicken-rice-bowl.jpg'),
  'turkey-avocado-wrap': require('../assets/images/foods/turkey-avocado-wrap.jpg'),
  'lentil-quinoa-salad': require('../assets/images/foods/lentil-quinoa-salad.jpg'),
  'tomato-basil-soup': require('../assets/images/foods/tomato-basil-soup.jpg'),
  'grilled-chicken-vegetables': require('../assets/images/foods/grilled-chicken-vegetables.jpg'),
  'shrimp-tacos': require('../assets/images/foods/shrimp-tacos.jpg'),
  'tofu-vegetable-stir-fry': require('../assets/images/foods/tofu-vegetable-stir-fry.jpg'),
  'whole-wheat-pasta-primavera': require('../assets/images/foods/whole-wheat-pasta-primavera.jpg'),
  'beef-bean-chili': require('../assets/images/foods/beef-bean-chili.jpg'),
  'cottage-cheese-berries': require('../assets/images/foods/cottage-cheese-berries.jpg'),
  'apple-almond-butter': require('../assets/images/foods/apple-almond-butter.jpg'),
  'hummus-vegetables': require('../assets/images/foods/hummus-vegetables.jpg'),
  'trail-mix': require('../assets/images/foods/trail-mix.jpg'),
  'tuna-cucumber-crackers': require('../assets/images/foods/tuna-cucumber-crackers.jpg'),
};

function isPlannerImageKey(value: string | null | undefined): value is PlannerImageKey {
  return Boolean(value && Object.prototype.hasOwnProperty.call(plannerImages, value));
}

function isFoodImageKey(value: string | null | undefined): value is FoodImageKey {
  return Boolean(value && Object.prototype.hasOwnProperty.call(foodImages, value));
}

export function plannerImageSource(
  imageAssetKey: string | null | undefined,
  remoteImage: string | null | undefined,
): ImageSource | null {
  if (isPlannerImageKey(imageAssetKey)) return plannerImages[imageAssetKey];
  return remoteImage ? { uri: remoteImage } : null;
}

export function foodImageSource(imageAssetKey: string | null | undefined): ImageSource | null {
  return isFoodImageKey(imageAssetKey) ? foodImages[imageAssetKey] : null;
}

export function hasPlannerImageKey(value: string | null | undefined): value is PlannerImageKey {
  return isPlannerImageKey(value);
}

export function hasFoodImageKey(value: string | null | undefined): value is FoodImageKey {
  return isFoodImageKey(value);
}