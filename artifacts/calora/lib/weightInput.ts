export type WeightUnit = 'metric' | 'imperial';

export const MIN_WEIGHT_KG = 25;
export const MAX_WEIGHT_KG = 350;
export const KG_PER_LB = 0.45359237;

export function displayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'imperial' ? kg / KG_PER_LB : kg;
}

export function weightUnitLabel(unit: WeightUnit): 'kg' | 'lb' {
  return unit === 'imperial' ? 'lb' : 'kg';
}

export function formatWeight(kg: number, unit: WeightUnit, digits = 1): string {
  return `${displayWeight(kg, unit).toFixed(digits)} ${weightUnitLabel(unit)}`;
}

export type WeightInputResult =
  | { ok: true; kg: number; displayValue: number }
  | { ok: false; message: string };

/**
 * Converts an explicitly user-entered measurement into canonical kilograms.
 * Calora uses the same 25–350 kg safety range as profile and goal forms.
 */
export function validateWeightInput(value: string, unit: WeightUnit): WeightInputResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: `Enter a weight in ${weightUnitLabel(unit)}.` };
  const displayValue = Number(trimmed);
  if (!Number.isFinite(displayValue)) return { ok: false, message: 'Enter a weight as a number.' };

  const kg = unit === 'imperial' ? displayValue * KG_PER_LB : displayValue;
  if (kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) {
    const minimum = displayWeight(MIN_WEIGHT_KG, unit).toFixed(unit === 'imperial' ? 0 : 0);
    const maximum = displayWeight(MAX_WEIGHT_KG, unit).toFixed(unit === 'imperial' ? 0 : 0);
    return { ok: false, message: `Enter a weight between ${minimum} and ${maximum} ${weightUnitLabel(unit)}.` };
  }
  return { ok: true, kg, displayValue };
}

export function isValidCanonicalWeightKg(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_WEIGHT_KG && value <= MAX_WEIGHT_KG;
}
