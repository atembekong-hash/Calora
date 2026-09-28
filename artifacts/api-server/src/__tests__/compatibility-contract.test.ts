import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const apiSpec = readFileSync(resolve(root, "lib/api-spec/openapi.yaml"), "utf8");
const generatedClient = readFileSync(resolve(root, "lib/api-client-react/src/generated/api.ts"), "utf8");
const generatedZod = readFileSync(resolve(root, "lib/api-zod/src/generated/api.ts"), "utf8");
const mobileScan = readFileSync(resolve(root, "artifacts/calora/app/(tabs)/scan.tsx"), "utf8");
const captureApprovalSync = readFileSync(
  resolve(root, "artifacts/calora/lib/captureApprovalSync.ts"),
  "utf8",
);
const captureRequest = readFileSync(
  resolve(root, "artifacts/calora/lib/captureRequest.ts"),
  "utf8",
);
const mobileRecipes = readFileSync(resolve(root, "artifacts/calora/app/(tabs)/recipes.tsx"), "utf8");
const mobileCoach = readFileSync(resolve(root, "artifacts/calora/app/coach.tsx"), "utf8");
const referralActivator = readFileSync(
  resolve(root, "artifacts/calora/components/ReferralActivator.tsx"),
  "utf8",
);
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
  resolve(root, "artifacts/calora/lib/captureRequest.ts"),
  resolve(root, "artifacts/calora/lib/captureApprovalSync.ts"),
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
    expect(mobileScan).toContain("syncCaptureApprovals");
    expect(captureApprovalSync).toContain("approveCapture(sessionId, { headers:");
    expect(captureApprovalSync).toContain("setCaptureApprovalAccountScope");
  });

  it("keeps capture analysis bound to the authenticated Scan transport helper", () => {
    expect(mobileScan).toContain("requestAuthenticatedCaptureAnalysis");
    expect(mobileScan).toContain("captureAccountId");
    expect(captureRequest).toContain("createCaptureRequestOptions(accountId, signal)");
    expect(captureRequest).toContain("supabase.auth.getSession()");
    expect(captureRequest).toContain("authIdentityGuard: assertIdentity");
    expect(captureRequest).toContain("authTokenGetter: getToken");
    expect(captureRequest).toContain("authTokenRefresher: refreshToken");
    expect(captureRequest).toContain("return analyzeCapture(");
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
      ["sendCoachV2Message", "/v1/coach/v2/chat"],
      ["listCoachV2Conversations", "/v1/coach/v2/conversations"],
      ["startNewCoachV2Conversation", "/v1/coach/v2/conversation/new"],
      ["openCoachV2Conversation", "/v1/coach/v2/conversation/:conversationId/open"],
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

  it("keeps durable profile synchronization aligned across the contract layers", () => {
    expect(apiSpec).toContain("/v1/profile:");
    expect(apiSpec).toContain("operationId: getProfile");
    expect(apiSpec).toContain("operationId: updateProfile");
    expect(generatedClient).toContain("getProfile");
    expect(generatedClient).toContain("updateProfile");
    expect(generatedClient).toContain("/api/v1/profile");
    expect(generatedZod).toContain("GetProfileResponse");
    expect(generatedZod).toContain("UpdateProfileBody");
    expect(generatedClient).not.toContain("listWeights");
    expect(generatedClient).not.toContain("createWeight");
    expect(generatedZod).not.toContain("ListWeightsQueryParams");
    expect(generatedZod).not.toContain("CreateWeightBody");
  });

  it("publishes only the implemented account-deletion privacy operation", () => {
    expect(apiSpec).toContain("/v1/account:");
    expect(apiSpec).toContain("operationId: deleteAccount");
    expect(generatedClient).toContain("getDeleteAccountUrl");
    expect(generatedClient).toContain("`/api/v1/account`");
    expect(generatedClient).not.toContain("requestDataExport");
    expect(generatedClient).not.toContain("requestDataDeletion");
    expect(apiSpec).not.toContain("/v1/privacy/export:");
    expect(apiSpec).not.toContain("/v1/privacy/delete:");
  });

  it("aligns referral docs and client attempts with server-verified capture proof", () => {
    expect(apiSpec).toContain("capture-backed meal whose server-issued capture session is verified");
    expect(apiSpec).toContain("cannot supply or override proof.");
    expect(generatedClient).toContain("verified capture-backed meal");
    expect(referralActivator).toContain("log.captureSessionId");
    expect(referralActivator).toContain("SERVER_CAPTURE_SESSION_ID.test");
  });

  it("aligns clean-room Coach with the documented server-owned contract", () => {
    expect(apiSpec).toContain("/v1/coach/v2/chat:");
    expect(apiSpec).toContain("operationId: sendCoachV2Message");
    expect(generatedClient).toContain("sendCoachV2Message");
    expect(generatedZod).toContain("SendCoachV2MessageBody");
    expect(mobileCoach).toContain("sendCoachV2Message");
    expect(mobileCoach).toContain("getCoachV2Conversation");
    expect(apiSpec).toContain("operationId: listCoachV2Conversations");
    expect(apiSpec).toContain("operationId: startNewCoachV2Conversation");
    expect(apiSpec).toContain("operationId: openCoachV2Conversation");
    expect(generatedClient).toContain("listCoachV2Conversations");
    expect(generatedClient).toContain("startNewCoachV2Conversation");
    expect(generatedClient).toContain("openCoachV2Conversation");
    expect(generatedZod).toContain("ListCoachV2ConversationsResponse");
    expect(mobileCoach).toContain("Saved chats");
    expect(mobileCoach).not.toContain("useCoachSendAdapter");
    expect(mobileCoach).not.toContain("CoachFactContextConsentPanel");
    expect(serverRoutes).toContain("/v1/coach/v2/chat");
  });
});
