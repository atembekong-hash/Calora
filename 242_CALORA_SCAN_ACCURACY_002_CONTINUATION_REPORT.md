# 242 â€” CAL-SCAN-ACCURACY-002 Continuation Report

**Branch:** `fix/scan-accuracy-002`
**Base preliminary commit:** `7668493ad01298e799b0da88dbb231e94de047e9`
**Scope:** bounded benchmark construction, validation-gate repair, and provider-gated measurement harness. No production deployment, database mutation, native build, installation, merge, or store action occurred.

## Benchmark v1

Created `benchmarks/cal-scan-accuracy-002-v1` with 68 meals and approximately 9.7 MB of local files:

- 58 original resized images from `vlm-food-benchmark`, selected deterministically from six anonymized participants, with up to 10 images per participant. Each row retains the published item names and weighed grams.
- 10 original overhead RGB images from Nutrition5k, selected without downloading the full archive. Each selected row retains dish-level calories, fat, carbohydrate, protein, ingredient names, and ingredient grams where present.
- Source labels, participant mapping, selected Nutrition5k metadata, a machine-readable manifest, and attribution notes are included.

The subset is deliberately not described as globally representative. It contains no African dishes. The VLM source is a European university-canteen sample, while Nutrition5k documents a limited set of California cafeteria data. This is useful for repeatable regression testing but insufficient for a US launch accuracy claim or global-food claim.

### Licensing and attribution

The VLM repository states that its dataset images, labels, and model outputs are licensed under CC BY 4.0 [1]. Nutrition5k states that its data are released under Creative Commons 4.0 and provides its CVPR citation [2]. The benchmark preserves both source URLs, license labels, and paper attributions in `benchmarks/cal-scan-accuracy-002-v1/ATTRIBUTION.md` and `metadata/manifest.json`.

The complete Nutrition5k archive is listed as 181.4 GB by its README [2] and was not downloaded. Only 10 individual RGB objects and the small metadata CSVs needed for the selected dish rows were retrieved.

## Measurement harness

Added:

- `scripts/run-capture-benchmark.mjs`
- `scripts/evaluate-capture-benchmark.mjs`

The runner requires both `CALORA_BENCHMARK_API_URL` and `CALORA_BENCHMARK_AUTH_TOKEN`. It refuses to run without an explicitly supplied authorized non-production endpoint and token. It enforces a maximum of 100 calls per run and a persistent combined budget through `CALORA_BENCHMARK_COMBINED_BUDGET_USD`, `CALORA_BENCHMARK_ESTIMATED_COST_USD`, and `runs/budget-ledger.json`. A second run cannot exceed the original ledger budget. The runner sends the original images to Calora's existing `/v1/capture/analyze` endpoint and records HTTP status, latency, raw response, and benchmark reference metadata.

The evaluator computes only metrics supported by the references:

- Identity overlap against published item names.
- Total portion mean absolute error in grams where weighed portions exist.
- Calories, protein, carbohydrate, and fat absolute error only for rows with published nutrition references.
- HTTP success rate and latency.

Unavailable references remain `null`. They are never treated as zero. The evaluator does not claim a nutrition score for the 58 VLM rows because those labels do not publish calories or macronutrients.

## Accuracy measurement result

No provider calls were made. The environment has no `OPENAI_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL`, or `CALORA_API_URL`, and no authorized non-production endpoint/token was supplied through the environment. The runner exited with its expected safety status and did not invoke a provider.

Therefore, current accuracy, before/after accuracy, latency, and provider cost are **not measured**. No numerical result is invented. The benchmark and harness are ready for a bounded run as soon as an authorized non-production endpoint and token are present.

## CAL-SCAN-ACCURACY-003 access investigation

The local repository contains only an environment-variable contract; no staging URL, test database, Supabase test configuration, or provider credential is present. The authenticated Railway connector was queried read-only and returned `Unauthorized; please login with railway login`; no project or environment inventory could be obtained. No production endpoint was used as a substitute.

Minimum owner action: authenticate the Railway CLI/connector and identify a non-production environment, then provision a least-privilege test account/token and provider key in that environment's secret manager. The owner should provide only the endpoint and short-lived benchmark token through a secure credential mechanism, never in chat or source control. The exact benchmark command must also set a combined budget, for example `CALORA_BENCHMARK_COMBINED_BUDGET_USD=...`, before either baseline or repeat run.

## TypeScript validation-gate resolution

The earlier API type failure was not source-level database API drift. The workspace junction pointed at the canonical `lib/db` source, but ignored generated declarations in `lib/db/dist/index.d.ts` were stale and omitted `CaloraDatabase` and `createDatabaseFromClient`.

Rebuilding the database project regenerated the declarations. The API-server typecheck then passed. To prevent a clean local/API validation invocation from depending on stale ignored output, `artifacts/api-server/package.json` now runs a `pretypecheck` build for the database, API Zod, and OpenAI integration declaration projects before its existing `typecheck` command.

## Validation evidence

- `tsc -b lib/db/tsconfig.json artifacts/api-server/tsconfig.json --pretty false`: **passed**.
- API capture regression suite: **66/66 passed**.
- Benchmark runner and evaluator: Node syntax validation **passed**.
- Benchmark integrity: 68 metadata rows, 58 VLM images, 10 Nutrition5k images, approximately 9.7 MB.
- Benchmark runner without credentials: safely refused to run; no external provider call occurred.

## Nutrition improvement status

The preliminary provenance correction remains active from commit `7668493a`: model output cannot upgrade a photo estimate to USDA/FatSecret-verified nutrition, and photo results carry explicit assumption and identity/portion review context.

No new database-reconciliation algorithm was added in this continuation because there is no measured provider output and no authorized non-production provider endpoint. Adding a USDA/FatSecret match from unverified model names without observing actual benchmark errors would be speculative and could silently convert uncertain visual guesses into false verified nutrition. The existing user-editable photo estimate remains preserved.

The next evidence-based implementation step is to run the same 68 images through the current scanner, inspect the failure distribution, and then add only the smallest reconciliation rule supported by those failures. The same images must be run again after that change.

## Final status

**CONDITIONAL / BLOCKED FOR ACCURACY CERTIFICATION.**

The benchmark and validation infrastructure are complete, the API type gate is repaired, and the safety/provenance improvements are validated. Actual accuracy improvement and before/after measurement remain blocked by the absence of an authorized non-production provider endpoint and token. The benchmark also requires an additional African-food subset before any broader cuisine-coverage claim can be made.

No PR was opened or merged, and the branch was not deployed.

## References

[1]: https://raw.githubusercontent.com/Metabolic-Intelligence-Lab/vlm-food-benchmark/main/LICENSE-DATA "VLM Food Benchmark dataset license"
[2]: https://github.com/google-research-datasets/Nutrition5k "Nutrition5k repository, dataset contents, download scope, and license"

