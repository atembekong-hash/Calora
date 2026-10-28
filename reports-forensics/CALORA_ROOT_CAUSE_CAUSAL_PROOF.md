# Calora Root-Cause Causal Proof

## Causal graph
1. The profile route invokes Supabase bearer verification before its own 401 branch (`artifacts/api-server/src/routes/profile.ts:84-100`).
2. In the pre-repair behavior, verifier setup/configuration or Auth-provider failure could throw before token validation; the generic request handler returned HTTP 500. The preserved P0 report explicitly records this behavior.
3. The resulting profile failure could block client startup/profile reconciliation. The earlier startup report and current client source support a contributing liveness risk: `AuthContext.tsx:125-143` awaits session restore, while `profileSync.ts:151-169` awaits remote profile operations; `custom-fetch.ts:427-463` applies no deadline unless `timeoutMs` is explicitly supplied.
4. `c3b0549` repairs the API classification: bearer presence is checked before verifier initialization, bounded non-secret failure codes are emitted, and `app.ts:110-114` returns 503 for verifier errors.
5. Railway queue state blocked independent proof that the repair reached production.

## What is proven
The API failure mechanism is strongly supported at source and preserved-report level: verifier/configuration or Auth availability failure could surface as an unclassified profile HTTP 500 before token validation. The repair behavior is source-supported and offline-test-supported. The client indefinite-wait risk is statically proven as a residual/contributing risk.

## What is not proven
The exact missing/malformed variable, wrong Supabase project, invalid key, transient Auth outage, or other runtime trigger is not distinguishable without protected runtime state. The profile/settings redesign is not proven to have caused the backend verifier fault. The client deadlock is not proven to be the first production trigger. Database, migration, RLS, and profile-row defects are not proven. Serving SHA after PR #253 and an authenticated production result are not available.

## Verdict
`ROOT_CAUSE_PARTIALLY_PROVEN; REPAIR_VALIDATED_OFFLINE; PRODUCTION_BLOCKED_EXTERNAL`. A narrow mechanism is proven, but a complete live causal chain from deployment/runtime condition to first customer request is not.