/**
 * Shopping aggregation counts matching planned-meal occurrences; it is not a
 * measurement of ingredient units. Keep that distinction explicit in the UI.
 */
export function shoppingItemUsageLabel(item: {
  quantity: number;
  recipeSource?: boolean;
}): string {
  if (item.recipeSource) return 'Added from recipe';
  const occurrences = Number.isFinite(item.quantity) && item.quantity > 0
    ? Math.floor(item.quantity)
    : 0;
  return `Used in ${occurrences} planned meal${occurrences === 1 ? '' : 's'}`;
}
