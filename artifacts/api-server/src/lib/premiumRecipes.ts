export type PremiumRecipe = {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  area: string | null;
  description: string | null;
  instructions: string | null;
  ingredients: string[];
  tags: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servings: number | null;
  cuisine: string | null;
  mealType: string | null;
  difficulty: string | null;
  dietary: string[];
  allergens: string[];
  equipment: string[];
  fiberG: number | null;
  sodiumMg: number | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: string;
  sourceUrl: string;
  sourceType: "premium";
  sourceProvider: string;
  sourceId: string;
  nutritionConfidence: "verified" | "estimated" | "unavailable";
  nutritionSource: string;
};

type ProviderPayload = { recipes?: unknown[]; recipe?: unknown; nextOffset?: number | null };

const configuredUrl = process.env.PREMIUM_RECIPE_PROVIDER_URL?.replace(/\/$/, "");
const providerName = process.env.PREMIUM_RECIPE_PROVIDER_NAME?.trim() || "Premium provider";
const providerKey = process.env.PREMIUM_RECIPE_PROVIDER_API_KEY;
const PROVIDER_TIMEOUT_MS = Number(process.env.PREMIUM_RECIPE_PROVIDER_TIMEOUT_MS ?? 8_000);
const accessMode = process.env.PREMIUM_RECIPE_ACCESS_MODE?.trim() || "allow";

export function premiumProviderStatus() {
  if (accessMode === "deny") return { status: "restricted" as const, provider: providerName, message: "Premium recipes are not available for this account." };
  return configuredUrl
    ? { status: "available" as const, provider: providerName, message: null }
    : { status: "unavailable" as const, provider: providerName, message: "A Premium recipe provider is not connected yet." };
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(string).filter((item): item is string => Boolean(item)) : [];
}

/** Normalize the documented generic provider payload without inventing absent fields. */
export function normalizePremiumRecipe(input: unknown): PremiumRecipe | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const providerId = string(raw.id) ?? string(raw.sourceId);
  const name = string(raw.name);
  const sourceUrl = string(raw.sourceUrl);
  if (!providerId || !name || !sourceUrl) return null;
  const confidence = raw.nutritionConfidence === "verified" || raw.nutritionConfidence === "estimated"
    ? raw.nutritionConfidence
    : "unavailable";
  return {
    id: `premium:${providerName}:${providerId}`,
    name,
    image: string(raw.image),
    category: string(raw.category),
    area: string(raw.area),
    description: string(raw.description),
    instructions: string(raw.instructions),
    ingredients: strings(raw.ingredients),
    tags: strings(raw.tags),
    prepMinutes: number(raw.prepMinutes),
    cookMinutes: number(raw.cookMinutes),
    totalMinutes: number(raw.totalMinutes),
    servings: number(raw.servings),
    cuisine: string(raw.cuisine),
    mealType: string(raw.mealType),
    difficulty: string(raw.difficulty),
    dietary: strings(raw.dietary),
    allergens: strings(raw.allergens),
    equipment: strings(raw.equipment),
    fiberG: number(raw.fiberG),
    sodiumMg: number(raw.sodiumMg),
    calories: number(raw.calories),
    proteinG: number(raw.proteinG),
    carbsG: number(raw.carbsG),
    fatG: number(raw.fatG),
    source: providerName,
    sourceUrl,
    sourceType: "premium",
    sourceProvider: providerName,
    sourceId: providerId,
    nutritionConfidence: confidence,
    nutritionSource: string(raw.nutritionSource) ?? "Not supplied by provider",
  };
}

async function providerFetch(path: string, params: Record<string, string | number | undefined> = {}) {
  if (!configuredUrl) return null;
  const url = new URL(`${configuredUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(PROVIDER_TIMEOUT_MS) ? PROVIDER_TIMEOUT_MS : 8_000);
  try {
    const response = await fetch(url, { headers: providerKey ? { Authorization: `Bearer ${providerKey}` } : undefined, signal: controller.signal });
    if (!response.ok) throw new Error(`Premium recipe provider returned ${response.status}`);
    return response.json() as Promise<ProviderPayload>;
  } finally {
    clearTimeout(timer);
  }
}

export async function listPremiumRecipes(input: { query?: string; category?: string; limit: number; offset: number }) {
  const status = premiumProviderStatus();
  if (status.status !== "available") return { ...status, recipes: [], nextOffset: null };
  const payload = await providerFetch("/recipes", input);
  const recipes = (payload?.recipes ?? []).map(normalizePremiumRecipe).filter((recipe): recipe is PremiumRecipe => Boolean(recipe));
  return { ...status, recipes, nextOffset: payload?.nextOffset ?? (recipes.length === input.limit ? input.offset + recipes.length : null) };
}

export async function getPremiumRecipe(sourceId: string) {
  const status = premiumProviderStatus();
  if (status.status !== "available") return null;
  const payload = await providerFetch(`/recipes/${encodeURIComponent(sourceId)}`);
  return normalizePremiumRecipe(payload?.recipe ?? payload);
}