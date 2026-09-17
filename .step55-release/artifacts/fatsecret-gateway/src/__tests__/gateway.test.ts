import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createGatewayApp, type GatewayConfig } from "../app.js";

const config: GatewayConfig = {
  clientId: "test-client",
  clientSecret: "test-secret",
  gatewaySecret: "shared-gateway-secret",
  timeoutMs: 25,
};
const auth = { "x-calora-gateway-secret": config.gatewaySecret };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function app() {
  return createGatewayApp(config);
}

function tokenResponse() {
  return { ok: true, status: 200, json: async () => ({ access_token: "provider-token", expires_in: 3600 }) };
}

describe("FatSecret gateway", () => {
  it("serves a lightweight health check without gateway credentials", async () => {
    const response = await request(app()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("rejects unauthorized operation requests before calling FatSecret", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(app()).post("/fatsecret/recipes/search").send({ query: "chicken", limit: 10, offset: 0 });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("unauthorized");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed operation payloads", async () => {
    const response = await request(app()).post("/fatsecret/foods/search").set(auth).send({ query: "burger", limit: 0, offset: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_request");
  });

  it("acquires one token and reuses it for recipe search and detail", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ recipes: { recipe: [] } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ recipe: { recipe_id: "84", recipe_name: "Chicken" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const gateway = app();
    const search = await request(gateway).post("/fatsecret/recipes/search").set(auth).send({ query: "chicken", limit: 10, offset: 20 });
    const detail = await request(gateway).post("/fatsecret/recipes/detail").set(auth).send({ sourceId: "premium:FatSecret:84" });
    expect(search.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/recipes/search/v3");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page_number=2");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/recipe/v2");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("recipe_id=84");
  });

  it("forwards branded food search and detail payloads with the existing API versions", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ foods_search: { results: { food: [] } } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ food: { food_id: "41963" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const gateway = app();
    const search = await request(gateway).post("/fatsecret/foods/search").set(auth).send({ query: "McDonald's cheeseburger", limit: 10, offset: 0 });
    const detail = await request(gateway).post("/fatsecret/foods/detail").set(auth).send({ sourceId: "fatsecret-food:41963" });
    expect(search.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/foods/search/v5");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("food_type=brand");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/food/v4");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("food_id=41963");
  });

  it("forwards provider error codes with a sanitized message", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: { code: 21, message: "Invalid IP address detected" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const response = await request(app()).post("/fatsecret/foods/search").set(auth).send({ query: "burger", limit: 10, offset: 0 });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: { code: 21, message: "FatSecret provider rejected the request." } });
  });

  it("returns a gateway timeout when FatSecret does not respond", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));
    const response = await request(app()).post("/fatsecret/recipes/search").set(auth).send({ query: "chicken", limit: 10, offset: 0 });
    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe("timeout");
  });
});