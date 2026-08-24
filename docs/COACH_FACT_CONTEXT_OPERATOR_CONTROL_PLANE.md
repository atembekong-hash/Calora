# Coach Fact Context — Production Operator Control Plane

**Status:** Approved technical operating procedure; no activation is authorized
by this document alone.
**Scope:** The separately approved, one-account Coach Fact Context check only.
It does not authorize a broader rollout, a second account, a percentage rollout,
an allowlist change, a client release, or a Legacy Coach change.

## 1. Supported control-plane boundary

The only approved production writers are Replit's operator interfaces:

| Control | Supported production surface | Authoritative value |
| --- | --- | --- |
| Process gate | **Publishing → Settings → Production secrets** | `COACH_FACT_CONTEXT_ENABLED` is exactly `true` |
| Global rollout gate | **Database → Production → My Data** | `calora_server_config` row `coach_fact_context_rollout_enabled` has JSON boolean value `true` |
| Reviewed pilot membership | **Database → Production → My Data** | One current `calora_cohort_memberships` row in `coach_fact_context_v1` with a future `expires_at` and non-null `reviewed_at` |

This path is intentionally outside the Calora app and its public API. Replit's
production database guidance confirms that an operator can edit production data
through Database **My Data**; use that supported panel rather than direct SQL.
The Publishing settings surface is the supported owner of production
environment values. Before relying on either panel for the first activation, the
operator must confirm the panel can perform the required typed edit and retain
that confirmation in the protected change record.

The following are prohibited, including in an incident:

- direct production SQL, `drizzle-kit push`, ad-hoc scripts, migrations, or
  database connection-string use;
- a public, hidden, temporary, or application-admin endpoint;
- an authentication bypass, an end-user Supabase bearer token, or a substitute
  account; and
- a deployment or code change intended to simulate any of these controls.

If either supported surface is unavailable to the authorized operator, stop with
all controls deny-all. Do not invent an alternate write path.

## 2. Access, approval, and audit record

Only a production operator who is authorized to edit both the project's
production Publishing settings and its production Database **My Data** view may
run this procedure. Before the first mutation, the operator must attach this
runbook to the approved change record and record:

1. the approved purpose and the exact one reviewed pilot account, retained only
   in the access-controlled change record;
2. the operator's accountable identity, the authorizing reviewer, UTC start
   time, and a change/approval reference;
3. a sanitized preflight snapshot; and
4. the required deny-all rollback owner and communication path.

Do not put the pilot's external identifier, email, credentials, bearer token,
facts, prompts, messages, nonces, or Coach responses in this repository,
screenshots shared broadly, or the release evidence. The controlled account
identifier may be handled only inside the approved operator session and
access-controlled change record.

For every mutation, append a time-stamped evidence entry to that same protected
change record with the surface used, accountable operator, approval reference,
sanitized before/after state, and verification result. This makes the operator
actions independently reviewable without adding an application writer or
storing sensitive Coach content.

## 3. Required deny-all baseline

Use the supported panels to read—not write—the current state. Do not proceed
unless every item is true:

```text
COACH_FACT_CONTEXT_ENABLED is absent or not exactly true
coach_fact_context_rollout_enabled is absent or JSON false
active reviewed, unexpired coach_fact_context_v1 memberships = 0
```

Also retain the existing release prerequisites from
`FIRST_CONTROLLED_ACTIVATION_CALORA.md`: the client capability is dark, the
approved pilot has current server-owned consent, the two-fact boundary remains
unchanged, and the production health/Premium controls are current.

If the database editor shows an unknown, malformed, extra, expired, or
unreviewed Coach Fact Context row, stop. Restore the deny-all state in
Section 7 before seeking a new written authorization.

## 4. Release attestation gate

This gate comes **before any sensitive control mutation**. The supported
Publishing model binds a clean reviewed source commit to metadata compiled into
the API bundle, then independently compares that metadata with the canonical
live HTTPS API.

1. In **Publishing → Adjust settings → Production secrets**, set these
   build-only values for the reviewed release:
   - `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` to exactly `true`; and
   - `RELEASE_SENSITIVE_ACTIVATION_COMMIT` to the exact reviewed 40-character
     Git commit.
   The production build fails closed if the commit does not exactly match its
   clean checkout. Do not set the runtime process gate at this point.
2. Click **Publish** and wait for the normal production build and health check
   to complete. The build compiles its Git commit, source tree, digest,
   timestamp, and release ID into `/api/version`.
3. While `COACH_FACT_CONTEXT_ENABLED` remains off and the database rollout
   remains false, compare the reviewed source with the live service:

   ```sh
   pnpm --filter @workspace/api-server run verify:release-identity -- \
     --git-commit "<reviewed 40-character commit>" \
     --source-tree "<reviewed 40-character tree>" \
     --source-digest "<reviewed SHA-256 digest>" \
     --live-url "https://<published-api-origin>"
   ```

   The verifier requires canonical HTTPS, rejects redirects, checks
   `/api/version` and `/api/healthz`, and requires the compiled live identity
   to exactly equal the reviewed source. A mismatch is a release stop.
