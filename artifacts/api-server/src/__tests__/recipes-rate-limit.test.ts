/**
 * Public recipe routes — rate limiting and cache-miss coalescing.
 *
 * These are the AI cost/DoS controls for the ANONYMOUS surface:
 *  - per-IP quota enforced before any provider work (429 + Retry-After)
 *  - fail-CLOSED (503) when the persistent limiter is unavailable
 *  - concurrent cold cache misses for the same meal share ONE OpenAI call
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { mockOpenAiCreate, mockCheckRateLimit, mockLimit } = vi.hoisted(() => {
  process.env.OPENAI_TIMEOUT_MS_OVERRIDE = "300";
  return {
    mockOpenAiCreate: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockLimit: vi.fn(),
  };
});

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mockOpenAiCreate } } },
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockLimit })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })) })),
  },
  recipeNutritionTable: { mealId: "meal_id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})) }));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

import express from "express";
import recipesRouter from "../routes/recipes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(recipesRouter);
  return app;
}

function mealLookupResponse(idMeal: string) {
  return {
    meals: [
      {
        idMeal,
        strMeal: `Meal ${idMeal}`,
        strCategory: "Pasta",
        strArea: "Italian",
        strInstructions: "Cook it.",
        strMealThumb: "https://example.com/meal.jpg",
        strIngredient1: "Penne",
        strMeasure1: "200g",
        strIngredient2: "Tomatoes",
        strMeasure2: "2",
      },
    ],
  };
}

function jsonResponse(payload: unknown) {
  return { ok: true, json: async () => payload } as unknown as globalThis.Response;
}

describe("public recipe routes — rate limiting", () => {
  let app: ReturnType<typeof buildApp>;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
    vi.stubGlobal("fetch", mockFetch);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
    mockLimit.mockResolvedValue([]); // L2 miss by default
  });

  it("returns 429 with Retry-After before any upstream or provider work when the IP quota is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfterSecs: 120 });

    const [list, detail] = await Promise.all([
      request(app).get("/v1/recipes?limit=3"),
      request(app).get("/v1/recipes/52771"),
    ]);

    expect(list.status).toBe(429);
    expect(list.headers["retry-after"]).toBe("120");
    expect(detail.status).toBe(429);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
    // Anonymous routes must request fail-closed behavior from the limiter.
    for (const call of mockCheckRateLimit.mock.calls) {
      expect(call[3]).toEqual({ failClosed: true });
    }
  });

  it("fails CLOSED (503, no provider call) when the limiter store is unavailable", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfterSecs: 30, degraded: true });

    const response = await request(app).get("/v1/recipes/52771");

    expect(response.status).toBe(503);
    expect(response.headers["retry-after"]).toBe("30");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("coalesces concurrent cold cache misses for the same meal into exactly one OpenAI call", async () => {
    const mealId = "99001";
    mockFetch.mockResolvedValue(jsonResponse(mealLookupResponse(mealId)));

    // Hold the OpenAI response until both requests are in-flight past the
    // cache checks, proving the second caller awaits the first call's promise
    // instead of issuing its own.
    let releaseOpenAi!: (value: unknown) => void;
    mockOpenAiCreate.mockImplementation(
      () => new Promise((resolve) => { releaseOpenAi = resolve; }),
    );

    // supertest requests are lazy thenables — convert to real promises so both
    // requests are actually dispatched concurrently before we await results.
    const first = Promise.resolve(request(app).get(`/v1/recipes/${mealId}`));
    const second = Promise.resolve(request(app).get(`/v1/recipes/${mealId}`));
    // Let both requests reach the miss path before releasing the model.
    await vi.waitFor(() => {
      expect(mockOpenAiCreate).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    releaseOpenAi({
      choices: [{ message: { content: JSON.stringify({ calories: 500, proteinG: 20, carbsG: 60, fatG: 15 }) } }],
    });

    const [a, b] = await Promise.all([first, second]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.calories).toBe(500);
    expect(b.body.calories).toBe(500);
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
  });
});
