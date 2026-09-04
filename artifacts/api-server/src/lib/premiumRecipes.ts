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

export type RestaurantFoodServing = {
  servingId: string | null;
  description: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
};

export type RestaurantFood = Omit<RestaurantFoodServing, "description"> & {
  id: string;
  sourceId: string;
  name: string;
  brandName: string | null;
  foodUrl: string | null;
  serving: string | null;
  servings: RestaurantFoodServing[];
  sourceProvider: "FatSecret";
  nutritionConfidence: "verified" | "unavailable";
  nutritionSource: string;
};

export type FatSecretProviderErrorKind = "restricted" | "rate_limited" | "authentication" | "timeout" | "upstream" | "invalid_response";

export class FatSecretProviderError extends Error {
  constructor(
    public readonly kind: FatSecretProviderErrorKind,
    public readonly providerCode: string | null,
    public readonly httpStatus: number | null,
    public readonly providerMessage: string | null = null,
  ) {
    super(`FatSecret provider ${kind}`);
    this.name = "FatSecretProviderError";
  }
}

type ProviderPayload = { recipes?: unknown[]; recipe?: unknown; nextOffset?: number | null };

const configuredUrl = process.env.PREMIUM_RECIPE_PROVIDER_URL?.replace(/\/$/, "");
const providerName = process.env.PREMIUM_RECIPE_PROVIDER_NAME?.trim() || "Premium provider";
const providerKey = process.env.PREMIUM_RECIPE_PROVIDER_API_KEY;
const configuredFatSecretGatewayUrl = process.env.FATSECRET_GATEWAY_URL?.replace(/\/$/, "");
const fatSecretGatewaySecret = process.env.FATSECRET_GATEWAY_SECRET;
const fatSecretClientId = process.env.FATSECRET_CLIENT_ID;
const fatSecretClientSecret = process.env.FATSECRET_CLIENT_SECRET;
const fatSecretEnabled = Boolean(fatSecretClientId && fatSecretClientSecret);
const fatSecretGatewayUrl = configuredFatSecretGatewayUrl && (process.env.NODE_ENV !== "production" || configuredFatSecretGatewayUrl.startsWith("https://"))
  ? configuredFatSecretGatewayUrl
  : undefined;
const fatSecretGatewayEnabled = Boolean(fatSecretGatewayUrl && fatSecretGatewaySecret);
const fatSecretTransportEnabled = configuredFatSecretGatewayUrl ? fatSecretGatewayEnabled : fatSecretEnabled;
const fatSecretApi = "https://platform.fatsecret.com/rest";
const fatSecretTokenUrl = "https://oauth.fatsecret.com/connect/token";
const PROVIDER_TIMEOUT_MS = Number(process.env.PREMIUM_RECIPE_PROVIDER_TIMEOUT_MS ?? 8_000);
const accessMode = process.env.PREMIUM_RECIPE_ACCESS_MODE?.trim() || "allow";
let fatSecretToken: { value: string; expiresAt: number } | null = null;

export function premiumProviderStatus() {
  if (accessMode === "deny") return { status: "restricted" as const, provider: providerName, message: "Premium recipes are not available for this account." };
  return configuredUrl || fatSecretTransportEnabled
    ? { status: "available" as const, provider: fatSecretTransportEnabled ? "FatSecret" : providerName, message: null }
    : { status: "unavailable" as const, provider: providerName, message: "A Premium recipe provider is not connected yet." };
}

export function restaurantProviderStatus() {
  return fatSecretTransportEnabled
    ? { status: "available" as const, provider: "FatSecret", message: null }
    : { status: "unavailable" as const, provider: "FatSecret", message: "Restaurant nutrition search is not connected yet." };
}

