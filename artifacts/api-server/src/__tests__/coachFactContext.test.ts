import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: { chat: { completions: { create: vi.fn() } } } }));
const verifyBearerToken = vi.fn();
vi.mock("../lib/supabase-auth.js", () => ({ verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args) }));
const checkRateLimit = vi.fn();
vi.mock("../lib/rate-limit.js", () => ({ checkRateLimit: (...args: unknown[]) => checkRateLimit(...args) }));
const hasCurrentCoachFactConsent = vi.fn();
vi.mock("../lib/coach-fact-consent.js", () => ({ hasCurrentCoachFactConsent: (...args: unknown[]) => hasCurrentCoachFactConsent(...args) }));
const loggerWarn = vi.hoisted(() => vi.fn());
vi.mock("../lib/logger.js", () => ({ logger: { warn: loggerWarn, error: vi.fn() } }));
const dbExecuteMock = vi.fn().mockResolvedValue({ rowCount: 1 });
vi.mock("@workspace/db", () => ({ db: { execute: (...args: unknown[]) => dbExecuteMock(...args) } }));

import { openai } from "@workspace/integrations-openai-ai-server";
import coachFactContextRouter, { validateDarkCoachClaims } from "../routes/coachFactContext.js";

const nonce = "a".repeat(24);

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use(coachFactContextRouter);
  return instance;
}

function body(message = "What have I logged today?") {
  const now = new Date();
  return {
    factContext: {
      schemaVersion: "coach-fact-context-v1",
      purpose: "coach_fact_context_v1",
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      calculationVersion: "nutrition-facts-v1",
      requestNonce: nonce,
      coverage: "partial",
      missingData: [],
      limitations: [],
      facts: [{
        key: "daily.calorie_status",
        status: "available",
        statement: "Today's logged calories are 400 kcal against a 2000 kcal app target.",
        values: { consumedKcal: 400, targetKcal: 2000, remainingKcal: 1600 },
        unit: "kcal",
        timeWindow: "today",
        confidence: "high",
        freshness: "fresh",
        provenance: "verified",
        limitations: ["This reflects logged records today and is not a recommendation."],
      }],
    },
    messages: [{ role: "user", content: message }],
    currentScreen: "progress-coach",
  };
}

function validCompletion(requestNonce = nonce) {
  return {
    choices: [{ message: { content: JSON.stringify({
      message: "untrusted provider prose",
      observations: [{
        text: "Today's logged calories are 400 kcal against a 2000 kcal app target.",
        confidence: "high",
        factKeys: ["daily.calorie_status"],
      }],
      actions: [],
      safetyState: "normal",
      limitations: [],
      contextCoverage: { usedSections: [], missingSections: [] },
      requestNonce,
    }) } }],
  };
}

