/**
 * Plan type definitions for the CaloraApp weekly meal planner.
 *
 * Data model is forward-compatible: PlannerPreferences holds a required
 * `primary` nutrition style plus an optional `secondary[]` for modifier types
 * (e.g. Budget Friendly, Quick & Easy) that a future version can layer on.
 */

export type PlanTypeId =
  | 'balanced-nutrition'
  | 'high-protein-power'
  | 'low-carb-living'
  | 'mediterranean-diet'
  | 'plant-based-week'
  | 'keto-kickstart'
  | 'intermittent-fasting'
  | 'budget-friendly'
  | 'quick-and-easy'
  | 'athletic-performance'
  | 'anti-inflammatory'
  | 'healthy-habits-week';

export interface PlanType {
  id: PlanTypeId;
  label: string;
  /** Short tagline shown on the compact card and in the modal list. */
  subtitle: string;
  /** Feather icon name. */
  icon: string;
  /** Full description shown inside the plan type selector modal. */
  description: string;
  /**
   * Instruction appended to the AI system prompt so the model selects
   * meals that match this plan style from the available catalog.
   */
  aiPrompt: string;
}

/**
 * Persisted planner generation preferences.
 *
 * `primary` is the nutrition style that drives AI meal selection.
 * `secondary` is reserved for future modifier types (e.g. Budget Friendly
 * stacked on top of High Protein Power) and should be ignored by consumers
 * that do not yet support it.
 */
export interface PlannerPreferences {
  primary: PlanTypeId;
  secondary?: PlanTypeId[];
  /**
   * Historical record of which Program produced each generated week.
   * Optional for backward compatibility — legacy preferences without this
   * field remain valid and are never rewritten on hydration.
   */
  appliedPrograms?: ProgramApplication[];
}

/**
 * An explicit, per-week record of a Program that shaped a generated week.
 * One record is kept per weekStart (the latest application wins), so changing
 * the Program for a future build never makes a past week ambiguous.
 */
export interface ProgramApplication {
  /** Monday-anchored week key (YYYY-MM-DD) the Program was applied to. */
  weekStart: string;
  programId: PlanTypeId;
  /** ISO timestamp of when the week was generated. */
  appliedAt: string;
  /**
   * How the week came to be:
   * - 'build'            — ordinary "Build week" generation
   * - 'refresh'          — explicit "Rebuild this week" confirmation
   * - 'offline-fallback' — the local starter week filled in after a failed request
   */
  source: 'build' | 'refresh' | 'offline-fallback';
}

