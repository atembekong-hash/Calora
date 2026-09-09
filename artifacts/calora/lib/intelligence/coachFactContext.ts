import type { IntelligenceFact, MissingDataKind } from './types';

export const COACH_FACT_CONTEXT_SCHEMA_VERSION = 'coach-fact-context-v1' as const;
/** This versioned, purpose-specific identifier is distinct from legacy Coach consent. */
export const COACH_FACT_CONTEXT_PURPOSE = 'coach_fact_context_v1' as const;
export const COACH_FACT_CONTEXT_TTL_MS = 60_000;

export const COACH_FACT_KEYS = [
  'daily.calorie_status',
  'daily.protein_status',
  'daily.carbohydrate_status',
  'daily.fat_status',
  'daily.fiber_status',
  'daily.sugar_status',
  'daily.sodium_status',
  'daily.water_status',
  'daily.meal_distribution',
  'daily.logging_completeness',
  'weekly.nutrition_coverage',
  'weekly.macro_coverage',
  'weight.short_trend',
] as const;

export type CoachFactKey = typeof COACH_FACT_KEYS[number];
export type CoachFactStatus = 'available' | 'limited' | 'unknown';
export type CoachFactMissingData = 'no_profile' | 'no_logged_food_today' | 'incomplete_logging' | 'unknown_provenance' | 'insufficient_history';
export type CoachFactProvenance = 'verified' | 'mixed' | 'estimated' | 'derived';

export type CoachApprovedFact = {
  key: CoachFactKey;
  status: CoachFactStatus;
  statement: string;
  values: Record<string, number | string | boolean>;
  unit: 'kcal' | 'g' | 'mg' | 'fl oz' | '%' | 'kg' | null;
  timeWindow: 'today' | 'recent';
  confidence: 'high' | 'medium' | 'limited';
  freshness: 'fresh' | 'limited';
  provenance: CoachFactProvenance;
  limitations: string[];
};

export type CoachFactContextV1 = {
  schemaVersion: typeof COACH_FACT_CONTEXT_SCHEMA_VERSION;
  purpose: typeof COACH_FACT_CONTEXT_PURPOSE;
  generatedAt: string;
  expiresAt: string;
  calculationVersion: string;
  requestNonce: string;
  coverage: 'available' | 'partial' | 'insufficient';
  missingData: CoachFactMissingData[];
  facts: CoachApprovedFact[];
  limitations: string[];
};

export type CoachFactConsent =
  | { state: 'not_consented'; purpose: typeof COACH_FACT_CONTEXT_PURPOSE }
  | { state: 'revoked'; purpose: typeof COACH_FACT_CONTEXT_PURPOSE }
  | { state: 'stale_version'; purpose: typeof COACH_FACT_CONTEXT_PURPOSE }
  | { state: 'consented_current'; purpose: typeof COACH_FACT_CONTEXT_PURPOSE };

/** Account-keyed, in-memory-only dark consent state. It deliberately vanishes
 * on app restart until an approved account-scoped persistence design exists. */
export class CoachFactConsentRegistry {
  private readonly states = new Map<string, CoachFactConsent>();

  get(accountId: string | null): CoachFactConsent {
    return accountId ? this.states.get(accountId) ?? { state: 'not_consented', purpose: COACH_FACT_CONTEXT_PURPOSE }
      : { state: 'not_consented', purpose: COACH_FACT_CONTEXT_PURPOSE };
  }

  consent(accountId: string) {
    this.states.set(accountId, { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE });
  }

  revoke(accountId: string) {
    this.states.set(accountId, { state: 'revoked', purpose: COACH_FACT_CONTEXT_PURPOSE });
  }

  markStale(accountId: string) {
    this.states.set(accountId, { state: 'stale_version', purpose: COACH_FACT_CONTEXT_PURPOSE });
  }

  clear(accountId: string | null) {
    if (accountId) this.states.delete(accountId);
  }
}

const missingMap: Partial<Record<MissingDataKind, CoachFactMissingData>> = {
  missing_profile: 'no_profile',
  incomplete_day: 'incomplete_logging',
  unknown_provenance: 'unknown_provenance',
};

