import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { isProgramEligible } from "@workspace/api-zod/planner-program-eligibility";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

const verifyBearerToken = vi.fn();
vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

const checkRateLimit = vi.fn();
vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));
const loggerWarn = vi.hoisted(() => vi.fn());
vi.mock("../lib/logger.js", () => ({
  logger: { warn: loggerWarn, error: vi.fn() },
}));

import { openai } from "@workspace/integrations-openai-ai-server";
import plannerRouter from "../routes/planner.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(plannerRouter);
  return app;
}

function validBody() {
  return {
    weekStart: "2026-08-17",
    profile: { goal: "maintain", activity: "low", diet: "Everything", calorieTarget: 2000 },
  };
}

describe("POST /v1/planner/generate", () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    verifyBearerToken.mockResolvedValue({ id: "user-a", email: "a@example.com" });
    checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
  });

  it("rejects unauthenticated callers without touching the model", async () => {
    verifyBearerToken.mockResolvedValueOnce(null);
    const response = await request(app).post("/v1/planner/generate").send(validBody());

    expect(response.status).toBe(401);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-account rate limit is exceeded", async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSecs: 300 });
    const response = await request(app).post("/v1/planner/generate").send(validBody());

    expect(response.status).toBe(429);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("returns a generic response and redacted signal for a planner deletion fence", async () => {
    checkRateLimit.mockRejectedValueOnce({
      code: "55000",
      message: "account deletion is in progress",
      detail: "raw account details",
    });

    const response = await request(app).post("/v1/planner/generate").send(validBody());

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      message: "Meal-plan generation is temporarily unavailable. Please try again shortly.",
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      {
        errorClass: "account_deletion_fence",
        route: "/v1/planner/generate",
        count: 1,
        schemaVersion: "calora.account-deletion-fence-signal.v1",
      },
      "Account deletion fence rejected planner request",
    );
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain("55000");
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain("account deletion is in progress");
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("keeps an ordinary limiter failure generic without classifying it as a deletion fence", async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSecs: 30, degraded: true });

    const response = await request(app).post("/v1/planner/generate").send(validBody());

    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/temporarily unavailable/i);
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it("falls back to a starter week when the model is unavailable", async () => {
    vi.mocked(openai.chat.completions.create).mockRejectedValueOnce(new Error("provider down"));
    const response = await request(app).post("/v1/planner/generate").send(validBody());

    expect(response.status).toBe(200);
    expect(response.body.meals).toHaveLength(28);
    expect(response.body.provider).toMatch(/starter planner/i);
    expect(response.body.meals.every((meal: { imageAssetKey?: string }) => Boolean(meal.imageAssetKey))).toBe(true);
    expect(new Set(response.body.meals.map((meal: { imageAssetKey: string }) => meal.imageAssetKey)).size).toBeGreaterThan(4);
    for (const role of ["Breakfast", "Lunch", "Dinner", "Snack"]) {
      const roleMeals = response.body.meals.filter((meal: { meal: string }) => meal.meal === role);
      expect(new Set(roleMeals.map((meal: { imageAssetKey: string }) => meal.imageAssetKey)).size).toBeGreaterThan(1);
      expect(roleMeals.every((meal: { imageAssetKey?: string }) => Boolean(meal.imageAssetKey))).toBe(true);
    }
  });

  it("filters model selections and fallback meals to Plant-Based Week", async () => {
    const days = Array.from({ length: 7 }, () => ({
      breakfast: "avo-toast-egg",
      lunch: "harvest-salad",
      dinner: "chicken-rice",
      snack: "apple-almond",
    }));
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ days }) } }],
    } as never);

    const response = await request(app).post("/v1/planner/generate").send({
      ...validBody(),
      planType: "plant-based-week",
    });

    expect(response.status).toBe(200);
    expect(response.body.meals.every((meal: { id: string }) =>
      ["berry-oats", "egg-toast", "yogurt-parfait", "smoothie-bowl", "banana-pancakes", "chia-pudding", "lentil-soup", "greek-salad", "chickpea-bowl", "stir-fry", "med-pasta", "apple-almond", "edamame", "trail-mix", "hummus-veggies", "banana-pb"].some((id) => meal.id.includes(`-${id}-`)),
    )).toBe(true);
  });

  it("limits AI selections to the selected Program eligibility contract", async () => {
    const days = Array.from({ length: 7 }, () => ({
      breakfast: "berry-oats",
      lunch: "harvest-salad",
      dinner: "spaghetti-bol",
      snack: "hummus-veggies",
    }));
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ days }) } }],
    } as never);

    const response = await request(app).post("/v1/planner/generate").send({
      ...validBody(),
      planType: "high-protein-power",
    });

    expect(response.status).toBe(200);
    expect(response.body.meals.every((meal: {
      id: string; meal: "Breakfast" | "Lunch" | "Dinner" | "Snack"; name: string;
      calories: number; proteinG: number; carbsG: number; fatG: number; prepMinutes: number; ingredients: string[];
    }) => isProgramEligible("high-protein-power", meal))).toBe(true);
  });

  it("keeps Quick & Easy fallback meals at or below 20 minutes", async () => {
    vi.mocked(openai.chat.completions.create).mockRejectedValueOnce(new Error("provider down"));

    const response = await request(app).post("/v1/planner/generate").send({
      ...validBody(),
      planType: "quick-and-easy",
    });

    expect(response.status).toBe(200);
    expect(response.body.provider).toMatch(/starter planner/i);
    expect(response.body.meals.every((meal: { prepMinutes: number }) => meal.prepMinutes <= 20)).toBe(true);
  });
});
