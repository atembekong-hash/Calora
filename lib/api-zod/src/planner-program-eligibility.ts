import { PROGRAM_MEAL_POOLS, type PlannerProgramId } from './planner-program-pools';

export type PlannerMealRole = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

/**
 * Shared minimum shape for the planner catalogue on the native client and API.
 * Program admission is calculated from these facts, never a display-only pool.
 */
export type ProgramEligibleMeal = {
  id: string;
  meal: PlannerMealRole;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMinutes?: number;
  ingredients: string[];
};

const animalIngredients = /\b(chicken|turkey|beef|pork|lamb|salmon|tuna|prawn|shrimp|fish|anchov|oyster|egg|dairy milk|cow'?s milk|greek yogurt|cheese|feta|parmesan|butter|cream|honey)\b/i;
const mediterraneanIngredients = /\b(salmon|tuna|prawn|lentil|chickpea|bean|quinoa|olive|tomato|spinach|kale|cucumber|avocado|berry|chia|nut|seed|lemon|vegetable)\b/i;
const antiInflammatoryIngredients = /\b(salmon|tuna|prawn|berry|chia|walnut|almond|spinach|kale|olive|avocado|ginger|turmeric|tomato|broccoli|edamame|lentil|chickpea)\b/i;
const budgetStaples = /\b(oat|egg|lentil|bean|chickpea|rice|banana|hummus|tofu|vegetable|pasta|peanut)\b/i;
const premiumIngredients = /\b(salmon|tuna|prawn|shrimp|beef)\b/i;

function ingredientText(meal: ProgramEligibleMeal) {
  return meal.ingredients.join(' ');
}

function minimumProtein(meal: ProgramEligibleMeal) {
  if (meal.meal === 'Snack') return 7;
  if (meal.meal === 'Breakfast') return 11;
  return 18;
}

/**
 * Returns a human-readable decision so validation artifacts can explain why
 * a meal belongs to a Program rather than merely reporting a boolean.
 */
export function programEligibility(
  programId: PlannerProgramId,
  meal: ProgramEligibleMeal,
): { eligible: boolean; reason: string } {
  const ingredients = ingredientText(meal);

  switch (programId) {
    case 'balanced-nutrition':
      return { eligible: true, reason: 'Balanced catalog meal with complete nutrition metadata.' };
    case 'high-protein-power':
      return meal.proteinG >= minimumProtein(meal)
        ? { eligible: true, reason: `Protein ${meal.proteinG}g meets the ${minimumProtein(meal)}g ${meal.meal.toLowerCase()} minimum.` }
        : { eligible: false, reason: `Protein ${meal.proteinG}g is below the ${minimumProtein(meal)}g ${meal.meal.toLowerCase()} minimum.` };
    case 'low-carb-living':
      return meal.carbsG <= 55
        ? { eligible: true, reason: `Carbohydrates ${meal.carbsG}g are within the 55g meal cap.` }
        : { eligible: false, reason: `Carbohydrates ${meal.carbsG}g exceed the 55g meal cap.` };
    case 'mediterranean-diet':
      return mediterraneanIngredients.test(ingredients)
        ? { eligible: true, reason: 'Contains a documented Mediterranean-pattern ingredient.' }
        : { eligible: false, reason: 'No documented Mediterranean-pattern ingredient is present.' };
    case 'plant-based-week':
      return !animalIngredients.test(ingredients)
        ? { eligible: true, reason: 'Ingredient list contains no animal-derived ingredient.' }
        : { eligible: false, reason: 'Ingredient list contains an animal-derived ingredient.' };
    case 'keto-kickstart':
      return meal.carbsG <= 45 && meal.fatG >= 8
        ? { eligible: true, reason: `Carbohydrates ${meal.carbsG}g and fat ${meal.fatG}g meet the keto catalog thresholds.` }
        : { eligible: false, reason: 'Does not meet the keto catalog thresholds of at most 45g carbs and at least 8g fat.' };
    case 'intermittent-fasting':
      return meal.meal !== 'Breakfast' || meal.calories <= 420
        ? { eligible: true, reason: meal.meal === 'Breakfast' ? 'Light breakfast supports the eating-window pattern.' : 'Lunch, dinner, or snack supports the eating-window pattern.' }
        : { eligible: false, reason: 'Breakfast exceeds the 420 kcal fasting-window cap.' };
    case 'budget-friendly':
      return budgetStaples.test(ingredients) && !premiumIngredients.test(ingredients)
        ? { eligible: true, reason: 'Uses documented budget staples without premium animal proteins.' }
        : { eligible: false, reason: 'Does not meet the budget-staple and premium-protein exclusion rule.' };
    case 'quick-and-easy':
      return (meal.prepMinutes ?? Number.POSITIVE_INFINITY) <= 20
        ? { eligible: true, reason: `Preparation time ${meal.prepMinutes} minutes meets the 20-minute cap.` }
        : { eligible: false, reason: `Preparation time ${meal.prepMinutes ?? 'unknown'} minutes exceeds the 20-minute cap.` };
    case 'athletic-performance':
      return meal.calories >= (meal.meal === 'Snack' ? 175 : meal.meal === 'Breakfast' ? 340 : 440)
        && meal.proteinG >= (meal.meal === 'Snack' ? 5 : 18)
        ? { eligible: true, reason: 'Meets the role-specific energy and protein floor for training support.' }
        : { eligible: false, reason: 'Does not meet the role-specific energy and protein floor for training support.' };
    case 'anti-inflammatory':
      return antiInflammatoryIngredients.test(ingredients) && !/\b(beef|processed)\b/i.test(ingredients)
        ? { eligible: true, reason: 'Contains a documented anti-inflammatory-pattern ingredient without an excluded ingredient.' }
        : { eligible: false, reason: 'Missing a documented anti-inflammatory-pattern ingredient or contains an excluded ingredient.' };
    case 'healthy-habits-week':
      return meal.calories >= 150 && meal.calories <= 680 && meal.ingredients.length >= 3
        ? { eligible: true, reason: 'Fits the whole-food calorie range and has a complete ingredient list.' }
        : { eligible: false, reason: 'Does not meet the healthy-habits calorie or ingredient-completeness rule.' };
  }
}

export function isProgramEligible(programId: PlannerProgramId, meal: ProgramEligibleMeal) {
  return programEligibility(programId, meal).eligible;
}

/**
 * Programs share a catalogue, but their pools only express a preferred order.
 * Eligibility is always enforced first; eligible meals outside a small legacy
 * pool remain available so the weekly planner can diversify safely.
 */
export function orderProgramMeals<T extends ProgramEligibleMeal>(programId: PlannerProgramId | undefined, meals: T[]): T[] {
  if (!programId) return [...meals];
  const rank = new Map<string, number>(
    PROGRAM_MEAL_POOLS[programId].map((id, index) => [id, index]),
  );
  return meals
    .filter((meal) => isProgramEligible(programId, meal))
    .map((meal, index) => ({ meal, index, rank: rank.get(meal.id) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ meal }) => meal);
}

/**
 * Deterministic role rotation for the local/offline planner. It maximizes
 * unique meals before reuse and prevents adjacent repeats whenever two or more
 * eligible choices exist. A one-item role is an explicit inventory limitation,
 * not an accidental fallback.
 */
export function selectDiverseProgramMeal<T extends ProgramEligibleMeal>(
  candidates: T[],
  dayIndex: number,
): T | undefined {
  if (candidates.length === 0) return undefined;
  return candidates[dayIndex % candidates.length];
}