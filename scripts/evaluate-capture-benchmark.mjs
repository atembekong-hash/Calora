#!/usr/bin/env node
import fs from "node:fs/promises";

const runPath = process.argv[2];
if (!runPath) throw new Error("Usage: node scripts/evaluate-capture-benchmark.mjs <run.json>");
const run = JSON.parse(await fs.readFile(runPath, "utf8"));
const evaluated = run.results.map((item) => {
  const components = Array.isArray(item.response?.components) ? item.response.components : [];
  const predictedNames = components.map((component) => String(component.name ?? "").toLowerCase());
  const referenceNames = String(item.reference.known_items ?? "").split(" | ").filter(Boolean).map((name) => name.toLowerCase());
  const identityRecall = referenceNames.length === 0 ? null : referenceNames.filter((name) => predictedNames.some((predicted) => tokenOverlap(predicted, name) >= 0.5)).length / referenceNames.length;
  const predictedPortions = components.map((component) => Number(component.servingWeightG)).filter(Number.isFinite);
  const referencePortions = String(item.reference.portion_grams ?? "").split(" | ").map(Number).filter(Number.isFinite);
  const portionMaeG = predictedPortions.length && referencePortions.length ? Math.abs(predictedPortions.reduce((sum, value) => sum + value, 0) - referencePortions.reduce((sum, value) => sum + value, 0)) : null;
  const nutrition = {};
  for (const key of ["calories", "protein_g", "carbs_g", "fat_g"]) {
    const predicted = Number(components.reduce((sum, component) => sum + Number(component[key.replace("_g", "G")] ?? component[key] ?? 0), 0));
    const reference = Number(item.reference[key]);
    nutrition[key] = Number.isFinite(reference) && item.reference.nutrition_status.includes("reference") ? { absolute_error: Math.abs(predicted - reference), predicted, reference } : null;
  }
  return { benchmark_id: item.benchmark_id, status: item.status, latency_ms: item.latency_ms, identity_recall: identityRecall, portion_mae_g: portionMaeG, nutrition };
});
const numericMean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const metric = (key, subset = evaluated) => numericMean(subset.map((item) => item[key]).filter(Number.isFinite));
const nutritionRows = evaluated.filter((item) => Object.values(item.nutrition).some(Boolean));
const report = {
  version: run.version,
  executed_calls: run.executed_calls,
  estimated_cost_usd: run.estimated_cost_usd,
  http_success_rate: evaluated.length ? evaluated.filter((item) => item.status === 200).length / evaluated.length : null,
  mean_latency_ms: metric("latency_ms"),
  identity_recall_mean: metric("identity_recall"),
  portion_mae_g_mean: metric("portion_mae_g"),
  nutrition_reference_rows: nutritionRows.length,
  nutrition_mae: Object.fromEntries(["calories", "protein_g", "carbs_g", "fat_g"].map((key) => [key, metricNested(nutritionRows, key)])),
  note: "Null means the published benchmark did not provide the required reference or the scanner did not return a comparable field; null is not treated as zero.",
  per_item: evaluated,
};
const outputPath = runPath.replace(/\.json$/i, ".evaluation.json");
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputPath, nutritionReferenceRows: nutritionRows.length, identityRecallMean: report.identity_recall_mean, portionMaeGMean: report.portion_mae_g_mean }, null, 2));

function metricNested(items, key) { return numericMean(items.map((item) => item.nutrition[key]?.absolute_error).filter(Number.isFinite)); }
function tokenOverlap(a, b) { const left = new Set(a.split(/\W+/).filter((token) => token.length > 2)); const right = new Set(b.split(/\W+/).filter((token) => token.length > 2)); if (!left.size || !right.size) return 0; return [...left].filter((token) => right.has(token)).length / Math.max(left.size, right.size); }
