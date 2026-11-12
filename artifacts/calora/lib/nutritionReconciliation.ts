import type { RestaurantFood, RestaurantFoodServing } from '@workspace/api-client-react';
import type { FoodMemoryComponent, FoodMemoryCorrection } from './foodMemory';

export type ConfirmedPortion =
  | { quantity: number; unit: 'serving' }
  | { quantity: number; unit: 'g' };

type ReconciliationServing = RestaurantFoodServing & {
  metricServingAmount?: number | null;
  metricServingUnit?: string | null;
  isDefault?: boolean;
};

export type NutritionReconciliationResult =
  | {
      ok: true;
      component: FoodMemoryComponent;
      correction: FoodMemoryCorrection;
      matchedName: string;
      servingDescription: string;
    }
  | { ok: false; reason: string };

const STOP_WORDS = new Set(['and', 'with', 'the', 'of', 'style', 'food']);

function singularize(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('oes')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function normalizeFoodIdentity(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(singularize)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Conservative token score used only to rank a provider match. It never
 * upgrades a component by itself; callers must still select a concrete record.
 */
export function foodIdentityScore(estimate: string, candidate: string): number {
  const left = new Set(normalizeFoodIdentity(estimate));
  const right = new Set(normalizeFoodIdentity(candidate));
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

export function rankNutritionMatches(
  estimate: string,
  foods: readonly Pick<RestaurantFood, 'name' | 'brandName'>[],
): Array<{ food: Pick<RestaurantFood, 'name' | 'brandName'>; score: number }> {
  return foods
    .map((food) => ({
      food,
      score: Math.max(foodIdentityScore(estimate, food.name), food.brandName ? foodIdentityScore(estimate, `${food.brandName} ${food.name}`) : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value >= 0;
}

function primaryServing(food: RestaurantFood): ReconciliationServing | null {
  const servings = food.servings as ReconciliationServing[];
  const serving = servings.find((item) => item.isDefault) ?? servings[0];
  if (serving) return serving;
  if (food.serving && finite(food.calories) && finite(food.proteinG) && finite(food.carbsG) && finite(food.fatG)) {
    return {
      servingId: food.servingId,
      description: food.serving,
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      fiberG: food.fiberG,
      sugarG: food.sugarG,
      sodiumMg: food.sodiumMg,
    };
  }
  return null;
}

function servingScale(serving: ReconciliationServing, portion: ConfirmedPortion): number | null {
  if (portion.quantity <= 0 || !Number.isFinite(portion.quantity)) return null;
  if (portion.unit === 'serving') return portion.quantity;
  const metricAmount = serving.metricServingAmount;
  const metricUnit = serving.metricServingUnit?.toLowerCase();
  if (!metricAmount || metricAmount <= 0 || metricUnit !== 'g') return null;
  return portion.quantity / metricAmount;
}

/**
 * Reconcile a reviewed visual component against a concrete FatSecret record.
 * The provider values are treated as per-provider-serving values and are scaled
 * only when the chosen portion has a known, compatible basis.
 */
export function reconcileComponentWithRestaurantFood(
  component: FoodMemoryComponent,
  food: RestaurantFood,
  portion: ConfirmedPortion = { quantity: 1, unit: 'serving' },
  correctionId = `correction-${component.id}-${food.sourceId}`,
  now = new Date().toISOString(),
): NutritionReconciliationResult {
  const serving = primaryServing(food);
  if (!serving) return { ok: false, reason: 'The provider did not return a usable serving.' };
  if (!finite(serving.calories) || !finite(serving.proteinG) || !finite(serving.carbsG) || !finite(serving.fatG)) {
    return { ok: false, reason: 'The provider record is missing complete calorie or macro values.' };
  }
  const scale = servingScale(serving, portion);
  if (scale == null) return { ok: false, reason: 'This provider serving has no verified gram basis for the requested portion.' };
  const matchedName = food.brandName ? `${food.brandName} ${food.name}` : food.name;
  const servingWeightG = portion.unit === 'g'
    ? portion.quantity
    : serving.metricServingUnit?.toLowerCase() === 'g' && finite(serving.metricServingAmount)
      ? serving.metricServingAmount * portion.quantity
    : null;
  const nextServing = portion.unit === 'g' ? `${portion.quantity} g` : `${portion.quantity} serving${portion.quantity === 1 ? '' : 's'}`;
  const next: FoodMemoryComponent = {
    ...component,
    name: food.name,
    brand: food.brandName,
    serving: nextServing,
    servingQuantity: portion.quantity,
    servingUnit: portion.unit,
    servingWeightG,
    nutritionBasis: 'per_serving',
    servingMetadataSource: food.nutritionSource,
    calories: serving.calories * scale,
    proteinG: serving.proteinG * scale,
    carbsG: serving.carbsG * scale,
    fatG: serving.fatG * scale,
    provenance: 'verified_provider',
    sourceLabel: food.nutritionSource,
    confidence: Math.max(component.confidence, food.nutritionConfidence === 'verified' ? 96 : 80),
    confidenceDimensions: {
      identity: 96,
      portion: portion.unit === 'g' ? 94 : 86,
      nutritionSource: food.nutritionConfidence === 'verified' ? 96 : 80,
      preparation: component.confidenceDimensions.preparation,
    },
    assumptions: component.assumptions.filter((item) => !/visual estimate|may be/i.test(item)),
    reviewQuestions: component.reviewQuestions.filter((item) => !/confirm.*(food|serving|portion)/i.test(item)),
  };
  return {
    ok: true,
    component: next,
    matchedName,
    servingDescription: serving.description,
    correction: {
      id: correctionId,
      memoryId: 'pending-draft',
      componentId: component.id,
      kind: 'component_replaced',
      from: `${component.name} - ${component.serving}`,
      to: `${matchedName} - ${nextServing} - ${food.nutritionSource}`,
      createdAt: now,
    },
  };
}

export function correctionForManualPortion(
  component: FoodMemoryComponent,
  serving: string,
  correctionId = `correction-${component.id}-portion`,
  now = new Date().toISOString(),
): FoodMemoryCorrection {
  return {
    id: correctionId,
    memoryId: 'pending-draft',
    componentId: component.id,
    kind: 'serving',
    from: component.serving,
    to: serving,
    createdAt: now,
  };
}
