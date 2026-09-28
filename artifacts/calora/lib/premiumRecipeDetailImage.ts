import { normalizeFoodImageUrl } from '@/lib/foodImageMetadata';

type PremiumRecipeImage = {
  id: string;
  sourceId: string;
  image?: string | null;
};

/**
 * FatSecret search results can include a thumbnail that its detail response
 * omits. Keep that exact selected-card thumbnail only for the same source
 * record, and only when the detail record has no trusted image of its own.
 */
export function resolvePremiumRecipeDetailImage<T extends PremiumRecipeImage>(
  detail: T,
  selectedCard: PremiumRecipeImage | null | undefined,
): T {
  if (normalizeFoodImageUrl(detail.image)) return detail;
  if (!selectedCard || selectedCard.id !== detail.id || selectedCard.sourceId !== detail.sourceId) return detail;

  const selectedCardImage = normalizeFoodImageUrl(selectedCard.image);
  return selectedCardImage ? { ...detail, image: selectedCardImage } : detail;
}
