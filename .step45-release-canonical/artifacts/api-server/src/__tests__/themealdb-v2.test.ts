import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { mockOpenAiCreate, mockSelect, mockInsert } = vi.hoisted(() => {
  process.env.THEMEALDB_API_KEY = "themealdb-test-secret";
  return {
    mockOpenAiCreate: vi.fn(),
    mockSelect: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn() })) })) })),
    mockInsert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })) })),
  };
});

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mockOpenAiCreate } } },
}));
vi.mock("@workspace/db", () => ({
  db: { select: mockSelect, insert: mockInsert },
  recipeNutritionTable: { mealId: "meal_id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})) }));
vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSecs: 0 })),
}));

import recipesRouter from "../routes/recipes.js";

function appWithRecipes() {
  const app = express();
  app.use(express.json());
  app.use(recipesRouter);
  return app;
}

describe("TheMealDB Premium V2 discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the server-only V2 key for documented multi-ingredient filtering without exposing it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        meals: [{ idMeal: "52772", strMeal: "Garlic chicken", strMealThumb: "https://www.themealdb.com/images/meal.jpg" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await request(appWithRecipes()).get("/v1/recipes?query=chicken,%20garlic,%20salt");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ source: "TheMealDB", recipes: [{ id: "52772", name: "Garlic chicken" }] });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://www.themealdb.com/api/json/v2/themealdb-test-secret/filter.php?i=chicken%2Cgarlic%2Csalt",
    );
    expect(JSON.stringify(response.body)).not.toContain("themealdb-test-secret");
  });

  it("returns a generic failure for malformed or unavailable V2 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meals: "not-an-array" }) });
    vi.stubGlobal("fetch", fetchMock);

    const response = await request(appWithRecipes()).get("/v1/recipes?query=chicken,garlic");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: "Recipe provider unavailable. Please try again shortly." });
    expect(JSON.stringify(response.body)).not.toContain("themealdb-test-secret");
  });
});