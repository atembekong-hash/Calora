/**
 * Regression tests for the /v1/recipes/:recipeId endpoint.
 *
 * Key concern: nutrition estimates must be served from the database after a
 * server restart (i.e. when the in-process nutritionCache Map is cold) so that
 * OpenAI is not called again for a meal that was already estimated.
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
  mockOnConflictDoNothing,
  mockValues,
  mockInsert,
  mockOpenAiCreate,
} = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockOnConflictDoNothing = vi.fn();
  const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOpenAiCreate = vi.fn();

  return { mockLimit, mockWhere, mockFrom, mockSelect, mockOnConflictDoNothing, mockValues, mockInsert, mockOpenAiCreate };
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
    mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  });

  it("calls OpenAI when neither L1 nor DB cache has an estimate, and writes the result to the DB", async () => {
    const MEAL_ID = "52771-cold-cache";

    // DB miss
    mockLimit.mockResolvedValueOnce([]);
    // DB write succeeds
    mockOnConflictDoNothing.mockResolvedValueOnce(undefined);

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
    // The estimate was written to the database
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("serves the DB-persisted estimate without calling OpenAI (simulates a server restart)", async () => {
    // Use a meal ID that has never been seen in this process — L1 cache is cold.
    // The DB returns a previously persisted row, simulating a post-restart lookup.
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
    // No write needed — row already exists
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("falls back to OpenAI and still returns a response when the DB read fails", async () => {
    const MEAL_ID = "52773-db-error";

    // DB read throws
    mockLimit.mockRejectedValueOnce(new Error("DB connection lost"));
    // DB write also fails (graceful)
    mockOnConflictDoNothing.mockRejectedValueOnce(new Error("DB connection lost"));

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