async function fatSecretAccessToken() {
  if (fatSecretToken && fatSecretToken.expiresAt > Date.now() + 30_000) return fatSecretToken.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(PROVIDER_TIMEOUT_MS) ? PROVIDER_TIMEOUT_MS : 8_000);
  try {
    const credentials = Buffer.from(`${fatSecretClientId}:${fatSecretClientSecret}`).toString("base64");
    const response = await fetch(fatSecretTokenUrl, { method: "POST", headers: { Authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&scope=basic%20premier", signal: controller.signal });
    if (!response.ok) {
      throw new FatSecretProviderError(
        response.status === 401 || response.status === 403 ? "authentication" : "upstream",
        null,
        response.status,
      );
    }
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new FatSecretProviderError("invalid_response", null, response.status);
    fatSecretToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000 };
    return fatSecretToken.value;
  } catch (error) {
    if (error instanceof FatSecretProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FatSecretProviderError("timeout", null, null);
    }
    throw new FatSecretProviderError("upstream", null, null);
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
  const servingSizes = raw.serving_sizes && typeof raw.serving_sizes === "object"
    ? (raw.serving_sizes as { serving?: unknown }).serving
    : null;
  const firstServing = Array.isArray(servingSizes) ? servingSizes[0] : servingSizes;
  const nutrition = raw.recipe_nutrition && typeof raw.recipe_nutrition === "object"
    ? raw.recipe_nutrition as Record<string, unknown>
    : firstServing && typeof firstServing === "object" ? firstServing as Record<string, unknown> : {};
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
    id: `premium:FatSecret:${recipeId}`, name, image: recipeImage(raw.recipe_image) ?? recipeImage(raw.image), category: null, area: null,
    description: string(raw.recipe_description), instructions: directionList.map((row) => row && typeof row === "object" ? string((row as Record<string, unknown>).direction_description) : null).filter((v): v is string => Boolean(v)).join("\n") || null,
    ingredients: ingredientList.map(fatSecretIngredient).filter((v): v is string => Boolean(v)),
    tags: [], prepMinutes: fatSecretNumber(raw.preparation_time_min), cookMinutes: fatSecretNumber(raw.cooking_time_min), totalMinutes: null, servings: fatSecretNumber(raw.number_of_servings),
    cuisine: null, mealType: null, difficulty: null, dietary: [], allergens: [], equipment: [], fiberG: fatSecretNumber(nutrients.fiber), sodiumMg: fatSecretNumber(nutrients.sodium),
    calories: fatSecretNumber(nutrients.calories), proteinG: fatSecretNumber(nutrients.protein), carbsG: fatSecretNumber(nutrients.carbohydrate), fatG: fatSecretNumber(nutrients.fat),
    source: "FatSecret", sourceUrl: string(raw.recipe_url) ?? `https://www.fatsecret.com/recipes/${recipeId}`, sourceType: "premium", sourceProvider: "FatSecret", sourceId: recipeId,
    nutritionConfidence: "verified", nutritionSource: "FatSecret nutrition data",
  };
}

function rows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function fatSecretServing(input: unknown): RestaurantFoodServing | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const description = string(raw.serving_description) ?? string(raw.measurement_description) ?? "1 serving";
  return {
    servingId: string(raw.serving_id),
    description,
    calories: fatSecretNumber(raw.calories),
    proteinG: fatSecretNumber(raw.protein),
    carbsG: fatSecretNumber(raw.carbohydrate),
    fatG: fatSecretNumber(raw.fat),
    fiberG: fatSecretNumber(raw.fiber),
    sugarG: fatSecretNumber(raw.sugar),
    sodiumMg: fatSecretNumber(raw.sodium),
  };
}

function nutrientsFromDescription(description: string | null): Omit<RestaurantFoodServing, "servingId" | "description"> {
  const value = description ?? "";
  const read = (label: string) => {
    const match = value.match(new RegExp(`(?:${label}):?\\s*([\\d.]+)`, "i"));
    return match ? fatSecretNumber(match[1]) : null;
  };
  return {
    calories: read("Calories"),
    proteinG: read("Protein"),
    carbsG: read("Carbs?|Carbohydrate"),
    fatG: read("Fat"),
    fiberG: read("Fiber"),
    sugarG: read("Sugar"),
    sodiumMg: read("Sodium"),
  };
}