4. Attach the successful verifier output to the rollout approval record. It is
   release-verification evidence, not activation authority.

Provider-signed final-package provenance remains optional defense in depth for
the stronger post-build artifact-replacement threat model. It is not required
for Calora's supported controlled-pilot activation path.

## 5. Controlled one-account enablement

This section remains a future procedure only. It may be used only after the
release-identity check in Section 4 succeeds for a newly published reviewed
release and the separate activation approval is granted.

Each step requires a read-back verification and a corresponding evidence entry
before the next step. The invariant is **zero or one** active reviewed,
unexpired member—never more.

1. **Create the reviewed membership while both gates are off.** In Production
   Database → My Data, create exactly one `calora_cohort_memberships` row:
   - `cohort_name`: `coach_fact_context_v1` exactly;
   - `external_user_id`: the already reviewed pilot only;
   - `added_by`: the accountable operator's approved audit identifier;
   - `reviewed_at`: a non-null current UTC timestamp;
   - `expires_at`: a short, explicitly approved UTC expiry in the future.

   Read it back and verify the cohort name, the exact reviewed pilot identity,
   non-null review time, future expiry, and active reviewed member count of
   exactly one. Verify there is no second active reviewed, unexpired row in this
   cohort. Do not use a null expiry for this check. Do not add a second row,
   alter another cohort, or bulk-edit.

2. **Enable the global database gate.** In the same Production My Data view,
   create or update only the `calora_server_config` row whose `key` is
   `coach_fact_context_rollout_enabled`. Its `value` must be the JSON boolean
   `true`, not the string `"true"`.

   Read the row back and reconfirm that the exact reviewed pilot is the sole
   active reviewed, unexpired member. A global gate without the reviewed member
   still denies everyone; nevertheless, stop and roll back if the identity or
   count is not exactly one.

3. **Enable the process gate last.** In Publishing → Settings → Production
   secrets, set `COACH_FACT_CONTEXT_ENABLED` to the exact value `true`. Use the
   surface's normal apply/restart lifecycle and wait until the production build
   is healthy. Do not publish unrelated code or use a deployment edit as a
   substitute for this gate.

   Read the secret configuration back, verify production health, and record
   that all three gate conditions now match the approved one-account state.

Only after all three read-backs pass may the separately authorized operator
perform the single bounded request and replay check. Any unexpected HTTP
response, eligibility count, pending deployment, or unverified transition is a
stop condition and requires immediate rollback.

## 6. Transition verification

The public endpoint is not an operator writer and must never be treated as one.
The database values are the authority for the global gate and cohort; production
secret settings are the authority for the process gate.

After each enablement or rollback mutation, verify the relevant source of truth
in its same supported surface. Before and after the bounded request, additionally
verify:

```text
active reviewed, unexpired coach_fact_context_v1 memberships = 1
eligible approved account = 1
ordinary-user eligibility = 0
percentage rollout = none
```

Immediately before the bounded request, use Production Database → My Data to
perform the server-owned consent read without using an end-user token or public
route. In the operator session only, find the reviewed pilot's
`calora_users` record, then read its matching
`calora_coach_fact_context_consents` record for purpose
`coach_fact_context_v1`. Verify and record only the consent state and document
version. It must be `consented_current` for the current approved document
version. Do not copy the account identifiers from either row into the evidence
record. A missing, stale, revoked, mismatched, or unverifiable consent is a
stop condition: do not send a request, leave the gates deny-all, and record the
failed preflight without account or Coach content.

At the end of the approved check, verify that no unapproved cohort member was
created. The idempotency record is structural metadata only; it must never be
used as an audit log or include Coach content.

## 7. Immediate deny-all rollback

Rollback needs no code change and must be performed through the same supported
operator surfaces. It is always permitted, including when an activation
verification is incomplete.

1. In Publishing → Settings → Production secrets, remove
   `COACH_FACT_CONTEXT_ENABLED` or change it to a value other than exactly
   `true`. Wait for the normal configuration lifecycle and verify the process
   gate is off.
2. In Production Database → My Data, set
   `coach_fact_context_rollout_enabled` to JSON `false` or delete that row.
   Read it back as absent/false.
3. In Production Database → My Data, delete the exact reviewed pilot
   membership and every other `coach_fact_context_v1` membership if an
   unexpected row exists. Record each deletion in the protected change record
   without copying account identifiers. Verify the active reviewed, unexpired
   cohort count is zero and that no Coach Fact Context membership remains.
4. Re-read all three controls and record the final state:

   ```text
   process_gate=off
   global_rollout=absent_or_false
   active_reviewed_cohort_count=0
   eligible_account_count=0
   ```

If only one rollback action can be completed during an incident, do the process
gate first; it stops the route before request authentication and data handling.
Continue the remaining two steps as soon as the supported surfaces are
available.

## 8. Approval checkpoint

The accountable production operator and authorizing reviewer must explicitly
mark the protected change record **approved** before Section 5 starts, and
**rolled back and verified** after Section 6 completes. A repository merge,
this runbook, or an agent session cannot substitute for that human
authorization.

Until those attestations and each required verification exist, the production
state remains deny-all and no pilot request is authorized.