/**
 * Recipe generation — live Supabase auth integration.
 *
 * Verifies that the concepts and generated-recipe endpoints:
 *   1. Reject requests without a token (401)
 *   2. Accept a real Supabase Bearer token and return the expected shape (200)
 *   3. Return no third-party attribution fields on Calora AI recipes
 *
 * OpenAI is mocked so the test is fast and deterministic; the point is to
 * exercise the real `verifyBearerToken` path without a mock.
 *
 * ── Prerequisites ──────────────────────────────────────────────────────────
 * All four env vars below must be present; the suite is skipped otherwise.
 *   EXPO_PUBLIC_SUPABASE_URL      — project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY — public anon key (sign-in)
 *   SUPABASE_SERVICE_ROLE_KEY     — admin key (create/delete ephemeral user)
 *   CALORA_SIGNUP_TEST_PASSWORD   — password for the ephemeral user
 *
 * Add SUPABASE_SERVICE_ROLE_KEY as a Replit secret then run:
 *   pnpm --filter @workspace/api-server test recipe-generation.integration
 *
 * ── How to provision a permanent QA account ────────────────────────────────
 * Run the provision script once (see scripts/src/provisionQaAccount.ts) to
 * create a confirmed qa@calora.dev account that can be used for manual
 * browser-flow verification without re-running this suite.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TEST_PASSWORD = process.env.CALORA_SIGNUP_TEST_PASSWORD ?? "";

const HAS_LIVE_AUTH = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_KEY && TEST_PASSWORD);

// ── Mock OpenAI and DB; leave supabase-auth un-mocked for real token validation

const { mockOpenAiCreate } = vi.hoisted(() => ({ mockOpenAiCreate: vi.fn() }));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mockOpenAiCreate } } },
}));

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  recipeNutritionTable: { mealId: "meal_id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})) }));

vi.mock("../lib/account-deletion-state.js", () => ({
  assertAccountWritable: vi.fn().mockResolvedValue(undefined),
  AccountDeletionInProgressError: class AccountDeletionInProgressError extends Error {},
}));

// supabase-auth is intentionally NOT mocked — verifyBearerToken runs against
// the real Supabase project so this test exercises the live auth path.

import express from "express";
import recipesRouter from "../routes/recipes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(recipesRouter);
  return app;
}

function completion(payload: unknown) {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

describe.skipIf(!HAS_LIVE_AUTH)("recipe generation with real Supabase auth", () => {
  const app = buildApp();

  // Unique email so parallel CI runs never collide.
  const TEST_EMAIL = `qa-recipe-${Date.now()}@calora.dev`;
  let testUserId = "";
  let accessToken = "";

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  beforeAll(async () => {
    // 1. Create a confirmed test user via the admin API — no email needed.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(`Could not create ephemeral test user: ${createErr?.message ?? "unknown"}`);
    }
    testUserId = created.user.id;

    // 2. Sign in with the anon key to get a real JWT.
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (signErr || !signed.session) {
      throw new Error(`Sign-in failed for test user: ${signErr?.message ?? "no session"}`);
    }
    accessToken = signed.session.access_token;
  }, 30_000);

  afterAll(async () => {
    if (!testUserId) return;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin.auth.admin.deleteUser(testUserId);
  }, 15_000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Tests ─────────────────────────────────────────────────────────────────

  it("rejects requests without a Bearer token (401)", async () => {
    const [concepts, recipe] = await Promise.all([
      request(app).post("/v1/recipes/concepts").send({ request: "a quick dinner" }),
      request(app).post("/v1/recipes/generated").send({ title: "Quick dinner" }),
    ]);
    expect(concepts.status).toBe(401);
    expect(recipe.status).toBe(401);
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });

  it("returns three concepts for a valid signed-in session — no 401", async () => {
    mockOpenAiCreate.mockResolvedValueOnce(
      completion({
        concepts: [
          {
            title: "Lemon herb chicken bowl",
            summary: "A bright one-pan dinner.",
            whyItFits: "High protein, quick to make.",
            keyIngredients: ["chicken", "lemon", "herbs"],
            estimatedMinutes: 25,
          },
          {
            title: "Garlic pasta",
            summary: "Simple comfort food.",
            whyItFits: "Uses pantry staples.",
            keyIngredients: ["pasta", "garlic"],
            estimatedMinutes: 20,
          },
          {
            title: "Veggie stir-fry",
            summary: "Light and fresh.",
            whyItFits: "Flexible with any veg.",
            keyIngredients: ["broccoli", "peppers"],
            estimatedMinutes: 18,
          },
        ],
      }),
    );

    const response = await request(app)
      .post("/v1/recipes/concepts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ request: "quick high-protein dinner", ingredients: ["chicken"] });

    expect(response.status).toBe(200);
    expect(response.body.concepts).toHaveLength(3);
    expect(response.body.concepts[0]).toMatchObject({
      title: "Lemon herb chicken bowl",
      estimatedMinutes: 25,
    });
    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
  });

  it("returns a complete generated recipe with no third-party attribution", async () => {
    mockOpenAiCreate.mockResolvedValueOnce(
      completion({
        name: "Lemon herb chicken bowl",
        description: "A quick, flavorful dinner with pantry staples.",
        ingredients: ["2 chicken breasts", "1 lemon, juiced", "1 tsp dried herbs", "1 tbsp olive oil"],
        instructions: ["Season chicken with herbs.", "Pan-fry 6 min each side.", "Squeeze lemon over and serve."],
        prepMinutes: 25,
        servings: 2,
        nutrition: { calories: 320, proteinG: 38, carbsG: 4, fatG: 14 },
        allergens: [],
      }),
    );

    const response = await request(app)
      .post("/v1/recipes/generated")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Lemon herb chicken bowl", summary: "Bright, protein-rich dinner.", servings: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Lemon herb chicken bowl",
      servings: 2,
      prepMinutes: 25,
      nutrition: { calories: 320, proteinG: 38, carbsG: 4, fatG: 14 },
    });
    // AI-estimated nutrition note must be present
    expect(response.body.nutritionNote).toMatch(/AI-estimated/i);
    // No third-party attribution — Calora AI recipes have no external source
    expect(response.body.source).toBeUndefined();
    expect(response.body.sourceUrl).toBeUndefined();
  });

  it("returns 400 for an empty concept request even when signed in", async () => {
    const response = await request(app)
      .post("/v1/recipes/concepts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ingredients: [], request: "" });

    expect(response.status).toBe(400);
    expect(mockOpenAiCreate).not.toHaveBeenCalled();
  });
});
