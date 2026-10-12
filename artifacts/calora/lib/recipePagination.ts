export type RecipePaginationMetrics = {
  section: "discover" | "premium" | "create";
  activeSection: "discover" | "premium" | "create";
  offsetY: number;
  viewportHeight: number;
  contentHeight: number;
  nextOffset: number | null;
  isFetching: boolean;
  isLoadingMore: boolean;
  prefetchDistance: number;
};

/**
 * Native ScrollView metrics can arrive in a different order on Android than
 * on web. Keep the decision pure and require a real cursor so a layout event
 * cannot create duplicate requests or loop after the provider is exhausted.
 */
export function shouldLoadMoreRecipePage(
  input: RecipePaginationMetrics,
): boolean {
  if (input.section !== input.activeSection) return false;
  if (input.nextOffset == null || input.isFetching || input.isLoadingMore)
    return false;
  if (input.viewportHeight <= 0 || input.contentHeight <= 0) return false;
  if (
    !Number.isFinite(input.offsetY) ||
    !Number.isFinite(input.viewportHeight) ||
    !Number.isFinite(input.contentHeight)
  )
    return false;
  return (
    input.offsetY + input.viewportHeight >=
    input.contentHeight - Math.max(0, input.prefetchDistance)
  );
}