export const PLAN_TYPES: PlanType[] = [
  {
    id: 'balanced-nutrition',
    label: 'Balanced Nutrition',
    subtitle: 'All food groups in harmony',
    icon: 'sliders',
    description: 'A well-rounded week covering all macronutrients — protein, carbs, and healthy fats — with plenty of variety across every meal.',
    aiPrompt: 'Prioritize balanced macronutrients across all meals. Vary protein sources, include plenty of vegetables, and distribute carbohydrates evenly. Maximise variety across the week.',
  },
  {
    id: 'high-protein-power',
    label: 'High Protein Power',
    subtitle: 'Fuel muscle and recovery',
    icon: 'zap',
    description: 'Every meal is anchored by a strong protein source to support muscle retention, satiety, and active recovery throughout the week.',
    aiPrompt: 'Maximise protein in every meal and snack. Strongly prefer the highest-protein options in the catalog. Target at least 35–40% of calories from protein across the week.',
  },
  {
    id: 'low-carb-living',
    label: 'Low Carb Living',
    subtitle: 'Fewer carbs, steady energy',
    icon: 'trending-down',
    description: 'Reduce refined carbohydrates and grains while emphasising lean proteins, healthy fats, and non-starchy vegetables for stable energy.',
    aiPrompt: 'Minimise carbohydrate-heavy meals. Avoid meals where pasta, oats, or rice is the primary ingredient wherever alternatives exist. Favour protein and fat-forward meals with non-starchy vegetables.',
  },
  {
    id: 'mediterranean-diet',
    label: 'Mediterranean Diet',
    subtitle: 'Olive oil, fish, and colour',
    icon: 'sun',
    description: 'Inspired by the traditional Mediterranean lifestyle — fish, legumes, whole grains, and colourful produce at every meal.',
    aiPrompt: 'Select meals inspired by Mediterranean eating: fish, legumes, whole grains, and abundant colourful vegetables. Limit red meat. Prioritise variety and colour across the week.',
  },
  {
    id: 'plant-based-week',
    label: 'Plant-Based Week',
    subtitle: 'Whole plants, full flavour',
    icon: 'feather',
    description: 'A fully plant-forward week — every meal is vegetarian or vegan, centred on legumes, grains, and seasonal produce.',
    aiPrompt: 'Select only vegetarian or vegan meals from the catalog. Prioritise plant protein sources such as legumes, tofu, and nuts. Ensure adequate protein across the week with no meat or fish.',
  },
  {
    id: 'keto-kickstart',
    label: 'Keto Kickstart',
    subtitle: 'Very low carb, high fat',
    icon: 'activity',
    description: 'A strict low-carbohydrate approach built around healthy fats and quality protein, minimising grains and sugars.',
    aiPrompt: 'Prioritise the lowest-carbohydrate meals available. Strongly avoid grain- or starch-based meals. Favour high-fat, moderate-protein options across the entire week.',
  },
  {
    id: 'intermittent-fasting',
    label: 'Intermittent Fasting',
    subtitle: 'Eating window focused',
    icon: 'clock',
    description: 'Meals are structured around a condensed eating window. Breakfast is lighter or skippable, with lunch and dinner carrying the day\'s nutrition.',
    aiPrompt: 'Structure meals to support an intermittent fasting eating window. Keep breakfast lighter and lower in calories. Concentrate more nutrition in lunch and dinner. Snacks should be protein-forward and satisfying.',
  },
  {
    id: 'budget-friendly',
    label: 'Budget Friendly',
    subtitle: 'Nourishing meals, lower cost',
    icon: 'dollar-sign',
    description: 'Great nutrition without expensive ingredients. This plan leans on filling, affordable staples like legumes, eggs, oats, and seasonal vegetables.',
    aiPrompt: 'Prioritise cost-effective meals using affordable, widely available ingredients: eggs, lentils, oats, beans, and vegetables. Minimise expensive proteins. Favour simple recipes that reduce waste.',
  },
  {
    id: 'quick-and-easy',
    label: 'Quick & Easy',
    subtitle: 'Under 20 minutes per meal',
    icon: 'fast-forward',
    description: 'A realistic week for busy days — every meal is simple to prepare without sacrificing nutrition or flavour.',
    aiPrompt: 'Prioritise the meals with the shortest preparation times in the catalog. Avoid anything complex or time-consuming. Every meal should be achievable in 20 minutes or less.',
  },
  {
    id: 'athletic-performance',
    label: 'Athletic Performance',
    subtitle: 'Calories and fuel for training',
    icon: 'award',
    description: 'Built for active bodies — higher calories, ample carbohydrates for energy, and strong protein to support training and recovery.',
    aiPrompt: 'Optimise for athletic performance. Prioritise higher-calorie, higher-protein meals with adequate carbohydrates for sustained energy. Support both pre- and post-workout nutrition across the week.',
  },
  {
    id: 'anti-inflammatory',
    label: 'Anti-Inflammatory',
    subtitle: 'Foods that support recovery',
    icon: 'shield',
    description: 'Centred on omega-3-rich fish, colourful vegetables, berries, and whole grains — foods associated with supporting the body\'s natural balance.',
    aiPrompt: 'Select meals rich in anti-inflammatory foods: fatty fish, berries, leafy greens, nuts, seeds, and colourful vegetables. Minimise processed or heavily fried options. Emphasise variety and colour.',
  },
  {
    id: 'healthy-habits-week',
    label: 'Healthy Habits Week',
    subtitle: 'Simple whole-food meals for a fresh start',
    icon: 'heart',
    description: 'A gentle, sustainable week of whole-food meals that builds positive habits without restriction or complexity — the best place to begin.',
    aiPrompt: 'Create a simple, balanced week of whole-food meals. Prioritise familiar, easy-to-eat foods from across all food groups. Avoid extremes in any macro. This is about building sustainable habits with nourishing, approachable meals.',
  },
];

/** Look up a plan type by id. Returns undefined if not found. */
export function findPlanType(id: PlanTypeId | string): PlanType | undefined {
  return PLAN_TYPES.find((pt) => pt.id === id);
}

/** A confirmed Program switch takes priority over the preference from the current render. */
export function planTypeForGeneration(
  confirmedProgram: PlanTypeId | undefined,
  preferences: PlannerPreferences | null | undefined,
): PlanTypeId | undefined {
  return confirmedProgram ?? preferences?.primary;
}

const APPLICATION_SOURCES: ProgramApplication['source'][] = ['build', 'refresh', 'offline-fallback'];

/**
 * Change the Program selected for future builds WITHOUT losing any other
 * preference state — secondary modifiers and the per-week application history
 * are always carried forward. Every UI path that switches the primary Program
 * must go through this helper instead of constructing a primary-only object.
 */
export function selectPrimaryProgram(
  preferences: PlannerPreferences | null,
  programId: PlanTypeId,
): PlannerPreferences {
  return preferences ? { ...preferences, primary: programId } : { primary: programId };
}

/**
 * Upsert a Program application record for a week, preserving all other
 * preference fields (primary, secondary, other weeks' records) untouched.
 * The latest application for a weekStart replaces any earlier one; records
 * stay sorted by weekStart for stable persistence.
 */
