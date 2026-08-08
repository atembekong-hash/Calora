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
    id: 'smoothie-bowl',
    day: '',
    meal: 'Breakfast',
    name: 'Blueberry smoothie bowl',
    image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 360,
    proteinG: 14,
    carbsG: 54,
    fatG: 10,
    ingredients: ['blueberries', 'banana', 'Greek yogurt', 'granola', 'chia seeds', 'honey'],
    description: 'A thick, vibrant smoothie bowl topped with crunch and fresh fruit.',
    prepMinutes: 8,
  },
  {
    id: 'avo-toast-egg',
    day: '',
    meal: 'Breakfast',
    name: 'Avocado toast with poached egg',
    image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?auto=format&fit=crop&w=1000&q=88',
    serving: '1 slice + 1 egg',
    calories: 420,
    proteinG: 18,
    carbsG: 36,
    fatG: 24,
    ingredients: ['sourdough bread', 'avocado', 'eggs', 'cherry tomatoes', 'chili flakes'],
    description: 'Creamy avocado and a perfectly poached egg on toasted sourdough.',
    prepMinutes: 14,
  },
  {
    id: 'banana-pancakes',
    day: '',
    meal: 'Breakfast',
    name: 'Banana oat pancakes',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1000&q=88',
    serving: '3 pancakes',
    calories: 390,
    proteinG: 12,
    carbsG: 64,
    fatG: 9,
    ingredients: ['rolled oats', 'banana', 'eggs', 'almond milk', 'vanilla', 'maple syrup'],
    description: 'Fluffy, naturally sweet pancakes made from oats and ripe banana.',
    prepMinutes: 18,
  },
  {
    id: 'chia-pudding',
    day: '',
    meal: 'Breakfast',
    name: 'Chia seed pudding',
    image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=88',
    serving: '1 jar',
    calories: 320,
    proteinG: 11,
    carbsG: 38,
    fatG: 14,
    ingredients: ['chia seeds', 'coconut milk', 'mixed berries', 'agave', 'vanilla'],
    description: 'Silky overnight pudding with berries — ready when you wake up.',
    prepMinutes: 5,
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
    id: 'greek-salad',
    day: '',
    meal: 'Lunch',
    name: 'Greek salad with feta',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1000&q=88',
    serving: '1 large bowl',
    calories: 380,
    proteinG: 12,
    carbsG: 24,
    fatG: 26,
    ingredients: ['cucumber', 'tomato', 'kalamata olives', 'feta', 'red onion', 'olive oil', 'oregano'],
    description: 'A bright, no-cook salad with creamy feta and bold herbs.',
    prepMinutes: 10,
  },
  {
    id: 'tuna-poke',
    day: '',
    meal: 'Lunch',
    name: 'Tuna poke bowl',
    image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 520,
    proteinG: 36,
    carbsG: 54,
    fatG: 16,
    ingredients: ['tuna', 'sushi rice', 'avocado', 'cucumber', 'edamame', 'sesame', 'soy sauce'],
    description: 'Fresh tuna over seasoned rice with cool vegetables and sesame.',
    prepMinutes: 15,
  },
  {
    id: 'chickpea-bowl',
    day: '',
    meal: 'Lunch',
    name: 'Roasted chickpea grain bowl',
    image: 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl',
    calories: 490,
    proteinG: 19,
    carbsG: 68,
    fatG: 16,
    ingredients: ['chickpeas', 'farro', 'roasted sweet potato', 'kale', 'tahini', 'lemon'],
    description: 'Hearty grains and crispy chickpeas with a rich tahini dressing.',
    prepMinutes: 30,
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
    id: 'thai-curry',
    day: '',
    meal: 'Dinner',
    name: 'Vegetable Thai curry',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl with rice',
    calories: 490,
    proteinG: 15,
    carbsG: 56,
    fatG: 20,
    ingredients: ['tofu', 'broccoli', 'bell pepper', 'coconut milk', 'Thai curry paste', 'jasmine rice'],
    description: 'A creamy, fragrant curry with vegetables and jasmine rice.',
    prepMinutes: 25,
  },
  {
    id: 'spaghetti-bol',
    day: '',
    meal: 'Dinner',
    name: 'Spaghetti bolognese',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1000&q=88',
    serving: '1 large plate',
    calories: 620,
    proteinG: 38,
    carbsG: 72,
    fatG: 22,
    ingredients: ['lean beef mince', 'spaghetti', 'crushed tomatoes', 'carrot', 'celery', 'parmesan'],
    description: 'A rich, slow-cooked bolognese over al dente spaghetti.',
    prepMinutes: 40,
  },
  {
    id: 'beef-tacos',
    day: '',
    meal: 'Dinner',
    name: 'Beef and veggie tacos',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=88',
    serving: '3 tacos',
    calories: 560,
    proteinG: 32,
    carbsG: 52,
    fatG: 22,
    ingredients: ['lean beef', 'corn tortillas', 'cabbage slaw', 'avocado', 'pico de gallo', 'lime'],
    description: 'Seasoned beef in warm tortillas with bright toppings and lime.',
    prepMinutes: 20,
  },
  {
    id: 'prawn-stirfry',
    day: '',
    meal: 'Dinner',
    name: 'Garlic prawn stir-fry',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=88',
    serving: '1 bowl with noodles',
    calories: 440,
    proteinG: 34,
    carbsG: 42,
    fatG: 14,
    ingredients: ['prawns', 'bok choy', 'snap peas', 'ginger', 'garlic', 'noodles', 'oyster sauce'],
    description: 'Juicy prawns and crisp greens tossed through silky garlic noodles.',
    prepMinutes: 18,
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
  {
    id: 'trail-mix',
    day: '',
    meal: 'Snack',
    name: 'Mixed nuts and dried fruit',
    image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=1000&q=88',
    serving: '1 small handful (30g)',
    calories: 175,
    proteinG: 5,
    carbsG: 16,
    fatG: 11,
    ingredients: ['almonds', 'cashews', 'walnuts', 'dried cranberries', 'pumpkin seeds'],
    description: 'A balanced handful of nuts and fruit for steady energy.',
    prepMinutes: 1,
  },
  {
    id: 'hummus-veggies',
    day: '',
    meal: 'Snack',
    name: 'Hummus with veggie sticks',
    image: 'https://images.unsplash.com/photo-1576400883215-7083980b6674?auto=format&fit=crop&w=1000&q=88',
    serving: '3 tbsp hummus + veg',
    calories: 165,
    proteinG: 6,
    carbsG: 18,
    fatG: 8,
    ingredients: ['hummus', 'carrot', 'cucumber', 'celery', 'bell pepper'],
    description: 'Creamy hummus with crisp vegetables — satisfying and light.',
    prepMinutes: 5,
  },
  {
    id: 'banana-pb',
    day: '',
    meal: 'Snack',
    name: 'Banana with peanut butter',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1000&q=88',
    serving: '1 medium banana + 1 tbsp',
    calories: 220,
    proteinG: 7,
    carbsG: 32,
    fatG: 8,
    ingredients: ['banana', 'peanut butter', 'chia seeds'],
    description: 'Quick natural energy with protein and healthy fats.',
    prepMinutes: 2,
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

/**
 * Slot-based replace — used by the "Browse recipes → Add to plan" flow.
 *
 * Removes any existing meal occupying the same (day, mealType) slot, then
 * appends newMeal. This is the canonical deduplication step that ensures
 * only one meal ever occupies a given slot after a recipe confirmation.
 */
export function applySlotReplace(
  plannerMeals: PlannerMeal[],
  planDay: string,
  planMealType: PlannerMeal['meal'],
  newMeal: PlannerMeal,
): PlannerMeal[] {
  return [
    ...plannerMeals.filter((meal) => !(meal.day === planDay && meal.meal === planMealType)),
    newMeal,
  ];
}

/**
 * Identity-based replace — used by the catalog "Replace meal" sheet in the planner.
 *
 * Swaps the meal whose id matches target.id, preserving target.id and
 * target.day so the slot position is never changed by the incoming recipe data.
 */
export function applyIdentityReplace(
  plannerMeals: PlannerMeal[],
  nextMeal: PlannerMeal,
  target: PlannerMeal,
): PlannerMeal[] {
  return plannerMeals.map((meal) =>
    meal.id === target.id ? { ...nextMeal, id: target.id, day: target.day } : meal,
  );
}

export function buildShoppingItems(meals: PlannerMeal[], checkedByName = new Map<string, boolean>()): ShoppingItem[] {
  const quantities = new Map<string, { name: string; quantity: number; sourceMealIds: string[]; sourceDays: Set<string> }>();
  meals.forEach((meal) => meal.ingredients.forEach((ingredient) => {
    const name = ingredient.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase();
    const current = quantities.get(key) ?? { name, quantity: 0, sourceMealIds: [], sourceDays: new Set<string>() };
    current.quantity += 1;
    if (!current.sourceMealIds.includes(meal.id)) current.sourceMealIds.push(meal.id);
    if (meal.day) current.sourceDays.add(meal.day);
    quantities.set(key, current);
  }));
  return Array.from(quantities.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => ({
      id: `shop-${key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      name: item.name,
      quantity: item.quantity,
      sourceMealIds: item.sourceMealIds,
      days: Array.from(item.sourceDays).sort(),
      checked: checkedByName.get(key) ?? checkedByName.get(item.name) ?? false,
    }));
}