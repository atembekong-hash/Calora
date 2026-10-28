# CALORA FINAL PRODUCTION RECOVERY AND ROOT-CAUSE CLOSURE

Date: 2026-10-28
Repository: `atembekong-hash/Calora`
Railway project: `attractive-harmony`
API service: `@workspace/api-server`

## 1. Executive verdict

- **ROOT_CAUSE_PARTIALLY_PROVEN**
- **REPAIR_VALIDATED_OFFLINE**
- **CLIENT_STARTUP_UNVERIFIED**
- **PRODUCTION_BLOCKED_EXTERNAL** for the complete authenticated Android/web recovery proof

The production API deployment path has recovered. Both public API domains currently serve the protected verifier-repair release `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`; health/readiness is HTTP 200 and unauthenticated profile access is the expected HTTP 401. Railway build and deployment logs now exist and show the exact protected commit being fetched, verified, built, and started.

This does **not** prove complete recovery of authenticated startup. No authorized disposable authenticated identity or physical Android verification was available in this mission, and no native build, OTA update, credentialed request, or customer-data access was authorized. Therefore the final success criterion—valid session restoration, existing profile retrieval, synchronization, historical-data preservation, and navigation to Today—remains unverified.

## 2. Current protected source and serving release

Protected main after PR #254:

