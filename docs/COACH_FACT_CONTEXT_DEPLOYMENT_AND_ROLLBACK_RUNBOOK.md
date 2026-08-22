# Coach Fact Context deployment and rollback runbook

## Scope and invariant

This runbook prepares a future controlled evaluation only. It does not authorize
activation, enrollment, percentage rollout, or a change to the Fact Context
allowlist. The required steady state after every rehearsal is:

- client Fact Context gate: **OFF**
- `COACH_FACT_CONTEXT_ENABLED`: **unset or not exactly `true`**
- `calora_server_config.coach_fact_context_rollout_enabled`: absent or `false`
- `calora_cohort_memberships`: no active Coach Fact Context member

Legacy Coach remains available when architecture selection chooses Legacy before
any minimized Fact Context egress. A request that has selected Fact Context must
never retry through Legacy with broad context.

## Deployment order

1. Confirm the client feature gate is hard-false and the server environment
   gate is off. Do not add a cohort member.
2. Deploy the API and database package containing the committed migration.
   The managed PostgreSQL migration command is:

   ```sh
   pnpm --filter @workspace/db run migrate
   ```

   The command uses Drizzle's migration journal. Do not use `db push` or edit
   an applied migration. The Supabase migration remains inert because Calora
   domain data is owned by managed PostgreSQL.
3. Verify the target schema before deploying application traffic:

   ```sql
   SELECT c.conname, pg_get_constraintdef(c.oid)
   FROM pg_constraint c
   JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'calora_coach_fact_context_consents';
   ```

   Required results are the composite primary key `(user_id, purpose)`, the
   `ON DELETE CASCADE` foreign key to `calora_users`, and the two-state check.
   Also verify the operational config, cohort, and idempotency tables exist.
4. Deploy the mobile client only after the API is compatible. The current
   client remains dark, so mixed app versions continue to choose Legacy Coach.
5. Reconfirm the four steady-state controls above after the deployment. An
   absent config row is intentional deny-all behavior.

## Controlled synthetic rehearsal

Only a non-production database and a synthetic identifier may be used.
Never use an existing customer account, a real email, facts, logs, messages,
or conversation content.

1. In an isolated non-production environment, insert a server-owned config row
   with boolean JSON value `true`.
2. Insert one synthetic membership in the exact named cohort
   `coach_fact_context_v1`, with a recorded reviewer and a short expiry.
   There is no client route to create either record.
3. Start the API only with an explicitly approved non-production server gate.
   Exercise the minimized endpoint using deterministic calorie/protein facts
   and a synthetic authenticated test identity. Confirm the provider receives
   no legacy context and that the same nonce cannot cause a second egress.
4. While a request is pending, remove the cohort record or set the global
   config to `false`; confirm the completion is discarded. Repeat with consent
   revoked and with the server gate disabled.
5. Delete the synthetic cohort row and the temporary config row, and remove
   the synthetic idempotency row. Confirm the endpoint returns unavailable.
6. Turn the non-production server gate off and verify the four steady-state
   controls at the start of this document.

## Immediate rollback

No redeploy is required for the server-owned controls:

1. Set the config value to `false` or delete the config row. This globally
   denies the endpoint on the next decision.
2. Delete an individual cohort membership to deny that identity immediately.
3. Revoke server consent to deny the identity independently.
4. If a code-level emergency stop is needed, remove or change
   `COACH_FACT_CONTEXT_ENABLED` so it is not exactly `true`, then restart the
   API process.
5. Keep the client gate off. Do not route an in-flight minimized request to
   Legacy Coach.

The idempotency ledger contains only external identity, nonce, claim time, and
expiry. It must never be used to store facts, prompts, messages, or provider
responses.

## Partial failures and recovery

- Migration failure: stop before application deployment; fix with a new
  forward migration only. Do not modify the applied migration journal.
- Consent, rollout, or idempotency lookup failure: the endpoint fails closed.
- Provider timeout or late completion: return the safe unavailable response;
  the client lifecycle epoch suppresses stale settlements.
- Unexpected exposure: immediately perform the global rollback above, remove
  all cohort rows, preserve no new Fact Context payloads, and investigate from
  structural operational records only.
