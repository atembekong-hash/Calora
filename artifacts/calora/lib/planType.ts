/**
 * Plan type definitions for the Calora weekly meal planner.
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
