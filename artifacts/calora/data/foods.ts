import { FoodLog, MealType } from '@/context/CaloraContext';

export type FoodSuggestion = Omit<FoodLog, 'id' | 'time'>;

export const verifiedFoods: FoodSuggestion[] = [
  {
    name: 'Greek yogurt, plain',
    meal: 'Snack',
    calories: 150,
    protein: 17,
    carbs: 9,
    fat: 5,
    source: 'USDA verified',
    confidence: 99,
  },
  {
    name: 'Salmon rice bowl',
    meal: 'Dinner',
    calories: 640,
    protein: 39,
    carbs: 62,
    fat: 24,
    source: 'USDA verified',
    confidence: 97,
  },
  {
    name: 'Eggs on sourdough',
    meal: 'Breakfast',
    calories: 380,
    protein: 22,
    carbs: 31,
    fat: 18,
    source: 'USDA verified',
    confidence: 98,
  },
  {
    name: 'Avocado toast',
    meal: 'Breakfast',
    calories: 320,
    protein: 9,
    carbs: 38,
    fat: 16,
    source: 'Brand verified',
    confidence: 94,
  },
];

export const mealOrder: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];