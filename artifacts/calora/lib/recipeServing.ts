export const MIN_RECIPE_PORTIONS = 1;
export const MAX_RECIPE_PORTIONS = 8;

/**
 * Returns a trustworthy source recipe yield when the provider supplied one.
 * An absent or malformed yield must not be silently treated as a measured fact.
 */
export function sourceRecipeYield(recipe: unknown): number | null {
  const servings =
    recipe && typeof recipe === "object"
      ? (recipe as { servings?: unknown }).servings
      : undefined;
  if (
    typeof servings !== "number" ||
    !Number.isFinite(servings) ||
    servings <= 0
  ) {
    return null;
  }
  return Math.round(servings);
}

export function nextRecipePortions(
  current: number,
  direction: -1 | 1,
  minimum = MIN_RECIPE_PORTIONS,
  maximum = MAX_RECIPE_PORTIONS,
): number {
  const next = current + direction;
  return Math.min(maximum, Math.max(minimum, Math.round(next)));
}

export function formatRecipePortions(portions: number): string {
  return String(Math.round(portions));
}

export function recipePortionLabel(portions: number): string {
  return portions === 1 ? "portion" : "portions";
}

export type ScaledRecipeIngredient = { text: string; scaled: boolean };

function parseLeadingQuantity(value: string): { end: number; quantity: number } | null {
  const match = /^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?=\s|$)/.exec(value);
  if (!match) return null;
  const token = match[2];
  const parts = token.split(/\s+/);
  const quantity = parts.length === 2
    ? Number(parts[0]) + Number(parts[1].split('/')[0]) / Number(parts[1].split('/')[1])
    : token.includes('/') ? Number(token.split('/')[0]) / Number(token.split('/')[1]) : Number(token);
  return Number.isFinite(quantity) && quantity > 0 ? { end: match[0].length, quantity } : null;
}

function formatQuantity(quantity: number): string {
  const rounded = Math.round(quantity * 100) / 100;
  const commonFractions: Array<[number, string]> = [[0.25, '1/4'], [0.33, '1/3'], [0.5, '1/2'], [0.67, '2/3'], [0.75, '3/4']];
  const whole = Math.floor(rounded);
  const remainder = Math.round((rounded - whole) * 100) / 100;
  const fraction = commonFractions.find(([value]) => Math.abs(remainder - value) < 0.01)?.[1];
  if (fraction) return whole > 0 ? `${whole} ${fraction}` : fraction;
  return String(rounded);
}

function singularizeCommonUnit(value: string, quantity: number): string {
  if (Math.abs(quantity - 1) > 0.0001) return value;
  return value.replace(/^(\s+)(cups|tablespoons|teaspoons|cloves|eggs)\b/i, (_, spacing: string, unit: string) => `${spacing}${unit.slice(0, -1)}`);
}

/** Scale only a trustworthy leading quantity; preserve ambiguous text verbatim. */
export function scaleRecipeIngredients(ingredients: readonly string[], portions: number, sourceYield: number | null): ScaledRecipeIngredient[] {
  const multiplier = sourceYield && sourceYield > 0 && Number.isFinite(portions) ? portions / sourceYield : null;
  return ingredients.map((text) => {
    if (!multiplier || Math.abs(multiplier - 1) < 0.0001) return { text, scaled: false };
    const parsed = parseLeadingQuantity(text);
    if (!parsed) return { text, scaled: false };
    const prefix = text.slice(0, parsed.end).match(/^\s*/)?.[0] ?? '';
    const scaledQuantity = parsed.quantity * multiplier;
    return { text: `${prefix}${formatQuantity(scaledQuantity)}${singularizeCommonUnit(text.slice(parsed.end), scaledQuantity)}`, scaled: true };
  });
}
