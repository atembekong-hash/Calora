export type AllowancePeriod = "daily" | "monthly" | "rolling_7_days";

export const FREE_SUCCESSFUL_DAILY_ALLOWANCES = {
  photo_scan: 1,
  barcode_scan: 1,
  nutrition_label_scan: 1,
  voice_log: 1,
  coach_message: 3,
} as const;

export const FREE_SUCCESSFUL_ROLLING_ALLOWANCES = {
  recipe_creation: 1,
} as const;

export const FREE_SUCCESSFUL_WEEKLY_ALLOWANCES = FREE_SUCCESSFUL_ROLLING_ALLOWANCES;

export const PRO_SUCCESSFUL_MONTHLY_ALLOWANCES = {
  photo_scan: 40,
  barcode_scan: 100,
  nutrition_label_scan: 40,
  voice_log: 40,
  receipt_scan: 3,
  coach_message: 120,
  recipe_creation: 8,
} as const;

export const PRO_FAIR_USE_LIMITS_APPROVED = true as const;

export type SubscriptionFeature =
  | keyof typeof FREE_SUCCESSFUL_DAILY_ALLOWANCES
  | keyof typeof FREE_SUCCESSFUL_ROLLING_ALLOWANCES
  | keyof typeof PRO_SUCCESSFUL_MONTHLY_ALLOWANCES;

export type AllowanceFeature = keyof typeof PRO_SUCCESSFUL_MONTHLY_ALLOWANCES;

export const ALLOWANCE_PERIODS: Record<AllowanceFeature, AllowancePeriod> = {
  photo_scan: "monthly",
  barcode_scan: "monthly",
  nutrition_label_scan: "monthly",
  voice_log: "monthly",
  receipt_scan: "monthly",
  coach_message: "monthly",
  recipe_creation: "monthly",
};

export const FREE_ALLOWANCE_PERIODS: Partial<Record<AllowanceFeature, AllowancePeriod>> = {
  ...Object.fromEntries(
    Object.keys(FREE_SUCCESSFUL_DAILY_ALLOWANCES).map((feature) => [feature, "daily"]),
  ),
  ...Object.fromEntries(
    Object.keys(FREE_SUCCESSFUL_ROLLING_ALLOWANCES).map((feature) => [feature, "rolling_7_days"]),
  ),
} as Partial<Record<AllowanceFeature, AllowancePeriod>>;

export function isFreeAllowanceFeature(feature: string): feature is SubscriptionFeature {
  return Object.prototype.hasOwnProperty.call(FREE_SUCCESSFUL_DAILY_ALLOWANCES, feature)
    || Object.prototype.hasOwnProperty.call(FREE_SUCCESSFUL_ROLLING_ALLOWANCES, feature);
}

export function isProAllowanceFeature(feature: string): feature is AllowanceFeature {
  return Object.prototype.hasOwnProperty.call(PRO_SUCCESSFUL_MONTHLY_ALLOWANCES, feature);
}
