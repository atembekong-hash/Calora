import type { PlannerMeal } from '@workspace/api-client-react';
import type { ShoppingItem } from '@/context/CaloraContext';
import { addDays, dateFromKey, dateKey } from '@/lib/dates';

export const plannerMealTypes: PlannerMeal['meal'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const plannerCatalog: PlannerMeal[] = [
  {
    id: 'berry-oats',
    day: '',
    meal: 'Breakfast',
    name: 'Overnight oats with berries',
    image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 420,
    proteinG: 18,
    carbsG: 58,
    fatG: 14,
    ingredients: ['rolled oats', 'Greek yogurt', 'mixed berries', 'chia seeds', 'almond milk'],
    description: 'Creamy oats layered with bright berries and a little crunch.',
    prepMinutes: 8,
  },
  {
    id: 'egg-toast',
    day: '',
    meal: 'Breakfast',
    name: 'Eggs on sourdough',
    image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1000&q=88',
    serving: '2 eggs + 1 slice',
    calories: 380,
    proteinG: 22,
    carbsG: 31,
    fatG: 18,
    ingredients: ['eggs', 'sourdough bread', 'avocado', 'baby greens', 'chili flakes'],
    description: 'Jammy eggs, avocado, and greens on toasted sourdough.',
    prepMinutes: 12,
  },
  {
    id: 'yogurt-parfait',
    day: '',
    meal: 'Breakfast',
    name: 'Mango yogurt parfait',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1000&q=88',
    serving: '1 glass',
    calories: 310,
    proteinG: 20,
    carbsG: 42,
    fatG: 7,
    ingredients: ['Greek yogurt', 'mango', 'granola', 'pumpkin seeds', 'lime'],
    description: 'A cool, bright parfait with tropical fruit and seeds.',
    prepMinutes: 6,
  },
  {
    id: 'harvest-salad',
    day: '',
    meal: 'Lunch',
    name: 'Chicken harvest salad',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=88',
    serving: '1 large bowl',
    calories: 510,
    proteinG: 38,
    carbsG: 34,
    fatG: 25,
    ingredients: ['chicken breast', 'mixed greens', 'apple', 'walnuts', 'feta', 'mustard dressing'],
    description: 'A crisp, satisfying salad with roasted chicken and seasonal crunch.',
    prepMinutes: 18,
  },
  {
    id: 'salmon-quinoa',
    day: '',
    meal: 'Lunch',
    name: 'Salmon quinoa bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 590,
    proteinG: 39,
    carbsG: 48,
    fatG: 24,
    ingredients: ['salmon', 'quinoa', 'cucumber', 'edamame', 'avocado', 'sesame'],
    description: 'Roasted salmon over quinoa with cool vegetables and sesame.',
    prepMinutes: 24,
  },
  {
    id: 'lentil-soup',
    day: '',
    meal: 'Lunch',
    name: 'Lemon lentil soup',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=88',
    serving: '2 cups',
    calories: 430,
    proteinG: 24,
    carbsG: 61,
    fatG: 9,
    ingredients: ['green lentils', 'carrots', 'celery', 'lemon', 'spinach', 'vegetable stock'],
    description: 'A golden, lemony lentil soup that holds up beautifully for lunch.',
    prepMinutes: 32,
  },
  {
    id: 'hummus-wrap',
    day: '',
    meal: 'Lunch',
    name: 'Turkey hummus wrap',
    image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=1000&q=88',
    serving: '1 wrap',
    calories: 480,
    proteinG: 34,
    carbsG: 46,
    fatG: 17,
    ingredients: ['whole wheat wrap', 'turkey', 'hummus', 'tomato', 'cucumber', 'greens'],
    description: 'A portable wrap with peppery greens and creamy hummus.',
    prepMinutes: 10,
  },
  {
    id: 'stir-fry',
    day: '',
    meal: 'Dinner',
    name: 'Tofu vegetable stir-fry',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 540,
    proteinG: 27,
    carbsG: 67,
    fatG: 18,
    ingredients: ['tofu', 'broccoli', 'bell pepper', 'brown rice', 'ginger', 'tamari'],
    description: 'Caramelized tofu and bright vegetables over fluffy brown rice.',
    prepMinutes: 25,
  },
  {
    id: 'med-pasta',
    day: '',
    meal: 'Dinner',
    name: 'Mediterranean tomato pasta',
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 620,
    proteinG: 23,
    carbsG: 84,
    fatG: 21,
    ingredients: ['whole wheat pasta', 'cherry tomatoes', 'white beans', 'spinach', 'parmesan', 'basil'],
    description: 'A saucy, weeknight pasta with beans, greens, and basil.',
    prepMinutes: 22,
  },
  {
    id: 'chicken-rice',
    day: '',
    meal: 'Dinner',
    name: 'Herby chicken rice plate',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=88',
    serving: '1 plate',
    calories: 670,
    proteinG: 46,
    carbsG: 62,
    fatG: 24,
    ingredients: ['chicken thigh', 'brown rice', 'zucchini', 'yogurt sauce', 'parsley', 'lemon'],
    description: 'A comforting plate of herby chicken, rice, and roasted vegetables.',
    prepMinutes: 35,
  },
  {
    id: 'apple-almond',
    day: '',
    meal: 'Snack',
    name: 'Apple with almond butter',
    image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=1000&q=88',
    serving: '1 apple + 1 tbsp',
    calories: 210,
    proteinG: 5,
    carbsG: 29,
    fatG: 10,
    ingredients: ['apple', 'almond butter', 'cinnamon'],
    description: 'A simple, crisp snack with just enough richness.',
    prepMinutes: 3,
  },
  {
    id: 'edamame',
    day: '',
    meal: 'Snack',
    name: 'Sea salt edamame',
    image: 'https://images.unsplash.com/photo-1607301406259-dfb186f9e7a7?auto=format&fit=crop&w=1000&q=88',
    serving: '1 cup',
    calories: 190,
    proteinG: 17,
    carbsG: 15,
    fatG: 8,
    ingredients: ['edamame', 'flaky sea salt', 'lemon'],
    description: 'A protein-forward snack with bright lemon and sea salt.',
    prepMinutes: 5,
  },
];

export function getPlannerWeekStart(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + offset);
  return `${local.getFullYear()}-${`${local.getMonth() + 1}`.padStart(2, '0')}-${`${local.getDate()}`.padStart(2, '0')}`;
}

