import { describe, expect, it, vi } from "vitest";
import { mkdir, readFile, writeFile, access, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runDirectVisionCase } from "../lib/directVisionBenchmarkAdapter.js";
import { createBudgetLedger, recordBudget, reserveBudget, validateBudgetLedger, type DirectVisionBudgetLedger } from "../lib/directVisionBudget.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const benchmarkDir = resolve(
  process.env.CALORA_BENCHMARK_DIR ?? join(repoRoot, "benchmarks", "cal-scan-accuracy-002-v1"),
);
const runsDir = join(benchmarkDir, "runs");
const variant = process.env.CALORA_DIRECT_BENCHMARK_VARIANT === "post-correction" ? "post-correction" : "baseline";
const isPostCorrection = variant === "post-correction";
const outputPath = join(runsDir, isPostCorrection ? "direct-openai-nutrition5k-post-correction.json" : "direct-openai-nutrition5k-baseline.json");
const checkpointPath = join(runsDir, isPostCorrection ? "direct-openai-nutrition5k-post-correction.partial.json" : "direct-openai-nutrition5k-baseline.partial.json");
const ledgerPath = join(runsDir, "direct-openai-budget-ledger.json");
const budgetUsd = Number(process.env.CALORA_DIRECT_BENCHMARK_BUDGET_USD ?? "8");
const reservationUsd = Number(process.env.CALORA_DIRECT_BENCHMARK_RESERVATION_USD ?? "0.50");

vi.mock("@workspace/db", () => ({
  db: { insert: vi.fn(), transaction: vi.fn() },
  pool: { query: vi.fn() },
  aiCaptureSessionsTable: {},
  aiCaptureCandidatesTable: {},
}));
vi.mock("../lib/supabase-auth.js", () => ({ verifyBearerToken: vi.fn() }));
vi.mock("../lib/user-rows.js", () => ({ ensureUserRow: vi.fn() }));
vi.mock("../lib/rate-limit.js", () => ({ checkRateLimit: vi.fn() }));
vi.mock("../lib/account-deletion-state.js", () => ({
  accountDeletionFenceSignal: vi.fn(),
  classifyAccountDeletionError: vi.fn(() => false),
}));
vi.mock("../lib/database-identity.js", () => ({ withVerifiedDatabaseIdentity: vi.fn() }));
vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  safeErrorDetails: vi.fn(() => ({ errorClass: "test" })),
}));

type Row = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value);
  return values;
}

