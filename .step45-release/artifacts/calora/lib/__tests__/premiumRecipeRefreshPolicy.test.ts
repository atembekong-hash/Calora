import { describe, expect, it } from "vitest";
import { PREMIUM_RECIPE_REFRESH_POLICY } from "../premiumRecipeRefreshPolicy";

describe("PREMIUM_RECIPE_REFRESH_POLICY", () => {
  it("revalidates on section mount without interrupting active browsing", () => {
    expect(PREMIUM_RECIPE_REFRESH_POLICY).toMatchObject({
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    });
    expect(PREMIUM_RECIPE_REFRESH_POLICY).not.toHaveProperty("refetchInterval");
  });
});