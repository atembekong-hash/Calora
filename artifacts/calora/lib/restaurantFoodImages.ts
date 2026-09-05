import { type ImageSource } from 'expo-image';
import { restaurantFoodImageKey, type RestaurantFoodImageInput, type RestaurantFoodImageKey } from './restaurantFoodImageSelection';

const FALLBACK_MAIN = require('../assets/images/food-fallback-main.jpg');
const FALLBACK_DRINK = require('../assets/images/food-fallback-drink.jpg');
const FALLBACK_SNACK = require('../assets/images/food-fallback-snack.jpg');
const BREAKFAST = require('../assets/images/foods/eggs-sourdough.jpg');
const BOWL = require('../assets/images/foods/chicken-rice-bowl.jpg');
const CHICKEN = require('../assets/images/foods/grilled-chicken-vegetables.jpg');
const WRAP = require('../assets/images/foods/turkey-avocado-wrap.jpg');
const SALAD = require('../assets/images/foods/lentil-quinoa-salad.jpg');
const SOUP = require('../assets/images/foods/tomato-basil-soup.jpg');
const TACOS = require('../assets/images/foods/shrimp-tacos.jpg');
const PASTA = require('../assets/images/foods/whole-wheat-pasta-primavera.jpg');

/**
 * Restaurant providers do not consistently return a food photo for every
 * branded result. Keep the nutrition source independent from presentation and
 * assign a stable, representative local photo for every menu item instead.
 */
export function restaurantFoodImageSource(food: RestaurantFoodImageInput): ImageSource {
  const images: Record<RestaurantFoodImageKey, ImageSource> = {
    main: FALLBACK_MAIN,
    drink: FALLBACK_DRINK,
    snack: FALLBACK_SNACK,
    breakfast: BREAKFAST,
    bowl: BOWL,
    chicken: CHICKEN,
    wrap: WRAP,
    salad: SALAD,
    soup: SOUP,
    tacos: TACOS,
    pasta: PASTA,
  };
  return images[restaurantFoodImageKey(food)];
}