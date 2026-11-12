import { describe, expect, it, vi } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runDirectVisionCase } from "../lib/directVisionBenchmarkAdapter.js";

// Resolve from this test file, not process.cwd(): PowerShell and Vitest may
// start from C:\, the repository root, or the API package directory.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const benchmarkDir = resolve(
  process.env.CALORA_BENCHMARK_DIR ?? join(repoRoot, "benchmarks", "cal-scan-accuracy-002-v1"),
);
const outputDir = join(benchmarkDir, "runs");

vi.mock("@workspace/db", () => ({
  db: { insert: vi.fn(), transaction: vi.fn() },
  pool: { query: vi.fn() },
  aiCaptureSessionsTable: {},
  aiCaptureCandidatesTable: {},
}));
vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: vi.fn(),
}));
vi.mock("../lib/user-rows.js", () => ({ ensureUserRow: vi.fn() }));
vi.mock("../lib/rate-limit.js", () => ({ checkRateLimit: vi.fn() }));
vi.mock("../lib/account-deletion-state.js", () => ({
  accountDeletionFenceSignal: vi.fn(),
  classifyAccountDeletionError: vi.fn(() => false),
}));
vi.mock("../lib/database-identity.js", () => ({
  withVerifiedDatabaseIdentity: vi.fn(),
}));
vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  safeErrorDetails: vi.fn(() => ({ errorClass: "test" })),
}));

type BenchmarkRow = {
  benchmark_id: string;
  local_image: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  nutrition_status: string;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += char;
  }
  values.push(value);
  return values;
}

async function readRows(): Promise<BenchmarkRow[]> {
  const csv = await readFile(join(benchmarkDir, "metadata", "benchmark.csv"), "utf8");
  return csv.trim().split(/\r?\n/).slice(1).map(parseCsvLine).map((values) => ({
    benchmark_id: values[0] ?? "",
    local_image: values[3] ?? "",
    calories: values[7] ?? "",
    protein_g: values[8] ?? "",
    carbs_g: values[9] ?? "",
    fat_g: values[10] ?? "",
    nutrition_status: values[11] ?? "",
  }));
}

describe("direct OpenAI vision smoke benchmark", () => {
  it("resolves the authoritative 68-meal manifest and first three image files without credentials", async () => {
    const manifest = JSON.parse(await readFile(join(benchmarkDir, "metadata", "manifest.json"), "utf8")) as { sample_count?: number };
    const allRows = await readRows();
    expect(manifest.sample_count).toBe(68);
    expect(allRows).toHaveLength(68);
    const rows = allRows.slice(0, 3);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      const imagePath = join(benchmarkDir, row.local_image);
      await expect(readFile(imagePath)).resolves.toBeInstanceOf(Buffer);
    }
  });

  it.skipIf(process.env.CALORA_DIRECT_BENCHMARK_ALLOW !== "1")("runs exactly three benchmark images through the production analyzer", async () => {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is required for the paid smoke test");
    }
    if (process.env.CALORA_DIRECT_BENCHMARK_ALLOW !== "1") {
      throw new Error("Set CALORA_DIRECT_BENCHMARK_ALLOW=1 in the secure launcher");
    }
    const { analyzeFoodPhoto } = await import("../routes/capture.js");

    const rows = (await readRows()).slice(0, 3);
    if (rows.length !== 3) throw new Error(`Expected three smoke rows, found ${rows.length}`);
    const results = [];
    for (const row of rows) {
      const result = await runDirectVisionCase(
        {
          benchmarkId: row.benchmark_id,
          imagePath: join(benchmarkDir, row.local_image),
          imageMimeType: row.local_image.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
          reference: {
            calories: row.calories || null,
            protein_g: row.protein_g || null,
            carbs_g: row.carbs_g || null,
            fat_g: row.fat_g || null,
            nutrition_status: row.nutrition_status,
          },
        },
        analyzeFoodPhoto,
      );
      results.push(result);
    }

    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `direct-openai-smoke-${new Date().toISOString().replaceAll(":", "-")}.json`);
    await writeFile(outputPath, JSON.stringify({
      version: "cal-scan-accuracy-005-direct-openai",
      model: "gpt-5.6-terra",
      endpoint_kind: "direct-openai",
      executed_calls: results.length,
      results,
    }, null, 2));
    console.log(JSON.stringify({ outputPath, executedCalls: results.length, model: "gpt-5.6-terra" }));
    expect(results).toHaveLength(3);
    for (const result of results) expect(result.analysis.title).toBeTruthy();
  }, 120_000);
});
