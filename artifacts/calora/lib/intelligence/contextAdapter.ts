import type { CaloraRecipe } from '@/context/CaloraContext';
import type { PlannerMeal } from '@workspace/api-client-react';
import type { IntelligenceContext, MissingDataKind } from './types';
import { INTELLIGENCE_CALCULATION_VERSION } from './types';

type LocalCaloraState = {
  logs: IntelligenceContext['foodLogs'];
  profile: IntelligenceContext['profile'];
  weights: IntelligenceContext['weights'];
  waterLogs: IntelligenceContext['waterLogs'];
  moodLogs: IntelligenceContext['moodLogs'];
  activityLogs: IntelligenceContext['activityLogs'];
  activityMinutesLogs: IntelligenceContext['activityMinutesLogs'];
  plannerMeals: readonly PlannerMeal[];
  shoppingItems: IntelligenceContext['shopping'];
  localRecipes: readonly CaloraRecipe[];
  activeEnergyKcal?: number | null;
};

export function missingDataForContext(input: Pick<LocalCaloraState, 'logs' | 'profile' | 'weights'>): MissingDataKind[] {
  const missing: MissingDataKind[] = [];
  if (!input.profile) missing.push('missing_profile');
  if (!input.profile?.calorieTarget || input.profile.calorieTarget <= 0) missing.push('missing_target');
  if (!input.weights.length) missing.push('missing_weight');
  if (!input.logs.length) missing.push('insufficient_history');
  return missing;
}

/**
 * Read-only adapter: creates an isolated serializable snapshot, never aliases
 * Calora state, and never mutates context, persistence, or sync state.
 */
export function createIntelligenceContext(
  state: LocalCaloraState,
  options: { date: string; timezone?: string } = { date: new Date().toISOString().slice(0, 10) },
): IntelligenceContext {
  return {
    date: options.date,
    timezone: options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown',
    dayBoundary: 'local-calendar-day',
    foodLogs: structuredClone(state.logs),
    profile: structuredClone(state.profile),
    weights: structuredClone(state.weights),
    waterLogs: structuredClone(state.waterLogs),
    moodLogs: structuredClone(state.moodLogs),
    activityLogs: structuredClone(state.activityLogs),
    activityMinutesLogs: structuredClone(state.activityMinutesLogs),
    planner: structuredClone(state.plannerMeals),
    shopping: structuredClone(state.shoppingItems),
    recipes: structuredClone(state.localRecipes),
    activeEnergyKcal: Number.isFinite(state.activeEnergyKcal) ? Math.max(0, state.activeEnergyKcal ?? 0) : null,
    sourceVersion: INTELLIGENCE_CALCULATION_VERSION,
    missingData: missingDataForContext(state),
  };
}