export function normalizeFatSecretFood(input: unknown): RestaurantFood | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const sourceId = string(raw.food_id);
  const name = string(raw.food_name);
  if (!sourceId || !name) return null;
  const servingSource = raw.servings && typeof raw.servings === "object"
    ? (raw.servings as { serving?: unknown }).serving
    : raw.serving;
  const servings = rows(servingSource).map(fatSecretServing).filter((serving): serving is RestaurantFoodServing => Boolean(serving));
  const parsedDescription = string(raw.food_description);
  const descriptionServing = parsedDescription
    ? { servingId: null, description: parsedDescription.split(" - ")[0]?.trim() || "1 serving", ...nutrientsFromDescription(parsedDescription) }
    : null;
  const primary = servings[0] ?? descriptionServing ?? {
    servingId: null,
    description: "1 serving",
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    fiberG: null,
    sugarG: null,
    sodiumMg: null,
  };
  const hasNutrition = primary.calories !== null
    && primary.proteinG !== null
    && primary.carbsG !== null
    && primary.fatG !== null;
  return {
    id: `fatsecret-food:${sourceId}`,
    sourceId,
    name,
    brandName: string(raw.brand_name),
    foodUrl: string(raw.food_url),
    serving: primary.description,
    servingId: primary.servingId,
    calories: primary.calories,
    proteinG: primary.proteinG,
    carbsG: primary.carbsG,
    fatG: primary.fatG,
    fiberG: primary.fiberG,
    sugarG: primary.sugarG,
    sodiumMg: primary.sodiumMg,
    servings,
    sourceProvider: "FatSecret",
    nutritionConfidence: hasNutrition ? "verified" : "unavailable",
    nutritionSource: hasNutrition ? "FatSecret nutrition data" : "Nutrition not supplied",
  };
}

function fatSecretError(payload: Record<string, unknown>, status: number): FatSecretProviderError | null {
  if (!payload.error) return null;
  const raw = payload.error && typeof payload.error === "object"
    ? payload.error as Record<string, unknown>
    : {};
  const code = string(raw.code) ?? (fatSecretNumber(raw.code) !== null ? String(raw.code) : null);
  const providerMessage = string(raw.message);
  const message = providerMessage?.toLowerCase() ?? "";
  const kind: FatSecretProviderErrorKind =
    status === 429 || code === "12" || message.includes("limit") || message.includes("quota")
      ? "rate_limited"
      : status === 401 || code === "2" || message.includes("token")
        ? "authentication"
        : status === 403 || ["13", "14", "21"].includes(code ?? "") || message.includes("scope") || message.includes("permission")
          ? "restricted"
          : "upstream";
  return new FatSecretProviderError(kind, code, status, providerMessage);
}

async function fatSecretFetch(path: string, params: Record<string, string | number>) {
  if (configuredFatSecretGatewayUrl) return fatSecretGatewayFetch(path, params);
  const token = await fatSecretAccessToken();
  const url = new URL(`${fatSecretApi}${path}`);
  Object.entries({ format: "json", ...params }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(PROVIDER_TIMEOUT_MS) ? PROVIDER_TIMEOUT_MS : 8_000);
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload) throw new FatSecretProviderError("invalid_response", null, response.status);
    const providerError = fatSecretError(payload, response.status);
    if (providerError) throw providerError;
    if (!response.ok) {
      throw new FatSecretProviderError(
        response.status === 429 ? "rate_limited" : response.status === 401 ? "authentication" : response.status === 403 ? "restricted" : "upstream",
        null,
        response.status,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof FatSecretProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FatSecretProviderError("timeout", null, null);
    }
    throw new FatSecretProviderError("upstream", null, null);
  } finally { clearTimeout(timer); }
}

function gatewayOperation(path: string, params: Record<string, string | number>) {
  if (path === "/recipes/search/v3") {
    return { path: "/fatsecret/recipes/search", body: { query: params.search_expression, limit: params.max_results, offset: Number(params.page_number) * Number(params.max_results) } };
  }
  if (path === "/recipe/v2") return { path: "/fatsecret/recipes/detail", body: { sourceId: `premium:FatSecret:${params.recipe_id}` } };
  if (path === "/foods/search/v5") {
    return { path: "/fatsecret/foods/search", body: { query: params.search_expression, limit: params.max_results, offset: Number(params.page_number) * Number(params.max_results) } };
  }
  if (path === "/food/v4") return { path: "/fatsecret/foods/detail", body: { sourceId: `fatsecret-food:${params.food_id}` } };
  throw new FatSecretProviderError("upstream", "gateway_operation_unsupported", null);
}

