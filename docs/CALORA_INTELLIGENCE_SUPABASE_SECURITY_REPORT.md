# Calora Intelligence — Supabase Security Report

## Security-stop verdict

**STOPPED WITHOUT DATABASE MUTATION.** The supplied Supabase credentials successfully reached the configured project, but the project does not expose any of the expected Calora application tables. Applying tenant RLS policies in this project would not secure the live Calora database and would create misleading security evidence.

No RLS, policy, grant, function, trigger, schema, data, account, or configuration change was made.

## Verified project and environment

| Check | Result |
| --- | --- |
| Configured Supabase project reference | `pzdulhkpwbrbrgskwwwe` |
| Connectivity | REST API reached successfully using server-side credentials without exposing their values |
| Calora identity match | PARTIAL: this reference is the one configured in Calora’s Supabase client and Auth integration |
| Project display name / account metadata | Not available through the supplied application credentials |
| Environment classification | **UNKNOWN**: no authoritative development/staging/production label is available through the supplied credentials or environment configuration |
| Safe-to-mutate determination | **NO** |

The app’s mobile configuration and server auth verifier both use this project for Supabase Auth. That proves an Auth integration relationship, not that it is the application database containing Calora data.

## Original and final live Supabase state

The following representative Calora application tables were queried through the Supabase REST interface with a zero-row metadata-safe request:

`calora_users`, `calora_profiles`, `calora_diary_entries`, `calora_weight_entries`, `calora_saved_meals`, `calora_recipes`, `calora_recipe_items`, `calora_ai_capture_sessions`, `calora_ai_capture_candidates`, `calora_subscriptions`, `calora_sync_mutations`, `calora_consent_events`, `calora_referral_codes`, `calora_referral_redemptions`, `calora_food_items`, `calora_recipe_nutrition`, `calora_capture_rate_limits`, and `calora_account_deletion_states`.

Every request returned `404 Not Found`.

| Security property | Original state | Final state |
| --- | --- | --- |
| Calora application tables in this Supabase REST schema | Not present | Unchanged |
| RLS enablement for Calora tables | Not inspectable because tables are absent | Unchanged |
| FORCE RLS | Not inspectable because tables are absent | Unchanged |
| RLS policies | Not inspectable because tables are absent | Unchanged |
| Table grants / ownership | Not inspectable through REST and tables are absent | Unchanged |
| Security-definer functions | Not inspectable through REST | Unchanged |
| Data / schema / policy changes | None | None |

## Repository-defined ownership classification

This is the intended classification from the canonical Drizzle schema, **not a claim about live Supabase objects**:

| Tables | Intended classification | Ownership model |
| --- | --- | --- |
| `calora_users`, `calora_profiles`, `calora_diary_entries`, `calora_weight_entries`, `calora_saved_meals`, `calora_recipes`, `calora_ai_capture_sessions`, `calora_subscriptions`, `calora_sync_mutations`, `calora_consent_events` | USER-OWNED | Internal `user_id` references `calora_users`; `external_id` maps to Supabase Auth identity |
| `calora_recipe_items` | USER-OWNED CHILD | `recipe_items → recipes → user_id` |
| `calora_ai_capture_candidates` | USER-OWNED CHILD | `capture_candidates → capture_sessions → user_id` |
| `calora_referral_codes`, `calora_referral_qualifications`, `calora_referral_redemptions` | SERVICE-ONLY / USER-OWNED | Use Supabase Auth external IDs; referral semantics involve one or two users and require explicit design |
| `calora_food_items`, `calora_recipe_nutrition` | SHARED READ-ONLY / SERVICE-ONLY | No direct user owner; client exposure must be explicit |
| `calora_capture_rate_limits`, `calora_account_deletion_states` | SYSTEM/OPERATIONAL | Ordinary mobile clients must not access them |

## Policies, grants, and functions

