import type { PlannerMeal } from '@workspace/api-client-react';
import {
  programEligibility,
  type PlannerMealRole,
} from '@workspace/api-zod/planner-program-eligibility';
import {
  PROGRAM_MEAL_POOLS,
  type PlannerProgramId,
} from '@workspace/api-zod/planner-program-pools';
import {
  createStarterPlannerMeals,
  plannerCatalog,
  plannerCatalogForProgram,
  plannerDate,
  plannerMealTypes,
} from '@/data/planner';
import { plannerImageKeyForMealId } from '@/lib/mealImageIdentity';

/**
 * Fixed solely for evidence reproducibility. This is not a planner default.
 */
export const PLANNER_INTEGRITY_EVIDENCE_WEEK_START = '2026-08-03';

export const plannerIntegrityProgramIds = Object.keys(
  PROGRAM_MEAL_POOLS,
) as PlannerProgramId[];

export type PlannerIntegrityInventoryMeal = {
  canonicalId: string;
  canonicalName: string;
  role: PlannerMealRole;
  macros: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  prepMinutes?: number;
  ingredients: string[];
  image: {
    key?: string;
    provenance: 'Calora planner catalog imageAssetKey; shared planner image identity';
    sourceUrl: string;
  };
  programEligibility: Record<PlannerProgramId, { eligible: boolean; reason: string }>;
};

/**
 * Machine-readable evidence derived from the live Calora catalog and shared
 * eligibility helper. Do not edit this as a second catalog authority.
 */
export const plannerIntegrityInventory: PlannerIntegrityInventoryMeal[] = plannerCatalog.map((meal) => ({
  canonicalId: meal.id,
  canonicalName: meal.name,
  role: meal.meal,
  macros: {
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
  },
  prepMinutes: meal.prepMinutes,
  ingredients: [...meal.ingredients],
  image: {
    key: meal.imageAssetKey ?? plannerImageKeyForMealId(meal.id, meal.name),
    provenance: 'Calora planner catalog imageAssetKey; shared planner image identity',
    sourceUrl: meal.image,
  },
  programEligibility: Object.fromEntries(
    plannerIntegrityProgramIds.map((programId) => [programId, programEligibility(programId, meal)]),
  ) as Record<PlannerProgramId, { eligible: boolean; reason: string }>,
}));

/** Derived inventory cardinality, exposed so validation never duplicates it. */
export const plannerIntegrityCatalogMealCount = plannerIntegrityInventory.length;

export type RoleRecurrenceMetric = {
  role: PlannerMealRole;
  eligibleCandidateCount: number;
  uniqueMealCount: number;
  reusedSlotCount: number;
  adjacentRepeatCount: number;
};

export type OneCandidateRoleException = {
  programId: PlannerProgramId;
  role: PlannerMealRole;
  canonicalMealId: string;
  reason: 'Only one eligible catalog candidate exists for this program role.';
};

export type ProgramWeekEvidence = {
  programId: PlannerProgramId;
  days: Array<{
    date: string;
    meals: Record<PlannerMealRole, { canonicalId: string; name: string }>;
  }>;
  roleRecurrence: RoleRecurrenceMetric[];
};

function canonicalMealId(meal: PlannerMeal): string {
  const catalogMeal = plannerCatalog.find((catalogItem) => catalogItem.name === meal.name);
  if (!catalogMeal) throw new Error(`Generated planner meal "${meal.name}" is absent from the catalog.`);
  return catalogMeal.id;
}

export function plannerWeekEvidence(
  programId: PlannerProgramId,
  weekStart = PLANNER_INTEGRITY_EVIDENCE_WEEK_START,
): ProgramWeekEvidence {
  const output = createStarterPlannerMeals(weekStart, programId);
  const catalog = plannerCatalogForProgram(programId);
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const date = plannerDate(weekStart, dayIndex);
    const dayMeals = output.filter((meal) => meal.day === date);
    return {
      date,
      meals: Object.fromEntries(plannerMealTypes.map((role) => {
        const meal = dayMeals.find((item) => item.meal === role);
        if (!meal) throw new Error(`Generated output is missing ${role} on ${date}.`);
        return [role, { canonicalId: canonicalMealId(meal), name: meal.name }];
      })) as Record<PlannerMealRole, { canonicalId: string; name: string }>,
    };
  });

  return {
    programId,
    days,
    roleRecurrence: plannerMealTypes.map((role) => {
      const ids = days.map((day) => day.meals[role].canonicalId);
      const eligibleCandidateCount = catalog.filter((meal) => meal.meal === role).length;
      return {
        role,
        eligibleCandidateCount,
        uniqueMealCount: new Set(ids).size,
        reusedSlotCount: ids.length - new Set(ids).size,
        adjacentRepeatCount: ids.slice(1).filter((id, index) => id === ids[index]).length,
      };
    }),
  };
}

