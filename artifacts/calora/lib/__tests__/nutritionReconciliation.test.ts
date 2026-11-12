import { describe, expect, it } from 'vitest';
import {
  foodIdentityScore,
  normalizeFoodIdentity,
  rankNutritionMatches,
  reconcileComponentWithRestaurantFood,
} from '../nutritionReconciliation';
import type { FoodMemoryComponent } from '../foodMemory';
import type { RestaurantFood } from '@workspace/api-client-react';

const component: FoodMemoryComponent = {
  id: 'photo-1', name: 'tomatoes', serving: 'about 100 g', calories: 30,
  proteinG: 1, carbsG: 6, fatG: 0.2, included: true, eatenFraction: 1,
  provenance: 'photo_estimate', sourceLabel: 'Photo estimate', confidence: 52,
  confidenceDimensions: { identity: 52, portion: 45, nutritionSource: 20, preparation: 40 },
  assumptions: ['Visual estimate may be incomplete.'],
  reviewQuestions: ['Confirm the food and serving portion.'],
};

function food(overrides: Partial<RestaurantFood> = {}): RestaurantFood {
  return {
    id: 'food-1', sourceId: 'fatsecret-food:1', name: 'Tomato', brandName: null,
    foodUrl: null, serving: '1 cup', servingId: 'serving-1', calories: 30,
    proteinG: 1.5, carbsG: 6.5, fatG: 0.3, fiberG: 2, sugarG: 4,
    sodiumMg: 10, servings: [], sourceProvider: 'FatSecret',
    nutritionConfidence: 'verified', nutritionSource: 'FatSecret verified',
    ...overrides,
  } as RestaurantFood;
}

describe('nutrition reconciliation', () => {
  it('normalizes singular/plural identities and ranks controlled matches', () => {
    expect(normalizeFoodIdentity('Tomatoes & herbs')).toEqual(['tomato', 'herb']);
    expect(foodIdentityScore('tomatoes', 'Tomato')).toBe(1);
    expect(rankNutritionMatches('tomatoes', [
      { name: 'Tomato', brandName: null },
      { name: 'Chicken breast', brandName: null },
    ])[0]?.food.name).toBe('Tomato');
  });

  it('scales complete provider nutrition from a verified gram serving', () => {
    const result = reconcileComponentWithRestaurantFood(component, food({
      servings: [{
        servingId: 'g-100', description: '100 g', calories: 30, proteinG: 1.5,
        carbsG: 6.5, fatG: 0.3, fiberG: 2, sugarG: 4, sodiumMg: 10,
        metricServingAmount: 100, metricServingUnit: 'g',
      } as RestaurantFood['servings'][number] & { metricServingAmount: number; metricServingUnit: string }],
    }), { quantity: 200, unit: 'g' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.component.provenance).toBe('verified_provider');
      expect(result.component.servingWeightG).toBe(200);
      expect(result.component.calories).toBe(60);
      expect(result.component.proteinG).toBe(3);
      expect(result.component.reviewQuestions).toEqual([]);
    }
  });

  it('does not claim verified nutrition when the provider lacks a compatible basis', () => {
    const result = reconcileComponentWithRestaurantFood(component, food({
      servings: [{
        servingId: null, description: '1 item', calories: 30, proteinG: 1,
        carbsG: 6, fatG: 0.2, fiberG: null, sugarG: null, sodiumMg: null,
      } as RestaurantFood['servings'][number]],
    }), { quantity: 100, unit: 'g' });
    expect(result).toEqual({ ok: false, reason: 'This provider serving has no verified gram basis for the requested portion.' });
  });
});
