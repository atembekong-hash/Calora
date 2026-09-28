function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatWhole(value: number | null | undefined): string {
  const number = finiteNumber(value);
  return number === null ? '—' : Math.round(number).toLocaleString();
}

export function formatCalories(value: number | null | undefined): string {
  const number = finiteNumber(value);
  return number === null ? 'Nutrition review needed' : `${formatWhole(number)} kcal`;
}

export function formatGrams(value: number | null | undefined): string {
  const number = finiteNumber(value);
  return number === null ? '—' : `${formatWhole(number)} g`;
}

export function formatPercent(value: number | null | undefined): string {
  const number = finiteNumber(value);
  return number === null ? '—' : `${Math.round(number)}%`;
}

/**
 * Calora presents human-facing health and nutrition quantities as whole
 * numbers. Calculations and stored values retain their source precision.
 */
export function formatQuantity(value: number | null | undefined): string {
  return formatWhole(value);
}
