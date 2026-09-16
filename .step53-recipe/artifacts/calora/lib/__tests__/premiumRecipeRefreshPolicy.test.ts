import { describe, expect, it } from "vitest";
import { PREMIUM_RECIPE_REFRESH_POLICY } from "../premiumRecipeRefreshPolicy";

describe("PREMIUM_RECIPE_REFRESH_POLICY", () => {
  it("revalidates stale sessions on section mount without restarting a fresh Plus session", () => {
    expect(PREMIUM_RECIPE_REFRESH_POLICY).toMatchObject({
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    });
    expect(PREMIUM_RECIPE_REFRESH_POLICY).not.toHaveProperty("refetchInterval");
  });
});