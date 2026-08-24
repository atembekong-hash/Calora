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

This gate comes **before any sensitive control mutation**. It binds the reviewed
source to the package observed by the deployment control plane; `/api/version`
is only a cross-check and never a source of trusted package identity.

**Current enforcement state:** all production releases remain compiled deny-all
for Coach Fact Context. The protected build and activation verifier can now
validate provider-issued package evidence and retain a rehearsal record, but the
configured Publishing service does not yet provide the required atomic provider
stage→attest→deploy activation contract. Setting
`COACH_FACT_CONTEXT_ENABLED=true` alone cannot activate this path. Do not
substitute an environment variable, deployment edit, or alternate writer.

1. In **Publishing → Settings → Production secrets**, an authorized operator
   must provision these build-only controls before publishing. Do not store their
   values in this repository, a deployment command, or the application runtime:
   - `RELEASE_ATTESTATION_SIGNING_KEY`: dedicated Ed25519 private key, readable
     only by the protected production build context;
   - `RELEASE_ATTESTATION_SIGNING_KEY_FINGERPRINT`: build-enrollment SHA-256
     SPKI fingerprint for that exact signer;
   - `RELEASE_ATTESTATION_ARTIFACT_DIR`: the absolute final deployment staging
     directory supplied by the deployment control plane; and
   - `RELEASE_ATTESTATION_MANIFEST_DIR`: an existing absolute, append-only
     evidence location outside the deployable workspace.
2. Publish only after the production build has succeeded. A missing control,
   non-Ed25519 key, fingerprint mismatch, relative path, workspace path, absent
   retention mount, or attempt to replace retained evidence is a release stop.
3. For a **sensitive** release only, set
    `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=true` in the protected production
    build context and provide the provider-retained absolute paths
    `RELEASE_PROVIDER_ATTESTATION_FILE`,
    `RELEASE_PROVIDER_ATTESTATION_SIGNATURE_FILE`, and
    `RELEASE_PROVIDER_ATTESTATION_PUBLIC_KEY_FILE`, plus
    `RELEASE_PROVIDER_TRUSTED_PUBLIC_KEY_SHA256`,
    `RELEASE_PROVIDER_DEPLOYMENT_ID`, and `RELEASE_PROVIDER_TARGET_ORIGIN`.
    The provider record must be canonical JSON with a detached Ed25519
    signature and immutable record URL. It must name the deployment identity,
    exact HTTPS target origin, and canonical SHA-256 of the **final deployable
    package** staged in `RELEASE_ATTESTATION_ARTIFACT_DIR`. The build checks
    all of these values before it can compile the sensitive release eligible.
    If the provider packages only after the build or cannot issue this signed
    immutable record, stop deny-all rather than substituting a dist directory,
    build log, generic JSON, command-line digest, or `/api/version`.
4. Obtain the activation verifier's trusted release-signer public-key SHA-256 from the
   access-controlled rollout approval trust record, held separately from
   Publishing production secrets and the build signer. A signer rotation needs
   written reviewer approval and an updated trust record before publishing.
   Never take this verification pin from
   `RELEASE_ATTESTATION_SIGNING_KEY_FINGERPRINT` or any mutable build setting.
5. Obtain the manifest, detached signature, and public key from the immutable
   retention location. Before any gate is changed, run the verifier against the
   separately pinned fingerprint, control-plane digest, and production HTTPS
   origin. Use an externally retained, new evidence path for its result:

   ```sh
   pnpm --filter @workspace/api-server run verify:release -- \
     --manifest /protected/retention/<release>.manifest.json \
     --signature /protected/retention/<release>.manifest.sig \
     --public-key /protected/retention/<release>.public-key.pem \
     --trusted-public-key-sha256 "<pin-from-separate-approval-trust-record>" \
      --provider-attestation /protected/provider-records/<deployment>.json \
      --provider-signature /protected/provider-records/<deployment>.sig \
      --provider-public-key /protected/provider-records/provider-public-key.pem \
      --trusted-provider-public-key-sha256 "<provider-pin-from-separate-approval-trust-record>" \
      --provider-deployment-id "<provider-deployment-id>" \
      --target-origin "https://<published-api-origin>" \
     --live-url "https://<published-api-origin>" \
     --evidence-file /protected/approval-records/<change>/<release>.verification.json
   ```

   The verifier must report `verified: true`, verify the detached signature and
    the pinned release signer **and the pinned provider trust anchor**, prove the
    same immutable provider record was bound to the signed release, match its
    final-package SHA-256, deployment identity, and target origin, and receive
    successful HTTPS `/api/version` and `/api/healthz` checks. This establishes
    immutable rehearsal evidence only; it does not override the compiled
    deny-all route. A failure,
    redirect, stale deployment, missing evidence, or mismatch is `BLOCKED —
    RELEASE ATTESTATION NOT ESTABLISHED`; leave all sensitive controls deny-all.
6. **Production rehearsal:** run the verifier and write its new
    `--evidence-file` in the external approval record while
    `COACH_FACT_CONTEXT_ENABLED` remains absent or not exactly `true` and the
    database rollout gate remains false. Confirm `verified: true`, retain the
    resulting exclusive-create evidence file, and record that no sensitive gate
    was changed. This rehearsal is required evidence, not activation authority.
7. Attach the immutable manifest, signature, public key, provider attestation,
    provider signature/key, verifier evidence record, and approval reference to
   the access-controlled rollout approval. Do not attach the private key,
   secrets, account identifiers, credentials, or Coach content.

## 5. Controlled one-account enablement

This section remains a future procedure only. It is unavailable while the
current compiled production release is deny-all. It may be used only after a
separately reviewed deployment-control-plane integration provides the final
package proof required by Section 4 and a new release binds that proof to an
activation authorization.

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