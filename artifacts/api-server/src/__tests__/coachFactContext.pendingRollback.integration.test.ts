import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import {
  coachFactContextIdempotencyTable,
  cohortMembershipsTable,
  db,
  pool,
  serverConfigTable,
  usersTable,
} from "@workspace/db";

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
import {
  acceptCoachFactConsent,
  revokeCoachFactConsent,
} from "../lib/coach-fact-consent.js";

const SYNTHETIC_REHEARSAL_OPT_IN = process.env.COACH_FACT_CONTEXT_SYNTHETIC_REHEARSAL === "development-only";
const SAFE_REHEARSAL_ENVIRONMENT = process.env.NODE_ENV === "test" && SYNTHETIC_REHEARSAL_OPT_IN;
const HAS_SAFE_DB = Boolean(process.env.DATABASE_URL) && SAFE_REHEARSAL_ENVIRONMENT;
const VERIFIED_DEVELOPMENT_TARGET = {
  databaseName: "heliumdb",
  postgresSystemIdentifier: "7670770438921318420",
} as const;
const CONFIG_KEY = "coach_fact_context_rollout_enabled";
const COHORT = "coach_fact_context_v1";
const createdExternalIds: string[] = [];
let priorConfig: { exists: boolean; value?: unknown } | undefined;
let priorServerGate: string | undefined;
let gateSnapshotCaptured = false;

function syntheticId(label: string) {
  const value = `synthetic-pending-rollback-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
        values: { consumedKcal: 400, targetKcal: 2000, remainingKcal: 1600 },
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

function validProviderCompletion() {
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
          requestNonce: "f".repeat(24),
        }),
      },
    }],
  };
}

async function prepareEligibleIdentity(externalId: string) {
  const [existingConfig] = await db.select({ value: serverConfigTable.value })
    .from(serverConfigTable)
    .where(eq(serverConfigTable.key, CONFIG_KEY))
    .limit(1);
  priorConfig = existingConfig
    ? { exists: true, value: existingConfig.value }
    : { exists: false };
  priorServerGate = process.env.COACH_FACT_CONTEXT_ENABLED;
  gateSnapshotCaptured = true;
  await acceptCoachFactConsent(externalId, null);
  await db.insert(serverConfigTable).values({ key: CONFIG_KEY, value: true })
    .onConflictDoUpdate({ target: serverConfigTable.key, set: { value: true, updatedAt: new Date() } });
  await db.insert(cohortMembershipsTable).values({
    cohortName: COHORT,
    externalUserId: externalId,
    addedBy: "synthetic-pending-rehearsal",
    reviewedAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });
}

async function cleanupSyntheticState() {
  while (createdExternalIds.length) {
    const externalId = createdExternalIds.pop()!;
    await db.delete(coachFactContextIdempotencyTable)
      .where(eq(coachFactContextIdempotencyTable.externalUserId, externalId));
    await db.delete(cohortMembershipsTable)
      .where(eq(cohortMembershipsTable.externalUserId, externalId));
    await db.delete(usersTable).where(eq(usersTable.externalId, externalId));
  }
  if (priorConfig !== undefined) {
    await db.delete(serverConfigTable).where(eq(serverConfigTable.key, CONFIG_KEY));
    if (priorConfig.exists) {
      await db.insert(serverConfigTable).values({ key: CONFIG_KEY, value: priorConfig.value });
    }
  }
  priorConfig = undefined;
}

afterEach(async () => {
  if (gateSnapshotCaptured) {
    if (priorServerGate === undefined) delete process.env.COACH_FACT_CONTEXT_ENABLED;
    else process.env.COACH_FACT_CONTEXT_ENABLED = priorServerGate;
  }
  priorServerGate = undefined;
  gateSnapshotCaptured = false;
  await cleanupSyntheticState();
});

describe.skipIf(!HAS_SAFE_DB).sequential("Coach Fact Context pending rollback rehearsal (real development state)", () => {
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

  async function runPendingCase(
    label: string,
    rollback: (externalId: string) => Promise<void>,
  ) {
    vi.clearAllMocks();
    const externalId = syntheticId(label);
    await prepareEligibleIdentity(externalId);
    process.env.COACH_FACT_CONTEXT_ENABLED = "true";
    verifyBearerToken.mockResolvedValue({
      id: externalId,
      email: null,
      coachFactAccount: { eligible: true, reason: "eligible" },
    });
    checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });

    let releaseProvider: ((value: ReturnType<typeof validProviderCompletion>) => void) | undefined;
    let providerEntered: (() => void) | undefined;
    const providerEnteredPromise = new Promise<void>((resolve) => { providerEntered = resolve; });
    vi.mocked(openai.chat.completions.create).mockImplementationOnce(() => new Promise((resolve) => {
      releaseProvider = resolve;
      providerEntered?.();
    }) as never);

    const pendingResponse = request(app()).post("/v1/coach/fact-context/respond")
      .send(body(Math.random().toString(16).slice(2).padEnd(24, "a").slice(0, 24)));
    const responsePromise = pendingResponse.then((response) => response);
    await providerEnteredPromise;

    await rollback(externalId);
    releaseProvider?.(validProviderCompletion());
    const response = await responsePromise;

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/unavailable/i);
    expect(vi.mocked(openai.chat.completions.create)).toHaveBeenCalledTimes(1);
  }

  it("discards a pending completion after cohort removal", async () => {
    await runPendingCase("cohort", async (externalId) => {
      await db.delete(cohortMembershipsTable).where(eq(cohortMembershipsTable.externalUserId, externalId));
    });
  });

  it("discards a pending completion after global rollout disablement", async () => {
    await runPendingCase("global", async () => {
      await db.update(serverConfigTable).set({ value: false, updatedAt: new Date() })
        .where(eq(serverConfigTable.key, CONFIG_KEY));
    });
  });

  it("discards a pending completion after consent revocation", async () => {
    await runPendingCase("consent", async (externalId) => {
      await revokeCoachFactConsent(externalId, null);
    });
  });

  it("discards a pending completion after the process-local server gate is disabled", async () => {
    await runPendingCase("server-gate", async () => {
      delete process.env.COACH_FACT_CONTEXT_ENABLED;
    });
  });
});