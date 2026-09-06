import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const DATABASE_REQUIRED =
  process.env.RECOVERY_SUMMARY_ROLLING_RESTART_REQUIRE_DATABASE === "true";
if (DATABASE_REQUIRED && !HAS_DB) {
  throw new Error(
    "DATABASE_URL must be set when recovery-summary rolling-restart verification is required.",
  );
}

const API_ENTRY = fileURLToPath(
  new URL("../../dist/index.mjs", import.meta.url),
);
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

interface SummaryRow {
  cohort_key: string;
  correlation_keys: string[];
  suppressed_cycle_count: number;
}

interface RunningApi {
  child: ChildProcess;
  output: string;
  waitForOutput(pattern: RegExp, timeoutMs?: number): Promise<void>;
  stop(): Promise<{ code: number | null; output: string }>;
}

function databaseUrlForSchema(schemaName: string): string {
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  databaseUrl.searchParams.set(
    "options",
    `-csearch_path="${schemaName}",public`,
  );
  return databaseUrl.toString();
}

function startApi(
  port: number,
  databaseUrl: string,
  seed?: string,
): RunningApi {
  const child = spawn(process.execPath, [API_ENTRY], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      ...(seed ? { CALORA_RECOVERY_SUMMARY_REHEARSAL_SEED: seed } : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  let stopPromise: Promise<{ code: number | null; output: string }> | undefined;

  function waitForOutput(pattern: RegExp, timeoutMs = 15_000): Promise<void> {
    if (pattern.test(output)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${pattern}: ${output}`));
      }, timeoutMs);
      const onData = () => {
        if (!pattern.test(output)) return;
        cleanup();
        resolve();
      };
      const cleanup = () => {
        clearTimeout(timeout);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
      };
      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
      child.once("exit", (code, signal) => {
        cleanup();
        reject(
          new Error(
            `API exited before emitting ${pattern} (code=${code}, signal=${signal}): ${output}`,
          ),
        );
      });
    });
  }

  async function stop(): Promise<{ code: number | null; output: string }> {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      if (child.exitCode !== null) {
        return { code: child.exitCode, output };
      }
      child.kill("SIGTERM");
      const code = await new Promise<number | null>((resolve, reject) => {
        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error(`API did not stop gracefully: ${output}`));
        }, 15_000);
        child.once("exit", (exitCode, signal) => {
          clearTimeout(timeout);
          if (signal) {
            reject(new Error(`API stopped with signal ${signal}: ${output}`));
          } else {
            resolve(exitCode);
          }
        });
      });
      return { code, output };
    })();
    return stopPromise;
  }

  return {
    child,
    get output() {
      return output;
    },
    waitForOutput,
    stop,
  };
}

async function waitForHealth(port: number): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      if (response.status === 200) return;
    } catch {
      // The child is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy on port ${port}`);
}

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "recovery summary rolling restart rehearsal",
  () => {
    let pool: (typeof import("@workspace/db"))["pool"];
    let schemaName: string;
    let qualifiedSummaryTable: string;
    let databaseUrl: string;
    let oldApi: RunningApi | undefined;
    let replacementApi: RunningApi | undefined;

    beforeAll(async () => {
      if (!existsSync(API_ENTRY)) {
        throw new Error(
          "The rolling-restart rehearsal requires a current API build in artifacts/api-server/dist.",
        );
      }

      ({ pool } = await import("@workspace/db"));
      schemaName = `calora_summary_restart_${randomUUID().replaceAll("-", "")}`;
      const quotedSchema = `"${schemaName}"`;
      qualifiedSummaryTable = `${quotedSchema}.calora_recovery_warning_summaries`;
      databaseUrl = databaseUrlForSchema(schemaName);

      const client = await pool.connect();
      try {
        await client.query(`CREATE SCHEMA ${quotedSchema}`);
        await client.query(`
          CREATE TABLE ${qualifiedSummaryTable} (
            cohort_key text PRIMARY KEY NOT NULL,
            correlation_keys jsonb NOT NULL,
            suppressed_cycle_count integer NOT NULL,
            first_seen_at timestamptz NOT NULL,
            updated_at timestamptz NOT NULL
          )
        `);
      } finally {
        client.release();
      }
    });

    afterAll(async () => {
      await oldApi?.stop().catch(() => undefined);
      await replacementApi?.stop().catch(() => undefined);
      if (pool && schemaName) {
        await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        await pool.end();
      }
    });

    it("keeps the summary visible across a graceful process replacement and stays fail-open", async () => {
      const rawCohortKey =
        "recovery:raw-account-id:provider-unavailable:response-details";
      const expectedCohortKey = createHash("sha256")
        .update(rawCohortKey)
        .digest("hex");
      const oldPort = 31_000 + Math.floor(Math.random() * 1_000);
      const replacementPort = oldPort + 1;

      oldApi = startApi(oldPort, databaseUrl, rawCohortKey);
      await waitForHealth(oldPort);

      let seededRow: SummaryRow | undefined;
      const seedDeadline = Date.now() + 15_000;
      while (Date.now() < seedDeadline) {
        const result = await pool.query<SummaryRow>(
          `SELECT cohort_key, correlation_keys, suppressed_cycle_count
             FROM ${qualifiedSummaryTable}`,
        );
        seededRow = result.rows[0];
        if (seededRow) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(seededRow).toMatchObject({
        cohort_key: expectedCohortKey,
        correlation_keys: ["0123456789abcdef"],
        suppressed_cycle_count: 1,
      });

      const oldExit = await oldApi.stop();
      expect(oldExit.code).toBe(0);
      await expect(
        oldApi.waitForOutput(/API shutdown complete/),
      ).resolves.toBeUndefined();

      // Simulate the reporting window expiring while the replacement is
      // being rolled out. The process was stopped well before the real
      // 15-minute cadence; only the persisted clock is advanced here so
      // this rehearsal remains fast and deterministic.
      await pool.query(
        `UPDATE ${qualifiedSummaryTable}
           SET first_seen_at = NOW() - INTERVAL '16 minutes',
               updated_at = NOW()`,
      );

      replacementApi = startApi(replacementPort, databaseUrl);
      await waitForHealth(replacementPort);
      await replacementApi.waitForOutput(
        /Account deletion recovery warnings remain suppressed/,
      );

      expect(replacementApi.output).toContain(expectedCohortKey);
      expect(replacementApi.output).toContain("suppressedCycleCount");
      expect(replacementApi.output).toContain("suppressedCohortCount");
      expect(replacementApi.output).not.toContain(rawCohortKey);
      expect(replacementApi.output).not.toContain("provider-unavailable");
      expect(replacementApi.output).not.toContain("response-details");

      // The summary table is reporting-only. Removing it after startup
      // models an outage while the API remains available for recovery work.
      await pool.query(`DROP TABLE ${qualifiedSummaryTable}`);
      const healthAfterStoreFailure = await fetch(
        `http://127.0.0.1:${replacementPort}/api/healthz`,
      );
      expect(healthAfterStoreFailure.status).toBe(200);
    }, 60_000);
  },
);
