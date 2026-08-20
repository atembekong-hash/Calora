type QueryKeyPart = readonly unknown[];

/**
 * Premium provider responses are account-scoped. Include the verified client
 * identity in every cache key so a shared device never reuses one member's
 * protected recipe data for another account.
 */
export function premiumRecipeListQueryKey(userId: string | null | undefined, baseKey: QueryKeyPart): readonly unknown[] {
  return ["premium-recipes", userId ?? "signed-out", ...baseKey];
}

export function premiumRecipeDetailQueryKey(userId: string | null | undefined, baseKey: QueryKeyPart): readonly unknown[] {
  return ["premium-recipe", userId ?? "signed-out", ...baseKey];
}