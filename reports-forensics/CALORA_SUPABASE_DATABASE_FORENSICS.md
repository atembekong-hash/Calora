# Calora Supabase and Database Forensics

## Source model
`artifacts/api-server/src/lib/supabase-auth.ts:36-50,139-173` uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for server-side public-token verification, while `SUPABASE_SERVICE_ROLE_KEY` is separately documented for account deletion. The verifier resolves the external Auth ID server-side.

`artifacts/api-server/src/routes/profile.ts:71-101` reads profiles by internal user ID, and `lib/db/src/schema/index.ts:22-53` defines `calora_users.external_id` as unique, `calora_profiles.user_id` as primary key, and a cascading foreign key. This supports the identity chain: Supabase Auth ID -> `calora_users.external_id` -> internal user ID -> `calora_profiles.user_id`.

## Proven failure and repair
The preserved P0 report states the active API returned `/api/v1/profile` HTTP 500 before token validation. The repair checks bearer syntax first, emits bounded codes `supabase_config_missing`, `supabase_config_invalid`, and `supabase_auth_unavailable`, and maps them to 503 (`supabase-auth.ts:15-27,139-156`; `app.ts:99-115`). Invalid credentials remain 401 and an authenticated account without a profile remains 404.

## Database findings
No live migration journal, schema, RLS state, permissions, profile row, duplicate row, or production database was queried. The repository model is coherent and offers no evidence of a database or profile-row defect causing the reported 500. The route's explicit 404 behavior is consistent with an absent profile, not an unhandled verifier failure.

Synthetic profile tests passed 7/7; synthetic verifier tests are reported as 12/12 with a localhost `DATABASE_URL` placeholder that made no database connection. This validates code paths only, not Supabase Auth or production PostgreSQL.

## Verdict
`ROOT_CAUSE_PARTIALLY_PROVEN; PRODUCTION_BLOCKED_EXTERNAL`. The verifier-boundary mechanism is supported; the exact runtime configuration, project alignment, Auth availability, and database state remain unverified.