describe("Coach Fact Context access for registered users", () => {
  const server = app();

  beforeEach(() => {
    vi.clearAllMocks();
    verifyBearerToken.mockResolvedValue({
      id: "ordinary-free-user",
      email: "ordinary@example.com",
      coachFactAccount: { eligible: true, reason: "eligible" },
    });
    hasCurrentCoachFactConsent.mockResolvedValue(true);
    checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
    dbExecuteMock.mockResolvedValue({ rowCount: 1 });
  });

  afterEach(() => vi.restoreAllMocks());

  it("serves a normal signed-in, non-subscribed user without cohort, rollout, approval, or process gates", async () => {
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce(validCompletion() as never);

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Here is a neutral summary based only on the currently approved records.");
    expect(response.body.observations).toEqual([expect.objectContaining({ factKeys: ["daily.calorie_status"] })]);
    expect(hasCurrentCoachFactConsent).toHaveBeenCalledWith("ordinary-free-user", "ordinary@example.com");
    expect(checkRateLimit).toHaveBeenCalledWith(
      "coach-fact-context:user:ordinary-free-user", 40, 60 * 60,
      { failClosed: true, rethrowAccountDeletionFence: true },
    );
    expect(openai.chat.completions.create).toHaveBeenCalledOnce();
  });

  it("denies an unauthenticated request before consent, rate-limit, nonce, or provider work", async () => {
    verifyBearerToken.mockResolvedValueOnce(null);

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/sign in/i);
    expect(hasCurrentCoachFactConsent).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(dbExecuteMock).not.toHaveBeenCalled();
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("requires current explicit consent before personal nutrition data can reach the provider", async () => {
    hasCurrentCoachFactConsent.mockResolvedValueOnce(false);

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/consent/i);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(dbExecuteMock).not.toHaveBeenCalled();
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("accepts bounded nutrition, hydration, history, and wellness facts after explicit consent", async () => {
    const consentedFacts = [
      {
        key: "daily.water_status", statement: "Today's logged water is 40 fl oz.", values: { consumedOz: 40 },
        unit: "fl oz", timeWindow: "today", limitations: ["This reflects logged water and is not a medical hydration target."],
      },
      {
        key: "daily.meal_distribution", statement: "Today's logged meal distribution is Breakfast 25%, Lunch 25%, Dinner 25%, and Snack 25%.",
        values: { breakfastPercentage: 25, lunchPercentage: 25, dinnerPercentage: 25, snackPercentage: 25 },
        unit: "%", timeWindow: "today", limitations: ["This describes logged meal timing and distribution; it is not a prescription for how to eat."],
      },
      {
        key: "weekly.nutrition_coverage", statement: "The last 7-day window includes 5 logged nutrition days.", values: { loggedDayCount: 5, windowDays: 7 },
        unit: null, timeWindow: "recent", limitations: ["This measures logged coverage, not nutrition quality or adherence."],
      },
      {
        key: "weight.short_trend", statement: "The recent 28-day weight trend is down with a 1 kg change across 4 entries.", values: { direction: "down", deltaKg: 1, entryCount: 4 },
        unit: "kg", timeWindow: "recent", limitations: ["Weight is one signal and does not determine health, progress, or what you should eat."],
      },
    ];

    for (const fact of consentedFacts) {
      const payload = body();
      payload.factContext.facts = [{
        ...fact,
        status: "available",
        confidence: "high",
        freshness: "fresh",
        provenance: "verified",
      }] as never;
      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          message: "bounded response",
          observations: [{ text: fact.statement, confidence: "high", factKeys: [fact.key] }],
          actions: [], safetyState: "normal", limitations: [],
          contextCoverage: { usedSections: [fact.key], missingSections: [] },
          requestNonce: nonce,
        }) } }],
      } as never);
      const response = await request(server).post("/v1/coach/fact-context/respond").send(payload);
      expect(response.status).toBe(200);
      expect(response.body.observations[0].factKeys).toEqual([fact.key]);
    }
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(consentedFacts.length);
  });

  it("keeps account-safety eligibility as a server-owned restriction", async () => {
    verifyBearerToken.mockResolvedValueOnce({
      id: "ordinary-free-user",
      email: "ordinary@example.com",
      coachFactAccount: { eligible: false, reason: "banned" },
    });

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(403);
    expect(hasCurrentCoachFactConsent).not.toHaveBeenCalled();
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("preserves deletion-fence handling in the fail-closed rate limiter", async () => {
    checkRateLimit.mockRejectedValueOnce({ code: "55000", message: "account deletion is in progress" });

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: "Coach Fact Context request protection could not be verified." });
    expect(loggerWarn).toHaveBeenCalledWith(
      { errorClass: "account_deletion_fence", route: "/v1/coach/fact-context/respond", count: 1, schemaVersion: "calora.account-deletion-fence-signal.v1" },
      "Account deletion fence rejected Coach Fact Context request",
    );
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("returns a safe fallback when the provider fails", async () => {
    vi.mocked(openai.chat.completions.create).mockRejectedValueOnce(new Error("provider unavailable"));

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(502);
    expect(response.body.message).toMatch(/couldn't reach Coach/i);
    expect(response.body.observations).toEqual([]);
    expect(JSON.stringify(response.body)).not.toMatch(/provider unavailable/i);
  });

  it("discards provider output if consent is revoked while the provider is pending", async () => {
    hasCurrentCoachFactConsent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce(validCompletion() as never);

    const response = await request(server).post("/v1/coach/fact-context/respond").send(body());

    expect(response.status).toBe(404);
    expect(response.body).not.toMatchObject({ message: "untrusted provider prose" });
  });

  it("keeps the bounded risk redirect local and avoids provider egress", async () => {
    const response = await request(server).post("/v1/coach/fact-context/respond")
      .send(body("I am pregnant and need medication advice"));

    expect(response.status).toBe(200);
    expect(response.body.safetyState).toBe("support_redirect");
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("does not accept a response observation outside the bounded consented fact allowlist", () => {
    const context = body().factContext;
    const response = {
      message: "ok", actions: [], safetyState: "normal", limitations: [],
      contextCoverage: { usedSections: [], missingSections: [] }, requestNonce: nonce,
      observations: [{ text: "You have a diagnosis.", confidence: "high", factKeys: ["medical.diagnosis"] }],
    };
    expect(validateDarkCoachClaims(response, context)).toBeNull();
  });
});
