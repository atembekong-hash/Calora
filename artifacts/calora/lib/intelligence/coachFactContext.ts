import type { IntelligenceFact, MissingDataKind } from './types';

export const COACH_FACT_CONTEXT_SCHEMA_VERSION = 'coach-fact-context-v1' as const;
/** This versioned, purpose-specific identifier is distinct from legacy Coach consent. */
export const COACH_FACT_CONTEXT_PURPOSE = 'coach_fact_context_v1' as const;
export const COACH_FACT_CONTEXT_TTL_MS = 60_000;

export const COACH_FACT_KEYS = [
  'daily.calorie_status',
  'daily.protein_status',
  'daily.meal_distribution',
  'daily.logging_completeness',
] as const;

export type CoachFactKey = typeof COACH_FACT_KEYS[number];
export type CoachFactStatus = 'available' | 'limited' | 'unknown';
export type CoachFactMissingData = 'no_profile' | 'no_logged_food_today' | 'incomplete_logging' | 'unknown_provenance';
export type CoachFactProvenance = 'verified' | 'mixed' | 'estimated' | 'derived';

export type CoachApprovedFact = {
  key: CoachFactKey;
  status: CoachFactStatus;
  statement: string;
  values: Record<string, number | string | boolean>;
  unit: 'kcal' | 'g' | null;
  timeWindow: 'today';
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

function valueState(fact: IntelligenceFact): string | null {
  return fact.value && typeof fact.value === 'object' && 'state' in fact.value
    ? String(fact.value.state)
    : null;
}

function factByType(facts: readonly IntelligenceFact[], factType: string) {
  return facts.find((fact) => fact.factType === factType);
}

function eligible(facts: Array<IntelligenceFact | undefined>) {
  return facts.every((fact) => fact
    && fact.freshness === 'fresh'
    && (fact.confidence === 'high' || fact.confidence === 'medium')
    && !fact.missingData.includes('unknown_provenance'));
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
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => factByType(facts, `meal.${meal}.distribution`));
  const completeness = factByType(facts, 'daily.logging_completeness');
  const result: CoachApprovedFact[] = [];

  if (eligible(calorie)) {
    const source = calorie as IntelligenceFact[];
    result.push({
      key: 'daily.calorie_status', status: 'available',
      statement: `Today’s logged calories are ${finiteValue(source[0], 'value')} kcal against a ${finiteValue(source[1], 'value')} kcal app target.`,
      values: { consumedKcal: finiteValue(source[0], 'value')!, targetKcal: finiteValue(source[1], 'value')!, remainingKcal: finiteValue(source[2], 'value')! },
      unit: 'kcal', timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['This reflects logged records today and is not a recommendation.'],
    });
  }
  if (eligible(protein)) {
    const source = protein as IntelligenceFact[];
    result.push({
      key: 'daily.protein_status', status: 'available',
      statement: `Today’s logged protein is ${finiteValue(source[0], 'value')} g against a ${finiteValue(source[1], 'value')} g app target.`,
      values: { consumedG: finiteValue(source[0], 'value')!, targetG: finiteValue(source[1], 'value')!, remainingG: finiteValue(source[2], 'value')! },
      unit: 'g', timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['This reflects logged records today and is not medical nutrition advice.'],
    });
  }
  if (eligible(meals)) {
    const source = meals as IntelligenceFact[];
    const slotsLogged = source.filter((fact) => valueState(fact) === 'logged').length;
    result.push({
      key: 'daily.meal_distribution', status: 'available',
      statement: `${slotsLogged} meal slot${slotsLogged === 1 ? '' : 's'} have logged food today.`,
      values: { mealSlotsLogged: slotsLogged },
      unit: null, timeWindow: 'today', confidence: confidence(source), freshness: 'fresh', provenance: provenance(source),
      limitations: ['Meal distribution is descriptive and does not assess adherence.'],
    });
  }
  if (eligible([completeness])) {
    const source = completeness!;
    const logCount = finiteValue(source, 'logCount')!;
    const mealSlotsLogged = finiteValue(source, 'mealSlotsLogged')!;
    result.push({
      key: 'daily.logging_completeness', status: 'available',
      statement: logCount ? `${logCount} food record${logCount === 1 ? '' : 's'} across ${mealSlotsLogged} meal slot${mealSlotsLogged === 1 ? '' : 's'} are logged today.` : 'No food records are logged today.',
      values: { logCount, mealSlotsLogged, state: valueState(source) ?? 'unknown' },
      unit: null, timeWindow: 'today', confidence: confidence([source]), freshness: 'fresh', provenance: provenance([source]),
      limitations: ['Missing records are unknown, not evidence of non-adherence.'],
    });
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