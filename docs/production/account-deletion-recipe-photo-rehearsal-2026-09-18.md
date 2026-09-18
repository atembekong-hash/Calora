# Account-deletion recipe-photo rehearsal

**Date:** 2026-09-18
**Environment:** Production-like configured API workflow before public release
**Verdict:** PASS

## Controlled run

One freshly created and confirmed disposable Auth identity generated one generic
recipe photo through the authenticated API. It was then removed through
`DELETE /api/v1/account`.

No real user account was used. This record intentionally excludes account
identifiers, email addresses, access tokens, passwords, image references,
image bytes, signed URLs, storage bucket names, and health data.

## Retained aggregate evidence

| Check | Result |
| --- | ---: |
| Disposable identities created for the final rehearsal | 1 |
| Generated recipe photos | 1 |
| Recipe-photo prefix objects listed before erasure | 1 |
| Recipe-photo prefix objects remaining after erasure | 0 |
| Account deletion response | 1 × HTTP 200 |
| Auth identities remaining after deletion | 0 |
| Terminal database deletion state | `deleted` |
| Terminal database stage | `auth` |
| Recovery external identity retained after completion | no |

The API’s sanitized operational log recorded
`Recipe photo object erasure completed` with `objectCount: 1` and
`remainingObjectCount: 0` immediately before the successful account-deletion
response. The erasure adapter re-lists the exact account-owned
`private/recipe-photos/<external-user-id>/` prefix after all deletes and fails
closed if any objects remain. Recipe-photo creation holds a matching shared
account lock from its final writable-state check through upload; deletion holds
the matching exclusive lock, so it cannot report successful erasure while an
already-admitted upload could still add an object.

## Stage completion

The terminal database checkpoint is reached only in this order:

1. Bounded private storage erasure and empty-prefix verification.
2. Application-data deletion.
3. RevenueCat deletion verification.
4. Supabase Auth deletion.
5. Terminal checkpoint completion.

The final `deleted / auth` checkpoint with no recovery identity therefore
confirms that the application, RevenueCat, and Supabase Auth stages completed
for the disposable account. The prior disposable account created while
diagnosing storage access was also recovered and deleted through the same
fenced account-deletion path; its recovery log recorded an empty photo prefix.

## Validation

- `pnpm --filter @workspace/api-server exec vitest run src/__tests__/recipe-photo-storage.test.ts src/__tests__/recipe-generation.test.ts src/__tests__/account.test.ts`
  — 35 tests passed.
- `pnpm --filter @workspace/api-server exec tsc -p tsconfig.json --noEmit`
  — passed.
- `git diff --check` — passed.

## Result

Account deletion removes the generated recipe photo, confirms the private
recipe-photo prefix is empty, and reaches the completed database, RevenueCat,
and Supabase Auth stages without retaining user health or image data in this
evidence.