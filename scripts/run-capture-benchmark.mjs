#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const root = process.cwd();
const benchmarkDir = path.resolve(process.env.CALORA_BENCHMARK_DIR ?? "benchmarks/cal-scan-accuracy-002-v1");
const endpoint = process.env.CALORA_BENCHMARK_API_URL;
const token = process.env.CALORA_BENCHMARK_AUTH_TOKEN;
const maxCalls = Number.parseInt(process.env.CALORA_BENCHMARK_MAX_CALLS ?? "68", 10);
const estimatedCostUsd = Number.parseFloat(process.env.CALORA_BENCHMARK_ESTIMATED_COST_USD ?? "0");
const combinedBudgetUsd = Number.parseFloat(process.env.CALORA_BENCHMARK_COMBINED_BUDGET_USD ?? "NaN");
const runLabel = process.env.CALORA_BENCHMARK_RUN_LABEL ?? `run-${new Date().toISOString()}`;

if (!endpoint || !token) {
  console.error("Benchmark not run: set CALORA_BENCHMARK_API_URL and CALORA_BENCHMARK_AUTH_TOKEN for an authorized non-production target.");
  process.exitCode = 2;
  process.exit();
}
if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 100) {
  throw new Error("CALORA_BENCHMARK_MAX_CALLS must be an integer from 1 to 100.");
}
if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
  throw new Error("CALORA_BENCHMARK_ESTIMATED_COST_USD must be a non-negative number.");
}
if (!Number.isFinite(combinedBudgetUsd) || combinedBudgetUsd < estimatedCostUsd) {
  throw new Error("CALORA_BENCHMARK_COMBINED_BUDGET_USD must be set and must cover this run's estimated cost.");
}

const rows = (await fs.readFile(path.join(benchmarkDir, "metadata", "benchmark.csv"), "utf8"))
  .trim().split(/\r?\n/).slice(1).map(parseCsvLine).map((values) => Object.fromEntries([
    "benchmark_id", "source_dataset", "source_image", "local_image", "participant", "known_items", "portion_grams", "calories", "protein_g", "carbs_g", "fat_g", "nutrition_status", "license",
  ].map((key, index) => [key, values[index] ?? ""])),);

const selected = rows.slice(0, Math.min(maxCalls, rows.length));
const runsDir = path.join(benchmarkDir, "runs");
await fs.mkdir(runsDir, { recursive: true });
const ledgerPath = path.join(runsDir, "budget-ledger.json");
let ledger = { version: 1, combined_budget_usd: combinedBudgetUsd, reservations: [] };
try {
  ledger = JSON.parse(await fs.readFile(ledgerPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (ledger.combined_budget_usd !== combinedBudgetUsd) {
  throw new Error(`Combined budget mismatch: ledger is ${ledger.combined_budget_usd}, requested ${combinedBudgetUsd}. Use a new benchmark directory for a new budget.`);
}
const reservedUsd = ledger.reservations.reduce((sum, reservation) => sum + reservation.estimated_cost_usd, 0);
if (reservedUsd + estimatedCostUsd > combinedBudgetUsd) {
  throw new Error(`Combined benchmark budget exceeded: reserved ${reservedUsd.toFixed(4)} + requested ${estimatedCostUsd.toFixed(4)} > ${combinedBudgetUsd.toFixed(4)}.`);
}
ledger.reservations.push({ run_label: runLabel, estimated_cost_usd: estimatedCostUsd, max_calls: selected.length, reserved_at: new Date().toISOString() });
await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
const results = [];
for (const row of selected) {
  const imagePath = path.join(benchmarkDir, row.local_image);
  const imageBase64 = (await fs.readFile(imagePath)).toString("base64");
  const started = performance.now();
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/v1/capture/analyze`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "food", imageBase64, imageMimeType: imagePath.endsWith(".png") ? "image/png" : "image/jpeg", clientSessionId: `benchmark-${row.benchmark_id}` }),
  });
  const latencyMs = Math.round(performance.now() - started);
  const body = await response.json().catch(() => ({}));
  results.push({ benchmark_id: row.benchmark_id, source_dataset: row.source_dataset, status: response.status, latency_ms: latencyMs, reference: row, response: body });
}

const output = { version: "cal-scan-accuracy-002-v1", run_label: runLabel, endpoint, max_calls: maxCalls, executed_calls: results.length, estimated_cost_usd: estimatedCostUsd, combined_budget_usd: combinedBudgetUsd, reserved_before_run_usd: reservedUsd, results };
const outputPath = path.join(benchmarkDir, "runs", `run-${new Date().toISOString().replaceAll(":", "-")}.json`);
await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ outputPath, executedCalls: results.length, estimatedCostUsd }, null, 2));

function parseCsvLine(line) {
  const values = []; let value = ""; let quoted = false;
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
