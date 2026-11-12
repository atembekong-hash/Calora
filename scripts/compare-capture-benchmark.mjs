#!/usr/bin/env node
import fs from "node:fs/promises";

const [baselinePath, postPath] = process.argv.slice(2);
if (!baselinePath || !postPath) throw new Error("Usage: node scripts/compare-capture-benchmark.mjs <baseline.json> <post-correction.json>");
const baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
const post = JSON.parse(await fs.readFile(postPath, "utf8"));
const postById = new Map(post.results.map((item) => [item.benchmark_id, item]));
const rows = baseline.results.filter((item) => item.benchmark_id !== "N5K-1558030724").map((before) => {
  const after = postById.get(before.benchmark_id);
  if (!after) return { benchmark_id: before.benchmark_id, status: "missing-post-result" };
  return { benchmark_id: before.benchmark_id, before: summarize(before), after: summarize(after), delta: delta(summarize(before), summarize(after)) };
});
const report = {
  version: "cal-scan-accuracy-008-before-after",
  baseline_model: baseline.model,
  post_model: post.model,
  primary_case_count: rows.length,
  baseline_cost_usd: sum(rows.map((row) => row.before.estimated_cost_usd)),
  post_correction_cost_usd: sum(rows.map((row) => row.after?.estimated_cost_usd)),
  aggregate: aggregate(rows),
  per_meal: rows,
  note: "Structural safeguard changes are reported separately from model-accuracy changes; this comparison does not attribute causality to an individual prompt or normalization change."
};
const outputPath = postPath.replace(/\.json$/i, ".comparison.json");
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputPath, primaryCaseCount: rows.length, aggregate: report.aggregate }, null, 2));

function summarize(item) {
  const components = Array.isArray(item.response?.components) ? item.response.components : [];
  const names = components.map((component) => String(component.name ?? ""));
  const referenceNames = String(item.reference.known_items ?? "").split(" | ").filter(Boolean);
  const identityRecall = referenceNames.length ? referenceNames.filter((name) => names.some((predicted) => tokenOverlap(predicted, name) >= 0.5)).length / referenceNames.length : null;
  const weights = components.filter((component) => component.servingWeightG !== null && component.servingWeightG !== undefined && component.servingWeightG !== "").map((component) => Number(component.servingWeightG)).filter(Number.isFinite);
  const referenceWeights = String(item.reference.portion_grams ?? "").split(" | ").map(Number).filter(Number.isFinite);
  const portionMaeG = weights.length && referenceWeights.length ? Math.abs(sum(weights) - sum(referenceWeights)) : null;
  const nutrition = {};
  for (const key of ["calories", "protein_g", "carbs_g", "fat_g"]) {
    const predictedKey = key === "calories" ? "calories" : key.replace("_g", "G");
    const predicted = sum(components.map((component) => Number(component[predictedKey] ?? 0)));
    const reference = Number(item.reference[key]);
    nutrition[key] = Number.isFinite(reference) && String(item.reference.nutrition_status ?? "").includes("reference") ? { absolute_error: Math.abs(predicted - reference), percentage_error: reference === 0 ? null : Math.abs(predicted - reference) / Math.abs(reference) * 100, predicted, reference } : null;
  }
  const lowConfidence = components.filter((component) => Number(component.confidenceDimensions?.identity) < 70 || /\b(likely|possible|unknown|unclear|or)\b/i.test(String(component.name))).length;
  const duplicateCount = components.length - new Set(components.map((component) => `${normalize(component.name)}|${component.servingWeightG ?? ""}|${component.calories}|${component.proteinG}|${component.carbsG}|${component.fatG}`)).size;
  return { identity_recall: identityRecall, portion_mae_g: portionMaeG, structured_weight_count: weights.length, known_weight_total_g: weights.length ? sum(weights) : null, nutrition, component_count: components.length, low_confidence_components: lowConfidence, duplicate_components: duplicateCount, latency_ms: item.latency_ms, estimated_cost_usd: item.estimated_cost_usd };
}
function aggregate(rows) {
  const completed = rows.filter((row) => row.after);
  const result = { completed_cases: completed.length, missing_post_cases: rows.filter((row) => !row.after).length };
  for (const side of ["before", "after"]) {
    result[side] = {
      identity_recall_mean: mean(completed.map((row) => row[side].identity_recall)),
      portion_mae_g_mean: mean(completed.map((row) => row[side].portion_mae_g)),
      latency_ms_mean: mean(completed.map((row) => row[side].latency_ms)),
      low_confidence_components: sum(completed.map((row) => row[side].low_confidence_components)),
      duplicate_components: sum(completed.map((row) => row[side].duplicate_components)),
      structured_weight_count: sum(completed.map((row) => row[side].structured_weight_count)),
      nutrition_mae: Object.fromEntries(["calories", "protein_g", "carbs_g", "fat_g"].map((key) => [key, mean(completed.map((row) => row[side].nutrition[key]?.absolute_error))]))
    };
  }
  result.delta = { identity_recall_mean: result.after.identity_recall_mean - result.before.identity_recall_mean, portion_mae_g_mean: Number.isFinite(result.after.portion_mae_g_mean) && Number.isFinite(result.before.portion_mae_g_mean) ? result.after.portion_mae_g_mean - result.before.portion_mae_g_mean : null, low_confidence_components: result.after.low_confidence_components - result.before.low_confidence_components, duplicate_components: result.after.duplicate_components - result.before.duplicate_components };
  return result;
}
function delta(before, after) { return { identity_recall: after.identity_recall - before.identity_recall, portion_mae_g: nullableDelta(before.portion_mae_g, after.portion_mae_g), calories_absolute_error: nullableDelta(before.nutrition.calories?.absolute_error, after.nutrition.calories?.absolute_error), protein_absolute_error: nullableDelta(before.nutrition.protein_g?.absolute_error, after.nutrition.protein_g?.absolute_error), carbs_absolute_error: nullableDelta(before.nutrition.carbs_g?.absolute_error, after.nutrition.carbs_g?.absolute_error), fat_absolute_error: nullableDelta(before.nutrition.fat_g?.absolute_error, after.nutrition.fat_g?.absolute_error), latency_ms: after.latency_ms - before.latency_ms } }
function nullableDelta(a, b) { return Number.isFinite(a) && Number.isFinite(b) ? b - a : null; }
function normalize(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " "); }
function tokenOverlap(a, b) { const left = new Set(normalize(a).split(" ").filter((token) => token.length > 2)); const right = new Set(normalize(b).split(" ").filter((token) => token.length > 2)); if (!left.size || !right.size) return 0; if ([...right].every((token) => left.has(token)) || [...left].every((token) => right.has(token))) return 1; return [...left].filter((token) => right.has(token)).length / Math.max(left.size, right.size); }
function sum(values) { return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0); }
function mean(values) { const valid = values.filter(Number.isFinite); return valid.length ? sum(valid) / valid.length : null; }
