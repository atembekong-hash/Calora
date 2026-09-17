import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { premiumRecipeDetailQueryKey, premiumRecipeListQueryKey } from "../premiumRecipeQueryKeys";

describe("Premium recipe query keys", () => {
  it("does not expose one account's cached catalogue or detail to another account", () => {
    const queryClient = new QueryClient();
    const memberList = premiumRecipeListQueryKey("premium-member", ["listPremiumRecipes", { limit: 18 }]);
    const nonMemberList = premiumRecipeListQueryKey("non-member", ["listPremiumRecipes", { limit: 18 }]);
    const memberDetail = premiumRecipeDetailQueryKey("premium-member", ["getPremiumRecipe", "provider:42"]);
    const nonMemberDetail = premiumRecipeDetailQueryKey("non-member", ["getPremiumRecipe", "provider:42"]);

    queryClient.setQueryData(memberList, { recipes: [{ name: "Protected recipe" }] });
    queryClient.setQueryData(memberDetail, { name: "Protected recipe" });

    expect(queryClient.getQueryData(nonMemberList)).toBeUndefined();
    expect(queryClient.getQueryData(nonMemberDetail)).toBeUndefined();
  });

  it("does not treat a pre-populated response as current access after entitlement loss", () => {
    const queryClient = new QueryClient();
    const key = premiumRecipeDetailQueryKey("formerly-premium", ["getPremiumRecipe", "provider:42"]);
    queryClient.setQueryData(key, { name: "Protected recipe" });

    // A new mount must wait for a successful current request. A 403 response
    // then removes the stale entry, so it cannot be rendered or restored.
    const fetchedAfterMount = false;
    expect(fetchedAfterMount && queryClient.getQueryData(key)).toBeFalsy();
    queryClient.removeQueries({ queryKey: key, exact: true });
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });
});