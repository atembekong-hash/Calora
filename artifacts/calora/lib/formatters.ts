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

/**
 * Keeps editable nutrition and health fields visibly whole-number-only.
 * Commas are accepted as thousands separators, but a decimal point or any
 * other character stops the accepted numeric prefix instead of silently
 * changing a value such as "1.5" into "15".
 */
export function normalizeWholeNumberInput(value: string): string {
  const normalized = value.replaceAll(',', '').trimStart();
  return /^\d*/.exec(normalized)?.[0] ?? '';
}
