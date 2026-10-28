# Calora Authentication Trace

## Evidence boundary
Repository source, tests, and supplied reports only. No production credentials, customer tokens, live Auth requests, production database records, builds, or deployments were accessed by this synthesis.

## Server request path
`artifacts/api-server/src/routes/profile.ts:84-100` calls `verifyBearerToken` before returning 401, then maps the Supabase identity through `ensureUserRow`, reads the profile, returns 404 when absent, and serializes a 200 response. The route does not accept a client-supplied user ID.

At `artifacts/api-server/src/lib/supabase-auth.ts:139-156`, the current code extracts a Bearer token before verifier initialization (`140-144`), returns null for missing/malformed/invalid credentials (`141-142`, `155-156`), throws bounded `SupabaseVerifierError` codes for missing configuration or Auth unavailability (`15-27`, `144-153`), and resolves identity from `auth.getUser`. `artifacts/api-server/src/app.ts:99-115` maps those errors to generic HTTP 503 while retaining generic 500 for unrelated exceptions.

The pre-repair defect is supported by the preserved report and prior source/history: verifier initialization could occur before bearer rejection, allowing configuration/provider failures to escape as unclassified HTTP 500.

## Client path
`artifacts/calora/context/AuthContext.tsx:98-202` has explicit restore states, generation guards, listener cleanup, and recovery error state. `artifacts/calora/lib/profileSync.ts:22-49,132-169` guards account identity before token acquisition/send/retry and treats only 404 as absent profile; 500/503 and transport errors remain failures. `lib/api-client-react/src/custom-fetch.ts:412-425,482-499` attaches the current token and performs at most one forced-refresh retry after 401.

## Offline evidence
Supplied evidence records profile tests 7/7, client profile-sync 8/8, session-storage 9/9, root-gate 5/5, and API networking 6/6 passing in focused runs; final API run records 43/43 files and 547/547 tests. The direct verifier suite was locally blocked once by the repository import-time `DATABASE_URL` guard and AuthContext integration tests by a jsdom/undici worker-startup issue; a separate synthetic run records verifier 12/12 after a localhost placeholder with no database connection.

## Verdict
`ROOT_CAUSE_PARTIALLY_PROVEN; REPAIR_VALIDATED_OFFLINE; PRODUCTION_BLOCKED_EXTERNAL`. The authentication boundary repair is source- and test-supported, but no live authenticated trace or serving artifact was verified.