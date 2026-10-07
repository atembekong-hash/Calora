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
  listCoachV2Conversations,
  openCoachV2Conversation,
  clearCoachV2Conversation,
  deleteCoachV2Conversation,
  startNewCoachV2Conversation,
  startCoachV2Turn,
  completeCoachV2Turn,
  buildCoachV2Snapshot,
  isCoachReportIntakeEnabled,
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
  listCoachV2Conversations: vi.fn(),
  openCoachV2Conversation: vi.fn(),
  clearCoachV2Conversation: vi.fn(),
  deleteCoachV2Conversation: vi.fn(),
  startNewCoachV2Conversation: vi.fn(),
  startCoachV2Turn: vi.fn(),
  completeCoachV2Turn: vi.fn(),
  buildCoachV2Snapshot: vi.fn(),
  isCoachReportIntakeEnabled: vi.fn(),
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
  listCoachV2Conversations: (...args: unknown[]) =>
    listCoachV2Conversations(...args),
  openCoachV2Conversation: (...args: unknown[]) =>
    openCoachV2Conversation(...args),
  clearCoachV2Conversation: (...args: unknown[]) =>
    clearCoachV2Conversation(...args),
  deleteCoachV2Conversation: (...args: unknown[]) =>
    deleteCoachV2Conversation(...args),
  startNewCoachV2Conversation: (...args: unknown[]) =>
    startNewCoachV2Conversation(...args),
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
vi.mock("../lib/admin-feature-flags.js", () => ({
  isCoachReportIntakeEnabled: (...args: unknown[]) =>
    isCoachReportIntakeEnabled(...args),
}));