function finiteValue(fact: IntelligenceFact, name: string): number | null {
  if (typeof fact.value === 'number') return Number.isFinite(fact.value) ? Math.round(fact.value) : null;
  if (!fact.value || typeof fact.value !== 'object') return null;
  const value = fact.value[name];
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function factByType(facts: readonly IntelligenceFact[], factType: string) {
  return facts.find((fact) => fact.factType === factType);
}

function eligible(facts: Array<IntelligenceFact | undefined>, allowInsufficient = false) {
  return facts.every((fact) => fact
    && fact.freshness === 'fresh'
    && (fact.confidence === 'high' || fact.confidence === 'medium')
    && !fact.missingData.includes('unknown_provenance')
    && (allowInsufficient || !fact.missingData.includes('insufficient_history')));
}

function provenance(facts: IntelligenceFact[]): CoachFactProvenance {
  const origins = facts.flatMap((fact) => fact.evidence.map((evidence) => evidence.origin));
  if (origins.every((origin) => origin === 'verified' || origin === 'barcode' || origin === 'nutrition_label')) return 'verified';
  if (origins.some((origin) => origin === 'ai_estimate' || origin === 'recipe_estimate')) return 'estimated';
  return origins.length > 1 ? 'mixed' : 'derived';
}

function confidence(facts: IntelligenceFact[]): 'high' | 'medium' {
  return facts.every((fact) => fact.confidence === 'high') ? 'high' : 'medium';
}

function buildFacts(facts: readonly IntelligenceFact[]): CoachApprovedFact[] {
  const calorie = [
    factByType(facts, 'daily.calories_consumed'),
    factByType(facts, 'daily.calorie_target'),
    factByType(facts, 'daily.calories_remaining'),
  ];
  const protein = [
    factByType(facts, 'daily.protein_consumed'),
    factByType(facts, 'daily.protein_target'),
    factByType(facts, 'daily.protein_remaining'),
  ];
  const result: CoachApprovedFact[] = [];

  const addNumeric = (
    key: CoachFactKey,
    sourceType: string,
    valueKey: string,
    unit: CoachApprovedFact['unit'],
    statement: (value: number) => string,
    limitations: string[],
    timeWindow: CoachApprovedFact['timeWindow'] = 'today',
  ) => {
    const source = factByType(facts, sourceType);
    const value = source ? finiteValue(source, valueKey) : null;
    if (source && value !== null && eligible([source])) {
      result.push({
        key, status: 'available', statement: statement(value),
        values: { [valueKey]: value }, unit, timeWindow,
        confidence: confidence([source]), freshness: 'fresh', provenance: provenance([source]), limitations,
      });
    }
  };

  if (eligible(calorie)) {
    const source = calorie as IntelligenceFact[];
    result.push({
      key: 'daily.calorie_status', status: 'available',
      // Protocol literal: must exactly match the server deterministic validator.
      statement: `Today's logged calories are ${finiteValue(source[0], 'value')} kcal against a ${finiteValue(source[1], 'value')} kcal app target.`,
      values: { consumedKcal: finiteValue(source[0], 'value')!, targetKcal: finiteValue(source[1], 'value')!, remainingKcal: finiteValue(source[2], 'value')! },
      unit: 'kcal', timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['This reflects logged records today and is not a recommendation.'],
    });
  }
  if (eligible(protein)) {
    const source = protein as IntelligenceFact[];
    result.push({
      key: 'daily.protein_status', status: 'available',
      // Protocol literal: must exactly match the server deterministic validator.
      statement: `Today's logged protein is ${finiteValue(source[0], 'value')} g against a ${finiteValue(source[1], 'value')} g app target.`,
      values: { consumedG: finiteValue(source[0], 'value')!, targetG: finiteValue(source[1], 'value')!, remainingG: finiteValue(source[2], 'value')! },
      unit: 'g', timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['This reflects logged records today and is not medical nutrition advice.'],
    });
  }
  const carbs = [factByType(facts, 'daily.carbohydrates_consumed'), factByType(facts, 'daily.carbohydrates_target'), factByType(facts, 'daily.carbohydrates_remaining')];
  if (eligible(carbs)) {
    const source = carbs as IntelligenceFact[];
    result.push({
      key: 'daily.carbohydrate_status', status: 'available',
      statement: `Today's logged carbohydrates are ${finiteValue(source[0], 'value')} g against a ${finiteValue(source[1], 'value')} g app target.`,
      values: { consumedG: finiteValue(source[0], 'value')!, targetG: finiteValue(source[1], 'value')!, remainingG: finiteValue(source[2], 'value')! },
      unit: 'g', timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['This reflects logged records today and is not a recommendation.'],
    });
  }
  const fat = [factByType(facts, 'daily.fat_consumed'), factByType(facts, 'daily.fat_target'), factByType(facts, 'daily.fat_remaining')];
  if (eligible(fat)) {
    const source = fat as IntelligenceFact[];
    result.push({
      key: 'daily.fat_status', status: 'available',
      statement: `Today's logged fat is ${finiteValue(source[0], 'value')} g against a ${finiteValue(source[1], 'value')} g app target.`,
      values: { consumedG: finiteValue(source[0], 'value')!, targetG: finiteValue(source[1], 'value')!, remainingG: finiteValue(source[2], 'value')! },
      unit: 'g', timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['This reflects logged records today and is not a recommendation.'],
    });
  }
  addNumeric('daily.fiber_status', 'daily.fiber_consumed', 'value', 'g', (value) => `Today's logged fiber is ${value} g.`, ['This reflects logged records today; fiber may be missing from some entries.']);
  addNumeric('daily.sugar_status', 'daily.sugar_consumed', 'value', 'g', (value) => `Today's logged sugar is ${value} g.`, ['This reflects logged records today; sugar may be missing from some entries.']);
  addNumeric('daily.sodium_status', 'daily.sodium_consumed', 'value', 'mg', (value) => `Today's logged sodium is ${value} mg.`, ['This reflects logged records today; sodium may be missing from some entries.']);
  addNumeric('daily.water_status', 'daily.water_consumed', 'consumedOz', 'fl oz', (value) => `Today's logged water is ${value} fl oz.`, ['This reflects logged water and is not a medical hydration target.']);

  const mealDistribution = factByType(facts, 'daily.meal_distribution');
  if (mealDistribution && eligible([mealDistribution])) {
    const value = mealDistribution.value;
    if (value && typeof value === 'object') {
      const percentages = ['breakfastPercentage', 'lunchPercentage', 'dinnerPercentage', 'snackPercentage'];
      if (percentages.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))) {
        result.push({
          key: 'daily.meal_distribution', status: 'available',
          statement: `Today's logged meal distribution is Breakfast ${value.breakfastPercentage}%, Lunch ${value.lunchPercentage}%, Dinner ${value.dinnerPercentage}%, and Snack ${value.snackPercentage}%.`,
          values: Object.fromEntries(percentages.map((key) => [key, value[key] as number])),
          unit: '%', timeWindow: 'today', confidence: confidence([mealDistribution]), freshness: 'fresh', provenance: provenance([mealDistribution]),
          limitations: ['This describes logged meal timing and distribution; it is not a prescription for how to eat.'],
        });
      }
    }
  }

  const completeness = factByType(facts, 'daily.logging_completeness');
  if (completeness && eligible([completeness])) {
    const value = completeness.value;
    if (value && typeof value === 'object' && typeof value.logCount === 'number' && typeof value.mealSlotsLogged === 'number' && typeof value.state === 'string') {
      result.push({
        key: 'daily.logging_completeness', status: 'available',
        statement: `Today's records include ${value.logCount} logged entries across ${value.mealSlotsLogged} meal slots.`,
        values: { logCount: value.logCount, mealSlotsLogged: value.mealSlotsLogged, state: value.state },
        unit: null, timeWindow: 'today', confidence: confidence([completeness]), freshness: 'fresh', provenance: provenance([completeness]),
        limitations: ['A missing log does not prove that a meal was skipped.'],
      });
    }
  }

  const nutritionCoverage = factByType(facts, 'nutrition.seven_day_coverage');
  if (nutritionCoverage && eligible([nutritionCoverage])) {
    const value = nutritionCoverage.value;
    if (value && typeof value === 'object' && typeof value.loggedDayCount === 'number' && typeof value.windowDays === 'number') {
      result.push({
        key: 'weekly.nutrition_coverage', status: 'available',
        statement: `The last ${value.windowDays}-day window includes ${value.loggedDayCount} logged nutrition days.`,
        values: { loggedDayCount: value.loggedDayCount, windowDays: value.windowDays },
        unit: null, timeWindow: 'recent', confidence: confidence([nutritionCoverage]), freshness: 'fresh', provenance: provenance([nutritionCoverage]),
        limitations: ['This measures logged coverage, not nutrition quality or adherence.'],
      });
    }
  }
  const macroCoverage = factByType(facts, 'nutrition.seven_day_macro_record_coverage');
  if (macroCoverage && eligible([macroCoverage])) {
    const value = macroCoverage.value;
    if (value && typeof value === 'object' && typeof value.qualifiedDayCount === 'number' && typeof value.windowDays === 'number') {
      result.push({
        key: 'weekly.macro_coverage', status: 'available',
        statement: `The last ${value.windowDays}-day window has complete macro records for ${value.qualifiedDayCount} days.`,
        values: { qualifiedDayCount: value.qualifiedDayCount, windowDays: value.windowDays },
        unit: null, timeWindow: 'recent', confidence: confidence([macroCoverage]), freshness: 'fresh', provenance: provenance([macroCoverage]),
        limitations: ['This measures record completeness, not nutrition quality or adherence.'],
      });
    }
  }
  const weightTrend = factByType(facts, 'weight.short_trend');
  if (weightTrend && eligible([weightTrend])) {
    const value = weightTrend.value;
    if (value && typeof value === 'object' && typeof value.direction === 'string' && typeof value.deltaKg === 'number' && typeof value.entryCount === 'number') {
      result.push({
        key: 'weight.short_trend', status: 'available',
        statement: `The recent 28-day weight trend is ${value.direction} with a ${value.deltaKg} kg change across ${value.entryCount} entries.`,
        values: { direction: value.direction, deltaKg: value.deltaKg, entryCount: value.entryCount },
        unit: 'kg', timeWindow: 'recent', confidence: confidence([weightTrend]), freshness: 'fresh', provenance: provenance([weightTrend]),
        limitations: ['Weight is one signal and does not determine health, progress, or what you should eat.'],
      });
    }
  }
  return result;
}

