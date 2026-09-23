import type { PlannerMeal } from '@workspace/api-client-react';
import { PLANNER_CATALOG, type PlannerDiet } from '@workspace/api-zod/planner-catalog';
import type { ShoppingItem } from '@/context/CaloraContext';
import { addDays, dateFromKey, dateKey } from '@/lib/dates';
import type { PlanTypeId } from '@/lib/planType';
import { plannerImageKeyForMeal, plannerImageKeyForMealId } from '@/lib/mealImageIdentity';
import { getPlannerMealRecipeLink } from '@/lib/plannerRecipeLink';
import { orderProgramMeals } from '@workspace/api-zod/planner-program-eligibility';
import { PROGRAM_HERO_MEAL_IDS, type PlannerProgramId } from '@workspace/api-zod/planner-program-pools';

export const plannerMealTypes: PlannerMeal['meal'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type PlannerCatalogMeal = PlannerMeal & { diets: PlannerDiet[] };

export const plannerCatalog: PlannerCatalogMeal[] = PLANNER_CATALOG.map((meal) => ({
  ...meal,
  day: '',
  image: meal.image ?? '',
  imageAssetKey: plannerImageKeyForMealId(meal.id),
}));

export function normalizePlannerMealImageIdentity(meal: PlannerMeal): PlannerMeal {
  const imageAssetKey = plannerImageKeyForMeal(meal.id, meal.name);
  if (imageAssetKey) {
    return imageAssetKey === meal.imageAssetKey ? meal : { ...meal, imageAssetKey };
  }

  // A renamed/customized canonical meal must not fall through to the catalog
  // URL it inherited before its visible identity changed. Recipe-linked meals
  // retain their own image source because their source evidence still names the
  // owning recipe entity.
  if (!getPlannerMealRecipeLink(meal)) {
    if (!meal.image && meal.imageAssetKey === undefined) return meal;
    return { ...meal, image: '', imageAssetKey: undefined };
  }

  return meal.imageAssetKey === undefined ? meal : { ...meal, imageAssetKey: undefined };
}

export function normalizePlannerMealImageIdentities(meals: PlannerMeal[]): PlannerMeal[] {
  return meals.map(normalizePlannerMealImageIdentity);
}

export function getPlannerWeekStart(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + offset);
  return `${local.getFullYear()}-${`${local.getMonth() + 1}`.padStart(2, '0')}-${`${local.getDate()}`.padStart(2, '0')}`;
}

export function normalizePlannerWeekStart(value: string | null | undefined, fallback = getPlannerWeekStart()): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
    || Number.isNaN(parsed.getTime())
  ) {
    return fallback;
  }
  return getPlannerWeekStart(parsed);
}
export function plannerDate(weekStart: string, offset: number) {
  return addDays(weekStart, offset);
}

export function plannerCatalogForProgram(programId?: PlanTypeId, diet: PlannerDiet = 'Everything'): PlannerMeal[] {
  const compatible = plannerCatalog.filter((meal) => diet === 'Everything' || meal.diets.includes(diet));
  return orderProgramMeals(programId as PlannerProgramId | undefined, compatible);
}

/**
 * A truthful, deterministic Program preview for one dietary preference.
 *
 * A result is available only when the exact Program/diet intersection can fill
 * Breakfast, Lunch, Dinner, and Snack. The preferred hero is conditional: it
 * is used only when it remains compatible; otherwise the ordered eligible
 * catalog provides a stable replacement. Detail previews contain four distinct
 * canonical meals, one per role, with the hero first.
 */
export type PlannerProgramPreview =
  | {
    status: 'available';
    diet: PlannerDiet;
    programId: PlanTypeId;
    hero: PlannerMeal;
    meals: [PlannerMeal, PlannerMeal, PlannerMeal, PlannerMeal];
  }
  | {
    status: 'unavailable';
    diet: PlannerDiet;
    programId: PlanTypeId;
    reason: 'missing-meal-role';
    missingRoles: PlannerMeal['meal'][];
  };

export function plannerProgramPreview(programId: PlanTypeId, diet: PlannerDiet = 'Everything'): PlannerProgramPreview {
  const eligible = plannerCatalogForProgram(programId, diet);
  const mealsByRole = new Map<PlannerMeal['meal'], PlannerMeal>();
  plannerMealTypes.forEach((role) => {
    const candidate = eligible.find((meal) => meal.meal === role);
    if (candidate) mealsByRole.set(role, candidate);
  });
  const missingRoles = plannerMealTypes.filter((role) => !mealsByRole.has(role));
  if (missingRoles.length > 0) {
    return { status: 'unavailable', programId, diet, reason: 'missing-meal-role', missingRoles };
  }

  // The fixed table is a preference only after diet filtering and Program
  // eligibility have occurred. Never render an incompatible legacy hero.
  const hero = eligible.find((meal) => meal.id === PROGRAM_HERO_MEAL_IDS[programId as PlannerProgramId]) ?? eligible[0]!;
  const roleMeals = plannerMealTypes
    .filter((role) => role !== hero.meal)
    .map((role) => mealsByRole.get(role)!);

  return {
    status: 'available',
    programId,
    diet,
    hero,
    meals: [hero, ...roleMeals] as [PlannerMeal, PlannerMeal, PlannerMeal, PlannerMeal],
  };
}

