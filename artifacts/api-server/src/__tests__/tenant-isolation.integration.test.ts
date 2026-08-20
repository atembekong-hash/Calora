/**
 * Tenant isolation — real managed PostgreSQL.
 *
 * The test deliberately drives the public diary and sync routes as two
 * distinct server-verified identities. It proves that identifiers originating
 * from User A cannot be used by User B to read, replace, delete, or consume
 * User A's persisted records.
 *
 * Supabase token verification is mocked at the boundary here so the database
 * test remains deterministic and never needs to create or delete a real Auth
 * account. The routes still receive identities exactly where a verified
 * Supabase session would supply them.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const verifyBearerToken = vi.fn();

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

const DIARY_BODY = {
  entryDate: "2026-08-20",
  meal: "Breakfast",
  name: "Tenant test oats",
  serving: "1 bowl",
  calories: 320,
  proteinG: 9,
  carbsG: 58,
  fatG: 6,
  provenance: "Photo estimate",
  confidence: 85,
  clientUpdatedAt: "2026-08-20T08:00:00.000Z",
};

function syncBody(mutations: unknown[]) {
  return { deviceId: "tenant-isolation-test-device", mutations };
}

describe.skipIf(!HAS_DB)("tenant isolation (real schema)", () => {
  const run = randomUUID().slice(0, 8);
  const userA = { id: `tenant-a-${run}`, email: `tenant-a-${run}@example.com` };
  const userB = { id: `tenant-b-${run}`, email: `tenant-b-${run}@example.com` };
  const userC = { id: `tenant-c-${run}`, email: `tenant-c-${run}@example.com` };
  let app: import("express").Express;
  let pool: typeof import("@workspace/db")["pool"];

  function actAs(user: typeof userA) {
    verifyBearerToken.mockResolvedValue(user);
  }

  beforeAll(async () => {
    pool = (await import("@workspace/db")).pool;
    const express = (await import("express")).default;
    const diaryRouter = (await import("../routes/diary.js")).default;
    const syncRouter = (await import("../routes/sync.js")).default;
    app = express();
    app.use(express.json());
    app.use(diaryRouter);
    app.use(syncRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM calora_users WHERE external_id = ANY($1::text[])",
      [[userA.id, userB.id, userC.id]],
    );
  });

  it("allows an owner to create and remove their diary entry, while a second user cannot read or delete it by guessed ID", async () => {
    actAs(userA);
    const created = await request(app).post("/v1/diary").send(DIARY_BODY);
    expect(created.status).toBe(201);
    const entryId = created.body.id as string;

    actAs(userB);
    const listAsB = await request(app).get(`/v1/diary?date=${DIARY_BODY.entryDate}`);
    expect(listAsB.status).toBe(200);
    expect(listAsB.body.entries).toEqual([]);

    const deleteAsB = await request(app).delete(`/v1/diary/${entryId}`);
    expect(deleteAsB.status).toBe(204);
    const rowAfterForeignDelete = await pool.query(
      "SELECT 1 FROM calora_diary_entries WHERE id = $1",
      [entryId],
    );
    expect(rowAfterForeignDelete.rowCount).toBe(1);

    actAs(userA);
    const deleteAsA = await request(app).delete(`/v1/diary/${entryId}`);
    expect(deleteAsA.status).toBe(204);
    const rowAfterOwnerDelete = await pool.query(
      "SELECT 1 FROM calora_diary_entries WHERE id = $1",
      [entryId],
    );
    expect(rowAfterOwnerDelete.rowCount).toBe(0);
  });

  it("binds sync upserts and deletes to the verified user instead of client-controlled identifiers", async () => {
    const clientId = `tenant-client-${randomUUID()}`;
    const mutationA = {
      mutationId: randomUUID(),
      entity: "diaryEntry",
      operation: "upsert",
      clientUpdatedAt: DIARY_BODY.clientUpdatedAt,
      payload: { ...DIARY_BODY, clientId, captureSessionId: null },
    };
    actAs(userA);
    const savedAsA = await request(app).post("/v1/sync").send(syncBody([mutationA]));
    expect(savedAsA.status).toBe(200);
    expect(savedAsA.body.accepted).toContain(mutationA.mutationId);

    const mutationB = {
      mutationId: randomUUID(),
      entity: "diaryEntry",
      operation: "upsert",
      clientUpdatedAt: DIARY_BODY.clientUpdatedAt,
      payload: { ...DIARY_BODY, clientId, captureSessionId: null, name: "User B replacement attempt" },
    };
    actAs(userB);
    const savedAsB = await request(app).post("/v1/sync").send(syncBody([mutationB]));
    expect(savedAsB.status).toBe(200);

    const owners = await pool.query<{ external_id: string; name: string }>(
      `SELECT u.external_id, d.name
       FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE d.client_id = $1
       ORDER BY u.external_id`,
      [clientId],
    );
    expect(owners.rows).toEqual([
      { external_id: userA.id, name: DIARY_BODY.name },
      { external_id: userB.id, name: "User B replacement attempt" },
    ]);

    const foreignDelete = {
      mutationId: randomUUID(),
      entity: "diaryEntry",
      operation: "delete",
      clientUpdatedAt: DIARY_BODY.clientUpdatedAt,
      payload: { clientId },
    };
    actAs(userB);
    await request(app).post("/v1/sync").send(syncBody([foreignDelete]));

    const remaining = await pool.query<{ external_id: string }>(
      `SELECT u.external_id
       FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE d.client_id = $1`,
      [clientId],
    );
    expect(remaining.rows).toEqual([{ external_id: userA.id }]);
  });

  it("rejects a foreign capture session before reading its candidates, while the owner can consume it", async () => {
    const sessionId = randomUUID();
    const owner = await pool.query<{ id: string }>(
      `INSERT INTO calora_users (external_id, email)
       VALUES ($1, $2)
       ON CONFLICT (external_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [userC.id, userC.email],
    );
    await pool.query(
      `INSERT INTO calora_ai_capture_sessions (id, user_id, mode, status)
       VALUES ($1::uuid, $2::uuid, 'image', 'review')`,
      [sessionId, owner.rows[0].id],
    );
    await pool.query(
      `INSERT INTO calora_ai_capture_candidates
       (session_id, name, calories, protein_g, carbs_g, fat_g, confidence, evidence)
       VALUES ($1::uuid, 'Tenant candidate', 320, 9, 58, 6, 85, '{}'::jsonb)`,
      [sessionId],
    );
    const firstLog = { ...DIARY_BODY, captureSessionId: sessionId };

    actAs(userB);
    const foreignAttempt = await request(app).post("/v1/diary/first-log").send(firstLog);
    expect(foreignAttempt.status).toBe(422);

    const untouched = await pool.query(
      "SELECT reviewed_at FROM calora_ai_capture_sessions WHERE id = $1::uuid",
      [sessionId],
    );
    expect(untouched.rows[0]?.reviewed_at).toBeNull();

    actAs(userC);
    const ownerAttempt = await request(app).post("/v1/diary/first-log").send(firstLog);
    expect(ownerAttempt.status).toBe(200);
    expect(ownerAttempt.body).toEqual({ synced: true, alreadyExisted: false });
  });
});