async function fatSecretGatewayFetch(path: string, params: Record<string, string | number>) {
  if (!fatSecretGatewayUrl || !fatSecretGatewaySecret) {
    throw new FatSecretProviderError("upstream", "gateway_not_configured", null);
  }
  const operation = gatewayOperation(path, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(PROVIDER_TIMEOUT_MS) ? PROVIDER_TIMEOUT_MS : 8_000);
  try {
    const response = await fetch(`${fatSecretGatewayUrl}${operation.path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-calora-gateway-secret": fatSecretGatewaySecret,
      },
      body: JSON.stringify(operation.body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload) throw new FatSecretProviderError("invalid_response", null, response.status);
    const providerError = fatSecretError(payload, response.status);
    if (providerError) throw providerError;
    if (!response.ok) {
      const gatewayError = payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : {};
      const code = string(gatewayError.code);
      const message = string(gatewayError.message);
      const kind: FatSecretProviderErrorKind =
        response.status === 429 ? "rate_limited"
          : response.status === 401 || response.status === 403 ? "authentication"
            : response.status === 504 || code === "timeout" ? "timeout"
              : response.status === 400 ? "invalid_response"
                : "upstream";
      throw new FatSecretProviderError(kind, code, response.status, message);
    }
    return payload;
  } catch (error) {
    if (error instanceof FatSecretProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FatSecretProviderError("timeout", null, null);
    }
    throw new FatSecretProviderError("upstream", null, null);
  } finally { clearTimeout(timer); }
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function recipeImage(value: unknown): string | null {
  const candidate = string(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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
    image: recipeImage(raw.image) ?? recipeImage(raw.recipeImage) ?? recipeImage(raw.recipe_image),
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
  if (fatSecretTransportEnabled) {
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
  if (fatSecretTransportEnabled) {
    const payload = await fatSecretFetch("/recipe/v2", { recipe_id: sourceId.replace(/^premium:FatSecret:/, "") });
    return fatSecretRecipe(payload.recipe);
  }
  const payload = await providerFetch(`/recipes/${encodeURIComponent(sourceId)}`);
  return normalizePremiumRecipe(payload?.recipe ?? payload);
}

export async function listRestaurantFoods(input: { query: string; limit: number; offset: number }) {
  const status = restaurantProviderStatus();
  if (status.status !== "available") return { ...status, foods: [], nextOffset: null };
  const pageNumber = Math.floor(input.offset / input.limit);
  const payload = await fatSecretFetch("/foods/search/v5", {
    search_expression: input.query,
    max_results: input.limit,
    page_number: pageNumber,
    food_type: "brand",
  });
  // v5 wraps matches in foods_search.results.food. Keep support for the
  // legacy foods.food envelope so a compatible provider response remains safe.
  const search = payload.foods_search && typeof payload.foods_search === "object"
    ? payload.foods_search as Record<string, unknown>
    : payload.foods && typeof payload.foods === "object"
      ? payload.foods as Record<string, unknown>
      : {};
  const resultRows = search.results && typeof search.results === "object"
    ? (search.results as Record<string, unknown>).food
    : search.food;
  const foods = rows(resultRows)
    .map(normalizeFatSecretFood)
    .filter((food): food is RestaurantFood => Boolean(food?.brandName));
  const total = fatSecretNumber(search.total_results) ?? 0;
  const nextProviderOffset = (pageNumber + 1) * input.limit;
  return { ...status, foods, nextOffset: nextProviderOffset < total ? nextProviderOffset : null };
}

export async function getRestaurantFood(sourceId: string) {
  const status = restaurantProviderStatus();
  if (status.status !== "available") return null;
  const payload = await fatSecretFetch("/food/v4", { food_id: sourceId.replace(/^fatsecret-food:/, "") });
  return normalizeFatSecretFood(payload.food);
}