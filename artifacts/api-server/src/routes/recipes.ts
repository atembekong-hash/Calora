import { openai } from "@workspace/integrations-openai-ai-server";
import { db, recipeNutritionTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const API_ROOT = "https://www.themealdb.com/api/json/v1/1";
const SOURCE = "TheMealDB";
const SOURCE_URL = "https://www.themealdb.com/";

// ─── Nutrition estimation ────────────────────────────────────────────────────

type NutritionEstimate = { calories: number; proteinG: number; carbsG: number; fatG: number };

// L1: in-memory cache (avoids a DB round-trip for hot meals within one process lifetime).
const nutritionCache = new Map<string, NutritionEstimate>();

/** Look up a persisted estimate from the database (L2 cache). */
async function getNutritionFromDb(mealId: string): Promise<NutritionEstimate | null> {
  try {
    const rows = await db
      .select()
      .from(recipeNutritionTable)
      .where(eq(recipeNutritionTable.mealId, mealId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { calories: row.calories, proteinG: row.proteinG, carbsG: row.carbsG, fatG: row.fatG };
  } catch (err) {
    logger.warn({ err, mealId }, "nutrition DB read failed — falling back to OpenAI");
    return null;
  }
}

/** Persist an estimate to the database so it survives server restarts. */
async function saveNutritionToDb(mealId: string, nutrition: NutritionEstimate): Promise<void> {
  try {
    await db
      .insert(recipeNutritionTable)
      .values({ mealId, ...nutrition })
      .onConflictDoNothing();
  } catch (err) {
    // Best-effort — a write failure should never break the response.
    logger.warn({ err, mealId }, "nutrition DB write failed — estimate not persisted");
  }
}

async function estimateNutrition(name: string, ingredients: string[]): Promise<NutritionEstimate | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a nutrition expert. Return ONLY a JSON object — no markdown, no prose — with these four integer keys: calories, proteinG, carbsG, fatG. Estimate values for one typical serving.",
        },
        {
          role: "user",
          content: `Recipe: ${name}\nIngredients: ${ingredients.join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 80,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const calories = Math.round(Number(parsed.calories) || 0);
    const proteinG = Math.round(Number(parsed.proteinG) || 0);
    const carbsG = Math.round(Number(parsed.carbsG) || 0);
    const fatG = Math.round(Number(parsed.fatG) || 0);
    if (calories <= 0) return null; // nonsensical estimate — skip
    return { calories, proteinG, carbsG, fatG };
  } catch {
    return null;
  }
}

/**
 * Resolve nutrition for a meal, checking caches in order:
 *   L1 (in-memory Map) → L2 (database) → OpenAI estimation
 * Writes through to both caches on a fresh estimate.
 */
async function resolveNutrition(
  mealId: string,
  name: string,
  ingredients: string[],
): Promise<NutritionEstimate | null> {
  // L1 hit
  const memHit = nutritionCache.get(mealId);
  if (memHit) return memHit;

  // L2 hit
  const dbHit = await getNutritionFromDb(mealId);
  if (dbHit) {
    nutritionCache.set(mealId, dbHit);
    return dbHit;
  }

  // Cache miss — call OpenAI
  if (ingredients.length === 0) return null;
  const fresh = await estimateNutrition(name, ingredients);
  if (fresh) {
    nutritionCache.set(mealId, fresh);
    void saveNutritionToDb(mealId, fresh);
  }
  return fresh;
}

// ─── Background nutrition warm-up ────────────────────────────────────────────

const WARMUP_BATCH_SIZE = 18;
const WARMUP_DELAY_MS = 500; // 500 ms between OpenAI calls to stay well within quota

// Single-flight guard: only one warm-up job may run at a time.
let warmupInProgress = false;
// Flips to true once the first warm-up job finishes; resets when the pool TTL
// expires so a fresh pool always triggers a new warm cycle.
let warmupDone = false;

/**
 * Silently pre-populate the nutrition cache for the first page of the "For you"
 * pool.  Runs entirely in the background — callers must NOT await it.
 *
 * Strategy:
 *   1. Take up to WARMUP_BATCH_SIZE meals that are not already in L1 (memory).
 *   2. For each, check L2 (DB) before hitting OpenAI.
 *   3. A full-detail fetch is required for ingredients (the pool only carries
 *      summary fields from the category filter endpoint).
 *   4. 500 ms delay between OpenAI calls prevents quota bursting.
 */
async function warmNutritionCache(meals: Meal[]): Promise<void> {
  // Single-flight: bail if a job is already running.
  if (warmupInProgress) return;
  warmupInProgress = true;

  // Prefer meals at the front of the pool; skip any already in L1.
  const candidates = meals
    .filter((m) => !nutritionCache.has(m.idMeal))
    .slice(0, WARMUP_BATCH_SIZE);

  if (candidates.length === 0) {
    warmupDone = true;
    warmupInProgress = false;
    return;
  }

  logger.info({ count: candidates.length }, "nutrition warm-up started");
  let warmed = 0;

  for (const meal of candidates) {
    try {
      // Re-check L1 — a concurrent detail request may have filled it since.
      if (nutritionCache.has(meal.idMeal)) continue;

      // L2 check — use DB hit without touching OpenAI.
      const dbHit = await getNutritionFromDb(meal.idMeal);
      if (dbHit) {
        nutritionCache.set(meal.idMeal, dbHit);
        continue;
      }

      // Need the full meal record to extract ingredients.
      const data = await fetchJson(`${API_ROOT}/lookup.php?i=${encodeURIComponent(meal.idMeal)}`);
      const fullMeal = data.meals?.[0];
      if (!fullMeal) continue;

      const recipe = toRecipe(fullMeal);
      if (recipe.ingredients.length === 0) continue;

      const nutrition = await estimateNutrition(recipe.name, recipe.ingredients);
      if (nutrition) {
        nutritionCache.set(meal.idMeal, nutrition);
        void saveNutritionToDb(meal.idMeal, nutrition);
        warmed++;
      }

      // Rate-limit: pause between OpenAI requests.
      await new Promise<void>((resolve) => setTimeout(resolve, WARMUP_DELAY_MS));
    } catch (err) {
      logger.warn({ err, mealId: meal.idMeal }, "nutrition warm-up skipped meal");
    }
  }

  warmupDone = true;
  warmupInProgress = false;
  logger.info({ warmed }, "nutrition warm-up complete");
}

// ─── "For you" pool ───────────────────────────────────────────────────────────

// Categories fetched in parallel to build the "For you" pool.
// Ordered so the feed opens with variety: lighter meals first, then
// heartier ones, then dessert — a natural browse rhythm.
const FOR_YOU_CATEGORIES = [
  "Vegetarian", "Seafood", "Chicken", "Pasta",
  "Beef", "Lamb", "Miscellaneous", "Side", "Dessert", "Starter",
];
const FOR_YOU_TTL_MS = 1000 * 60 * 60; // 1 hour

let forYouCache: Meal[] = [];
let forYouCacheTime = 0;
let forYouFetchPromise: Promise<Meal[]> | null = null;

type Meal = {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strTags?: string | null;
  [key: string]: string | null | undefined;
};

function toRecipe(meal: Meal) {
  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const ingredient = meal[`strIngredient${index + 1}`]?.trim();
    const measure = meal[`strMeasure${index + 1}`]?.trim();
    return ingredient ? `${measure ? `${measure} ` : ""}${ingredient}` : null;
  }).filter((value): value is string => Boolean(value));

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb ?? null,
    category: meal.strCategory ?? null,
    area: meal.strArea ?? null,
    description: null,
    instructions: meal.strInstructions ?? null,
    ingredients,
    tags: meal.strTags ? meal.strTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    prepMinutes: null,
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Recipe provider returned ${response.status}`);
  return response.json() as Promise<{ meals?: Meal[] | null }>;
}

async function buildForYouPool(): Promise<Meal[]> {
  const results = await Promise.allSettled(
    FOR_YOU_CATEGORIES.map((cat) => fetchJson(`${API_ROOT}/filter.php?c=${encodeURIComponent(cat)}`)),
  );
  // Interleave results so the feed has variety on every page rather than
  // showing one whole category then the next.
  const buckets = results.map((r) => (r.status === "fulfilled" ? (r.value.meals ?? []) : []));
  const maxLen = Math.max(...buckets.map((b) => b.length), 0);
  const interleaved: Meal[] = [];
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      if (i < bucket.length) interleaved.push(bucket[i]!);
    }
  }
  // Deduplicate by idMeal (same dish can appear in multiple categories)
  const seen = new Set<string>();
  return interleaved.filter((m) => {
    if (seen.has(m.idMeal)) return false;
    seen.add(m.idMeal);
    return true;
  });
}

