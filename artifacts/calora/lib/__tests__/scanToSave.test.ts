import { describe, expect, it } from 'vitest';
import {
  FOOD_MEMORY_SCHEMA_VERSION,
  nutritionForComponents,
  parseServingInput,
  type FoodMemoryComponent,
  type FoodMemoryDraft,
} from '../foodMemory';
import { buildAcceptResult } from '../captureReviewTransitions';
import { reconcileComponentWithRestaurantFood } from '../nutritionReconciliation';
import type { RestaurantFood } from '@workspace/api-client-react';

const NOW = '2026-11-12T00:00:00.000Z';

function estimate(overrides: Partial<FoodMemoryComponent> = {}): FoodMemoryComponent {
  return {
    id: 'photo-chicken', name: 'chicken breast', serving: 'about 100 g', servingQuantity: 100,
    servingUnit: 'g', servingWeightG: 100, nutritionBasis: 'per_100g',
    calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, included: true, eatenFraction: 1,
    provenance: 'photo_estimate', sourceLabel: 'Photo estimate', confidence: 52,
    confidenceDimensions: { identity: 52, portion: 45, nutritionSource: 20, preparation: 40 },
    assumptions: ['Visual estimate may be incomplete.'],
    reviewQuestions: ['Confirm the food and serving portion.'], ...overrides,
  };
}

function providerFood(overrides: Partial<RestaurantFood> = {}): RestaurantFood {
  return {
    id: 'food-chicken', sourceId: 'fatsecret-food:chicken', name: 'Chicken breast', brandName: null,
    foodUrl: null, serving: '1 serving', servingId: 'serving-chicken', calories: 165,
    proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, sugarG: 0, sodiumMg: 74,
    servings: [{ servingId: 'g-100', description: '100 g', metricServingAmount: 100,
      metricServingUnit: 'g', calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6,
      fiberG: 0, sugarG: 0, sodiumMg: 74 } as RestaurantFood['servings'][number] & {
        metricServingAmount: number; metricServingUnit: string;
      }],
    sourceProvider: 'FatSecret', nutritionConfidence: 'verified', nutritionSource: 'FatSecret verified',
    ...overrides,
  } as RestaurantFood;
}

function draft(components: FoodMemoryComponent[]): FoodMemoryDraft {
  const nutrition = nutritionForComponents(components, NOW);
  return {
    id: 'draft-scan-save', schemaVersion: FOOD_MEMORY_SCHEMA_VERSION, inputType: 'photo',
    status: 'draft', title: 'Chicken meal', date: '2026-11-12', meal: 'Lunch', components,
    nutrition, originalNutrition: { ...nutrition }, provenance: 'photo_estimate', sourceLabel: 'AI',
    confidence: 52, confidenceDimensions: { identity: 52, portion: 45, nutritionSource: 20, preparation: 40 },
    assumptions: [], reviewQuestions: [], imageRetention: 'not_collected', createdAt: NOW,
    updatedAt: NOW, correctionIds: [],
  };
}

describe('Scan-to-Save deterministic workflow', () => {
  it('keeps a qualified AI portion estimate saveable', () => {
    expect(parseServingInput('about 100 g', estimate())).toEqual({ valid: true, quantity: 100, unit: 'g' });
    expect(parseServingInput('approximately 1 serving', estimate({ serving: '1 serving', servingQuantity: 1, servingUnit: 'serving', servingWeightG: null, nutritionBasis: 'per_serving' }))).toEqual({ valid: true, quantity: 1, unit: 'serving' });
    expect(parseServingInput('about one bowl', estimate())).toMatchObject({ valid: false });
  });

  it('matches a straightforward food, scales grams once, and saves the same nutrition', () => {
    const result = reconcileComponentWithRestaurantFood(estimate(), providerFood(), { quantity: 200, unit: 'g' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const accepted = buildAcceptResult(draft([result.component]), 'log-1', NOW);
    expect(result.component.provenance).toBe('verified_provider');
    expect(result.component.calories).toBe(330);
    expect(result.component.servingWeightG).toBe(200);
    expect(accepted.log.calories).toBe(330);
    expect(accepted.log.protein).toBe(62);
    expect(accepted.log.carbs).toBe(0);
    expect(accepted.log.fat).toBe(7);
  });

  it('applies partial consumption after reconciliation without double scaling', () => {
    const result = reconcileComponentWithRestaurantFood(estimate(), providerFood(), { quantity: 200, unit: 'g' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const partial = { ...result.component, eatenFraction: 0.5 };
    const accepted = buildAcceptResult(draft([partial]), 'log-2', NOW);
    expect(accepted.log.calories).toBe(165);
    expect(accepted.log.protein).toBe(31);
    expect(accepted.log.fat).toBe(4);
  });

  it('fails closed for incomplete provider data and preserves the editable estimate', () => {
    const incomplete = providerFood({ proteinG: null, servings: [] });
    const original = estimate();
    const result = reconcileComponentWithRestaurantFood(original, incomplete, { quantity: 150, unit: 'g' });
    expect(result.ok).toBe(false);
    expect(original.provenance).toBe('photo_estimate');
    expect(original.calories).toBe(165);
  });

  it('supports mixed meals without changing unrelated components', () => {
    const chicken = reconcileComponentWithRestaurantFood(estimate(), providerFood(), { quantity: 100, unit: 'g' });
    expect(chicken.ok).toBe(true);
    if (!chicken.ok) return;
    const salad = estimate({ id: 'photo-salad', name: 'mixed salad', calories: 90, proteinG: 3, carbsG: 12, fatG: 4 });
    const accepted = buildAcceptResult(draft([chicken.component, salad]), 'log-3', NOW);
    expect(accepted.log.calories).toBe(255);
    expect(accepted.log.protein).toBe(34);
    expect(accepted.log.carbs).toBe(12);
    expect(accepted.log.fat).toBe(8);
  });
});
