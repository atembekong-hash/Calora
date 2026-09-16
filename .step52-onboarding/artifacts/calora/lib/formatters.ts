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

export function formatQuantity(value: number | null | undefined, maximumFractionDigits = 1): string {
  const number = finiteNumber(value);
  return number === null
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits, minimumFractionDigits: 0 }).format(number);
}