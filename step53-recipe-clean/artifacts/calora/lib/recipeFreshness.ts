export type RecipeIdentity = {
  id: string;
};

export const RECIPE_RECENT_HISTORY_LIMIT = 36;
export const RECIPE_RECENT_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const RECIPE_FRESHNESS_SESSION_LIMIT = 8;

export function recipeIdentity(recipe: RecipeIdentity): string {
  return recipe.id.trim();
}

export function dedupeRecipes<T extends RecipeIdentity>(recipes: readonly T[]): T[] {
  const seen = new Set<string>();
  return recipes.filter((recipe) => {
    const id = recipeIdentity(recipe);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function mergeRecipePages<T extends RecipeIdentity>(current: readonly T[], page: readonly T[]): T[] {
  return dedupeRecipes([...current, ...page]);
}

export class RecipeFreshnessSession {
  private recentIds = new Map<string, number>();
  private visit = 0;

  constructor(
    private readonly maxRecentIds = RECIPE_RECENT_HISTORY_LIMIT,
    private readonly ttlMs = RECIPE_RECENT_HISTORY_TTL_MS,
  ) {}

  beginVisit(now = Date.now()): number {
    this.prune(now);
    this.visit += 1;
    return this.visit;
  }

  order<T extends RecipeIdentity>(recipes: readonly T[], visit = this.visit, now = Date.now()): T[] {
    this.prune(now);
    const unique = dedupeRecipes(recipes);
    const eligible = unique.filter((recipe) => !this.recentIds.has(recipeIdentity(recipe)));
    const recent = unique.filter((recipe) => this.recentIds.has(recipeIdentity(recipe)));
    if (recent.length === 0) return eligible;
    const rotation = visit % recent.length;
    return [...eligible, ...recent.slice(rotation), ...recent.slice(0, rotation)];
  }

  remember(recipes: readonly RecipeIdentity[], now = Date.now()): void {
    this.prune(now);
    for (const recipe of dedupeRecipes(recipes)) {
      const id = recipeIdentity(recipe);
      this.recentIds.delete(id);
      this.recentIds.set(id, now);
    }
    while (this.recentIds.size > this.maxRecentIds) {
      const oldest = this.recentIds.keys().next().value;
      if (oldest === undefined) break;
      this.recentIds.delete(oldest);
    }
  }

  recentIdsSnapshot(now = Date.now()): string[] {
    this.prune(now);
    return [...this.recentIds.keys()];
  }

  private prune(now: number): void {
    for (const [id, shownAt] of this.recentIds) {
      if (now - shownAt >= this.ttlMs) this.recentIds.delete(id);
    }
  }
}

const sessions = new Map<string, RecipeFreshnessSession>();

export function getRecipeFreshnessSession(scope: string): RecipeFreshnessSession {
  const current = sessions.get(scope);
  if (current) {
    sessions.delete(scope);
    sessions.set(scope, current);
    return current;
  }
  const session = new RecipeFreshnessSession();
  sessions.set(scope, session);
  while (sessions.size > RECIPE_FRESHNESS_SESSION_LIMIT) {
    const oldestScope = sessions.keys().next().value;
    if (oldestScope === undefined) break;
    sessions.delete(oldestScope);
  }
  return session;
}

export function clearRecipeFreshnessSessions(): void {
  sessions.clear();
}