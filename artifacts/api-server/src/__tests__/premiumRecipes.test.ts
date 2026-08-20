import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { verifyBearerTokenMock, hasActivePremiumEntitlementMock, checkRateLimitMock } = vi.hoisted(() => ({
  verifyBearerTokenMock: vi.fn(),
  hasActivePremiumEntitlementMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: verifyBearerTokenMock,
}));

vi.mock("../lib/revenuecat.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/revenuecat.js")>(),
  hasActivePremiumEntitlement: hasActivePremiumEntitlementMock,
}));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: checkRateLimitMock,
}));

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  delete process.env.PREMIUM_RECIPE_PROVIDER_URL;
  delete process.env.PREMIUM_RECIPE_PROVIDER_NAME;
  delete process.env.PREMIUM_RECIPE_PROVIDER_API_KEY;
  delete process.env.PREMIUM_RECIPE_ACCESS_MODE;
  delete process.env.FATSECRET_GATEWAY_URL;
  delete process.env.FATSECRET_GATEWAY_SECRET;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  delete process.env.FATSECRET_CLIENT_ID;
  delete process.env.FATSECRET_CLIENT_SECRET;
  vi.unstubAllGlobals();
  vi.resetModules();
});

beforeEach(() => {
  delete process.env.PREMIUM_RECIPE_PROVIDER_URL;
  delete process.env.PREMIUM_RECIPE_PROVIDER_NAME;
  delete process.env.PREMIUM_RECIPE_PROVIDER_API_KEY;
  delete process.env.PREMIUM_RECIPE_ACCESS_MODE;
  delete process.env.FATSECRET_GATEWAY_URL;
  delete process.env.FATSECRET_GATEWAY_SECRET;
  delete process.env.FATSECRET_CLIENT_ID;
  delete process.env.FATSECRET_CLIENT_SECRET;
  verifyBearerTokenMock.mockResolvedValue({ id: "premium-user", email: "premium@example.com" });
  hasActivePremiumEntitlementMock.mockResolvedValue(true);
  checkRateLimitMock.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
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
  it("rejects anonymous requests before entitlement, quota, or provider work", async () => {
    verifyBearerTokenMock.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider("https://provider.example");

    const res = await request(app).get("/v1/premium-recipes");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Sign in to access Premium recipes." });
    expect(hasActivePremiumEntitlementMock).not.toHaveBeenCalled();
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a signed-in account without a current Premium entitlement before provider work", async () => {
    hasActivePremiumEntitlementMock.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider("https://provider.example");

    const res = await request(app).get("/v1/premium-recipes/premium%3AProvider%3A42");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Premium access is not available for this account." });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

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

  it("does not reach the provider when RevenueCat entitlement verification fails", async () => {
    hasActivePremiumEntitlementMock.mockRejectedValue(new Error("RevenueCat unavailable"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider("https://provider.example");

    const res = await request(app).get("/v1/premium-recipes");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: "Premium recipes are temporarily unavailable. Please try again shortly." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies independent account and IP limits after entitlement verification", async () => {
    checkRateLimitMock
      .mockResolvedValueOnce({ allowed: true, retryAfterSecs: 0 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSecs: 23 });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider("https://provider.example");

    const res = await request(app).get("/v1/premium-recipes");

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBe("23");
    expect(checkRateLimitMock).toHaveBeenCalledWith("premium-recipes:user:premium-user", 60, 60 * 60);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      expect.stringMatching(/^premium-recipes:ip:/),
      120,
      60 * 60,
      { failClosed: true },
    );
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("uses the configured FatSecret gateway before direct credentials", async () => {
    process.env.FATSECRET_CLIENT_ID = "direct-client-id";
    process.env.FATSECRET_CLIENT_SECRET = "direct-client-secret";
    process.env.FATSECRET_GATEWAY_URL = "https://gateway.example";
    process.env.FATSECRET_GATEWAY_SECRET = "gateway-shared-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        recipes: {
          total_results: "1",
          recipe: [{ recipe_id: "99", recipe_name: "Gateway bowl", recipe_url: "https://foods.fatsecret.com/recipes/99-gateway-bowl/Default.aspx" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes?query=bowl&limit=10&offset=20");
    expect(res.status).toBe(200);
    expect(res.body.recipes[0]).toMatchObject({ id: "premium:FatSecret:99", name: "Gateway bowl" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://gateway.example/fatsecret/recipes/search");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ "x-calora-gateway-secret": "gateway-shared-secret" }),
      body: JSON.stringify({ query: "bowl", limit: 10, offset: 20 }),
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("oauth.fatsecret.com");
  });

  it("keeps the direct FatSecret transport available when no gateway URL is configured", async () => {
    process.env.FATSECRET_CLIENT_ID = "test-id";
    process.env.FATSECRET_CLIENT_SECRET = "test-secret";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "token", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ recipes: { total_results: "0", recipe: [] } }) });
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes?query=bowl");
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("oauth.fatsecret.com");
  });

  it("uses the gateway recipe-detail translation and keeps provider failures user-safe", async () => {
    process.env.FATSECRET_GATEWAY_URL = "https://gateway.example";
    process.env.FATSECRET_GATEWAY_SECRET = "gateway-shared-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: { code: 21, message: "FatSecret provider rejected the request." } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes/premium%3AFatSecret%3A99");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ message: "Premium recipes are not enabled for this provider account." });
    expect(JSON.stringify(res.body)).not.toContain("provider rejected");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://gateway.example/fatsecret/recipes/detail");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ sourceId: "premium:FatSecret:99" }));
  });

  it("does not send a shared secret to an insecure gateway URL in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.FATSECRET_GATEWAY_URL = "http://gateway.example";
    process.env.FATSECRET_GATEWAY_SECRET = "gateway-shared-secret";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await appWithProvider();
    const res = await request(app).get("/v1/premium-recipes?query=bowl");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "unavailable", recipes: [] });
    expect(fetchMock).not.toHaveBeenCalled();
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