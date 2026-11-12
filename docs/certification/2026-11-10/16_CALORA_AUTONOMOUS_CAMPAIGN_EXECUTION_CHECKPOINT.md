# Calora Autonomous Campaign — Execution Checkpoint

**Date:** 2026-11-10
**Current protected main:** `c2b46da7526ebdb31bf286f0ef9a577567729b4c`
**Scope:** Current executable validation after the campaign discovery checkpoint

## Completed protected checkpoints

The following evidence reports were created, checked, and merged through protected main:

| PR | Merge SHA | Evidence |
|---|---|---|
| #445 | `3c396b1b1bfb3fb7e4b6382b902d5eff39e62144` | Capture/input validation, 207 client and 64 API capture tests; provider/database/device evidence remains partial |
| #446 | `7c885725c84993876c1d3bb195057379de543eae` | Coach/Progress/wellness validation, 118 client and 62 API tests; native/provider/RLS evidence remains partial |
| #447 | `8468f21c573576ffa2eabd0724752c4154435bc8` | Health/commercial validation; fixed a flaky invalid-signature fixture, then passed 5 repeated webhook runs and 573/573 offline API tests |
| #448 | `5a9761d20b825aef5218e886a818ae26d95bd04b` | Security/release contracts, 7/7 source security tests; real-schema suites correctly skip without PostgreSQL |
| #449 | `c2b46da7526ebdb31bf286f0ef9a577567729b4c` | Startup/auth/onboarding/profile/customization validation, 215/215 client tests |

## Current validation evidence

The capture cluster passed 207/207 focused client tests and 64/64 API tests. Coach, Progress, fasting, hydration, and steps passed 118/118 client tests and 62/62 API tests. Health and commercial client coverage passed 57/57, while RevenueCat API contract/emulator/webhook coverage passed 24/24; the two database-backed webhook tests were skipped because no disposable PostgreSQL environment was available. The corrected webhook invalid-signature regression passed 5/5 in five repeated runs. The full offline API suite passed 573/573. Startup/auth/onboarding/profile/customization coverage passed 215/215 across 19 files. Source security/provenance contracts passed 7/7.

## Classification

No cluster reaches full VERIFIED launch certification from this sandbox evidence alone. Capture, Coach/Progress/wellness, Health, and persistence are **PARTIAL**. RevenueCat lifecycle and backend security/release certification remain **BLOCKED** until their required external evidence is current. Startup/auth/customization has strong bounded source/UI evidence but remains unverified for native and production behavior.

## Remaining genuine blockers

A reachable disposable PostgreSQL environment is required for the skipped non-BYPASSRLS tenant-isolation, sync, saved-state, webhook, deletion, and recovery rehearsals. Current production role/grant state, applied migration state, service/worker identities, serving SHA/build digest, observability, recovery/RPO/RTO, and provider configuration still require authorized attestation. The documented staged-RLS Coach rate-limit-table boundary remains unresolved until a current real-handler rehearsal proves its disposition.

Current signed Android/iOS candidates require physical Galaxy S20 and iOS/TestFlight execution for health, capture, Coach, Progress, fasting, hydration, steps, restart/background/timezone, accessibility, and cross-device journeys. RevenueCat still requires provider-approved purchase, restore, renewal, expiration, billing-failure/grace, refund/revocation, account-switch, and cross-device lifecycle evidence. These are not substituted by mocks, source tests, healthy endpoints, or queued build records.

## Safety and release disposition

No production database mutation, customer-data query, provider mutation, native build, store submission, credential change, or deployment was performed in this checkpoint. The campaign is **CONDITIONAL / NO-GO for full launch certification** until the external database, device, provider, production-provenance, recovery, and commercial gates are executed under their respective authorizations.
