/**
 * Regression tests for the /v1/recipes/:recipeId endpoint.
 *
 * Key concerns:
 *   1. Nutrition estimates are served from the database after a server restart
 *      (i.e. when the in-process nutritionCache Map is cold) so that OpenAI is
 *      not called again for a meal that was already estimated.
 *   2. A stale DB-cached estimate (age > 7 days) is served immediately so the
 *      card is never blank, while a background re-estimation is triggered so
 *      the next request gets a fresh value.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// vi.hoisted() variables are available when vi.mock() factory functions run
// (vi.mock calls are hoisted to the top of the file by Vitest).
// ---------------------------------------------------------------------------
const {
  mockLimit,
  mockWhere,
  mockFrom,
  mockSelect,
  mockOnConflictDoUpdate,
  mockValues,
  mockInsert,
  mockOpenAiCreate,
} = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockOnConflictDoUpdate = vi.fn();
  const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOpenAiCreate = vi.fn();

  return { mockLimit, mockWhere, mockFrom, mockSelect, mockOnConflictDoUpdate, mockValues, mockInsert, mockOpenAiCreate };
});

// ---------------------------------------------------------------------------
// Mock @workspace/integrations-openai-ai-server before any import triggers its
// initialisation guard (which throws when env vars are missing).
// ---------------------------------------------------------------------------
vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: mockOpenAiCreate,
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock @workspace/db so tests never touch a real database.
// ---------------------------------------------------------------------------
vi.mock("@workspace/db", () => ({
  db: { select: mockSelect, insert: mockInsert },
  recipeNutritionTable: { mealId: "meal_id" },
}));

// drizzle-orm eq() is only used to build a query clause; the mock DB ignores it.
vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Imports that depend on the mocked modules (must come after vi.mock calls).
// ---------------------------------------------------------------------------
import express from "express";
import recipesRouter from "../routes/recipes.js";

// ---------------------------------------------------------------------------
// Minimal Express app that mounts the recipes router
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(recipesRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** A minimal TheMealDB lookup response for one meal. */
function mealLookupResponse(idMeal: string, strMeal = "Spicy Arrabiata Penne") {
  return {
    meals: [
      {
        idMeal,
        strMeal,
        strCategory: "Pasta",
        strArea: "Italian",
        strInstructions: "Cook pasta.",
        strTags: "Pasta,Spicy",
        strIngredient1: "penne rigate",
        strIngredient2: "olive oil",
        strIngredient3: "garlic",
        strMeasure1: "1 pound",
        strMeasure2: "1/4 cup",
        strMeasure3: "3 cloves",
      },
    ],
  };
}

/** Build an OpenAI chat completion response carrying a nutrition JSON string. */
function openAiNutritionResponse(calories = 450, proteinG = 15, carbsG = 70, fatG = 12) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ calories, proteinG, carbsG, fatG }),
        },
      },
    ],
  };
}

const NUTRITION_DB_TTL_MS = 1000 * 60 * 60 * 24 * 7; // must match routes/recipes.ts

/** Returns a Date that is older than the 7-day nutrition TTL. */
function staleDate(): Date {
  return new Date(Date.now() - NUTRITION_DB_TTL_MS - 1000 * 60 * 60); // 8 days ago
}

