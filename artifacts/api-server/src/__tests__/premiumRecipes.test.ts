import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

afterEach(() => {
  delete process.env.PREMIUM_RECIPE_PROVIDER_URL;
  delete process.env.PREMIUM_RECIPE_PROVIDER_NAME;
  delete process.env.PREMIUM_RECIPE_PROVIDER_API_KEY;
  delete process.env.PREMIUM_RECIPE_ACCESS_MODE;
  delete process.env.FATSECRET_CLIENT_ID;
  delete process.env.FATSECRET_CLIENT_SECRET;
  vi.unstubAllGlobals();
  vi.resetModules();
});

beforeEach(() => {
  delete process.env.FATSECRET_CLIENT_ID;
  delete process.env.FATSECRET_CLIENT_SECRET;
});

async function appWithProvider(url?: string) {
  if (url) process.env.PREMIUM_RECIPE_PROVIDER_URL = url;
  const { default: router } = await import("../routes/premiumRecipes.js");
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

describe("Premium recipe routes", () => {
  it("returns an honest unavailable state with no provider configuration", async () => {
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "unavailable", recipes: [] });
  });

  it("normalizes a configured provider list and forwards filters/pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recipes: [{ id: "42", name: "Miso bowl", sourceUrl: "https://provider.example/42", calories: 410, nutritionConfidence: "verified", nutritionSource: "Provider data", servings: 2, cookMinutes: 18, dietary: ["Vegan"], allergens: ["Soy"], equipment: ["Saucepan"], fiberG: 8 }], nextOffset: 18 }) });
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider("https://provider.example");
    const res = await request(app).get("/v1/premium-recipes?query=miso&category=Dinner&limit=18&offset=0");
    expect(res.status).toBe(200);
    expect(res.body.recipes[0]).toMatchObject({ id: "premium:Premium provider:42", sourceType: "premium", nutritionConfidence: "verified" });
    expect(res.body.recipes[0]).toMatchObject({ servings: 2, cookMinutes: 18, dietary: ["Vegan"], allergens: ["Soy"], equipment: ["Saucepan"], fiberG: 8, sodiumMg: null });
    expect(String(fetchMock.mock.calls[0][0])).toContain("query=miso");
    expect(String(fetchMock.mock.calls[0][0])).toContain("offset=0");
  });

  it("reports a policy-restricted catalogue without contacting the provider", async () => {
    process.env.PREMIUM_RECIPE_ACCESS_MODE = "deny";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider("https://provider.example");
    const res = await request(app).get("/v1/premium-recipes");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "restricted", recipes: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("isolates an upstream failure as a retryable Premium error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const app = await appWithProvider("https://provider.example");
    const res = await request(app).get("/v1/premium-recipes");
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ status: "error", recipes: [] });
  });

  it("uses FatSecret OAuth and normalizes a recipe search result", async () => {
    process.env.FATSECRET_CLIENT_ID = "test-id";
    process.env.FATSECRET_CLIENT_SECRET = "test-secret";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "token", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ recipes: { total_results: "1", recipe: [{ recipe_id: "99", recipe_name: "FatSecret bowl", recipe_image: "https://image.example/99", recipe_url: "https://foods.fatsecret.com/recipes/99-fatsecret-bowl/Default.aspx" }] } }) });
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes?query=bowl");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ provider: "FatSecret", status: "available" });
    expect(res.body.recipes[0]).toMatchObject({ id: "premium:FatSecret:99", sourceProvider: "FatSecret", sourceUrl: "https://foods.fatsecret.com/recipes/99-fatsecret-bowl/Default.aspx", nutritionConfidence: "verified" });
    expect(String(fetchMock.mock.calls[1][0])).toContain("/recipes/search/v3");
  });

  it("surfaces a FatSecret entitlement rejection as a safe restricted state", async () => {
    process.env.FATSECRET_CLIENT_ID = "test-id";
    process.env.FATSECRET_CLIENT_SECRET = "test-secret";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "token", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: { code: 13, message: "Missing premium scope detail" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes?query=bowl");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "restricted", provider: "FatSecret", recipes: [] });
    expect(JSON.stringify(res.body)).not.toContain("scope detail");
  });

  it("normalizes FatSecret branded food servings without inventing nutrition", async () => {
    const { normalizeFatSecretFood } = await import("../lib/premiumRecipes.js");
    const food = normalizeFatSecretFood({
      food_id: "123",
      food_name: "Cheeseburger",
      brand_name: "Example Burger",
      food_url: "https://www.fatsecret.com/calories-nutrition/example/cheeseburger",
      servings: {
        serving: [{
          serving_id: "456",
          serving_description: "1 burger",
          calories: "320",
          protein: "17",
          carbohydrate: "31",
          fat: "15",
          fiber: "2",
          sugar: "7",
          sodium: "710",
        }],
      },
    });
    expect(food).toMatchObject({
      id: "fatsecret-food:123",
      sourceId: "123",
      brandName: "Example Burger",
      serving: "1 burger",
      servingId: "456",
      calories: 320,
      proteinG: 17,
      carbsG: 31,
      fatG: 15,
      nutritionConfidence: "verified",
      nutritionSource: "FatSecret nutrition data",
    });
    expect(food?.servings).toHaveLength(1);
  });
});