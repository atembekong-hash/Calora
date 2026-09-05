import { type ImageSource } from 'expo-image';

type RestaurantFoodImageInput = {
  name: string;
  brandName?: string | null;
};

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
  const text = `${food.brandName ?? ''} ${food.name}`.toLowerCase();

  if (/\b(water|coffee|tea|latte|lemonade|juice|smoothie|shake|soda|drink|beverage)\b/.test(text)) {
    return FALLBACK_DRINK;
  }
  if (/\b(cookie|brownie|cake|pie|donut|doughnut|dessert|ice cream|chips?|fries|fries|side)\b/.test(text)) {
    return FALLBACK_SNACK;
  }
  if (/\b(egg|oatmeal|oats|pancake|waffle|breakfast)\b/.test(text)) {
    return BREAKFAST;
  }
  if (/\b(salad|greens)\b/.test(text)) {
    return SALAD;
  }
  if (/\b(soup|chili)\b/.test(text)) {
    return SOUP;
  }
  if (/\b(taco|tacos|burrito|quesadilla|nacho)\b/.test(text)) {
    return TACOS;
  }
  if (/\b(pasta|spaghetti|mac ?and ?cheese)\b/.test(text)) {
    return PASTA;
  }
  if (/\b(chicken|nugget|tender|wing|turkey)\b/.test(text)) {
    return CHICKEN;
  }
  if (/\b(wrap|sub|hoagie|sandwich)\b/.test(text)) {
    return WRAP;
  }
  if (/\b(bowl|rice|poke)\b/.test(text)) {
    return BOWL;
  }

  return FALLBACK_MAIN;
}