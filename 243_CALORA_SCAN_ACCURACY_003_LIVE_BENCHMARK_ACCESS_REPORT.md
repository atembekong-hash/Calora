# 243 Ã¢â‚¬â€ CAL-SCAN-ACCURACY-003 Live Benchmark Access Report

**Branch:** `fix/scan-accuracy-002`
**Mission:** Unlock live benchmark testing
**Status:** BLOCKED at safe staging-access boundary; no provider calls made.

## Investigation completed

The repository's API environment contract was inspected. A runnable non-production scanner requires, at minimum:

- An isolated `DATABASE_URL` with no production customer data.
- Supabase URL and server-side verification settings for an authenticated test account.
- Server-side AI integration base URL and API key.
- A bounded provider spending control.
- A reachable API URL and short-lived benchmark authentication token.

No values for the benchmark endpoint, benchmark token, OpenAI/provider key, Supabase URL, database URL, or API URL are present in the current environment. Repository `.env.example` files contain names only and no deployable values.

The Railway account was authenticated successfully as `atembekong@gmail.com`. The account contains a Calora project named `attractive-harmony` with services `@workspace/api-server`, `Calora`, and `@workspace/calora`, but it has exactly one environment: `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`). All three services are healthy; no non-production Railway environment exists. The API service is configured only for the production source and has 26 defined variables. No production variables or secret values were read.

Railway usage was checked before provisioning. The workspace usage limit is unset; current-period workspace usage is **$41.78189344568556** with an estimated bill of **$55.436715751487554**. Railway exposes an agent hard limit of **$20**, but not a project-specific hard cap matching the approved $5 Railway allowance. Setting a workspace-wide cap would affect existing production projects and is not authorized. Because the approved Railway spending limit cannot be enforced without risking production or changing shared billing controls, no Railway environment was created.

The separate Supabase account check found the healthy `caloraapp` project with only its default `main` branch; no development branch exists. A branch would incur $0.01344/hour, and the owner explicitly declined its creation. No production database or customer records were queried.

The repository contains no local mock provider that could produce genuine scanner measurements. Existing capture tests use fixtures and mocks; they are suitable for contract regression but cannot establish food-recognition or nutrition accuracy.

## Safety improvements completed

The benchmark runner now enforces:

- A maximum of 100 calls per run.
- A persistent combined spending ceiling across baseline and repeat runs.
- A budget ledger stored under the benchmark's `runs/` directory.
- Refusal when the requested run estimate would exceed the combined ceiling.
- Refusal when endpoint, token, or budget settings are absent.

No provider call occurs before these checks succeed.

## Current evidence

- TypeScript declaration repair and API typecheck: passed.
- API capture regressions: 66/66 passed.
- Benchmark: 68 meals, approximately 9.7 MB.
- Genuine baseline accuracy: **not measured**.
- Genuine latency/cost: **not measured**.
- Production impact: none.
- Database mutations: none.
- Deployments/native builds: none.

## Exact minimum owner action

1. Owner must authorize creation of a separate Railway non-production environment (or provide an existing one); production is the only current environment.
2. Owner must authorize an isolated non-production database. The existing Supabase `caloraapp` project has no development branch, and branch creation was explicitly declined.
3. Add a least-privilege test account and short-lived token through the non-production environment's secret manager.
4. Configure a provider key and explicit combined spending ceiling.
5. Supply only the non-production API URL and short-lived benchmark token through a secure credential-entry mechanism, not chat, source control, logs, or screenshots.

After that action, the existing runner can execute the 68-image baseline and, if justified by measured failures, one repeat run within the same combined budget. The output will preserve raw responses, HTTP failures, latency, model/provider configuration, and reference-aware metrics.

## Verdict

**BLOCKED Ã¢â‚¬â€ enforceable-cost and credential boundary.** The mission cannot honestly claim first accuracy measurements without an isolated non-production endpoint, database, authentication token, provider access, and a Railway cost limit that is enforceable without affecting production. No Railway or Supabase paid resource was created, no provider call was made, and no production resource was changed.

