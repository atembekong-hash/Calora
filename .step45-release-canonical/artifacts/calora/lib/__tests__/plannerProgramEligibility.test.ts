import { describe, expect, it } from 'vitest';
import { plannerCatalogForProgram, plannerCatalog } from '@/data/planner';
import { orderProgramMeals, programEligibility, selectDiverseProgramMeal } from '@workspace/api-zod/planner-program-eligibility';

describe('planner Program eligibility and pools', () => {
  it('keeps plant-based local choices free of animal ingredients', () => {
    const meals = plannerCatalogForProgram('plant-based-week');
    expect(meals.length).toBeGreaterThan(0);
    expect(meals.some((meal) => meal.ingredients.some((ingredient) => /\b(egg|chicken|salmon|feta|yogurt)\b/i.test(ingredient)))).toBe(false);
  });

  it('filters quick choices by the shared preparation-time rule', () => {
    const meals = orderProgramMeals('quick-and-easy', plannerCatalog);
    expect(meals.length).toBeGreaterThan(0);
    expect(meals.every((meal) => (meal.prepMinutes ?? Infinity) <= 20)).toBe(true);
  });

  it('returns an explanatory decision for a rejected meal', () => {
    const decision = programEligibility('low-carb-living', {
      ...plannerCatalog.find((meal) => meal.id === 'med-pasta')!,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toMatch(/55g|exceed/i);
  });

  it('rotates eligible choices deterministically for local starter weeks', () => {
    const choices = plannerCatalog.filter((meal) => meal.meal === 'Snack');
    expect(selectDiverseProgramMeal(choices, 0)?.id).toBe(choices[0].id);
    expect(selectDiverseProgramMeal(choices, choices.length)?.id).toBe(choices[0].id);
  });
});