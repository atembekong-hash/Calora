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
const fatSecretClientId = process.env.FATSECRET_CLIENT_ID;
const fatSecretClientSecret = process.env.FATSECRET_CLIENT_SECRET;
const fatSecretEnabled = Boolean(fatSecretClientId && fatSecretClientSecret);
const fatSecretApi = "https://platform.fatsecret.com/rest";
const fatSecretTokenUrl = "https://oauth.fatsecret.com/connect/token";
const PROVIDER_TIMEOUT_MS = Number(process.env.PREMIUM_RECIPE_PROVIDER_TIMEOUT_MS ?? 8_000);
const accessMode = process.env.PREMIUM_RECIPE_ACCESS_MODE?.trim() || "allow";
let fatSecretToken: { value: string; expiresAt: number } | null = null;

export function premiumProviderStatus() {
  if (accessMode === "deny") return { status: "restricted" as const, provider: providerName, message: "Premium recipes are not available for this account." };
  return configuredUrl || fatSecretEnabled
    ? { status: "available" as const, provider: fatSecretEnabled ? "FatSecret" : providerName, message: null }
    : { status: "unavailable" as const, provider: providerName, message: "A Premium recipe provider is not connected yet." };
}

async function fatSecretAccessToken() {
  if (fatSecretToken && fatSecretToken.expiresAt > Date.now() + 30_000) return fatSecretToken.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(PROVIDER_TIMEOUT_MS) ? PROVIDER_TIMEOUT_MS : 8_000);
  try {
    const credentials = Buffer.from(`${fatSecretClientId}:${fatSecretClientSecret}`).toString("base64");
    const response = await fetch(fatSecretTokenUrl, { method: "POST", headers: { Authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&scope=basic", signal: controller.signal });
    if (!response.ok) throw new Error(`FatSecret token request returned ${response.status}`);
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new Error("FatSecret token response was incomplete");
    fatSecretToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000 };
    return fatSecretToken.value;
  } finally { clearTimeout(timer); }
}

function fatSecretNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function fatSecretIngredient(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  // Recipe v2 exposes food_name plus optional quantity/measurement rather than
  // the legacy ingredient_description used by the older server.api response.
  const description = string(item.ingredient_description);
  if (description) return description;
  const food = string(item.food_name) ?? string(item.ingredient_name);
  if (!food) return null;
  const amount = string(item.number_of_units);
  const measurement = string(item.measurement_description);
  return [amount, measurement, food].filter(Boolean).join(" ");
}

function fatSecretRecipe(input: unknown): PremiumRecipe | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const recipeId = string(raw.recipe_id);
  const name = string(raw.recipe_name);
  if (!recipeId || !name) return null;
  const nutrition = raw.recipe_nutrition && typeof raw.recipe_nutrition === "object" ? raw.recipe_nutrition as Record<string, unknown> : {};
  const ingredientSource = (raw.ingredients ?? raw.recipe_ingredients);
  const directionSource = (raw.directions ?? raw.recipe_directions);
  const ingredientRows = ingredientSource && typeof ingredientSource === "object"
    ? (ingredientSource as { ingredient?: unknown }).ingredient
    : [];
  const instructionRows = directionSource && typeof directionSource === "object"
    ? (directionSource as { direction?: unknown }).direction
    : [];
  const ingredientList = Array.isArray(ingredientRows) ? ingredientRows : ingredientRows ? [ingredientRows] : [];
  const directionList = Array.isArray(instructionRows) ? instructionRows : instructionRows ? [instructionRows] : [];
  const nutrients = nutrition as Record<string, unknown>;
  return {
    id: `premium:FatSecret:${recipeId}`, name, image: string(raw.recipe_image), category: null, area: null,
    description: string(raw.recipe_description), instructions: directionList.map((row) => row && typeof row === "object" ? string((row as Record<string, unknown>).direction_description) : null).filter((v): v is string => Boolean(v)).join("\n") || null,
    ingredients: ingredientList.map(fatSecretIngredient).filter((v): v is string => Boolean(v)),
    tags: [], prepMinutes: fatSecretNumber(raw.preparation_time_min), cookMinutes: fatSecretNumber(raw.cooking_time_min), totalMinutes: null, servings: fatSecretNumber(raw.number_of_servings),
    cuisine: null, mealType: null, difficulty: null, dietary: [], allergens: [], equipment: [], fiberG: fatSecretNumber(nutrients.fiber), sodiumMg: fatSecretNumber(nutrients.sodium),
    calories: fatSecretNumber(nutrients.calories), proteinG: fatSecretNumber(nutrients.protein), carbsG: fatSecretNumber(nutrients.carbohydrate), fatG: fatSecretNumber(nutrients.fat),
    source: "FatSecret", sourceUrl: `https://www.fatsecret.com/recipes/${recipeId}`, sourceType: "premium", sourceProvider: "FatSecret", sourceId: recipeId,
    nutritionConfidence: "verified", nutritionSource: "FatSecret nutrition data",
  };
}

async function fatSecretFetch(path: string, params: Record<string, string | number>) {
  const token = await fatSecretAccessToken();
  const url = new URL(`${fatSecretApi}${path}`);
  Object.entries({ format: "json", ...params }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(PROVIDER_TIMEOUT_MS) ? PROVIDER_TIMEOUT_MS : 8_000);
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (!response.ok) throw new Error(`FatSecret recipe request returned ${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    if (payload.error) {
      throw new Error("FatSecret request rejected");
    }
    return payload;
  } finally { clearTimeout(timer); }
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
  if (fatSecretEnabled) {
    const payload = await fatSecretFetch("/recipes/search/v3", { search_expression: input.query || input.category || "", max_results: input.limit, page_number: Math.floor(input.offset / input.limit) });
    const search = payload.recipes && typeof payload.recipes === "object" ? payload.recipes as Record<string, unknown> : {};
    const rows = Array.isArray(search.recipe) ? search.recipe : search.recipe ? [search.recipe] : [];
    const recipes = rows.map(fatSecretRecipe).filter((recipe): recipe is PremiumRecipe => Boolean(recipe));
    const total = fatSecretNumber(search.total_results) ?? 0;
    return { ...status, recipes, nextOffset: input.offset + recipes.length < total ? input.offset + recipes.length : null };
  }
  const payload = await providerFetch("/recipes", input);
  const recipes = (payload?.recipes ?? []).map(normalizePremiumRecipe).filter((recipe): recipe is PremiumRecipe => Boolean(recipe));
  return { ...status, recipes, nextOffset: payload?.nextOffset ?? (recipes.length === input.limit ? input.offset + recipes.length : null) };
}

export async function getPremiumRecipe(sourceId: string) {
  const status = premiumProviderStatus();
  if (status.status !== "available") return null;
  if (fatSecretEnabled) {
    const payload = await fatSecretFetch("/recipe/v2", { recipe_id: sourceId.replace(/^premium:FatSecret:/, "") });
    return fatSecretRecipe(payload.recipe);
  }
  const payload = await providerFetch(`/recipes/${encodeURIComponent(sourceId)}`);
  return normalizePremiumRecipe(payload?.recipe ?? payload);
}