- **Policies created or changed:** none.
- **Policy logic created or changed:** none.
- **Grants reviewed:** no Calora tables exist in this Supabase REST schema; PostgreSQL catalog/grant access was not available through the provided application credentials.
- **Security-definer functions reviewed:** not available through the Supabase REST interface; no claim is made.
- **Child-resource ownership protections:** not created because the relevant child and parent tables are absent.

## Service-role audit

Repository inspection finds the service-role key used only by server-side Supabase administration in `artifacts/api-server/src/lib/supabase-admin.ts`, consumed by account-deletion handling in `artifacts/api-server/src/routes/account.ts`.

- The Expo/mobile code uses the public Supabase URL and anon key, not the service-role key.
- Server routes verify the authenticated bearer identity; request-body user IDs are not trusted for account deletion.
- The service role is used for privileged Auth user deletion, not as a client-side shortcut around data ownership.
- This static review does **not** prove deployed mobile bundles or other runtime environments are free of accidental secret exposure; no secret values were inspected or recorded.

## Cross-user and same-user tests

| Test area | Result |
| --- | --- |
| Two dedicated Supabase test identities | Not created; no Calora data tables exist in the target project |
| USER_A read/insert/update/delete against USER_B profile | BLOCKED |
| Diary, weights, saved meals, recipes, recipe items | BLOCKED |
| Capture sessions and candidates | BLOCKED |
| Consent and sync mutations | BLOCKED |
| Same-user operations | BLOCKED |
| RLS policy negative tests | BLOCKED |

No isolation claim is made without executed negative tests.

## Account-deletion validation

No Supabase database security change was made, so the existing application-side account-deletion route and database fence were not altered. The authoritative Calora data schema has previously been observed in the project’s managed PostgreSQL database, not in this Supabase REST schema. The account-deletion fence cannot be validated against this Supabase project because the relevant tables are absent.

## Repository and database changes performed

| Category | Result |
| --- | --- |
| Repository files modified | This report only |
| Supabase database changes | None |
| RLS policies enabled/created | None |
| Auth users created | None |
| Application data created/changed/deleted | None |

## Exact validation commands and results

| Operation | Result |
| --- | --- |
| Read repository auth/database configuration and schema | Confirmed Supabase Auth external ID → internal Calora user-row mapping |
| Read configured secret existence | Anon and service-role secrets are present; values were not displayed |
| Extract project reference from configured Supabase URL in a server-side process | `pzdulhkpwbrbrgskwwwe` |
| REST reachability check | PASS |
| Zero-row REST existence checks for 18 Calora tables | All returned `404 Not Found` |
| Typechecks, API suite, Calora suite, database integration tests | Not rerun: no source or application-database change was safe or appropriate after the target mismatch |
| RLS policy / two-user / account-deletion fence tests against Supabase | BLOCKED: required tables are absent |

## Remaining unknowns and risks

1. The exact environment label and project display name for project `pzdulhkpwbrbrgskwwwe` are not verifiable with the supplied application credentials.
2. It is unknown whether the actual Calora PostgreSQL database is intentionally separate from Supabase Auth or whether a separate Supabase database/project was intended.
3. Database-level tenant isolation for the real Calora tables remains unverified in the database where those tables actually reside.
4. RLS policies must not be copied blindly from a generic Supabase pattern because Calora’s user-owned tables use internal UUIDs bridged from Supabase Auth external IDs.
5. Production propagation of account-deletion support objects remains unverified.

## Phase 2 readiness

**DO NOT APPROVE PHASE 2.**

`intelligence.facts.server_adapter` must remain blocked. No persistent Intelligence facts, Today Intelligence, post-log Intelligence, Progress Intelligence, Coach fact context, proactive Intelligence, or adaptive Intelligence was enabled.

The next safe action requires an authoritative mapping to the live Calora application database and, if it is Supabase, an administrator-capable PostgreSQL/schema connection for that exact project. Only then can policies, grants, security-definer functions, and two-user negative isolation tests be performed directly and safely.