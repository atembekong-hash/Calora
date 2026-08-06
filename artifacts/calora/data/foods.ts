import { FoodLog, MealType } from '@/context/CaloraContext';

export type FoodSuggestion = Omit<FoodLog, 'id' | 'time' | 'date'>;

export const verifiedFoods: FoodSuggestion[] = [
  {
    name: 'Greek yogurt, plain',
    serving: '170 g',
    meal: 'Snack',
    calories: 150,
    protein: 17,
    carbs: 9,
    fat: 5,
    fiber: 0,
    sugar: 7,
    sodium: 65,
    source: 'USDA verified',
    confidence: 99,
  },
  {
    name: 'Salmon rice bowl',
    serving: '1 bowl',
    meal: 'Dinner',
    calories: 640,
    protein: 39,
    carbs: 62,
    fat: 24,
    fiber: 6,
    sugar: 5,
    sodium: 580,
    source: 'USDA verified',
    confidence: 97,
  },
  {
    name: 'Eggs on sourdough',
    serving: '2 eggs + 1 slice',
    meal: 'Breakfast',
    calories: 380,
    protein: 22,
    carbs: 31,
    fat: 18,
    fiber: 4,
    sugar: 2,
    sodium: 510,
    source: 'USDA verified',
    confidence: 98,
  },
  {
    name: 'Avocado toast',
    serving: '1 slice',
    meal: 'Breakfast',
    calories: 320,
    protein: 9,
    carbs: 38,
    fat: 16,
    fiber: 7,
    sugar: 2,
    sodium: 390,
    source: 'Brand verified',
    confidence: 94,
  },
];

export const mealOrder: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];