export function createCoachFactNonce(): string {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Pure, non-persisting projection. It never accepts or serializes account identifiers. */
export function buildCoachFactContext(input: {
  hydrated: boolean;
  consent: CoachFactConsent;
  facts: readonly IntelligenceFact[];
  now?: Date;
  nonce?: string;
}): CoachFactContextV1 | null {
  if (!input.hydrated || input.consent.state !== 'consented_current') return null;
  const now = input.now ?? new Date();
  const facts = buildFacts(input.facts);
  const missingData = [...new Set(input.facts.flatMap((fact) => fact.missingData.map((missing) => missingMap[missing]).filter(Boolean) as CoachFactMissingData[]))];
  if (!facts.length && !missingData.includes('no_logged_food_today')) missingData.push('no_logged_food_today');
  return {
    schemaVersion: COACH_FACT_CONTEXT_SCHEMA_VERSION,
    purpose: COACH_FACT_CONTEXT_PURPOSE,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + COACH_FACT_CONTEXT_TTL_MS).toISOString(),
    calculationVersion: input.facts[0]?.calculationVersion ?? 'nutrition-facts-v1',
    requestNonce: input.nonce ?? createCoachFactNonce(),
    coverage: facts.length === COACH_FACT_KEYS.length ? 'available' : facts.length ? 'partial' : 'insufficient',
    missingData,
    facts,
    limitations: facts.length ? [] : ['There is not enough fresh, eligible logged information for a factual Coach discussion.'],
  };
}

export function isCoachFactContextCurrent(context: CoachFactContextV1, now = Date.now()) {
  const generated = Date.parse(context.generatedAt);
  const expires = Date.parse(context.expiresAt);
  return Number.isFinite(generated) && Number.isFinite(expires)
    && expires > generated && expires - generated <= COACH_FACT_CONTEXT_TTL_MS && now < expires;
}