import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { mockOpenAiCreate, verifyBearerToken, checkRateLimit } = vi.hoisted(() => ({
  mockOpenAiCreate: vi.fn(),
  verifyBearerToken: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mockOpenAiCreate } } },
}));

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  recipeNutritionTable: { mealId: "meal_id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})) }));

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

import express from "express";
import recipesRouter from "../routes/recipes.js";

const USER = { id: "create-recipe-user", email: "creator@example.com" };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(recipesRouter);
  return app;
}

function completion(payload: unknown) {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

describe("AI recipe creation endpoints", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    verifyBearerToken.mockResolvedValue(USER);
    checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
  });

  it("returns 429 and never calls the model when the per-account quota is exceeded", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterSecs: 600 });

    const [concepts, recipe] = await Promise.all([
      request(app).post("/v1/recipes/concepts").send({ request: "A pasta dinner" }),
      request(app).post("/v1/recipes/generated").send({ title: "Pasta dinner" }),
    ]);

    expect(concepts.status).toBe(429);
    expect(concepts.headers["retry-after"]).toBe("600");
    expect(recipe.status).toBe(429);
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
    // Quotas are namespaced per endpoint and keyed by the verified user id.
    const keys = checkRateLimit.mock.calls.map((call) => call[0]);
    expect(keys).toContain(`recipes-concepts:user:${USER.id}`);
    expect(keys).toContain(`recipes-generated:user:${USER.id}`);
  });

  it("requires a signed-in user to generate concepts or a complete recipe", async () => {
    verifyBearerToken.mockResolvedValue(null);

    const [concepts, recipe] = await Promise.all([
      request(app).post("/v1/recipes/concepts").send({ request: "A pasta dinner" }),
      request(app).post("/v1/recipes/generated").send({ title: "Pasta dinner" }),
    ]);

    expect(concepts.status).toBe(401);
    expect(recipe.status).toBe(401);
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("allows bounded guest concepts without resolving authentication or account context", async () => {
    mockOpenAiCreate.mockResolvedValueOnce(completion({
      concepts: [{ title: "Lentil bowl", summary: "A quick dinner.", whyItFits: "Uses lentils.", keyIngredients: ["lentils"], estimatedMinutes: 25 }],
    }));

    const response = await request(app)
      .post("/v1/recipes/guest-concepts")
      .set("Authorization", "Bearer ignored-by-guest-route")
      .send({ ingredients: ["lentils"], mealType: "Dinner", preferences: ["Vegan"], profile: { email: "must-not-forward@example.com" } });

    expect(response.status).toBe(200);
    expect(verifyBearerToken).not.toHaveBeenCalled();
    expect(checkRateLimit.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([
      expect.stringContaining("guest-recipes:burst:ip:"),
      expect.stringContaining("guest-recipes:daily:ip:"),
    ]));
    const payload = JSON.parse(mockOpenAiCreate.mock.calls[0][0].messages[1].content);
    expect(payload).not.toHaveProperty("profile");
    expect(payload).toMatchObject({ ingredients: ["lentils"], preferences: ["Vegan"] });
  });

  it("fails closed before model work when a guest limiter is unavailable", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, retryAfterSecs: 30, degraded: true });
    const response = await request(app).post("/v1/recipes/guest-concepts").send({ request: "A quick dinner" });
    expect(response.status).toBe(503);
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("stops guest requests at the independent quota before model work", async () => {
    checkRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSecs: 0 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSecs: 3600 });
    const response = await request(app).post("/v1/recipes/guest-concepts").send({ request: "A quick dinner" });
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBe("3600");
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("validates concept requests before calling the model", async () => {
    const [missingPrompt, malformedBody] = await Promise.all([
      request(app).post("/v1/recipes/concepts").send({ ingredients: [], request: "" }),
      request(app).post("/v1/recipes/concepts").send(null as unknown as object),
    ]);

    expect(missingPrompt.status).toBe(400);
    expect(malformedBody.status).toBe(400);
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("returns bounded, structured concepts and normalizes invalid numeric input", async () => {
    mockOpenAiCreate.mockResolvedValueOnce(completion({
      concepts: [
        { title: "Lemony lentil bowl", summary: "A bright one-pan dinner.", whyItFits: "Uses your lentils.", keyIngredients: ["lentils", "lemon"], estimatedMinutes: 27.6 },
        { title: "Spinach pasta", summary: "A simple pasta.", whyItFits: "Quick comfort food.", keyIngredients: ["spinach"], estimatedMinutes: 18 },
        { title: "Herb grain salad", summary: "A fresh grain bowl.", whyItFits: "Flexible and light.", keyIngredients: ["herbs"], estimatedMinutes: 22 },
      ],
    }));

    const response = await request(app).post("/v1/recipes/concepts").send({
      ingredients: ["lentils", "spinach"],
      servings: Number.NaN,
      maxMinutes: Number.POSITIVE_INFINITY,
    });

    expect(response.status).toBe(200);
    expect(response.body.concepts).toHaveLength(3);
    expect(response.body.concepts[0]).toMatchObject({ title: "Lemony lentil bowl", estimatedMinutes: 28 });
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
    expect(mockOpenAiCreate.mock.calls[0][0].max_completion_tokens).toBe(1_000);
    const requestPayload = JSON.parse(mockOpenAiCreate.mock.calls[0][0].messages[1].content);
    expect(requestPayload).toMatchObject({ servings: 2, maxMinutes: 30 });
  });

  it("returns a complete local-ready generated recipe with estimated nutrition", async () => {
    mockOpenAiCreate.mockResolvedValueOnce(completion({
      name: "Lemony lentil bowl",
      description: "A quick, hearty dinner.",
      ingredients: ["1 cup lentils", "1 lemon", "2 cups spinach"],
      instructions: ["Cook the lentils.", "Wilt the spinach.", "Finish with lemon."],
      prepMinutes: 25,
      servings: 3,
      nutrition: { calories: 480, proteinG: 24, carbsG: 62, fatG: 14 },
      allergens: ["legumes"],
    }));

    const response = await request(app).post("/v1/recipes/generated").send({
      title: "Lemony lentil bowl",
      summary: "A quick dinner.",
      servings: 3,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Lemony lentil bowl",
      servings: 3,
      prepMinutes: 25,
      nutrition: { calories: 480, proteinG: 24, carbsG: 62, fatG: 14 },
    });
    expect(response.body.nutritionNote).toMatch(/AI-estimated/i);
  });

  it("rejects incomplete model output without leaking an invalid recipe", async () => {
    mockOpenAiCreate.mockResolvedValueOnce(completion({
      ingredients: ["lentils"],
      instructions: ["Cook."],
    }));

    const response = await request(app).post("/v1/recipes/generated").send({ title: "Lentil bowl" });

    expect(response.status).toBe(502);
    expect(response.body.message).toMatch(/couldn’t finish/i);
  });
});