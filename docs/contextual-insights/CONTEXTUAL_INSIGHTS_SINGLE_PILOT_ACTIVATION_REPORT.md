# Contextual Insights Single-Pilot Activation Report

## Final activation verdict

**FAIL — NO ACTIVATION PERFORMED**

The activation preflight failed before any production control was changed.
Calora remained in its existing deny-all state.

## Production release identity

| Field | Verified value |
| --- | --- |
| Git commit | `560e655f86508686970c093c44f22d66a1d7014f` |
| Source tree | `60ac4e67a8eb5fb2bd512264229cb9849f8455d5` |
| Source digest | `f6884a117ce6d6badeb20ffe5ee42603309014dbaa3dc1e611a6d0cef2e99327` |
| Release ID | `calora-api-560e655f8650-20260824120117614` |
| Release identity verification | passed |
| Production health | passed |

The canonical production HTTPS `/api/version` and `/api/healthz` checks passed
for the reviewed release identity immediately before the attempted activation.

## Before-state safeguards

| Control | State |
| --- | --- |
| Fact Context global rollout | `false` |
| Active reviewed `coach_fact_context_v1` memberships | `0` |
| Active Fact Context nonces | `0` |
| Deployment health | healthy |
| Release identity | exact match |

## Pilot eligibility preflight

The server-side Supabase Admin check did **not** establish exactly one dedicated
pilot account that simultaneously had both required server-owned pilot markers,
was active, and was unbanned.

No account identifier, credential, or metadata value is recorded in this report.

## Activation sequence

No membership was created. The Fact Context master rollout was not enabled.
`COACH_FACT_CONTEXT_ENABLED` was not changed. No publish, restart, provider
request, RevenueCat action, or unrelated-account mutation occurred.

## End-to-end and negative authorization evidence

No pilot end-to-end provider request was sent because preflight failed. No
negative non-pilot request was sent. The existing deny-all route state was
preserved; no Legacy Coach fallback was introduced.

## Rollback verification

Rollback is immediately available and no action was required because the
pre-existing deny-all state remained in place:

- global rollout is `false`;
- active reviewed pilot membership count is `0`;
- active nonce count is `0`; and
- the process gate was not changed.

## Errors or anomalies

The only anomaly was dedicated-pilot preflight failure. The required
single-account active-and-unbanned eligibility condition was not proven, so the
activation stopped before mutation.