async function getForYouMeals(): Promise<Meal[]> {
  const now = Date.now();
  if (forYouCache.length > 0 && now - forYouCacheTime < FOR_YOU_TTL_MS) return forYouCache;
  // Coalesce concurrent requests into one fetch
  if (!forYouFetchPromise) {
    forYouFetchPromise = buildForYouPool().then((meals) => {
      forYouCache = meals;
      forYouCacheTime = Date.now();
      forYouFetchPromise = null;
      // Reset warm-up state so the fresh pool always triggers a new cycle.
      warmupDone = false;
      warmupInProgress = false;
      // Fire-and-forget: warm the nutrition cache so first-visit cards show
      // calorie estimates without the user ever opening a detail sheet.
      void warmNutritionCache(meals);
      return meals;
    }).catch((err) => {
      forYouFetchPromise = null;
      throw err;
    });
  }
  return forYouFetchPromise;
}

router.get("/v1/recipes", async (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const parsedLimit = Number(req.query.limit ?? 12);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 30) : 12;
    const parsedOffset = Number(req.query.offset ?? 0);
    const offset = Number.isFinite(parsedOffset) ? Math.max(Math.floor(parsedOffset), 0) : 0;

    let meals: Meal[];
    if (query) {
      const data = await fetchJson(`${API_ROOT}/search.php?s=${encodeURIComponent(query)}`);
      meals = data.meals ?? [];
    } else if (category) {
      const data = await fetchJson(`${API_ROOT}/filter.php?c=${encodeURIComponent(category)}`);
      meals = data.meals ?? [];
    } else {
      // "For you" — multi-category interleaved pool, cached server-side
      meals = await getForYouMeals();
    }

    const recipes = meals.slice(offset, offset + limit).map((meal) => {
      const recipe = toRecipe(meal);
      // Attach any L1-cached estimate so the card can show ~kcal without
      // the user needing to open the detail sheet first.
      const cached = nutritionCache.get(recipe.id);
      return cached ? { ...recipe, ...cached } : recipe;
    });
    // Let clients know they should refetch soon if the background warm-up
    // has not yet populated estimates for the first page of results.
    const warmupPending = !warmupDone;
    res.json({ source: SOURCE, recipes, warmupPending });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Recipe provider unavailable" });
  }
});

router.get("/v1/recipes/:recipeId", async (req, res) => {
  try {
    const data = await fetchJson(`${API_ROOT}/lookup.php?i=${encodeURIComponent(req.params.recipeId)}`);
    const meal = data.meals?.[0];
    if (!meal) {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }
    const base = toRecipe(meal);

    // TheMealDB never includes nutrition — fill it in via AI, persisted per meal ID.
    const nutrition = await resolveNutrition(base.id, base.name, base.ingredients);

    // When estimation fails, spread null does nothing — calories stays null and
    // the client would silently show blanks. Instead, set a flag so the client
    // can surface a clear "Nutrition unavailable" label with a retry option.
    res.json(nutrition ? { ...base, ...nutrition } : { ...base, nutritionUnavailable: true });
    return;
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Recipe provider unavailable" });
    return;
  }
});

export default router;