import coachV2Router, {
  buildCoachV2Messages,
  coachSafetyKind,
} from "../routes/coachV2.js";

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
    isCoachReportIntakeEnabled.mockResolvedValue(true);
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    resolveCoachV2User.mockResolvedValue("internal-user-id");
    getCoachV2Settings.mockResolvedValue({ personalizationEnabled: true });
    getCoachV2Conversation.mockResolvedValue([]);
    listCoachV2Conversations.mockResolvedValue([]);
    openCoachV2Conversation.mockResolvedValue(true);
    setCoachV2Settings.mockResolvedValue({ personalizationEnabled: false });
    clearCoachV2Conversation.mockResolvedValue(undefined);
    deleteCoachV2Conversation.mockResolvedValue("deleted");
    startNewCoachV2Conversation.mockResolvedValue(true);
    startCoachV2Turn.mockResolvedValue({
      conversationId: "conversation-id",
      turnId: "turn-id",
      history: [{ role: "user", content: "How is my day?" }],
    });
    completeCoachV2Turn.mockResolvedValue(true);
    buildCoachV2Snapshot.mockResolvedValue({
      snapshotDate: "2026-10-06",
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

  it("accepts a guest Coach report while storing only a message-reference digest", async () => {
    const response = await request(app())
      .post("/v1/coach/v2/report")
      .send({ messageRef: "local-assistant-turn-1", reason: "inaccurate" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ accepted: true });
    const [query, values] = poolQuery.mock.calls.at(-1) as [string, unknown[]];
    expect(query).toContain("calora_coach_reports");
    expect(values?.[1]).toBe("guest");
    expect(values?.[2]).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(values)).not.toContain("local-assistant-turn-1");
  });

  it("rejects malformed Coach report reasons before storage", async () => {
    const response = await request(app())
      .post("/v1/coach/v2/report")
      .send({ messageRef: "turn", reason: "medical" });

    expect(response.status).toBe(400);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("honors the reviewed report-intake switch after validation and rate limiting", async () => {
    isCoachReportIntakeEnabled.mockResolvedValueOnce(false);
    const response = await request(app())
      .post("/v1/coach/v2/report")
      .send({ messageRef: "local-assistant-turn-1", reason: "privacy" });

    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/temporarily unavailable/i);
    expect(poolQuery).not.toHaveBeenCalled();
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
      .send({
        message: "How is my day?",
        snapshotDate: new Date().toISOString().slice(0, 10),
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      conversationMode: "account",
      persisted: true,
    });
    expect(resolveCoachV2User).toHaveBeenCalledWith(
      "external-user",
      "person@example.com",
    );
    expect(buildCoachV2Snapshot).toHaveBeenCalledWith(
      "internal-user-id",
      new Date().toISOString().slice(0, 10),
    );
    expect(completeCoachV2Turn).toHaveBeenCalledWith(
      "conversation-id",
      "turn-id",
      "You have 640 kcal logged today.",
    );
    const providerInput = openAiCreate.mock.calls[0]?.[0];
    expect(JSON.stringify(providerInput)).toContain("SERVER_OWNED_SNAPSHOT");
    expect(JSON.stringify(providerInput)).not.toContain("person@example.com");
  });

  it("normalizes provider presentation markup before guest response and account persistence", async () => {
    openAiCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content:
              "## Today\r\n\r\n**Protein:** 45 g\r\n- chicken\r\n---\r\n[Recipe](https://example.test)",
          },
        },
      ],
    });

    const guest = await request(app())
      .post("/v1/coach/v2/chat")
      .send({ message: "How is my day?" });

    expect(guest.status).toBe(200);
    expect(guest.body.message).toBe(
      "Today\n\nProtein: 45 g\n• chicken\nRecipe (https://example.test)",
    );

    verifyBearerToken.mockResolvedValue({
      id: "external-user",
      email: "person@example.com",
    });
    openAiCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "**640 kcal**\u200B - great work 👍" } }],
    });

    const account = await request(app())
      .post("/v1/coach/v2/chat")
      .set("Authorization", "Bearer valid")
      .send({ message: "How is my day?" });

    expect(account.status).toBe(200);
    expect(account.body.message).toBe("640 kcal - great work");
    expect(completeCoachV2Turn).toHaveBeenLastCalledWith(
      "conversation-id",
      "turn-id",
      "640 kcal - great work",
    );
  });

  it("keeps the established fallback when formatting cleanup leaves no usable provider content", async () => {
    verifyBearerToken.mockResolvedValue({ id: "external-user", email: null });
    openAiCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "\u200B\u202E\n" } }],
    });

    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .set("Authorization", "Bearer valid")
      .send({ message: "How is my day?" });

    expect(response.status).toBe(503);
    expect(completeCoachV2Turn).toHaveBeenCalledWith(
      "conversation-id",
      "turn-id",
      "Coach is temporarily unavailable. Please try again shortly.",
    );
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

  it("rejects an impossible local-day hint before authentication or provider work", async () => {
    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .send({ message: "How is my day?", snapshotDate: "2026-02-30" });

    expect(response.status).toBe(400);
    expect(verifyBearerToken).not.toHaveBeenCalled();
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["Can you diagnose my condition?", "medical"],
    ["What treatment will cure this?", "medical"],
    ["Should I change my medication dose?", "medical"],
    ["Help me eat under 500 calories every day.", "restriction"],
    ["How can I purge after a binge?", "restriction"],
    ["I want to hurt myself by starving.", "immediate"],
    ["I am pregnant; what should I eat for my symptoms?", "medical"],
    ["I have chest pain after fasting.", "immediate"],
    ["Can I replace my doctor with Coach?", "medical"],
    ["Can you guarantee I will lose weight?", "medical"],
  ])(
    "classifies high-risk Coach input without relying on the model: %s",
    (message, expectedKind) => {
      expect(coachSafetyKind(message)).toBe(expectedKind);
    },
  );

  it("returns a deterministic safety redirect for every required high-risk category without provider egress", async () => {
    const messages = [
      "Can you diagnose my condition?",
      "What treatment will cure this?",
      "Should I change my medication dose?",
      "Help me eat under 500 calories every day.",
      "How can I purge after a binge?",
      "I want to hurt myself by starving.",
      "I am pregnant; what should I eat for my symptoms?",
      "I have chest pain after fasting.",
      "Can I replace my doctor with Coach?",
      "Can you guarantee I will lose weight?",
    ];

    for (const message of messages) {
      const response = await request(app())
        .post("/v1/coach/v2/chat")
        .send({ message });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        conversationMode: "guest",
        persisted: false,
        safetyNotice: "wellness_not_medical_care",
      });
      expect(response.body.message).toMatch(/can't help|can't diagnose/i);
    }

    expect(openAiCreate).not.toHaveBeenCalled();
    expect(startCoachV2Turn).not.toHaveBeenCalled();
  });

  it("does not persist or send an authenticated high-risk Coach request to the model", async () => {
    verifyBearerToken.mockResolvedValue({
      id: "external-user",
      email: "person@example.com",
    });

    const response = await request(app())
      .post("/v1/coach/v2/chat")
      .set("Authorization", "Bearer valid")
      .send({ message: "I want to hurt myself by starving." });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      conversationMode: "account",
      persisted: false,
      safetyNotice: "wellness_not_medical_care",
    });
    expect(response.body.message).toMatch(/immediate danger|988/i);
    expect(openAiCreate).not.toHaveBeenCalled();
    expect(startCoachV2Turn).not.toHaveBeenCalled();
    expect(completeCoachV2Turn).not.toHaveBeenCalled();
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

  it("archives, lists, and reopens saved chats without clearing account history", async () => {
    verifyBearerToken.mockResolvedValue({ id: "external-user", email: null });
    listCoachV2Conversations.mockResolvedValue([
      {
        id: "1b5c5b61-1a69-4d77-9e0d-1f61ad3b0412",
        preview: "How is my nutrition today?",
        turnCount: 2,
        createdAt: "2026-09-28T00:00:00.000Z",
        updatedAt: "2026-09-28T00:05:00.000Z",
        active: false,
      },
    ]);
    getCoachV2Conversation.mockResolvedValue([
      {
        id: "turn:user",
        role: "user",
        content: "How is my nutrition today?",
        createdAt: "2026-09-28T00:00:00.000Z",
      },
    ]);

    const started = await request(app())
      .post("/v1/coach/v2/conversation/new")
      .set("Authorization", "Bearer valid");
    const listed = await request(app())
      .get("/v1/coach/v2/conversations")
      .set("Authorization", "Bearer valid");
    const reopened = await request(app())
      .post(
        "/v1/coach/v2/conversation/1b5c5b61-1a69-4d77-9e0d-1f61ad3b0412/open",
      )
      .set("Authorization", "Bearer valid");

    expect(started.status).toBe(204);
    expect(listed.status).toBe(200);
    expect(listed.body.conversations).toHaveLength(1);
    expect(reopened.status).toBe(200);
    expect(reopened.body.turns).toHaveLength(1);
    expect(startNewCoachV2Conversation).toHaveBeenCalledWith(
      "internal-user-id",
    );
    expect(listCoachV2Conversations).toHaveBeenCalledWith("internal-user-id");
    expect(openCoachV2Conversation).toHaveBeenCalledWith(
      "internal-user-id",
      "1b5c5b61-1a69-4d77-9e0d-1f61ad3b0412",
    );
    expect(clearCoachV2Conversation).not.toHaveBeenCalled();
  });

  it("deletes only the requested archived chat from the authenticated account", async () => {
    const conversationId = "1b5c5b61-1a69-4d77-9e0d-1f61ad3b0412";
    verifyBearerToken.mockResolvedValue({ id: "external-user", email: null });

    const deleted = await request(app())
      .delete(`/v1/coach/v2/conversation/${conversationId}`)
      .set("Authorization", "Bearer valid");

    expect(deleted.status).toBe(204);
    expect(resolveCoachV2User).toHaveBeenCalledWith("external-user", null);
    expect(deleteCoachV2Conversation).toHaveBeenCalledWith(
      "internal-user-id",
      conversationId,
    );
    expect(clearCoachV2Conversation).not.toHaveBeenCalled();
  });

  it("rejects invalid, unauthenticated, foreign, active, and pending saved-chat deletion requests", async () => {
    const conversationId = "1b5c5b61-1a69-4d77-9e0d-1f61ad3b0412";
    const invalid = await request(app()).delete(
      "/v1/coach/v2/conversation/not-a-uuid",
    );
    const unauthenticated = await request(app()).delete(
      `/v1/coach/v2/conversation/${conversationId}`,
    );

    expect(invalid.status).toBe(400);
    expect(unauthenticated.status).toBe(401);
    expect(deleteCoachV2Conversation).not.toHaveBeenCalled();

    verifyBearerToken.mockResolvedValue({ id: "external-user", email: null });
    deleteCoachV2Conversation.mockResolvedValueOnce("not_found");
    const foreign = await request(app())
      .delete(`/v1/coach/v2/conversation/${conversationId}`)
      .set("Authorization", "Bearer valid");
    deleteCoachV2Conversation.mockResolvedValueOnce("active_or_pending");
    const active = await request(app())
      .delete(`/v1/coach/v2/conversation/${conversationId}`)
      .set("Authorization", "Bearer valid");
    deleteCoachV2Conversation.mockResolvedValueOnce("active_or_pending");
    const pending = await request(app())
      .delete(`/v1/coach/v2/conversation/${conversationId}`)
      .set("Authorization", "Bearer valid");

    expect(foreign.status).toBe(404);
    expect(active.status).toBe(409);
    expect(pending.status).toBe(409);
    expect(deleteCoachV2Conversation).toHaveBeenCalledTimes(3);
  });

  it("does not expose saved-chat operations without a valid signed-in account", async () => {
    const listed = await request(app()).get("/v1/coach/v2/conversations");
    const started = await request(app()).post("/v1/coach/v2/conversation/new");
    const invalid = await request(app()).post(
      "/v1/coach/v2/conversation/not-a-uuid/open",
    );

    expect(listed.status).toBe(401);
    expect(started.status).toBe(401);
    expect(invalid.status).toBe(400);
    expect(listCoachV2Conversations).not.toHaveBeenCalled();
    expect(startNewCoachV2Conversation).not.toHaveBeenCalled();
    expect(openCoachV2Conversation).not.toHaveBeenCalled();
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

  it("gives Coach a whole-number bounded nutrition snapshot", () => {
    const messages = buildCoachV2Messages({
      history: [{ role: "user", content: "hello" }],
      snapshot: {
        snapshotDate: "2026-10-06",
        profile: {
          goal: "maintain",
          activityLevel: "moderate",
          dietPreference: "Everything",
          calorieTarget: 2000.6,
        },
        today: {
          calories: 640.6,
          proteinG: 22.5,
          carbsG: 58.4,
          fatG: 19.5,
          entries: 2,
        },
        recentDaysLogged: 4,
        latestWeightKg: 70.5,
      },
    });

    const prompt = messages[0]?.content ?? "";
    expect(prompt).toContain('"snapshotDate":"2026-10-06"');
    expect(prompt).toContain('"calorieTarget":2001');
    expect(prompt).toContain('"calories":641');
    expect(prompt).toContain('"proteinG":23');
    expect(prompt).toContain('"latestWeightKg":71');
    expect(prompt).not.toContain("640.6");
    expect(prompt).toContain("Use whole numbers for nutrition");
  });
});