async function readRows(): Promise<Row[]> {
  const csv = await readFile(join(benchmarkDir, "metadata", "benchmark.csv"), "utf8");
  const headers = parseCsvLine(csv.trim().split(/\r?\n/)[0]);
  return csv.trim().split(/\r?\n/).slice(1).map(parseCsvLine).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function readLedger(): Promise<DirectVisionBudgetLedger> {
  try {
    return validateBudgetLedger(JSON.parse(await readFile(ledgerPath, "utf8")), budgetUsd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return createBudgetLedger(budgetUsd);
    throw new Error(`Budget ledger is damaged or invalid: ${(error as Error).message}`);
  }
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(runsDir, { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, path);
}

type Checkpoint = {
  version: "cal-scan-accuracy-006-partial" | "cal-scan-accuracy-008-post-correction-partial";
  budgetUsd: number;
  results: Array<Record<string, unknown>>;
};

async function readCheckpoint(): Promise<Checkpoint> {
  try {
    const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;
    const expectedVersion = isPostCorrection ? "cal-scan-accuracy-008-post-correction-partial" : "cal-scan-accuracy-006-partial";
    if (checkpoint.version !== expectedVersion || checkpoint.budgetUsd !== budgetUsd || !Array.isArray(checkpoint.results)) throw new Error("Checkpoint schema is damaged");
    return checkpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: isPostCorrection ? "cal-scan-accuracy-008-post-correction-partial" : "cal-scan-accuracy-006-partial", budgetUsd, results: [] };
    throw new Error(`Nutrition5k checkpoint is damaged or invalid: ${(error as Error).message}`);
  }
}

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

describe("direct OpenAI Nutrition5k baseline", () => {
  it("selects all 10 Nutrition5k rows and verifies their references and images without credentials", async () => {
    const manifest = JSON.parse(await readFile(join(benchmarkDir, "metadata", "manifest.json"), "utf8")) as { nutrition5k_count?: number };
    const rows = (await readRows()).filter((row) => row.source_dataset.trim().toLowerCase() === "nutrition5k");
    expect(manifest.nutrition5k_count).toBe(10);
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row.benchmark_id).toMatch(/^N5K-/);
      expect(row.known_items).toBeTruthy();
      expect(row.nutrition_status).toContain("reference");
      for (const value of [row.calories, row.protein_g, row.carbs_g, row.fat_g]) {
        expect(Number.isFinite(Number(value))).toBe(true);
      }
      const imagePath = join(benchmarkDir, row.local_image);
      await expect(readFile(imagePath)).resolves.toBeInstanceOf(Buffer);
    }
  });

  it("selects nine valid Nutrition5k rows for post-correction scoring without credentials", async () => {
    const rows = (await readRows()).filter((row) => row.source_dataset.trim().toLowerCase() === "nutrition5k" && row.benchmark_id !== "N5K-1558030724");
    expect(rows).toHaveLength(9);
    expect(rows.some((row) => row.benchmark_id === "N5K-1558030724")).toBe(false);
    for (const row of rows) await expect(readFile(join(benchmarkDir, row.local_image))).resolves.toBeInstanceOf(Buffer);
  });

  it("rejects damaged ledgers and reservations that exceed the configured ceiling", () => {
    expect(() => validateBudgetLedger({ schemaVersion: 1, budgetUsd, recordedCostUsd: 2, runs: [], pending: [] }, budgetUsd)).toThrow("total does not match");
    const ledger = createBudgetLedger(1);
    expect(() => reserveBudget(ledger, "N5K-test", 1.01)).toThrow("exceed");
    reserveBudget(ledger, "N5K-test", 0.5);
    expect(() => reserveBudget(ledger, "N5K-test-2", 0.51)).toThrow("exceed");
    expect(recordBudget(ledger, "N5K-test", 0.75)).toBe(true);
    expect(ledger.recordedCostUsd).toBe(0.75);
  });

  it.skipIf(process.env.CALORA_DIRECT_BENCHMARK_SKIP_PAID === "1")("runs each of the 10 Nutrition5k cases once with usage and budget evidence", async () => {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is required");
    if (process.env.CALORA_DIRECT_BENCHMARK_ALLOW !== "1") throw new Error("Set CALORA_DIRECT_BENCHMARK_ALLOW=1");
    if (await fileExists(outputPath)) throw new Error(`Baseline already exists; refusing to repeat: ${outputPath}`);
    if (!Number.isFinite(reservationUsd) || reservationUsd <= 0 || reservationUsd > budgetUsd) throw new Error("Invalid conservative per-request reservation");

    const { analyzeFoodPhoto } = await import("../routes/capture.js");
    const rows = (await readRows()).filter((row) => row.source_dataset.trim().toLowerCase() === "nutrition5k" && (!isPostCorrection || row.benchmark_id !== "N5K-1558030724"));
    expect(rows).toHaveLength(isPostCorrection ? 9 : 10);
    const ledger = await readLedger();
    if (ledger.halted) throw new Error(`Benchmark is halted pending reconciliation: ${ledger.halted.reason}`);
    if (ledger.budgetUsd > budgetUsd) throw new Error("Existing ledger budget exceeds configured budget");
    if (ledger.recordedCostUsd >= budgetUsd) throw new Error("Local cumulative budget is exhausted");
    const runStartCostUsd = ledger.recordedCostUsd;

    const checkpoint = await readCheckpoint();
    const completedIds = new Set<string>(checkpoint.results.map((result) => String(result.benchmark_id ?? "")));
    for (const checkpointResult of checkpoint.results) {
      const benchmarkId = String(checkpointResult.benchmark_id ?? "");
      const ledgerBenchmarkId = String(checkpointResult.ledger_benchmark_id ?? (isPostCorrection ? `post-correction:${benchmarkId}` : benchmarkId));
      if (!benchmarkId) throw new Error("Checkpoint contains a result without a benchmark ID");
      if (!ledger.runs.some((run) => run.benchmarkId === ledgerBenchmarkId)) {
        const matchingPending = ledger.pending.find((pending) => pending.benchmarkId === ledgerBenchmarkId);
        if (!matchingPending) throw new Error(`Checkpoint result ${benchmarkId} has no ledger reservation`);
        const cost = Number(checkpointResult.estimated_cost_usd);
        recordBudget(ledger, ledgerBenchmarkId, cost);
        await writeJsonAtomic(ledgerPath, ledger);
      }
    }
    const checkpointIds = new Set(checkpoint.results.map((result) => String(result.benchmark_id ?? "")));
    const unresolvedPending = ledger.pending.filter((pending) => !checkpointIds.has(pending.benchmarkId));
    if (unresolvedPending.length > 0) {
      throw new Error(`Unresolved provider reservations require reconciliation before retry: ${unresolvedPending.map((pending) => pending.benchmarkId).join(", ")}`);
    }
    const results = [...checkpoint.results];
    for (const row of rows) {
      if (completedIds.has(row.benchmark_id)) continue;
      const ledgerBenchmarkId = isPostCorrection ? `post-correction:${row.benchmark_id}` : row.benchmark_id;
      if (ledger.runs.some((run) => run.benchmarkId === ledgerBenchmarkId)) throw new Error(`Ledger contains a completed call without a checkpoint for ${row.benchmark_id}; reconcile before retrying`);
      if (!ledger.pending.some((pending) => pending.benchmarkId === ledgerBenchmarkId)) {
        reserveBudget(ledger, ledgerBenchmarkId, reservationUsd);
      }
      await writeJsonAtomic(ledgerPath, ledger);
      const result = await runDirectVisionCase(
        {
          benchmarkId: row.benchmark_id,
          imagePath: join(benchmarkDir, row.local_image),
          imageMimeType: row.local_image.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
          reference: {
            known_items: row.known_items,
            portion_grams: row.portion_grams,
            calories: row.calories,
            protein_g: row.protein_g,
            carbs_g: row.carbs_g,
            fat_g: row.fat_g,
            nutrition_status: row.nutrition_status,
          },
        },
        analyzeFoodPhoto,
        { inputUsdPerMillionTokens: 2, outputUsdPerMillionTokens: 12 },
      );
      if (result.estimatedCostUsd === null || result.estimatedCostUsd === undefined) {
        throw new Error(`Provider returned no token usage for ${row.benchmark_id}; stopping before the next paid call`);
      }
      const completedResult = {
        benchmark_id: row.benchmark_id,
        ledger_benchmark_id: ledgerBenchmarkId,
        status: 200,
        latency_ms: result.latencyMs,
        response: result.analysis,
        reference: result.reference,
        provider_usage: result.provider,
        estimated_cost_usd: result.estimatedCostUsd,
      };
      results.push(completedResult);
      await writeJsonAtomic(checkpointPath, { ...checkpoint, results });
      const reservationOverrun = recordBudget(ledger, ledgerBenchmarkId, result.estimatedCostUsd);
      await writeJsonAtomic(ledgerPath, ledger);
      if (reservationOverrun) {
        ledger.halted = {
          benchmarkId: ledgerBenchmarkId,
          reason: `Actual provider cost exceeded the $${reservationUsd.toFixed(2)} reservation`,
          haltedAt: new Date().toISOString(),
        };
        await writeJsonAtomic(ledgerPath, ledger);
        throw new Error(`Actual provider cost for ${row.benchmark_id} exceeded the $${reservationUsd.toFixed(2)} reservation; stopping before another request`);
      }
    }

    await writeJsonAtomic(outputPath, {
      version: isPostCorrection ? "cal-scan-accuracy-008-nutrition5k-post-correction" : "cal-scan-accuracy-006-nutrition5k-baseline",
      model: "gpt-5.6-terra",
      endpoint_kind: "direct-openai",
      executed_calls: results.length,
      estimated_cost_usd: ledger.recordedCostUsd - runStartCostUsd,
      budget_usd: budgetUsd,
      results,
    });
    console.log(JSON.stringify({ outputPath, executedCalls: results.length, estimatedCostUsd: ledger.recordedCostUsd - runStartCostUsd, cumulativeCostUsd: ledger.recordedCostUsd, budgetRemainingUsd: budgetUsd - ledger.recordedCostUsd }));
    expect(results).toHaveLength(isPostCorrection ? 9 : 10);
  }, 900_000);
});
