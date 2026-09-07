import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { verifyBearerTokenMock, checkRateLimitMock } = vi.hoisted(() => ({
  verifyBearerTokenMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));
const loggerWarnMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: verifyBearerTokenMock,
}));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("../lib/logger.js", () => ({
  logger: { warn: loggerWarnMock, error: vi.fn() },
}));

beforeEach(() => {
  verifyBearerTokenMock.mockResolvedValue(null);
  checkRateLimitMock.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
  loggerWarnMock.mockReset();
});

afterEach(() => {
  delete process.env.FATSECRET_CLIENT_ID;
  delete process.env.FATSECRET_CLIENT_SECRET;
  delete process.env.FATSECRET_GATEWAY_URL;
  delete process.env.FATSECRET_GATEWAY_SECRET;
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
    expect(res.body.foods[0]).not.toHaveProperty("imageUrl");
    expect(res.body.foods[0]).not.toHaveProperty("foodImage");
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "restaurant-foods:user:user-123",
      80,
      3600,
      { failClosed: true, rethrowAccountDeletionFence: true },
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/foods/search/v5");
  });

  it("reads the documented v5 foods_search envelope and requests branded foods", async () => {
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
          foods_search: {
            total_results: "1",
            results: {
              food: {
                food_id: "321",
                food_name: "Classic Cheeseburger",
                brand_name: "Example Burger",
                food_description: "Per 1 burger - Calories: 320kcal | Fat: 15g | Carbs: 31g | Protein: 17g",
              },
            },
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
    expect(res.body.foods).toMatchObject([{
      id: "fatsecret-food:321",
      sourceId: "321",
      name: "Classic Cheeseburger",
      brandName: "Example Burger",
      nutritionConfidence: "verified",
    }]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("food_type=brand");
  });

  it("routes authenticated restaurant searches through the configured FatSecret gateway", async () => {
    process.env.FATSECRET_GATEWAY_URL = "https://gateway.example";
    process.env.FATSECRET_GATEWAY_SECRET = "gateway-shared-secret";
    verifyBearerTokenMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        foods_search: {
          total_results: "1",
          results: { food: { food_id: "321", food_name: "Classic Cheeseburger", brand_name: "Example Burger" } },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods?query=burger&limit=10&offset=10");

    expect(res.status).toBe(200);
    expect(res.body.foods[0]).toMatchObject({ id: "fatsecret-food:321", brandName: "Example Burger" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://gateway.example/fatsecret/foods/search");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ "x-calora-gateway-secret": "gateway-shared-secret" }),
      body: JSON.stringify({ query: "burger", limit: 10, offset: 10 }),
    });
  });

  it("routes authenticated restaurant details through the gateway and keeps provider errors safe", async () => {
    process.env.FATSECRET_GATEWAY_URL = "https://gateway.example";
    process.env.FATSECRET_GATEWAY_SECRET = "gateway-shared-secret";
    verifyBearerTokenMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: { code: 21, message: "FatSecret provider rejected the request." } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods/fatsecret-food%3A321");

    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain("provider rejected");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://gateway.example/fatsecret/foods/detail");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ sourceId: "fatsecret-food:321" }));
  });

  it("rejects malformed restaurant source identifiers before contacting FatSecret", async () => {
    process.env.FATSECRET_CLIENT_ID = "test-id";
    process.env.FATSECRET_CLIENT_SECRET = "test-secret";
    verifyBearerTokenMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods/not-a-fatsecret-id");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid restaurant food identifier." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a generic response and redacted signal for an account deletion fence", async () => {
    verifyBearerTokenMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    checkRateLimitMock.mockRejectedValueOnce({
      code: "55000",
      message: "account deletion is in progress",
      detail: "raw account details",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods?query=burger");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: "Restaurant search is temporarily unavailable." });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "restaurant-foods:user:user-123",
      80,
      3600,
      { failClosed: true, rethrowAccountDeletionFence: true },
    );
    expect(loggerWarnMock).toHaveBeenCalledWith(
      { errorClass: "account_deletion_fence", route: "/v1/restaurant-foods", count: 1 },
      "Account deletion fence rejected restaurant food request",
    );
    expect(JSON.stringify(loggerWarnMock.mock.calls)).not.toContain("55000");
    expect(JSON.stringify(loggerWarnMock.mock.calls)).not.toContain("account deletion is in progress");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps an ordinary account limiter failure generic without classifying it as a deletion fence", async () => {
    verifyBearerTokenMock.mockResolvedValue({ id: "user-123", email: "test@example.com" });
    checkRateLimitMock.mockRejectedValueOnce(new Error("limiter unavailable"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { default: router } = await import("../routes/restaurantFoods.js");
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app).get("/v1/restaurant-foods?query=burger");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: "Restaurant search is temporarily unavailable." });
    expect(loggerWarnMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});