# CAL-QA-20 / CAL-QA-21 / CAL-QA-22 / CAL-QA-24 Security and Release Validation

**Date:** 2026-11-10
**Source basis:** protected main after `8468f21c573576ffa2eabd0724752c4154435bc8`
**Scope:** security contracts, tenant-isolation gates, source provenance, release attestation, and opt-in real-schema integration behavior

The current source/security contract run passed **7/7 tests**. These checks covered security-function hardening, least-privilege staged-RLS prototype boundaries, identity assertion rejection, verified-identity executor use, sync/referral grant-path visibility, absence of broad privileged fallback, and database/Auth source provenance.

The tenant-isolation and sync real-schema suites were run in their safe default mode and explicitly skipped **11/11 database-backed tests** because no reachable disposable PostgreSQL integration environment was available. An earlier attempt with `CALORA_RUN_DB_INTEGRATION_TESTS=true` and a loopback port intentionally failed at connection/configuration boundaries; those failures are not tenant-isolation assertions and are not counted as evidence.

Classifications remain **BLOCKED** for full CAL-QA-20/21/22/24 certification. Current source contracts are healthy, but API-wide non-BYPASSRLS execution, production roles/grants/migrations, service/worker identities, current serving provenance, recovery evidence, and native/provider/commercial evidence remain unverified. No database mutation, production configuration change, deployment, native build, or store submission was performed.

**Verdict: BLOCKED for full security/release certification; bounded source-contract validation PASS.**
