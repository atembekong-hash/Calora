export type RestaurantFoodImageInput = {
  name: string;
  brandName?: string | null;
};

export type RestaurantFoodImageKey =
  | 'main'
  | 'drink'
  | 'snack'
  | 'breakfast'
  | 'bowl'
  | 'chicken'
  | 'wrap'
  | 'salad'
  | 'soup'
  | 'tacos'
  | 'pasta';

export function restaurantFoodImageKey(food: RestaurantFoodImageInput): RestaurantFoodImageKey {
  const text = `${food.brandName ?? ''} ${food.name}`.toLowerCase();

  if (/\b(water|coffee|tea|latte|lemonade|juice|smoothie|shake|soda|drink|beverage)\b/.test(text)) return 'drink';
  if (/\b(cookie|brownie|cake|pie|donut|doughnut|dessert|ice cream|chips?|fries|side)\b/.test(text)) return 'snack';
  if (/\b(egg|oatmeal|oats|pancake|waffle|breakfast)\b/.test(text)) return 'breakfast';
  if (/\b(salad|greens)\b/.test(text)) return 'salad';
  if (/\b(soup|chili)\b/.test(text)) return 'soup';
  if (/\b(taco|tacos|burrito|quesadilla|nacho)\b/.test(text)) return 'tacos';
  if (/\b(pasta|spaghetti|mac ?and ?cheese)\b/.test(text)) return 'pasta';
  if (/\b(chicken|nugget|tender|wing|turkey)\b/.test(text)) return 'chicken';
  if (/\b(wrap|sub|hoagie|sandwich)\b/.test(text)) return 'wrap';
  if (/\b(bowl|rice|poke)\b/.test(text)) return 'bowl';

  return 'main';
}