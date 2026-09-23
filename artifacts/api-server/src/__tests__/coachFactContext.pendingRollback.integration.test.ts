import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import { coachFactContextIdempotencyTable, db, pool, usersTable } from "@workspace/db";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));
const verifyBearerToken = vi.fn();
vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));
const checkRateLimit = vi.fn();
vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

import { openai } from "@workspace/integrations-openai-ai-server";
import coachFactContextRouter from "../routes/coachFactContext.js";
import { acceptCoachFactConsent, revokeCoachFactConsent } from "../lib/coach-fact-consent.js";

const SYNTHETIC_REHEARSAL_OPT_IN = process.env.COACH_FACT_CONTEXT_SYNTHETIC_REHEARSAL === "development-only";
const HAS_SAFE_DB = Boolean(process.env.DATABASE_URL) && process.env.NODE_ENV === "test" && SYNTHETIC_REHEARSAL_OPT_IN;
const VERIFIED_DEVELOPMENT_TARGET = {
  databaseName: "heliumdb",
  postgresSystemIdentifier: "7670770438921318420",
} as const;
const createdExternalIds: string[] = [];

function syntheticId(label: string) {
  const value = `synthetic-coach-consent-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  createdExternalIds.push(value);
  return value;
}

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use(coachFactContextRouter);
  return instance;
}

function body(nonce: string) {
  const now = Date.now();
  return {
    factContext: {
      schemaVersion: "coach-fact-context-v1",
      purpose: "coach_fact_context_v1",
      generatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
      calculationVersion: "nutrition-facts-v1",
      requestNonce: nonce,
      coverage: "partial",
      missingData: [],
      limitations: [],
      facts: [{
        key: "daily.calorie_status",
        status: "available",
        statement: "Today's logged calories are 400 kcal against a 2000 kcal app target.",
        values: { consumedKcal: 400, targetKcal: 2000 },
        unit: "kcal",
        timeWindow: "today",
        confidence: "high",
        freshness: "fresh",
        provenance: "verified",
        limitations: ["This reflects logged records today and is not a recommendation."],
      }],
    },
    messages: [{ role: "user", content: "What does the approved calorie record show today?" }],
    currentScreen: "progress-coach",
  };
}

function validProviderCompletion(requestNonce: string) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          message: "ok",
          observations: [],
          actions: [],
          safetyState: "normal",
          limitations: [],
          contextCoverage: { usedSections: [], missingSections: [] },
          requestNonce,
        }),
      },
    }],
  };
}

async function prepareConsentedIdentity(externalId: string) {
  await acceptCoachFactConsent(externalId, null);
}

async function cleanupSyntheticState() {
  while (createdExternalIds.length) {
    const externalId = createdExternalIds.pop()!;
    await db.delete(coachFactContextIdempotencyTable)
      .where(eq(coachFactContextIdempotencyTable.externalUserId, externalId));
    await db.delete(usersTable).where(eq(usersTable.externalId, externalId));
  }
}

afterEach(async () => {
  await cleanupSyntheticState();
});

describe.skipIf(!HAS_SAFE_DB).sequential("Coach Fact Context consent/account completion fences (real development state)", () => {
  beforeEach(async () => {
    const result = await pool.query<{ database_name: string; system_identifier: string }>(
      "SELECT current_database() AS database_name, system_identifier::text AS system_identifier FROM pg_control_system()",
    );
    const target = result.rows[0];
    if (
      target?.database_name !== VERIFIED_DEVELOPMENT_TARGET.databaseName
      || target.system_identifier !== VERIFIED_DEVELOPMENT_TARGET.postgresSystemIdentifier
    ) {
      throw new Error("Synthetic Coach Fact Context rehearsal blocked: database target is not the verified development cluster.");
    }
  });

  function prepareRequest(externalId: string) {
    verifyBearerToken.mockResolvedValue({ id: externalId, email: null });
    checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
  }

  async function runPendingCase(
    label: string,
    invalidate: (externalId: string) => Promise<void>,
  ) {
    vi.clearAllMocks();
    const externalId = syntheticId(label);
    await prepareConsentedIdentity(externalId);
    prepareRequest(externalId);

    let releaseProvider: ((value: ReturnType<typeof validProviderCompletion>) => void) | undefined;
    let providerEntered: (() => void) | undefined;
    const providerEnteredPromise = new Promise<void>((resolve) => { providerEntered = resolve; });
    vi.mocked(openai.chat.completions.create).mockImplementationOnce(() => new Promise((resolve) => {
      releaseProvider = resolve;
      providerEntered?.();
    }) as never);

    const requestNonce = Math.random().toString(16).slice(2).padEnd(24, "a").slice(0, 24);
    const responsePromise = request(app()).post("/v1/coach/fact-context/respond")
      .send(body(requestNonce))
      .then((response) => response);
    await providerEnteredPromise;

    await invalidate(externalId);
    releaseProvider?.(validProviderCompletion(requestNonce));
    const response = await responsePromise;

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/unavailable/i);
    expect(vi.mocked(openai.chat.completions.create)).toHaveBeenCalledTimes(1);
  }

  it("allows an ordinary authenticated, consented account without membership, cohort, or rollout state", async () => {
    vi.clearAllMocks();
    const externalId = syntheticId("ordinary");
    await prepareConsentedIdentity(externalId);
    prepareRequest(externalId);
    const requestNonce = "f".repeat(24);
    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce(validProviderCompletion(requestNonce) as never);

    const response = await request(app()).post("/v1/coach/fact-context/respond")
      .send(body(requestNonce));

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Here is a neutral summary based only on the currently approved records.");
    expect(response.body.message).not.toBe("ok");
    expect(vi.mocked(openai.chat.completions.create)).toHaveBeenCalledTimes(1);
  });

  it("discards a pending completion after explicit consent revocation", async () => {
    await runPendingCase("consent", async (externalId) => {
      await revokeCoachFactConsent(externalId, null);
    });
  });

  it("discards a pending completion after account deletion", async () => {
    await runPendingCase("account", async (externalId) => {
      await db.delete(usersTable).where(eq(usersTable.externalId, externalId));
    });
  });
});
