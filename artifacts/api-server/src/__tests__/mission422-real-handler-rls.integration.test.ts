import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { isDatabaseIntegrationTestEnabled } from "./db-integration-gate.js";
import { withVerifiedDatabaseIdentity } from "../lib/database-identity.js";
import {
  claimReferralReward,
  completeReferralReward,
  readReferralRewardAttempts,
} from "../lib/referral-reward-state.js";

const RUN =
  isDatabaseIntegrationTestEnabled() &&
  process.env.CALORA_RLS_DATABASE_MODE === "staged-rls" &&
  typeof process.env.CALORA_TEST_ADMIN_DATABASE_URL === "string";
const verifyBearerToken = vi.fn();
const grantPromoDays = vi.fn();
vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));
vi.mock("../lib/revenuecat.js", () => ({
  grantPromoDays: (...args: unknown[]) => grantPromoDays(...args),
}));

describe.skipIf(!RUN)("Mission 422 staged-RLS real handlers", () => {
  const run = randomUUID().slice(0, 8);
  const userA = `m422-a-${run}`;
  const userB = `m422-b-${run}`;
  const userC = `m422-c-${run}`;
  const code = `M422${run.toUpperCase()}`;
  const clientId = `m422-client-${run}`;
  const mutationId = randomUUID();
  const sessionId = randomUUID();
  const firstLogSessionId = randomUUID();
  let app: import("express").Express;
  let admin: Pool;
  let runtimePool: (typeof import("@workspace/db"))["pool"];

  function actAs(id: string) {
    verifyBearerToken.mockResolvedValue({
      id,
      email: `${id}@synthetic.invalid`,
    });
  }

  beforeAll(async () => {
    admin = new Pool({
      connectionString: process.env.CALORA_TEST_ADMIN_DATABASE_URL,
    });
    runtimePool = (await import("@workspace/db")).pool;
    const express = (await import("express")).default;
    const syncRouter = (await import("../routes/sync.js")).default;
    const referralRouter = (await import("../routes/referral.js")).default;
    const diaryRouter = (await import("../routes/diary.js")).default;
    app = express();
    app.use(express.json());
    app.use(diaryRouter);
    app.use(syncRouter);
    app.use(referralRouter);
    await admin.query(
      `INSERT INTO calora_users (external_id, email)
       VALUES ($1, $2), ($3, $4), ($5, $6)
       ON CONFLICT (external_id) DO UPDATE SET email = EXCLUDED.email`,
      [
        userA,
        `${userA}@synthetic.invalid`,
        userB,
        `${userB}@synthetic.invalid`,
        userC,
        `${userC}@synthetic.invalid`,
      ],
    );
    const c = await admin.query<{ id: string }>(
      `SELECT id FROM calora_users WHERE external_id = $1`,
      [userC],
    );
    await admin.query(
      `INSERT INTO calora_ai_capture_sessions (id, user_id, mode, status)
       VALUES ($1::uuid, $2::uuid, 'food', 'review')`,
      [sessionId, c.rows[0].id],
    );
    await admin.query(
      `INSERT INTO calora_ai_capture_candidates
         (session_id, name, calories, protein_g, carbs_g, fat_g, confidence, evidence)
       VALUES ($1::uuid, 'Synthetic capture meal', 420, 30, 40, 12, 90, '{}'::jsonb)`,
      [sessionId],
    );
    const b = await admin.query<{ id: string }>(
      `SELECT id FROM calora_users WHERE external_id = $1`,
      [userB],
    );
    await admin.query(
      `INSERT INTO calora_ai_capture_sessions (id, user_id, mode, status)
       VALUES ($1::uuid, $2::uuid, 'food', 'review')`,
      [firstLogSessionId, b.rows[0].id],
    );
    await admin.query(
      `INSERT INTO calora_ai_capture_candidates
         (session_id, name, calories, protein_g, carbs_g, fat_g, confidence, evidence)
       VALUES ($1::uuid, 'Synthetic first-log meal', 320, 20, 35, 10, 90, '{}'::jsonb)`,
      [firstLogSessionId],
    );
    await admin.query(
      `INSERT INTO calora_referral_codes (user_id, code)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [userA, code],
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    grantPromoDays.mockResolvedValue(new Date());
  });

  afterAll(async () => {
    await admin.query(
      `DELETE FROM calora_referral_redemptions
       WHERE referred_user_id = ANY($1::text[]) OR referrer_user_id = $2`,
      [[userA, userB, userC], userA],
    );
    await admin.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [
      userA,
    ]);
    await admin.query(
      `DELETE FROM calora_users WHERE external_id = ANY($1::text[])`,
      [[userA, userB, userC]],
    );
    await runtimePool.end();
    await admin.end();
  });

  it("keeps referral code discovery shareable but keeps redemption summary tenant-scoped", async () => {
    actAs(userA);
    const created = await request(app).get("/v1/referral");
    expect(created.status).toBe(200);
    expect(created.body.code).toBeTruthy();

    actAs(userB);
    const redemption = await request(app)
      .post("/v1/referral/redeem")
      .send({ code: created.body.code });
    expect(redemption.status).toBe(200);
    const bSummary = await request(app).get("/v1/referral");
    expect(bSummary.status).toBe(200);
    expect(bSummary.body.redemption.status).toBe("pending");

    actAs(userC);
    const cSummary = await request(app).get("/v1/referral");
    expect(cSummary.status).toBe(200);
    expect(cSummary.body.redemption.status).toBe("none");
  });

  it("runs capture-verified first-log through one staged identity transaction", async () => {
    actAs(userB);
    const firstLog = await request(app)
      .post("/v1/diary/first-log")
      .send({
        captureSessionId: firstLogSessionId,
        entryDate: "2026-11-08",
        meal: "Breakfast",
        name: "Synthetic first-log meal",
        serving: "1 bowl",
        calories: 320,
        proteinG: 20,
        carbsG: 35,
        fatG: 10,
        provenance: "Photo estimate",
        confidence: 90,
        clientUpdatedAt: "2026-11-08T12:00:00.000Z",
      });
    expect(firstLog.status).toBe(200);
    expect(firstLog.body).toEqual({ synced: true, alreadyExisted: false });

    actAs(userA);
    const foreign = await request(app)
      .post("/v1/diary/first-log")
      .send({
        captureSessionId: firstLogSessionId,
        entryDate: "2026-11-08",
        meal: "Breakfast",
        name: "Synthetic first-log meal",
        serving: "1 bowl",
        calories: 320,
        proteinG: 20,
        carbsG: 35,
        fatG: 10,
        provenance: "Photo estimate",
        confidence: 90,
        clientUpdatedAt: "2026-11-08T12:00:00.000Z",
      });
    expect(foreign.status).toBe(422);
  });

  it("runs sync and referral activation through real handlers with three-user RLS isolation", async () => {
    actAs(userC);
    const synced = await request(app)
      .post("/v1/sync")
      .send({
        deviceId: `device-${run}`,
        mutations: [
          {
            mutationId,
            entity: "diaryEntry",
            operation: "upsert",
            clientUpdatedAt: "2026-11-08T12:00:00.000Z",
            payload: {
              clientId,
              captureSessionId: sessionId,
              entryDate: "2026-11-08",
              meal: "Lunch",
              name: "Synthetic capture meal",
              serving: "1 bowl",
              calories: 420,
              proteinG: 30,
              carbsG: 40,
              fatG: 12,
              provenance: "Manual",
              confidence: 90,
              notes: null,
              imageUrl: null,
              imageSource: null,
              clientUpdatedAt: "2026-11-08T12:00:00.000Z",
            },
          },
        ],
      });
    expect(synced.status).toBe(200);
    expect(synced.body.accepted).toContain(mutationId);

    actAs(userC);
    const codeRow = await admin.query<{ code: string }>(
      `SELECT code FROM calora_referral_codes WHERE user_id = $1`,
      [userA],
    );
    const cRedemption = await request(app)
      .post("/v1/referral/redeem")
      .send({ code: codeRow.rows[0].code });
    expect(cRedemption.status).toBe(200);

    const activation = await request(app)
      .post("/v1/referral/activate")
      .send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe("rewarded");
    expect(grantPromoDays).toHaveBeenCalledTimes(2);
    expect(
      grantPromoDays.mock.calls.every((call) => typeof call[2] === "string"),
    ).toBe(true);

    const attempts = await admin.query<{ side: string; state: string }>(
      `SELECT side, state FROM calora_referral_reward_attempts a
       JOIN calora_referral_redemptions r ON r.id = a.redemption_id
       WHERE r.referred_user_id = $1 ORDER BY side`,
      [userC],
    );
    expect(attempts.rows).toEqual([
      { side: "referred", state: "granted" },
      { side: "referrer", state: "granted" },
    ]);

    grantPromoDays.mockClear();
    const repeat = await request(app).post("/v1/referral/activate").send({});
    expect(repeat.body.status).toBe("rewarded");
    expect(grantPromoDays).not.toHaveBeenCalled();

    actAs(userA);
    const foreignDiary = await request(app).get("/v1/diary?date=2026-11-08");
    expect(foreignDiary.status).toBe(200);
    expect(foreignDiary.body.entries).toEqual([]);
  });

  it("handles crash-after-claim, lease expiry, lost responses, and concurrent claims", async () => {
    await admin.query(
      `DELETE FROM calora_referral_redemptions WHERE referred_user_id = $1`,
      [userC],
    );
    const pending = await admin.query<{ id: string }>(
      `INSERT INTO calora_referral_redemptions
         (code, referrer_user_id, referred_user_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [`CRASH${run}`, userA, userC],
    );
    const redemptionId = pending.rows[0].id;

    const first = await withVerifiedDatabaseIdentity(userC, (database) =>
      claimReferralReward(database, redemptionId, "referred"),
    );
    expect(first.kind).toBe("claimed");
    if (first.kind !== "claimed") throw new Error("expected first claim");

    const concurrent = await Promise.all([
      withVerifiedDatabaseIdentity(userC, (database) =>
        claimReferralReward(database, redemptionId, "referred"),
      ),
      withVerifiedDatabaseIdentity(userC, (database) =>
        claimReferralReward(database, redemptionId, "referred"),
      ),
    ]);
    expect(concurrent.every((claim) => claim.kind === "in_flight")).toBe(true);

    // Simulate a provider success whose response was lost after the claim.
    await withVerifiedDatabaseIdentity(userC, (database) =>
      database.execute(sql`
        UPDATE calora_referral_reward_attempts
           SET lease_until = now() - interval '1 second'
         WHERE redemption_id = ${redemptionId}::uuid
           AND side = 'referred'
      `),
    );
    const recovered = await withVerifiedDatabaseIdentity(userC, (database) =>
      claimReferralReward(database, redemptionId, "referred"),
    );
    expect(recovered.kind).toBe("claimed");
    if (recovered.kind !== "claimed")
      throw new Error("expected reclaimed claim");
    expect(recovered.attemptKey).not.toBe(first.attemptKey);
    const reclaimedEvidence = await withVerifiedDatabaseIdentity(
      userC,
      (database) => readReferralRewardAttempts(database, redemptionId),
    );
    expect(reclaimedEvidence).toEqual([
      expect.objectContaining({
        side: "referred",
        state: "processing",
        reconciliation_required: true,
      }),
    ]);

    const completed = await withVerifiedDatabaseIdentity(userC, (database) =>
      completeReferralReward(
        database,
        redemptionId,
        "referred",
        recovered.attemptKey,
      ),
    );
    expect(completed).toBe(true);

    const replay = await withVerifiedDatabaseIdentity(userC, (database) =>
      claimReferralReward(database, redemptionId, "referred"),
    );
    expect(replay).toEqual({ kind: "granted" });

    const evidence = await withVerifiedDatabaseIdentity(userC, (database) =>
      readReferralRewardAttempts(database, redemptionId),
    );
    expect(evidence).toEqual([
      expect.objectContaining({
        side: "referred",
        state: "granted",
        reconciliation_required: false,
      }),
    ]);
  });
});