export function recordProgramApplication(
  preferences: PlannerPreferences | null,
  application: ProgramApplication,
): PlannerPreferences {
  const base: PlannerPreferences = preferences ?? { primary: application.programId };
  const others = (base.appliedPrograms ?? []).filter((record) => record.weekStart !== application.weekStart);
  return {
    ...base,
    appliedPrograms: [...others, application].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  };
}

/**
 * Record the outcome of a successful generation honestly:
 * - 'rebuild' (explicit confirmed refresh) actually replaces program-generated
 *   meals, so it upserts the week's record.
 * - 'fill' (ordinary Build week) never touches existing meals, so it may only
 *   ESTABLISH provenance for a week that has no record yet — it must never
 *   overwrite the record of the Program that originally shaped the week.
 */
export function recordGenerationOutcome(
  preferences: PlannerPreferences | null,
  application: ProgramApplication,
  mode: 'fill' | 'rebuild',
): PlannerPreferences {
  if (mode === 'fill' && programAppliedToWeek(preferences, application.weekStart)) {
    return preferences ?? { primary: application.programId };
  }
  return recordProgramApplication(preferences, application);
}

/**
 * Remove a week's Program record — used when an explicit rebuild falls back to
 * the offline starter week: the old Program no longer shaped the week and the
 * new one never got to, so claiming either would be inaccurate.
 */
export function clearProgramApplication(
  preferences: PlannerPreferences | null,
  weekStart: string,
): PlannerPreferences | null {
  if (!preferences?.appliedPrograms?.some((record) => record.weekStart === weekStart)) return preferences;
  const remaining = preferences.appliedPrograms.filter((record) => record.weekStart !== weekStart);
  const next: PlannerPreferences = { ...preferences };
  if (remaining.length > 0) next.appliedPrograms = remaining;
  else delete next.appliedPrograms;
  return next;
}

/** The planner API returns starter meals as a 200 with a starter-planner provider when its AI provider fails. */
export function isStarterFallbackProvider(provider: string | undefined): boolean {
  return /starter/i.test(provider ?? '');
}

/**
 * Single decision point for what a generation outcome does to the week's
 * Program record:
 * - 'record' — a real Program-guided generation materially changed the week
 * - 'clear'  — a fallback (server starter response or offline starter week)
 *              materially rebuilt the week, so any prior claim is now stale
 *              and the requested Program never actually shaped it
 * - 'none'   — nothing changed, or a fill fallback that only padded empty
 *              slots: existing provenance (or its absence) stays accurate
 */
export function resolveGenerationRecording(options: {
  programId: PlanTypeId | undefined;
  mode: 'fill' | 'rebuild';
  changed: boolean;
  fallback: boolean;
}): 'record' | 'clear' | 'none' {
  if (!options.changed || !options.programId) return 'none';
  if (options.fallback) return options.mode === 'rebuild' ? 'clear' : 'none';
  return 'record';
}

/** The Program application recorded for a week, if that week was ever generated. */
export function programAppliedToWeek(
  preferences: PlannerPreferences | null | undefined,
  weekStart: string,
): ProgramApplication | undefined {
  return preferences?.appliedPrograms?.find((record) => record.weekStart === weekStart);
}

/**
 * Normalize persisted planner preferences from storage.
 *
 * Backward compatible: legacy `{ primary }` and `{ primary, secondary }`
 * shapes pass through unchanged (no rewriting of profile constraints).
 * Unknown primary ids invalidate the whole preference (null → user re-picks).
 * Malformed appliedPrograms entries are dropped individually; valid ones are kept.
 */
export function normalizePlannerPreferences(raw: unknown): PlannerPreferences | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<PlannerPreferences> & { [key: string]: unknown };
  if (typeof candidate.primary !== 'string' || !findPlanType(candidate.primary)) return null;
  const normalized: PlannerPreferences = { primary: candidate.primary as PlanTypeId };
  if (Array.isArray(candidate.secondary)) {
    const secondary = candidate.secondary.filter(
      (id): id is PlanTypeId => typeof id === 'string' && Boolean(findPlanType(id)),
    );
    if (secondary.length > 0) normalized.secondary = secondary;
  }
  if (Array.isArray(candidate.appliedPrograms)) {
    const seen = new Set<string>();
    const applications = candidate.appliedPrograms.filter((entry): entry is ProgramApplication => {
      if (!entry || typeof entry !== 'object') return false;
      const record = entry as Partial<ProgramApplication>;
      const valid =
        typeof record.weekStart === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(record.weekStart) &&
        typeof record.programId === 'string' &&
        Boolean(findPlanType(record.programId)) &&
        typeof record.appliedAt === 'string' &&
        APPLICATION_SOURCES.includes(record.source as ProgramApplication['source']);
      if (!valid || seen.has(record.weekStart as string)) return false;
      seen.add(record.weekStart as string);
      return true;
    });
    if (applications.length > 0) {
      normalized.appliedPrograms = applications.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    }
  }
  return normalized;
}
