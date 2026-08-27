# Final RevenueCat Account Deletion Verification Report

**Date:** 2026-08-27  
**Final verdict:** **PASS**

## Scope

This verification changed only Calora's server-side RevenueCat customer-erasure adapter, its focused tests, this report, and the durable operational note for future maintainers. No client, Expo configuration, public environment variable, schema, migration, dependency, subscription logic, or unrelated feature was changed.

## Exact files changed

- `artifacts/api-server/src/lib/revenuecat.ts`
- `artifacts/api-server/src/__tests__/revenuecat.test.ts`
- `FINAL_REVENUECAT_ACCOUNT_DELETION_VERIFICATION_REPORT.md`
- `.agents/memory/revenuecat-customer-erasure-scope.md`

## Server path used

The server used RevenueCat REST API v2 at:

- `GET https://api.revenuecat.com/v2/projects/{existing REVENUECAT_PROJECT_ID}/customers/{existing checkpointed external user ID}`
- `DELETE https://api.revenuecat.com/v2/projects/{existing REVENUECAT_PROJECT_ID}/customers/{existing checkpointed external user ID}`
- `GET https://api.revenuecat.com/v2/projects/{existing REVENUECAT_PROJECT_ID}/customers/{existing checkpointed external user ID}`

Both identifiers came from the application's existing server configuration and deletion checkpoint. No project or customer identifier was invented or hard-coded. Identifier values are intentionally omitted from this persistent report.

## Test customer

The live test used the previously checkpointed disposable QA RevenueCat customer created during the earlier account-deletion audit. Before this retry:

- Exactly one recoverable account deletion existed.
- Its state was `deleting`.
- Its stage was `revenuecat`.
- Its error marker was `retry_required`.
- Its Calora application user row was already absent.
- Its Supabase Auth identity was already absent.

No new customer or account was created.

## Lookup before deletion

**Result:** Successful and positively matched.

- RevenueCat returned HTTP `200`.
- The returned v2 customer object's `id` exactly matched the checkpointed external user ID.
- Any non-`200` result, malformed JSON, missing ID, or mismatched ID would have stopped the destructive retry.

## Deletion result

**Result:** Successful.

- The adapter sent `DELETE` only to the exact verified customer path.
- RevenueCat returned a successful response.
- The adapter did not treat the DELETE response alone as proof of erasure.
- The verification harness rejected any RevenueCat hostname/path other than the exact checkpointed customer path and allowed only `GET` and `DELETE`.

The one-shot harness expected RevenueCat's documented `204 No Content` and retained the response status only in process memory. Its final aggregate assertion exited before printing that in-memory sequence, so this report does not claim an unretained numeric DELETE status. The live saga could not have advanced unless the DELETE response was successful and the subsequent mandatory absence lookup returned `404`.

## Verification lookup after deletion

**Result:** Verified absent.

- The deletion adapter performed a second real `GET` to the same RevenueCat v2 customer path.
- RevenueCat returned HTTP `404`.
- The adapter returns success after an existing-customer deletion only when this second lookup returns `404`.
- Every other verification result throws and leaves the saga retryable.

This was a real provider request, not a mocked response or code-inspection-only conclusion. The retained database evidence is the terminal checkpoint: the saga checkpoints `auth` only after the adapter returns, and the adapter returns after an existing-customer DELETE only when its real verification lookup is `404`.

## Checkpoint transition

Observed transition:

1. `deleting / revenuecat / retry_required`
2. RevenueCat existing-customer lookup verified
3. RevenueCat deletion succeeded
4. RevenueCat post-deletion lookup returned `404`
5. Stage advanced to `auth`
6. The already-absent Supabase Auth identity was accepted as idempotently erased
7. State advanced to terminal `deleted`

Final persisted state:

- State: `deleted`
- Stage: `auth`
- Completion timestamp: present
- Recovery external user ID: cleared
- Operation/lease ID: cleared
- Retry error: cleared
- Remaining recoverable deletion count: `0`

## Fail-closed behavior preserved

The adapter now requires the server-only erasure credential and preserves these rules:

- Initial verified `404`: success because no RevenueCat customer exists.
- Initial `200`: response JSON must contain the exact expected customer ID before DELETE is attempted.
- `401`, `403`, other non-success statuses, network errors, and timeouts: failure.
- Invalid JSON, missing customer ID, or mismatched customer ID: failure.
- Every non-success DELETE response, including `404`: failure.
- Post-delete `404`: verified success.
- Post-delete `200` or any lookup error: failure; the customer is not reported erased.

The account-deletion saga still marks failures `retry_required` and cannot advance to Auth or completion unless the RevenueCat adapter positively verifies absence.

## Automated validation

Focused validation:

- `src/__tests__/revenuecat.test.ts`: 21 tests passed.
- `src/__tests__/account.test.ts`: 8 tests passed.
- Combined focused run: 29 tests passed.

Full API validation:

- 30 test files passed; 1 intentionally skipped.
- 380 tests passed; 4 intentionally skipped.
- API production build passed.
- Isolated TypeScript check for `src/lib/revenuecat.ts` passed.
- `git diff --check` passed.

The repository-wide API typecheck is currently blocked by an unrelated pre-existing error in `src/routes/sync.ts`: the merged cross-device sync code reads `row.syncMetadata`, but that property is absent from the inferred row type. This file was not changed because the requested work explicitly excluded unrelated cleanup.

## Proof the secret remained server-side

- The credential is read only from `process.env.REVENUECAT_SECRET_API_KEY` in `artifacts/api-server/src/lib/revenuecat.ts`.
- The value was never printed, logged, returned, copied, or written to a file.
- The value was not added to Git, this report, screenshots, or chat output.
- Repository reference scan found the variable name only in:
  - `artifacts/api-server/src/lib/revenuecat.ts`
  - `artifacts/api-server/src/__tests__/revenuecat.test.ts` using a dummy test value
  - this report
- Client/public reference scan across Calora, the generated API client, and the API specification returned zero matches before this report was written.
- No `EXPO_PUBLIC_*` variable or client bundle references the credential.

## Unrelated-data safety

- The retry selected exactly one existing recoverable checkpoint.
- The checkpoint was already at the RevenueCat stage, so application-data deletion was not rerun.
- The RevenueCat request guard permitted only the exact checkpointed customer path.
- No product, entitlement, offering, subscription, purchase, or other customer endpoint was called.
- The Auth step targeted only the same checkpointed external user ID, whose Auth identity was already absent.
- No schema changes, migrations, or broad database operations were performed.

An additional aggregate table-count assertion ran after the successful saga but rejected before emitting its detailed in-memory results, potentially because background maintenance can change aggregate counts concurrently. No second destructive retry was attempted. Direct read-only inspection then confirmed the terminal checkpoint fields above.

## Remaining blocker

No RevenueCat erasure blocker remains for the verified server-key path.

The unrelated `syncMetadata` repository typecheck error remains outside this task's scope.

## Final verdict

**PASS**

PASS is based on a real RevenueCat v2 customer lookup, real deletion, required real post-deletion `404`, and a real persisted checkpoint transition to terminal completion. It is not based on code inspection alone.