export function plannerDate(weekStart: string, offset: number) {
  return addDays(weekStart, offset);
}

export function createStarterPlannerMeals(weekStart = getPlannerWeekStart()): PlannerMeal[] {
  const byMeal = {
    Breakfast: plannerCatalog.filter((meal) => meal.meal === 'Breakfast'),
    Lunch: plannerCatalog.filter((meal) => meal.meal === 'Lunch'),
    Dinner: plannerCatalog.filter((meal) => meal.meal === 'Dinner'),
    Snack: plannerCatalog.filter((meal) => meal.meal === 'Snack'),
  };
  return Array.from({ length: 7 }, (_, dayIndex) =>
    plannerMealTypes.map((mealType, mealIndex) => {
      const meal = byMeal[mealType][(dayIndex + mealIndex) % byMeal[mealType].length];
      return { ...meal, id: `starter-${dayIndex}-${mealType}`, day: plannerDate(weekStart, dayIndex) };
    }),
  ).flat();
}

export function buildShoppingItems(meals: PlannerMeal[], checkedByName = new Map<string, boolean>()): ShoppingItem[] {
  const quantities = new Map<string, { name: string; quantity: number; sourceMealIds: string[] }>();
  meals.forEach((meal) => meal.ingredients.forEach((ingredient) => {
    const name = ingredient.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase();
    const current = quantities.get(key) ?? { name, quantity: 0, sourceMealIds: [] };
    current.quantity += 1;
    if (!current.sourceMealIds.includes(meal.id)) current.sourceMealIds.push(meal.id);
    quantities.set(key, current);
  }));
  return Array.from(quantities.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => ({
      id: `shop-${key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      ...item,
      checked: checkedByName.get(key) ?? checkedByName.get(item.name) ?? false,
    }));
}