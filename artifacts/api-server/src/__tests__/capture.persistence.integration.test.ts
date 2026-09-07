/**
 * Capture persistence rollback — disposable PostgreSQL schema.
 *
 * This test keeps the provider and rate-limit boundaries deterministic while
 * exercising the real user-row lookup, Drizzle transaction, and capture route
 * against PostgreSQL. The candidate table trigger fails after the session
 * insert so the database, not an in-memory mock, proves the rollback.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

const {
  verifyBearerTokenMock,
  openAiCreateMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  verifyBearerTokenMock: vi.fn(),
  openAiCreateMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: verifyBearerTokenMock,
}));

vi.mock("../lib/rate-limit.js", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    count: 1,
    limit: 30,
    retryAfterSecs: 0,
    degraded: false,
  }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: {
    error: loggerErrorMock,
    warn: vi.fn(),
  },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: openAiCreateMock,
      },
    },
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
    },
  },
}));

const HAS_DB = Boolean(process.env.DATABASE_URL);
const DATABASE_REQUIRED =
  process.env.CAPTURE_ROLLBACK_REQUIRE_DATABASE === "true";
if (DATABASE_REQUIRED && !HAS_DB) {
  throw new Error(
    "DATABASE_URL must be set when capture rollback database verification is required.",
  );
}

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "capture persistence rollback (disposable PostgreSQL schema)",
  () => {
    let pool: (typeof import("@workspace/db"))["pool"];
    let app: import("express").Express;
    let schemaName: string;
    let quotedSchemaName: string;
    let userId: string;
    const externalUserId = `capture-rollback-${randomUUID()}`;
    const databaseErrorDetails =
      "candidate persistence failed: private database detail";

    async function configurePoolSearchPath(
      searchPath: string,
    ): Promise<void> {
      const maxClients = pool.options.max ?? 10;
      const clients: PoolClient[] = [];
      try {
        for (let index = 0; index < maxClients; index += 1) {
          const client = await pool.connect();
          clients.push(client);
          await client.query(`SET search_path TO ${searchPath}, public`);
        }
      } finally {
        for (const client of clients) {
          client.release();
        }
      }
    }

    async function resetPoolSearchPath(): Promise<void> {
      const maxClients = pool.options.max ?? 10;
      const clients: PoolClient[] = [];
      try {
        for (let index = 0; index < maxClients; index += 1) {
          clients.push(await pool.connect());
        }
        for (const client of clients) {
          await client.query("RESET search_path");
          client.release();
        }
      } catch (error) {
        for (const client of clients) {
          client.release();
        }
        throw error;
      }
    }

    beforeAll(async () => {
      ({ pool } = await import("@workspace/db"));
      const express = (await import("express")).default;

      schemaName = `calora_capture_rollback_${randomUUID().replaceAll("-", "")}`;
      quotedSchemaName = `"${schemaName}"`;
      const qualified = (tableName: string) =>
        `${quotedSchemaName}.${tableName}`;
      userId = randomUUID();

      const setupClient = await pool.connect();
      try {
        await setupClient.query(`CREATE SCHEMA ${quotedSchemaName}`);
        await setupClient.query(`
          CREATE TABLE ${qualified("calora_account_deletion_states")} (
            identity_fingerprint text PRIMARY KEY NOT NULL,
            state text NOT NULL
          );
          CREATE TABLE ${qualified("calora_users")} (
            id uuid PRIMARY KEY NOT NULL,
            external_id text UNIQUE NOT NULL,
            email text
          );
          CREATE TABLE ${qualified("calora_ai_capture_sessions")} (
            id uuid PRIMARY KEY NOT NULL,
            user_id uuid NOT NULL
              REFERENCES ${qualified("calora_users")}(id) ON DELETE CASCADE,
            mode text NOT NULL,
            input_uri text,
            status text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            reviewed_at timestamptz
          );
          CREATE TABLE ${qualified("calora_ai_capture_candidates")} (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id uuid NOT NULL
              REFERENCES ${qualified("calora_ai_capture_sessions")}(id)
              ON DELETE CASCADE,
            name text NOT NULL,
            calories numeric(9, 2) NOT NULL,
            protein_g numeric(9, 2) NOT NULL,
            carbs_g numeric(9, 2) NOT NULL,
            fat_g numeric(9, 2) NOT NULL,
            confidence integer NOT NULL,
            evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
            accepted boolean NOT NULL DEFAULT false
          );
          INSERT INTO ${qualified("calora_users")} (id, external_id, email)
          VALUES ('${userId}'::uuid, '${externalUserId}', '${externalUserId}@example.com')
        `);
        await setupClient.query(`
          CREATE FUNCTION ${quotedSchemaName}.reject_capture_candidate()
          RETURNS trigger
          LANGUAGE plpgsql
          AS $$
          BEGIN
            RAISE EXCEPTION '${databaseErrorDetails}';
          END;
          $$;
          CREATE TRIGGER reject_capture_candidate
          BEFORE INSERT ON ${qualified("calora_ai_capture_candidates")}
          FOR EACH ROW
          EXECUTE FUNCTION ${quotedSchemaName}.reject_capture_candidate();
        `);
      } finally {
        setupClient.release();
      }

      await configurePoolSearchPath(quotedSchemaName);

      const captureRouter = (await import("../routes/capture.js")).default;
      app = express();
      app.use(express.json({ limit: "20mb" }));
      app.use(captureRouter);
    });

    afterAll(async () => {
      if (!pool || !schemaName) return;
      await resetPoolSearchPath();
      await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    });

    it("rolls back the session and hides candidate database errors from the client", async () => {
      const clientSessionId = "client-session-not-persisted";
      verifyBearerTokenMock.mockResolvedValueOnce({
        id: externalUserId,
        email: `${externalUserId}@example.com`,
      });
      openAiCreateMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Oatmeal",
                candidates: [
                  {
                    name: "Oatmeal",
                    serving: "1 bowl",
                    calories: 320,
                    proteinG: 9,
                    carbsG: 58,
                    fatG: 6,
                    confidence: 75,
                  },
                ],
                assumptions: [],
                reviewQuestions: ["How large was the bowl?"],
              }),
            },
          },
        ],
      });

      const response = await request(app)
        .post("/v1/capture/analyze")
        .send({
          mode: "text",
          textInput: "a bowl of oatmeal",
          clientSessionId,
        })
        .set("Authorization", "Bearer valid-token")
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe(clientSessionId);
      expect(JSON.stringify(response.body)).not.toContain(databaseErrorDetails);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        {
          err: expect.objectContaining({
            cause: expect.objectContaining({ message: databaseErrorDetails }),
          }),
        },
        "Failed to persist capture session",
      );

      const persisted = await pool.query<{
        sessions: string;
        candidates: string;
      }>(
        `SELECT
           (SELECT COUNT(*)::text FROM ${quotedSchemaName}.calora_ai_capture_sessions
            WHERE user_id = $1::uuid) AS sessions,
           (SELECT COUNT(*)::text FROM ${quotedSchemaName}.calora_ai_capture_candidates) AS candidates`,
        [userId],
      );
      expect(persisted.rows[0]).toEqual({ sessions: "0", candidates: "0" });
    });
  },
);