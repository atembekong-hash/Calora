import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const apiSpec = readFileSync(resolve(root, "lib/api-spec/openapi.yaml"), "utf8");
const generatedClient = readFileSync(resolve(root, "lib/api-client-react/src/generated/api.ts"), "utf8");
const generatedZod = readFileSync(resolve(root, "lib/api-zod/src/generated/api.ts"), "utf8");
const mobileScan = readFileSync(resolve(root, "artifacts/calora/app/(tabs)/scan.tsx"), "utf8");
const mobileRecipes = readFileSync(resolve(root, "artifacts/calora/app/(tabs)/recipes.tsx"), "utf8");
const mobileSources = [
  resolve(root, "artifacts/calora/app/(tabs)/index.tsx"),
  resolve(root, "artifacts/calora/app/(tabs)/planner.tsx"),
  resolve(root, "artifacts/calora/app/(tabs)/recipes.tsx"),
  resolve(root, "artifacts/calora/app/(tabs)/scan.tsx"),
  resolve(root, "artifacts/calora/app/coach.tsx"),
  resolve(root, "artifacts/calora/app/restaurants.tsx"),
  resolve(root, "artifacts/calora/app/saved-recipes.tsx"),
  resolve(root, "artifacts/calora/components/CoachFactContextConsentPanel.tsx"),
  resolve(root, "artifacts/calora/components/ReferralActivator.tsx"),
  resolve(root, "artifacts/calora/components/ReferralCard.tsx"),
  resolve(root, "artifacts/calora/lib/diarySync.ts"),
  resolve(root, "artifacts/calora/lib/intelligence/coachFactActivationCoordinator.ts"),
  resolve(root, "artifacts/calora/lib/intelligence/coachFactContextClient.ts"),
].map((file) => readFileSync(file, "utf8")).join("\n");
const serverRoutes = readdirSync(resolve(root, "artifacts/api-server/src/routes"))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => readFileSync(resolve(root, "artifacts/api-server/src/routes", file), "utf8"))
  .join("\n");

describe("released mobile API compatibility contract", () => {
  it("keeps capture approval aligned across OpenAPI, generated client, and mobile review flow", () => {
    expect(apiSpec).toContain("/v1/capture/{sessionId}/approve:");
    expect(apiSpec).toContain("operationId: approveCapture");
    expect(generatedClient).toContain("getApproveCaptureUrl");
    expect(generatedClient).toContain("/api/v1/capture/${sessionId}/approve");
    expect(mobileScan).toContain("approveCapture(accepted.captureSessionId)");
  });

  it("keeps open-source and Premium recipe pagination fields in every contract layer", () => {
    expect(mobileRecipes).toContain("data.nextOffset");
    expect(apiSpec).toMatch(/RecipeList:[\s\S]*?nextOffset:/);
    expect(apiSpec).toMatch(/RecipeList:[\s\S]*?terminalReason:/);
    expect(apiSpec).toMatch(/PremiumRecipeList:[\s\S]*?nextOffset:/);
    expect(apiSpec).toMatch(/PremiumRecipeList:[\s\S]*?terminalReason:/);
    expect(generatedZod).toContain('"nextOffset": zod.number().int().nullish()');
    expect(generatedZod).toContain('"terminalReason": zod.string().nullish()');
  });

  it("audits every released mobile API family against a current server route", () => {
    const auditedContracts = [
      ["listRecipes", "/v1/recipes"],
      ["getRecipe", "/v1/recipes/:recipeId"],
      ["listPremiumRecipes", "/v1/premium-recipes"],
      ["getPremiumRecipe", "/v1/premium-recipes/:sourceId"],
      ["useListRestaurantFoods", "/v1/restaurant-foods"],
      ["useGetRestaurantFood", "/v1/restaurant-foods/:sourceId"],
      ["analyzeCapture", "/v1/capture/analyze"],
      ["approveCapture", "/v1/capture/:sessionId/approve"],
      ["generatePlanner", "/v1/planner/generate"],
      ["respondCoachFactContext", "/v1/coach/fact-context/respond"],
      ["getCoachFactContextConsent", "/v1/coach/fact-context/consent"],
      ["syncOutbox", "/v1/sync"],
      ["getReferral", "/v1/referral"],
      ["redeemReferral", "/v1/referral/redeem"],
      ["activateReferral", "/v1/referral/activate"],
    ] as const;

    for (const [clientCall, route] of auditedContracts) {
      expect(mobileSources, `${clientCall} is not consumed by the released mobile source`).toContain(clientCall);
      expect(serverRoutes, `${route} is not implemented by the current API`).toContain(route);
    }
  });
});