- Merge commit: `10361f9586a83f88a3da3d77a93d458e490e2101`
- PR: [#254](https://github.com/atembekong-hash/Calora/pull/254)
- PR #253 verifier repair commit: `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`

The API `/api/version` attestation on both domains reported:

- `gitCommit`: `efe059aab0c33d31907f6cba2cd9a9bd91d76c38`
- `sourceTree`: `8b884f804b94f1984d5dccc7b896b9cffced7b8a`
- `releaseId`: `calora-api-efe059aab0c3-20261028190050265`

The documentation-only PR #254 changed the repository head but did not change the API source tree relative to PR #253. Railway’s service source metadata remained pinned to the PR #253 API commit for the live deployment.

## 3. Railway deployment reality

Railway production service inventory at verification:

- `@workspace/api-server`: healthy/live; current deployment sequence included:
  - `e7722a4f-4d79-44b3-81e1-b60da432197c` — successful build/deploy for `efe059a...`
  - `0824226f-a194-4aad-ae96-c3d4b553bb4e` — duplicate queued deployment later completed successfully for the same `efe059a...` commit
- `@workspace/calora`: successful deployment, separate companion web responsibility
- `Calora`: deployment activity present as a separate service; it is not the API service used for `/api/version` and `/api/v1/profile`

The Railway build logs for both successful API deployments contain the protected-commit equality check and release attestation. The successful deployment log includes:

```text
fetch --depth=1 origin efe059aab0c33d31907f6cba2cd9a9bd91d76c38
reset --hard FETCH_HEAD
test "$(git rev-parse HEAD)" = "efe059aab0c33d31907f6cba2cd9a9bd91d76c38"
```

The official Railway status page currently reports Railway dashboard, API, builds, and deployments as operational. Its remaining notice concerns the support/community site, not production deployment execution.

No new deployment was triggered by this mission.

## 4. Public production evidence

Both domains were checked independently:

- `https://mycaloraapp.com/api/healthz` → HTTP 200, `{"status":"ok"}`
- `https://app.mycaloraapp.com/api/healthz` → HTTP 200, `{"status":"ok"}`
- Both `/api/version` responses matched `efe059a...`
- Both `/api/v1/profile` requests without credentials → HTTP 401, `Please sign in to view your profile.`

This is evidence that the repaired anonymous-auth boundary is live. It is not evidence of valid-token acceptance or profile retrieval.

## 5. Root-cause closure

The earlier forensic reports established the following causal chain with high confidence:

1. The original verifier path could initialize before rejecting a missing or malformed bearer credential.
2. Supabase verifier configuration and Auth-provider failures could escape as ordinary exceptions.
3. The application could therefore emit HTTP 500 instead of a bounded authentication response.
4. The client startup path treated unresolved Auth/session/profile operations as blocking work, allowing an indefinite loading state.
5. The exact historical production trigger—specific missing value, malformed value, project mismatch, stale token, provider outage, or database/profile failure—cannot be reconstructed from the available sanitized evidence.

The exact runtime trigger remains unavailable because raw credentials, JWTs, raw provider responses, customer profiles, and a valid authenticated disposable request were not available or authorized.

The root cause is therefore **ROOT_CAUSE_PARTIALLY_PROVEN**, not proven as one specific production configuration value.

## 6. Implemented startup-liveness repair

The protected feature branch restores and adapts the previously reviewed bounded-startup implementation. The change is intentionally narrow:

- Adds `withTimeout` with a typed `PromiseTimeoutError`.
- Bounds Supabase `getSession()` during session restoration.
- Bounds encrypted local-state hydration.
- Bounds profile GET/PUT/delete request execution through the API client’s existing `timeoutMs` support.
- Bounds session checks, token acquisition, and forced token refresh used by profile requests.
- Preserves stale-bootstrap generation checks and identity guards.
- Does not treat timeout, 500, 503, or transport failure as a missing profile.
- Keeps retry explicit and bounded rather than introducing automatic retry loops.
- Preserves local data and exposes the existing explicit recovery UI/state paths.

The old implementation was not blindly cherry-picked: the diff against current protected main was reviewed and showed these exact timeout protections had been removed by the rollback. No UI redesign, database migration, package upgrade, or unrelated behavior was added.

## 7. Validation evidence

### API

Command:

```bash
DATABASE_URL='postgres://synthetic:test@127.0.0.1:5432/calora' \
AI_INTEGRATIONS_OPENAI_BASE_URL='http://127.0.0.1:9/v1' \
AI_INTEGRATIONS_OPENAI_API_KEY='synthetic-test-key' \
pnpm run test:offline
```

Result: **43 test files, 547 tests passed**.

This reconciles the earlier 546-versus-547 discrepancy: the current protected API source reports 547 passing tests under the exact command above.

### Client focused tests

```bash
pnpm exec vitest run \
  lib/__tests__/withTimeout.test.ts \
  lib/__tests__/profileSync.test.ts \
  --pool=threads --no-file-parallelism --maxWorkers=1
```

Result: **2 files, 10 tests passed**.

### Client TypeScript

```bash
pnpm run typecheck:libs
pnpm run typecheck
```

Result: **passed**.

### Client security/web tests

```bash
node --test \
  server/serve.security.cjs \
  server/serve-web.test.cjs \
  scripts/build-web.test.mjs \
  scripts/expo-config-authority.test.cjs \
  scripts/health-connect-privacy-policy.test.cjs
```

Result: **28 tests passed**.

### Full client suite

The full client run executed **157 test files and 1,688 tests passed** before reporting 20 worker-start errors. The errors are all the same sandbox/runtime incompatibility:

```text
TypeError: Cannot read properties of undefined (reading 'bind')
undici@8.12.2/lib/interceptor/decompress.js
```

The failure occurs while Vitest starts jsdom workers and is independent of the liveness changes. The affected AuthContext regression could not execute in this sandbox for the same reason. It remains in the protected branch and should run in the repository’s supported CI environment.

## 8. Security and data-preservation review

- No production secret values were printed, exported, or written to reports.
- No JWTs, bearer tokens, customer profiles, raw provider errors, signed URLs, or image bytes were accessed.
- No customer records were reset, deleted, recreated, migrated, or overwritten.
- No database schema or storage change was made.
- No native Android/iOS/EAS build, OTA update, app-store submission, or unrelated production deployment was triggered.
- The repair remains fail-closed for authentication and preserves the distinction between invalid authentication, dependency unavailability, missing profile, and unexpected application failure.

The earlier Railway terminal-exposure/security-incident concerns remain rotation-plan items only. No credential rotation or revocation was authorized in this mission.

## 9. Remaining blockers and exact owner actions

Complete recovery requires one separate owner-authorized validation step after the liveness repair is merged and deployed:

1. Permit an API-only deployment of the merged startup-liveness repair.
2. Provide or authorize one disposable non-customer identity for a bounded authenticated profile/sync check, or authorize an equivalent existing protected QA identity.
3. Verify a valid-token `/api/v1/profile` response, profile synchronization, and no unrelated database changes.
4. Deliver the client JavaScript through the project’s approved mobile/web release path. A new Android native build is required if the installed APK does not already contain the repaired client code; no build was triggered here because native-build authorization is separate.
5. On the owner’s Android device and web client, verify cold start, warm start, session restoration, offline/slow-backend recovery, profile preservation, synchronization, and navigation to Today.

Until those actions occur, the correct final state is **PRODUCTION_BLOCKED_EXTERNAL** and **CLIENT_STARTUP_UNVERIFIED**, not full production recovery.

## 10. Final closure statement

The Railway deployment incident has cleared sufficiently for the protected verifier repair to build, start, and serve. The anonymous authentication boundary is now externally verified as HTTP 401 rather than HTTP 500. The lost startup-liveness safeguards have been restored in a narrow, tested feature change.

The historical trigger remains only partially provable, and authenticated production plus Android startup remain unverified. No stronger claim is warranted without the owner-controlled identity/device validation described above.
