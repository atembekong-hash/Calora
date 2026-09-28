import { describe, expect, it } from "vitest";
import { PREMIUM_RECIPE_REFRESH_POLICY } from "../premiumRecipeRefreshPolicy";
import {
  PREMIUM_RECIPE_REQUEST_OPTIONS,
  PREMIUM_RECIPE_REQUEST_TIMEOUT_MS,
  isPremiumRecipeAuthenticationError,
  premiumRecipeRetryDelay,
  shouldRetryPremiumRecipeRequest,
} from "../premiumRecipeRequest";

describe("PREMIUM_RECIPE_REFRESH_POLICY", () => {
  it("revalidates on section mount without interrupting active browsing", () => {
    expect(PREMIUM_RECIPE_REFRESH_POLICY).toMatchObject({
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: shouldRetryPremiumRecipeRequest,
      retryDelay: premiumRecipeRetryDelay,
    });
    expect(PREMIUM_RECIPE_REFRESH_POLICY).not.toHaveProperty("refetchInterval");
  });

  it("uses a bounded, cache-bypassing request for account-scoped provider responses", () => {
    expect(PREMIUM_RECIPE_REQUEST_OPTIONS).toEqual({
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      timeoutMs: PREMIUM_RECIPE_REQUEST_TIMEOUT_MS,
    });
    expect(PREMIUM_RECIPE_REQUEST_TIMEOUT_MS).toBe(20_000);
  });

  it("retries only one transient Plus failure", () => {
    expect(shouldRetryPremiumRecipeRequest(0, { status: 502 })).toBe(true);
    expect(shouldRetryPremiumRecipeRequest(0, { name: "ApiRequestTimeoutError" })).toBe(true);
    expect(shouldRetryPremiumRecipeRequest(0, new TypeError("Network request failed"))).toBe(true);
    expect(shouldRetryPremiumRecipeRequest(1, { status: 502 })).toBe(false);
    expect(shouldRetryPremiumRecipeRequest(0, { status: 401 })).toBe(false);
    expect(shouldRetryPremiumRecipeRequest(0, { status: 403 })).toBe(false);
    expect(shouldRetryPremiumRecipeRequest(0, { status: 429 })).toBe(false);
    expect(shouldRetryPremiumRecipeRequest(0, { status: 400 })).toBe(false);
    expect(shouldRetryPremiumRecipeRequest(0, new TypeError('Blob responses are not supported in this runtime.'))).toBe(false);
    expect(premiumRecipeRetryDelay()).toBe(600);
  });

  it("recognizes only authentication and authorization failures as access recovery states", () => {
    expect(isPremiumRecipeAuthenticationError({ status: 401 })).toBe(true);
    expect(isPremiumRecipeAuthenticationError({ status: 403 })).toBe(true);
    expect(isPremiumRecipeAuthenticationError({ status: 429 })).toBe(false);
    expect(isPremiumRecipeAuthenticationError({ status: 502 })).toBe(false);
  });
});
