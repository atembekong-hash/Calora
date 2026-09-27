import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const {
  openAiCreate,
  verifyBearerToken,
  checkRateLimit,
  clientQuery,
  poolQuery,
  poolConnect,
  resolveCoachV2User,
  getCoachV2Settings,
  setCoachV2Settings,
  getCoachV2Conversation,
  clearCoachV2Conversation,
  startCoachV2Turn,
  completeCoachV2Turn,
  buildCoachV2Snapshot,
} = vi.hoisted(() => ({
  openAiCreate: vi.fn(),
  verifyBearerToken: vi.fn(),
  checkRateLimit: vi.fn(),
  clientQuery: vi.fn(),
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  resolveCoachV2User: vi.fn(),
  getCoachV2Settings: vi.fn(),
  setCoachV2Settings: vi.fn(),
  getCoachV2Conversation: vi.fn(),
  clearCoachV2Conversation: vi.fn(),
  startCoachV2Turn: vi.fn(),
  completeCoachV2Turn: vi.fn(),
  buildCoachV2Snapshot: vi.fn(),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: openAiCreate } } },
}));

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock("@workspace/db", () => ({
  pool: {
    connect: () => poolConnect(),
    query: (...args: unknown[]) => poolQuery(...args),
  },
}));

vi.mock("../lib/coach-v2-data.js", () => ({
  resolveCoachV2User: (...args: unknown[]) => resolveCoachV2User(...args),
  getCoachV2Settings: (...args: unknown[]) => getCoachV2Settings(...args),
  setCoachV2Settings: (...args: unknown[]) => setCoachV2Settings(...args),
  getCoachV2Conversation: (...args: unknown[]) =>
    getCoachV2Conversation(...args),
  clearCoachV2Conversation: (...args: unknown[]) =>
    clearCoachV2Conversation(...args),
  startCoachV2Turn: (...args: unknown[]) => startCoachV2Turn(...args),
  completeCoachV2Turn: (...args: unknown[]) => completeCoachV2Turn(...args),
  buildCoachV2Snapshot: (...args: unknown[]) => buildCoachV2Snapshot(...args),
}));

vi.mock("../lib/account-deletion-state.js", () => ({
  assertAccountWritable: vi.fn(),
  classifyAccountDeletionError: () => false,
  accountDeletionFenceSignal: () => ({}),
}));
vi.mock("../lib/logger.js", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import coachV2Router, { buildCoachV2Messages } from "../routes/coachV2.js";

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use(coachV2Router);
  return instance;
}

describe("clean-room Coach V2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolConnect.mockResolvedValue({ query: clientQuery, release: vi.fn() });
    verifyBearerToken.mockResolvedValue(null);
    checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    resolveCoachV2User.mockResolvedValue("internal-user-id");
    getCoachV2Settings.mockResolvedValue({ personalizationEnabled: true });
    getCoachV2Conversation.mockResolvedValue([]);
    setCoachV2Settings.mockResolvedValue({ personalizationEnabled: false });
    clearCoachV2Conversation.mockResolvedValue(undefined);
    startCoachV2Turn.mockResolvedValue({
      conversationId: "conversation-id",
      turnId: "turn-id",
      history: [{ role: "user", content: "How is my day?" }],
    });
    completeCoachV2Turn.mockResolvedValue(true);
    buildCoachV2Snapshot.mockResolvedValue({
      profile: {
        goal: "maintain",
        activityLevel: "moderate",
        dietPreference: "Everything",
        calorieTarget: 2000,
      },
      today: { calories: 640, proteinG: 45, carbsG: 72, fatG: 19, entries: 2 },
      recentDaysLogged: 3,
      latestWeightKg: 70,
    });
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: "You have 640 kcal logged today." } }],
    });
  });

  it("serves an ephemeral general Coach reply to a guest without data persistence", async () => {
    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .send({ message: "How can I plan dinner?" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      conversationMode: "guest",
      persisted: false,
    });
    expect(resolveCoachV2User).not.toHaveBeenCalled();
    expect(startCoachV2Turn).not.toHaveBeenCalled();
    expect(buildCoachV2Snapshot).not.toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("coach-v2:guest:"),
      12,
      3600,
      expect.objectContaining({ failClosed: true }),
    );
  });

  it("uses only the server-built snapshot and persists signed-in conversation turns", async () => {
    verifyBearerToken.mockResolvedValue({
      id: "external-user",
      email: "person@example.com",
    });

    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .set("Authorization", "Bearer valid")
      .send({ message: "How is my day?" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      conversationMode: "account",
      persisted: true,
    });
    expect(resolveCoachV2User).toHaveBeenCalledWith(
      "external-user",
      "person@example.com",
    );
    expect(buildCoachV2Snapshot).toHaveBeenCalledWith("internal-user-id");
    expect(completeCoachV2Turn).toHaveBeenCalledWith(
      "conversation-id",
      "turn-id",
      "You have 640 kcal logged today.",
    );
    const providerInput = openAiCreate.mock.calls[0]?.[0];
    expect(JSON.stringify(providerInput)).toContain("SERVER_OWNED_SNAPSHOT");
    expect(JSON.stringify(providerInput)).not.toContain("person@example.com");
  });

  it("honors the signed-in personalization setting by withholding the snapshot", async () => {
    verifyBearerToken.mockResolvedValue({ id: "external-user", email: null });
    getCoachV2Settings.mockResolvedValue({ personalizationEnabled: false });

    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .set("Authorization", "Bearer valid")
      .send({ message: "What did I log?" });

    expect(response.status).toBe(200);
    expect(buildCoachV2Snapshot).not.toHaveBeenCalled();
    expect(JSON.stringify(openAiCreate.mock.calls[0]?.[0])).toContain(
      "No signed-in app snapshot is available",
    );
  });

  it("rejects malformed requests before authentication, rate-limit, or provider work", async () => {
    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .send({ message: " " });

    expect(response.status).toBe(400);
    expect(verifyBearerToken).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it("reads and clears only the authenticated account conversation", async () => {
    verifyBearerToken.mockResolvedValue({ id: "external-user", email: null });
    getCoachV2Conversation.mockResolvedValue([
      {
        id: "turn:user",
        role: "user",
        content: "Hello",
        createdAt: new Date().toISOString(),
      },
    ]);

    const history = await request(app())
      .get("/v1/coach/v2/conversation")
      .set("Authorization", "Bearer valid");
    const cleared = await request(app())
      .delete("/v1/coach/v2/conversation")
      .set("Authorization", "Bearer valid");

    expect(history.status).toBe(200);
    expect(history.body.turns).toHaveLength(1);
    expect(cleared.status).toBe(204);
    expect(clearCoachV2Conversation).toHaveBeenCalledWith("internal-user-id");
  });

  it("documents a bounded system instruction that rejects invented app data", () => {
    const messages = buildCoachV2Messages({
      history: [{ role: "user", content: "hello" }],
      snapshot: null,
    });
    expect(messages[0]?.content).toContain(
      "Do not invent meals, targets, nutrients, hydration, plans, or trends.",
    );
    expect(messages[0]?.content).toContain(
      "No signed-in app snapshot is available",
    );
  });
});
