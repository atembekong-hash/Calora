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
 * Removes display-only grouping separators without silently changing a user's
 * numeric intent. Callers validate the returned value before persistence, so
 * a fractional or otherwise invalid value is rejected rather than becoming a
 * different whole number while the user types.
 */
export function normalizeWholeNumberInput(value: string): string {
  return value.replaceAll(',', '').trimStart();
}

/**
 * Accepts only an unambiguous non-negative integer from a normalized editable
 * field. Keeping this parser separate from display formatting prevents a
 * partial value such as "12.5" from being saved as a different value.
 */
export function parseWholeNumberInput(value: string): number | null {
  const normalized = normalizeWholeNumberInput(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
