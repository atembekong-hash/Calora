# Final Sync Metadata TypeScript Fix Report

**Date:** 2026-08-27  
**Final verdict:** **PASS**

## Original error

The standalone API TypeScript check failed at `artifacts/api-server/src/routes/sync.ts:308`:

```text
Property 'syncMetadata' does not exist on type
'{ clientId: string | null; captureSessionId: string | null; entryDate: string;
meal: string; name: string; serving: string; provenance: string; calories: string;
proteinG: string; carbsG: string; ...; updatedAt: Date; }'.
```

The failing expression was:

```ts
...row.syncMetadata
```

## Root cause

The access in `sync.ts` was correct. The inferred row type was stale.

`serializeDiaryRecord` accepts `typeof diaryEntriesTable.$inferSelect`, and the route's final query performs an unrestricted Drizzle selection from `diaryEntriesTable`. Therefore its row contract should include every column declared by that table, including `syncMetadata`.

The source schema already declared:

- Drizzle property: `syncMetadata`
- PostgreSQL column: `sync_metadata`
- Type: a bounded object containing optional `time`, `fiber`, `sugar`, `sodium`, `preparation`, `memoryId`, `plannerMealId`, and `sourceRecipeId`
- Constraint: non-null
- Default: empty JSON object

The committed migration also already created `sync_metadata` as non-null `jsonb` with an empty-object default.

However, the generated and Git-ignored declaration at `lib/db/dist/schema/index.d.ts` was dated 2026-08-22, while the source schema was updated on 2026-08-27. The stale declaration omitted `syncMetadata`. A direct API-only `tsc -p` consumed that stale project-reference output and inferred the outdated diary row shape.

The repository's canonical `typecheck` command first runs `tsc --build` for workspace libraries and then checks artifacts. Rebuilding the existing project references regenerated the database declaration with the correct `syncMetadata` column and row type.

## Evidence supporting the diagnosis

Source and persistence contracts agreed before any fix:

- `lib/db/src/schema/index.ts` defined `syncMetadata`.
- `lib/db/migrations/0002_cross_device_diary_restore.sql` defined `sync_metadata jsonb DEFAULT '{}'::jsonb NOT NULL`.
- `artifacts/api-server/src/routes/sync.ts` writes `sync_metadata` during insert and update.
- The same route selects the complete `diaryEntriesTable` row before serialization.
- The live database reported exactly one `sync_metadata` column with:
  - PostgreSQL type `jsonb`
  - `is_nullable = NO`
  - empty-object JSONB default
- Existing real-database integration coverage verifies metadata create, restore, edit, conflict, retry, and delete behavior.

Generated-type evidence:

- Before rebuild, `lib/db/dist/schema/index.d.ts` had no `syncMetadata` property in `diaryEntriesTable`.
- After the canonical library build, it included a non-null, defaulted `PgJsonb` `syncMetadata` column with the same optional-property shape as the source schema.
- A standalone API typecheck then passed without modifying `sync.ts`.

## Exact files changed

No application source, schema, migration, API contract, or test file was changed for this fix.

Tracked documentation files created or updated:

- `FINAL_SYNC_METADATA_TYPESCRIPT_FIX_REPORT.md`
- `.agents/memory/MEMORY.md`
- `.agents/memory/project-reference-typechecks.md`

Generated, Git-ignored build outputs were refreshed by the existing TypeScript build:

- `lib/db/dist/schema/index.d.ts`
- `lib/db/tsconfig.tsbuildinfo`
- `artifacts/api-server/.tsbuildinfo`

## Exact fix

Ran the repository's canonical library-first TypeScript build through:

```text
pnpm run typecheck
```

This executed `pnpm run typecheck:libs`, which runs `tsc --build` for the referenced workspace libraries before checking application packages. It regenerated the stale `@workspace/db` declaration and then checked every configured artifact and script package.

After regeneration, the standalone API typecheck was run again and passed.

No compiler suppression, `any`, assertion, fabricated property, query change, schema change, or migration was used.

## Why the fix is type-safe

The regenerated inferred type comes directly from the existing Drizzle table declaration. It does not widen the type manually or override compiler knowledge.

The compiler now sees the same contract at all layers:

1. PostgreSQL column: non-null `jsonb`
2. Migration: non-null `jsonb` with empty-object default
3. Drizzle schema: typed `syncMetadata` object, non-null, defaulted
4. Query: complete `diaryEntriesTable` selection
5. Serializer: `typeof diaryEntriesTable.$inferSelect`
6. Response: spreads only the allowlisted persisted metadata object

## Tests added or changed

None.

The root cause did not expose missing runtime coverage. Existing focused real-database tests already exercise and assert the full allowlisted metadata round trip. Adding a behavioral test would not prevent a stale generated declaration; the canonical repository typecheck is the correct validation for that build-state issue.

## Focused test results

Command scope:

- `src/__tests__/sync.test.ts`
- `src/__tests__/sync.integration.test.ts`

Result:

- 2 test files passed
- 27 tests passed
- 0 failed

The integration tests ran against the real configured schema.

## API typecheck result

**PASS**

The standalone API command completed successfully after the library declaration rebuild:

```text
pnpm --filter @workspace/api-server run typecheck
```

The original `row.syncMetadata` compiler error is gone.

## Repository-wide typecheck result

**PASS**

```text
pnpm run typecheck
```

All configured checks completed successfully:

- Workspace library project references
- API server
- Calora mobile app
- FatSecret gateway
- Mockup sandbox
- Workspace scripts

No additional TypeScript errors were exposed.

## API test results

**PASS**

- 30 test files passed
- 1 intentionally skipped
- 380 tests passed
- 4 intentionally skipped
- 0 failed

## Production build result

**PASS**

The API production build completed successfully and emitted the server bundle and source maps.

## `git diff --check` result

**PASS**

No whitespace errors were reported.

## Regression and security assessment

This fix changes generated compiler state only. It does not change executable behavior.

Confirmed unchanged:

- Authentication remains required before sync processing.
- User identity still comes from the verified bearer token.
- All diary reads remain scoped to the authenticated internal user ID.
- Capture-session ownership checks remain scoped to that user.
- Upsert uniqueness remains scoped by user and client ID.
- Deletes remain scoped by user and client ID.
- Mutation claims, advisory locking, idempotency, stale-write handling, conflicts, validation, and transaction boundaries are unchanged.
- Only the existing allowlisted metadata keys are parsed, persisted, and returned.
- No metadata is exposed outside the authenticated user's sync response.
- No database record was modified as part of the type repair.
- No schema push, migration, destructive operation, or public API contract change occurred.
- RevenueCat files and behavior were not modified.

## Remaining errors or blockers

None.

## Final verdict

**PASS**

The original `syncMetadata` error was genuinely resolved by restoring the correct generated project-reference type. Both the standalone API typecheck and complete repository-wide typecheck now pass without suppressing or bypassing the compiler.