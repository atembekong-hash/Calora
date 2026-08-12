import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

import { openai } from "@workspace/integrations-openai-ai-server";
import coachRouter from "../routes/coach.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(coachRouter);
  return app;
}

function validContext() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-06T12:00:00.000Z",
    currentDate: "2026-08-06",
    dateRange: { start: "2026-07-08", end: "2026-08-06" },
    profile: null,
    dailySummaries: [],
    recentEntries: [],
    wellness: {
      waterAverageOunces: 0,
      waterLoggedDays: 0,
      moodLoggedDays: 0,
      activityLoggedDays: 0,
      weightEntries: 0,
      latestWeightKg: null,
      weightChangeKg: null,
    },
    planning: {
      plannedMealCount: 0,
      shoppingItemCount: 0,
      savedMealNames: [],
      savedRecipeCount: 0,
    },
    foodMemory: {
      acceptedCount: 0,
      repeatPatterns: [],
      verifiedShare: 0,
      estimatedShare: 0,
    },
    missingData: ["approved diary entries", "hydration check-ins"],
  };
}

function validBody(content = "What should I focus on today?") {
  return {
    context: validContext(),
    messages: [{ role: "user", content }],
    currentScreen: "progress-coach",
  };
}

describe("POST /v1/coach/respond", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects sensitive restriction and purging requests without calling the model", async () => {
    const response = await request(app)
      .post("/v1/coach/respond")
      .send(validBody("How can I starve myself and purge to lose weight quickly?"));

    expect(response.status).toBe(200);
    expect(response.body.safetyState).toBe("support_redirect");
    expect(response.body.message).toMatch(/qualified clinician|trusted person/i);
    expect(response.body.message).not.toMatch(/calorie target|purge plan|fasting schedule/i);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("validates the request before provider access", async () => {
    const response = await request(app)
      .post("/v1/coach/respond")
      .send({ messages: [{ role: "user", content: "Hello" }] });

    expect(response.status).toBe(400);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("keeps only allowlisted navigation actions from a valid model response", async () => {
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            message: "Your next step could be a simple dinner plan.",
            observations: [],
            actions: [
              {
                id: "recipes",
                label: "Browse recipes",
                kind: "navigate",
                destination: "recipes",
                confirmationRequired: true,
              },
              {
                id: "mutate",
                label: "Change my calorie target",
                kind: "prepare",
                destination: "profile",
                confirmationRequired: true,
              },
            ],
            safetyState: "normal",
            limitations: [],
            contextCoverage: {
              usedSections: ["dailySummaries"],
              missingSections: [],
            },
          }),
        },
      }],
    } as never);

    const response = await request(app)
      .post("/v1/coach/respond")
      .send(validBody());

    expect(response.status).toBe(200);
    expect(response.body.actions).toEqual([
      expect.objectContaining({
        id: "recipes",
        destination: "recipes",
        kind: "navigate",
        confirmationRequired: false,
      }),
    ]);
  });

  it("cleans formatting artifacts from all model-provided display text", async () => {
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            message: "## Today\\n\\n> ~~Focus~~ on `protein` — and hydration. <strong>Stay steady.</strong>\\n\\n---\\n\\n{{internal note}}\\u200B\\nInternal note: omit this",
            observations: [{ text: "- **Lunch** was balanced.\\n\\n\\nTODO", confidence: "medium", evidenceKeys: ["daily\\nSummaries", "[[internal]]"] }],
            actions: [{ id: "recipes", label: "Browse — recipes", kind: "navigate", destination: "recipes", confirmationRequired: false }],
            safetyState: "normal",
            limitations: ["```text\\nLimited evidence\\n```", "<placeholder>"],
            contextCoverage: { usedSections: ["daily\\nSummaries"], missingSections: ["—"] },
          }),
        },
      }],
    } as never);

    const response = await request(app).post("/v1/coach/respond").send(validBody());

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Today\n\nFocus on protein, and hydration. Stay steady.");
    expect(response.body.observations[0].text).toBe("• Lunch was balanced.");
    expect(response.body.actions[0].label).toBe("Browse, recipes");
    expect(response.body.limitations).toEqual(["Limited evidence"]);
    expect(response.body.contextCoverage.usedSections).toEqual(["daily\nSummaries"]);
    expect(response.body.contextCoverage.missingSections).toEqual([]);
    expect(JSON.stringify(response.body)).not.toMatch(/```|{{|TODO|\u200B|—|~~|`|<strong>/);
  });
});