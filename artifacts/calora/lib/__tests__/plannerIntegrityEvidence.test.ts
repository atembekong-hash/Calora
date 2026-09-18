import { describe, expect, it } from 'vitest';
import { isProgramEligible } from '@workspace/api-zod/planner-program-eligibility';
import {
  allPlannerWeekEvidence,
  oneCandidateRoleExceptions,
  plannerIntegrityCatalogMealCount,
  plannerIntegrityInventory,
  plannerIntegrityProgramIds,
} from '@/lib/validation/plannerIntegrityEvidence';

describe('Mission 03 planner integrity evidence', () => {
  it('records every catalog meal with an eligibility decision and image provenance for every Program', () => {
    expect(plannerIntegrityCatalogMealCount).toBe(28);
    expect(plannerIntegrityInventory).toHaveLength(plannerIntegrityCatalogMealCount);
    for (const meal of plannerIntegrityInventory) {
      expect(meal.image.key).toBeTruthy();
      expect(meal.image.sourceUrl).toMatch(/^(https:\/\/|bundle:\/\/)/);
      expect(Object.keys(meal.programEligibility)).toEqual(plannerIntegrityProgramIds);
    }
  });

  it('uses only shared-helper eligible catalog meals in every deterministic Program output', () => {
    const byCanonicalId = new Map(plannerIntegrityInventory.map((meal) => [meal.canonicalId, meal]));
    for (const week of allPlannerWeekEvidence()) {
      for (const day of week.days) {
        for (const meal of Object.values(day.meals)) {
          const inventoryMeal = byCanonicalId.get(meal.canonicalId);
          expect(inventoryMeal, `${week.programId}/${meal.canonicalId}`).toBeDefined();
          expect(isProgramEligible(week.programId, {
            id: inventoryMeal!.canonicalId,
            name: inventoryMeal!.canonicalName,
            meal: inventoryMeal!.role,
            ...inventoryMeal!.macros,
            prepMinutes: inventoryMeal!.prepMinutes,
            ingredients: inventoryMeal!.ingredients,
          }), `${week.programId}/${meal.canonicalId}`).toBe(true);
        }
      }
    }
  });

  it('prohibits adjacent role repeats in every Program role', () => {
    for (const week of allPlannerWeekEvidence()) {
      for (const metric of week.roleRecurrence) {
        expect(metric.eligibleCandidateCount, `${week.programId}/${metric.role}`).toBeGreaterThanOrEqual(2);
        expect(metric.adjacentRepeatCount, `${week.programId}/${metric.role}`).toBe(0);
      }
    }
  });

  it('reports no one-candidate inventory exceptions', () => {
    expect(oneCandidateRoleExceptions()).toEqual([]);
  });
});