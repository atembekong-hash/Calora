import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { verifyBearerTokenMock, checkRateLimitMock } = vi.hoisted(() => ({
  verifyBearerTokenMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: verifyBearerTokenMock,
}));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: checkRateLimitMock,
}));

beforeEach(() => {
  verifyBearerTokenMock.mockResolvedValue(null);
  checkRateLimitMock.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
});

afterEach(() => {
  delete process.env.FATSECRET_CLIENT_ID;
  delete process.env.FATSECRET_CLIENT_SECRET;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("Restaurant food routes", () => {
  it("requires a verified account before using the paid provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods?query=burger");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: "Sign in to search restaurant foods." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns normalized branded foods for a verified account", async () => {
    process.env.FATSECRET_CLIENT_ID = "test-id";
    process.env.FATSECRET_CLIENT_SECRET = "test-secret";
    verifyBearerTokenMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          foods: {
            total_results: "3",
            food: [
              {
                food_id: "123",
                food_name: "Cheeseburger",
                brand_name: "Example Burger",
                food_url: "https://www.fatsecret.com/calories-nutrition/example/cheeseburger",
                food_description: "Per 1 burger - Calories: 320kcal | Fat: 15g | Carbs: 31g | Protein: 17g",
              },
              {
                food_id: "999",
                food_name: "Generic raw onion",
                food_description: "Per 100 g - Calories: 40kcal | Fat: 0g | Carbs: 9g | Protein: 1g",
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods?query=burger&limit=2&offset=0");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "available",
      provider: "FatSecret",
      foods: [{
        id: "fatsecret-food:123",
        sourceId: "123",
        name: "Cheeseburger",
        brandName: "Example Burger",
        serving: "Per 1 burger",
        calories: 320,
        proteinG: 17,
        carbsG: 31,
        fatG: 15,
        nutritionConfidence: "verified",
      }],
      nextOffset: 2,
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "restaurant-foods:user:user-123",
      80,
      3600,
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/foods/search/v5");
  });
});