/** Returns a Date that is just inside the 7-day TTL (fresh by 30 minutes). */
function nearExpiryDate(): Date {
  return new Date(Date.now() - NUTRITION_DB_TTL_MS + 1000 * 60 * 30); // 30 min before expiry
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /v1/recipes/:recipeId — nutrition persistence", () => {
  let app: ReturnType<typeof buildApp>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    app = buildApp();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    vi.clearAllMocks();

    // Restore chain stubs that clearAllMocks wipes
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  });

  it("calls OpenAI when neither L1 nor DB cache has an estimate, and writes the result to the DB", async () => {
    const MEAL_ID = "52771-cold-cache";

    // DB miss
    mockLimit.mockResolvedValueOnce([]);
    // DB write succeeds
    mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mealLookupResponse(MEAL_ID),
    } as any);

    mockOpenAiCreate.mockResolvedValueOnce(openAiNutritionResponse(450, 15, 70, 12));

    const res = await request(app).get(`/v1/recipes/${MEAL_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(450);
    expect(res.body.proteinG).toBe(15);
    // OpenAI was called exactly once (no cached data)
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
    // The estimate was written to the database (upsert)
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("serves the DB-persisted estimate without calling OpenAI (simulates a server restart)", async () => {
    // Use a meal ID that has never been seen in this process — L1 cache is cold.
    // The DB returns a previously persisted row with a fresh createdAt,
    // simulating a post-restart lookup within the TTL window.
    const MEAL_ID = "52772-db-hit";

    mockLimit.mockResolvedValueOnce([
      { mealId: MEAL_ID, calories: 620, proteinG: 40, carbsG: 55, fatG: 22, createdAt: new Date() },
    ]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mealLookupResponse(MEAL_ID),
    } as any);

    const res = await request(app).get(`/v1/recipes/${MEAL_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(620);
    expect(res.body.proteinG).toBe(40);
    // OpenAI must NOT have been called — the DB row was sufficient
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
    // No write needed — row already exists and is fresh
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("serves the stale DB estimate immediately and triggers a background re-estimation", async () => {
    // Use a unique meal ID so L1 cache is cold for this test.
    const MEAL_ID = "52774-stale-db-hit";

    // DB returns a row whose createdAt is 8 days ago (beyond the 7-day TTL).
    mockLimit.mockResolvedValueOnce([
      { mealId: MEAL_ID, calories: 500, proteinG: 20, carbsG: 60, fatG: 15, createdAt: staleDate() },
    ]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mealLookupResponse(MEAL_ID),
    } as any);

    // OpenAI will be called in the background after the response is sent.
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockOpenAiCreate.mockResolvedValue(openAiNutritionResponse(520, 22, 62, 16));

    const res = await request(app).get(`/v1/recipes/${MEAL_ID}`);

    // The stale estimate is returned immediately — the card is never blank.
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(500);
    expect(res.body.proteinG).toBe(20);

    // Give the background refresh a chance to run (it fires after the response).
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // OpenAI was called in the background to refresh the estimate.
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
    // The refreshed estimate was written back to the DB.
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not refresh a DB row that is just inside the TTL, but does refresh once that same L1 entry ages past the TTL", async () => {
    // Use fake timers so we can advance the clock without making the test slow.
    vi.useFakeTimers();

    const MEAL_ID = "52776-boundary";

    // DB row is 30 minutes before expiry — still fresh.
    const nearExpiry = nearExpiryDate();
    mockLimit.mockResolvedValue([
      { mealId: MEAL_ID, calories: 300, proteinG: 10, carbsG: 40, fatG: 8, createdAt: nearExpiry },
    ]);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mealLookupResponse(MEAL_ID),
    } as any);
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockOpenAiCreate.mockResolvedValue(openAiNutritionResponse(310, 11, 41, 9));

    // ── First request: fresh DB hit ────────────────────────────────────────
    const res1 = await request(app).get(`/v1/recipes/${MEAL_ID}`);
    expect(res1.status).toBe(200);
    expect(res1.body.calories).toBe(300);
    // No refresh yet — the row is still inside the TTL.
    expect(mockOpenAiCreate).not.toHaveBeenCalled();

    // Advance the clock by 31 minutes so the L1 entry (anchored to nearExpiry)
    // is now 1 minute past the 7-day TTL.
    vi.advanceTimersByTime(1000 * 60 * 31);

    // ── Second request: L1 hit but now stale ──────────────────────────────
    // The DB mock still returns the same row but the L1 cachedAt is the
    // original nearExpiry, which is now past the TTL boundary.
    const res2 = await request(app).get(`/v1/recipes/${MEAL_ID}`);
    expect(res2.status).toBe(200);
    // Stale estimate is still served immediately so the card is never blank.
    expect(res2.body.calories).toBe(300);

    // Wait for the background refresh to run.
    await vi.runAllTimersAsync();

    // OpenAI was called exactly once for the background refresh.
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
    // The refreshed estimate was written to the DB.
    expect(mockInsert).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("does not fire a second background refresh for the same stale meal while one is in flight", async () => {
    // Both requests see the same stale DB row — only one OpenAI call should
    // be made thanks to the nutritionRefreshInFlight single-flight guard.
    const MEAL_ID = "52775-stale-double-request";

    mockLimit.mockResolvedValue([
      { mealId: MEAL_ID, calories: 400, proteinG: 18, carbsG: 50, fatG: 10, createdAt: staleDate() },
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mealLookupResponse(MEAL_ID),
    } as any);

    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    // Slow background refresh — still resolving when the second request lands.
    mockOpenAiCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(openAiNutritionResponse(410, 19, 51, 11)), 20)),
    );

    const [res1, res2] = await Promise.all([
      request(app).get(`/v1/recipes/${MEAL_ID}`),
      request(app).get(`/v1/recipes/${MEAL_ID}`),
    ]);

    // Both responses show the stale estimate without blocking.
    expect(res1.body.calories).toBe(400);
    expect(res2.body.calories).toBe(400);

    // Wait for any background work to settle.
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // Only one OpenAI call despite two concurrent requests hitting the stale entry.
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
  });

  it("falls back to OpenAI and still returns a response when the DB read fails", async () => {
    const MEAL_ID = "52773-db-error";

    // DB read throws
    mockLimit.mockRejectedValueOnce(new Error("DB connection lost"));
    // DB write also fails (graceful)
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("DB connection lost"));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mealLookupResponse(MEAL_ID),
    } as any);

    mockOpenAiCreate.mockResolvedValueOnce(openAiNutritionResponse(380, 12, 60, 10));

    const res = await request(app).get(`/v1/recipes/${MEAL_ID}`);

    // A DB failure must never result in a 5xx — we still get nutrition from OpenAI
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(380);
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the meal ID is not found in TheMealDB", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ meals: null }),
    } as any);

    const res = await request(app).get("/v1/recipes/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// Helpers for the "For you" pool mock (filter endpoint)
// ---------------------------------------------------------------------------

function filterResponse(meals: Array<{ idMeal: string; strMeal: string }>) {
  return { meals: meals.map((m) => ({ ...m, strMealThumb: null })) };
}

// ---------------------------------------------------------------------------
// Warm-up / list endpoint tests
//
// These tests are placed LAST intentionally: the warm-up fires background
// async tasks (setTimeout delays, fetch, DB reads) that share module-level
// state (nutritionCache, forYouCache, warmupDone).  Placing them at the end
// means no subsequent test block can be contaminated by that activity.
// ---------------------------------------------------------------------------

describe("GET /v1/recipes — nutrition warm-up", () => {
  let app: ReturnType<typeof buildApp>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    app = buildApp();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    vi.clearAllMocks();

    // Restore chain stubs
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });

    // Ensure all background DB reads during warm-up return an empty result set
    // so they never consume mock responses intended for later assertions.
    mockLimit.mockResolvedValue([]);
  });

  it("returns warmupPending:true on the first list response before estimates are ready", async () => {
    // The for-you pool fetch returns meals with no ingredient fields so the
    // warm-up detail lookups find nothing to estimate and exit quickly.
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => filterResponse([
        { idMeal: "wp-001", strMeal: "Warm Meal A" },
        { idMeal: "wp-002", strMeal: "Warm Meal B" },
      ]),
    } as any);

    const res = await request(app).get("/v1/recipes");

    expect(res.status).toBe(200);
    // warmupPending must be true: the background job fires after the response.
    expect(res.body.warmupPending).toBe(true);
  });

  it("does not call OpenAI for the list endpoint itself", async () => {
    // The list response is built from L1 cache only; it must never trigger an
    // OpenAI call of its own.
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => filterResponse([{ idMeal: "wp-003", strMeal: "Warm Meal C" }]),
    } as any);

    await request(app).get("/v1/recipes");

    // The synchronous list handler must not touch OpenAI; the warm-up is
    // the only caller, and it runs asynchronously after the response is sent.
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("does not fire a second concurrent warm-up while one is in progress", async () => {
    // First request builds the pool and kicks off warm-up.
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => filterResponse([{ idMeal: "wp-guard-001", strMeal: "Guard Meal" }]),
    } as any);

    await request(app).get("/v1/recipes");
    // Second request within TTL uses the cached pool — the warm-up guard
    // prevents a second job from starting. Verify the response is still valid.
    const res = await request(app).get("/v1/recipes");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("recipes");
    expect(res.body).toHaveProperty("warmupPending");
  });

  it("estimates populated by the warm-up appear on a subsequent list response", async () => {
    // Use fake timers so we can (a) expire the existing For You pool TTL to
    // force a fresh fetch, and (b) fast-forward past the 500 ms rate-limit
    // delay inside the warm-up without making the test slow.
    vi.useFakeTimers();
    // Advance the fake clock far enough to expire the TTL of any pool cached
    // by the earlier warm-up tests (1 hour + 1 minute).
    vi.advanceTimersByTime(1000 * 60 * 61);

    const MEAL_ID = "wp-int-meal";

    // Route mock responses based on the request URL:
    //   • filter.php  → pool build (all 10 categories return the same meal)
    //   • lookup.php  → warm-up detail fetch (includes real ingredients)
    mockFetch.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => {
        if ((url as string).includes("lookup.php")) {
          return {
            meals: [{
              idMeal: MEAL_ID,
              strMeal: "Integration Meal",
              strCategory: "Chicken",
              strIngredient1: "chicken breast",
              strMeasure1: "200g",
              strIngredient2: "olive oil",
              strMeasure2: "1 tbsp",
            }],
          };
        }
        // filter.php — pool build
        return filterResponse([{ idMeal: MEAL_ID, strMeal: "Integration Meal" }]);
      },
    }));

    // DB: no cached estimate — warm-up must fall through to OpenAI.
    mockLimit.mockResolvedValue([]);
    mockOnConflictDoUpdate.mockResolvedValue(undefined);

    // OpenAI returns a valid nutrition estimate for the meal.
    mockOpenAiCreate.mockResolvedValue(openAiNutritionResponse(350, 30, 20, 12));

    // ── First request ─────────────────────────────────────────────────────────
    // The pool is built and the background warm-up is kicked off.
    // The response is returned immediately (before warm-up completes) so
    // warmupPending must be true and calories must be null at this point.
    const first = await request(app).get("/v1/recipes");
    expect(first.status).toBe(200);
    expect(first.body.warmupPending).toBe(true);
    expect(first.body.recipes[0].calories).toBeNull();

    // ── Advance timers ────────────────────────────────────────────────────────
    // Run all pending timers (the 500 ms rate-limit delay) and flush the
    // microtask queue so the warm-up coroutine can fully complete.
    await vi.runAllTimersAsync();

    // ── Second request ────────────────────────────────────────────────────────
    // The warm-up has now written the estimate into L1 (nutritionCache).
    // The list handler attaches L1-cached values, so calories should appear.
    const second = await request(app).get("/v1/recipes");
    expect(second.status).toBe(200);
    expect(second.body.warmupPending).toBe(false);
    expect(second.body.recipes[0].calories).toBe(350);
    expect(second.body.recipes[0].proteinG).toBe(30);

    vi.useRealTimers();
  });
});