export function allPlannerWeekEvidence() {
  return plannerIntegrityProgramIds.map((programId) => plannerWeekEvidence(programId));
}

export function oneCandidateRoleExceptions(): OneCandidateRoleException[] {
  return plannerIntegrityProgramIds.flatMap((programId) =>
    plannerMealTypes.flatMap((role) => {
      const candidates = plannerCatalogForProgram(programId).filter((meal) => meal.meal === role);
      return candidates.length === 1
        ? [{
          programId,
          role,
          canonicalMealId: candidates[0].id,
          reason: 'Only one eligible catalog candidate exists for this program role.' as const,
        }]
        : [];
    }),
  );
}

export type CrossProgramOverlapMetric = {
  programs: [PlannerProgramId, PlannerProgramId];
  sharedCanonicalIds: string[];
  sharedMealCount: number;
  unionMealCount: number;
  jaccardSimilarity: number;
};

export function crossProgramOverlapMetrics(
  weeks = allPlannerWeekEvidence(),
): CrossProgramOverlapMetric[] {
  return weeks.flatMap((first, firstIndex) =>
    weeks.slice(firstIndex + 1).map((second) => {
      const firstIds = new Set(first.days.flatMap((day) =>
        plannerMealTypes.map((role) => day.meals[role].canonicalId)));
      const secondIds = new Set(second.days.flatMap((day) =>
        plannerMealTypes.map((role) => day.meals[role].canonicalId)));
      const sharedCanonicalIds = [...firstIds].filter((id) => secondIds.has(id)).sort();
      const unionMealCount = new Set([...firstIds, ...secondIds]).size;
      return {
        programs: [first.programId, second.programId],
        sharedCanonicalIds,
        sharedMealCount: sharedCanonicalIds.length,
        unionMealCount,
        jaccardSimilarity: Number((sharedCanonicalIds.length / unionMealCount).toFixed(3)),
      };
    }),
  );
}

/** Human-readable deterministic counterpart to the exported inventory. */
export function plannerIntegrityMarkdownReport(): string {
  const weeks = allPlannerWeekEvidence();
  const exceptionRows = oneCandidateRoleExceptions();
  const outputSections = weeks.map((week) => [
    `### ${week.programId}`,
    '',
    '| Date | Breakfast | Lunch | Dinner | Snack |',
    '| --- | --- | --- | --- | --- |',
    ...week.days.map((day) =>
      `| ${day.date} | ${day.meals.Breakfast.canonicalId} | ${day.meals.Lunch.canonicalId} | ${day.meals.Dinner.canonicalId} | ${day.meals.Snack.canonicalId} |`),
    '',
    '| Role | Eligible candidates | Unique meals | Reused slots | Adjacent repeats |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...week.roleRecurrence.map((metric) =>
      `| ${metric.role} | ${metric.eligibleCandidateCount} | ${metric.uniqueMealCount} | ${metric.reusedSlotCount} | ${metric.adjacentRepeatCount} |`),
  ].join('\n')).join('\n\n');
  const overlapRows = crossProgramOverlapMetrics(weeks).map((metric) =>
    `| ${metric.programs.join(' / ')} | ${metric.sharedMealCount} | ${metric.unionMealCount} | ${metric.jaccardSimilarity.toFixed(3)} | ${metric.sharedCanonicalIds.join(', ')} |`);

  return [
    '# Calora Mission 03 planner integrity validation sample',
    '',
    `Deterministic week: \`${PLANNER_INTEGRITY_EVIDENCE_WEEK_START}\` through \`${plannerDate(PLANNER_INTEGRITY_EVIDENCE_WEEK_START, 6)}\`.`,
    'The machine-readable source is `lib/validation/plannerIntegrityEvidence.ts`; it derives inventory, decisions, and output from the Calora planner catalog and shared eligibility helper.',
    '',
    '## Deterministic seven-day program output and role recurrence',
    '',
    outputSections,
    '',
    '## Explicit one-candidate inventory exceptions',
    '',
    '| Program | Role | Canonical meal | Reason |',
    '| --- | --- | --- | --- |',
    ...exceptionRows.map((exception) => `| ${exception.programId} | ${exception.role} | ${exception.canonicalMealId} | ${exception.reason} |`),
    '',
    '## Cross-program output overlap',
    '',
    'Overlap compares unique canonical meals used in each deterministic 28-slot output.',
    '',
    '| Program pair | Shared | Union | Jaccard | Shared canonical IDs |',
    '| --- | ---: | ---: | ---: | --- |',
    ...overlapRows,
    '',
  ].join('\n');
}