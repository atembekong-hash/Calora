export const FREE_SUCCESSFUL_DAILY_ALLOWANCES = {
  photo_scan: 1,
  barcode_scan: 1,
  nutrition_label_scan: 1,
  receipt_scan: 1,
  voice_log: 1,
  coach_message: 3,
  recipe_creation: 1,
} as const;

export const FREE_SUCCESSFUL_WEEKLY_ALLOWANCES = {
  meal_planner: 2,
} as const;

/**
 * Pro fair-use values intentionally remain unset until the owner approves the
 * proposed numerical limits. Do not silently activate numbers in code.
 */
export const PRO_FAIR_USE_LIMITS_APPROVED = false as const;

export type SubscriptionFeature = keyof typeof FREE_SUCCESSFUL_DAILY_ALLOWANCES | keyof typeof FREE_SUCCESSFUL_WEEKLY_ALLOWANCES;

export function isFreeAllowanceFeature(feature: string): feature is keyof typeof FREE_SUCCESSFUL_DAILY_ALLOWANCES {
  return Object.prototype.hasOwnProperty.call(FREE_SUCCESSFUL_DAILY_ALLOWANCES, feature);
}