export function createStarterPlannerMeals(
  weekStart = getPlannerWeekStart(),
  programId?: PlanTypeId,
  diet: PlannerDiet = 'Everything',
): PlannerMeal[] {
  const catalog = plannerCatalogForProgram(programId, diet);
  const byMeal = {
    Breakfast: catalog.filter((meal) => meal.meal === 'Breakfast'),
    Lunch: catalog.filter((meal) => meal.meal === 'Lunch'),
    Dinner: catalog.filter((meal) => meal.meal === 'Dinner'),
    Snack: catalog.filter((meal) => meal.meal === 'Snack'),
  };
  if (plannerMealTypes.some((mealType) => byMeal[mealType].length === 0)) return [];
  return Array.from({ length: 7 }, (_, dayIndex) =>
    plannerMealTypes.map((mealType, mealIndex) => {
      const candidates = byMeal[mealType];
      const meal = candidates[(dayIndex + mealIndex) % candidates.length]!;
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
 * Swaps the meal whose id matches target.id, assigning the replacement a
 * distinct identity while preserving target.day and target.meal. Callers can
 * repoint any diary log explicitly instead of silently changing the meaning
 * of a historical plannerMealId.
 */
export function applyIdentityReplace(
  plannerMeals: PlannerMeal[],
  nextMeal: PlannerMeal,
  target: PlannerMeal,
): PlannerMeal[] {
  if (nextMeal.meal !== target.meal) return plannerMeals;
  return plannerMeals.map((meal) =>
    meal.id === target.id
      ? { ...nextMeal, id: `planned-replacement-${target.id}-${nextMeal.id}`, day: target.day, meal: target.meal }
      : meal,
  );
}

/**
 * True when a meal was produced by a Program generation or the starter seed —
 * i.e. NOT something the user authored or edited themselves.
 * Generated meals carry a `planner-` id (API) and starter meals `starter-`;
 * user-created meals carry `custom-` / `planned-` (catalog add) / recipe ids.
 */
export function isProgramGeneratedMeal(meal: PlannerMeal): boolean {
  return meal.id.startsWith('planner-') || meal.id.startsWith('starter-');
}

/**
 * Merge a freshly generated week into the current planner meals.
 *
 * - 'fill'    — conservative build: every existing meal in the week keeps its
 *               slot; generated meals only fill slots that were empty.
 * - 'rebuild' — explicit Program refresh: program-generated meals in the week
 *               are replaced, but user-authored meals (custom, manually added,
 *               recipe picks), edited meals, and any meal whose id is in
 *               `protectedIds` (e.g. already logged to the diary) keep their
 *               slots. Meals outside the week are never touched.
 *
 * The result reports how many meals were actually inserted and replaced so
 * callers can record Program provenance ONLY when the generation materially
 * changed the week — a no-op merge must not claim the Program shaped it.
 */
export interface MergeGeneratedWeekResult {
  meals: PlannerMeal[];
  /** Generated meals that actually landed in the week. */
  insertedCount: number;
  /** Existing in-week meals that were removed (rebuild mode only). */
  replacedCount: number;
}

export function mergeGeneratedWeek(
  current: PlannerMeal[],
  generated: PlannerMeal[],
  weekDays: string[],
  options: { mode: 'fill' | 'rebuild'; protectedIds?: ReadonlySet<string> },
): MergeGeneratedWeekResult {
  const weekSet = new Set(weekDays);
  const protectedIds = options.protectedIds ?? new Set<string>();
  const isPreserved = (meal: PlannerMeal) =>
    options.mode === 'fill' || !isProgramGeneratedMeal(meal) || protectedIds.has(meal.id);
  const kept = current.filter((meal) => !weekSet.has(meal.day) || isPreserved(meal));
  const keptSlots = new Set(kept.filter((meal) => weekSet.has(meal.day)).map((meal) => `${meal.day}-${meal.meal}`));
  const additions = generated.filter(
    (meal) => weekSet.has(meal.day) && !keptSlots.has(`${meal.day}-${meal.meal}`),
  );
  return {
    meals: [...kept, ...additions],
    insertedCount: additions.length,
    replacedCount: current.length - kept.length,
  };
}

export function shoppingNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function shoppingChecksByName(items: readonly ShoppingItem[], weekStart?: string): Map<string, boolean> {
  return new Map(items.map((item) => [
    shoppingNameKey(item.name),
    weekStart && item.checkedByWeek?.[weekStart] !== undefined
      ? item.checkedByWeek[weekStart]
      : item.checked,
  ]));
}

export function shoppingWeekChecksByName(items: readonly ShoppingItem[]): Map<string, Record<string, boolean>> {
  return new Map(
    items
      .filter((item) => item.checkedByWeek && Object.keys(item.checkedByWeek).length > 0)
      .map((item) => [shoppingNameKey(item.name), item.checkedByWeek!] as const),
  );
}
export function buildShoppingItems(
  meals: PlannerMeal[],
  checkedByName = new Map<string, boolean>(),
  checkedByWeek = new Map<string, Record<string, boolean>>(),
): ShoppingItem[] {
  const normalizedChecks = new Map(
    Array.from(checkedByName.entries()).map(([name, checked]) => [shoppingNameKey(name), checked] as const),
  );
  const quantities = new Map<string, { name: string; quantity: number; sourceMealIds: string[]; sourceDays: Set<string> }>();
  meals.forEach((meal) => meal.ingredients.forEach((ingredient) => {
    const name = ingredient.trim().replace(/\s+/g, ' ');
    const key = shoppingNameKey(name);
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
       checked: normalizedChecks.get(key) ?? false,
       ...(checkedByWeek.get(key) ? { checkedByWeek: checkedByWeek.get(key) } : {}),
    }));
}
