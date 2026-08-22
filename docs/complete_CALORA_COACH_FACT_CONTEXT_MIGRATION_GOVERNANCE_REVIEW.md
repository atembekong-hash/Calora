# Calora Coach Fact Context — Migration Governance & Publish History Evidence

**Review date:** 2026-08-22  
**Scope:** Read-only review of Replit-managed production schema deployment,
Publish evidence, production schema, and dark-state controls.  
**No mutation performed:** No migration was re-run, no journal row was added,
no DDL or `drizzle-kit push` was executed, no production table was altered, and
no synthetic rehearsal or Fact Context activation was performed.

## Actual Replit Publish database mechanism

For Replit-managed PostgreSQL, the supported production schema mechanism is
user-confirmed **Publish-time schema diffing**:

1. Publish introspects development and production schemas.
2. It computes and presents the schema diff, including rename confirmation.
3. On confirmation, Publish applies the resulting change to production.

This is the production authority. It is not direct SQL, `drizzle-kit push`,
Supabase SQL, startup DDL, or an agent-run production migration command.

The project has a separate development lifecycle: `scripts/post-merge.sh` runs
the Drizzle migration runner and support-object provisioning against
development. The runner records its development execution in
`__drizzle_migrations`.

## Production Drizzle journal conclusion

`__drizzle_migrations` is **not required in production** under Replit's
managed Publish schema-diff model. Its absence from the production read-only
replica is not evidence that Publish failed or that the Phase 2B schema is
invalid. It must not be "fixed" with a manual journal row or any other manual
production bookkeeping.

The immutable SQL migration remains a reviewed development artifact; the
canonical Drizzle schema represents the same application-facing relational
structure. Publish need not execute the SQL file directly or maintain the
project's Drizzle journal in production.

## Authoritative audit trail

The supported audit trail is:

1. reviewed repository commit, canonical schema source, and immutable
   migration artifact;
2. Replit-issued Publish record;
3. managed Publish schema-diff result;
4. read-only post-publish production schema comparison; and
5. retained release evidence.

### Exact Publish-history record

| Field | Evidence |
| --- | --- |
| Publish record | `a554656389b1ff6cff0e98a55eb9d27f6e372b79` |
| Platform author / committer | `Replit Agent <agent@replit.com>` |
| Subject | `Published your App` |
| Publish timestamp | `2026-08-22T06:42:55Z` |
| Immutable Git tree | `becc1810c92d642df99879450eb620fd02bda48e` |
| Publish-record parents | `b86a928cf155ea3128dd313f0d7b021003227dd5`, `400532f071d0156569e38633fbea143b01906daa` |

Deployment logs record artifact startup for the corresponding publication
window beginning at `2026-08-22T06:42:29.672Z`.

### Production application identity

| Field | Evidence |
| --- | --- |
| Public application URL | `https://calorie-coach-pie35449.replit.app` |
| Deployment type | Autoscale |
| Visibility | Public |
| Current build status | Successful |
| Numeric deployment/build ID | Not exposed by the available supported API |

### Relationship to the authorized revision

The authorized commit is:

```text
a85b0b36e0c6b246b48388431ac3e7e76f824405
```

Read-only Git ancestry verification established:

```text
authorized_commit_is_ancestor_of_publish_record=true
```

The authorized commit is therefore in the immutable lineage of the
Replit-issued `Published your App` record. This is direct repository linkage,
not an inference based only on matching timestamps.

## Production schema comparison and fingerprint

Read-only production verification found all required Phase 2B tables:

1. `calora_coach_fact_context_consents`
2. `calora_server_config`
3. `calora_cohort_memberships`
4. `calora_coach_fact_context_idempotency`

No difference was found from the reviewed Phase 2B schema:

- expected columns, PostgreSQL types, nullability, and metadata-only fields;
- consent composite primary key;
- consent foreign key to `calora_users(id)` with `ON DELETE CASCADE`;
- consent-state check for `consented_current` or `revoked`;
- configuration primary key;
- cohort unique `(cohort_name, external_user_id)` index;
- nonce unique `(external_user_id, request_nonce)` index; and
- expected primary-key and supporting indexes.

The deterministic ordered production metadata fingerprint is:

```text
algorithm: MD5
schema fingerprint: 13931375fbf1f6b2ec5a3efef31e2c07
canonical metadata lines: 35
```

This proves schema shape, not direct execution of the SQL migration file.

## Future migration-governance policy

- Keep canonical Drizzle schema and immutable forward-only migration artifacts
  in the reviewed commit.
- Use the configured post-merge runner for development only.
- Use Replit Publish's managed schema-diff flow for production only.
- Capture the reviewed commit, Replit Publish identity when exposed,
  post-publish schema fingerprint, data-state check, and health smoke result.
- Detect drift with read-only production comparisons after material publishes.
- Correct schema defects only with a reviewed forward change and Publish.
- Never use manual production DDL, direct production `db push`, manual journal
  rows, startup repair DDL, or ad-hoc production migration scripts.

## Final production dark-state proof

- Client `intelligence.coach.fact_context`: **OFF**.
- Server Fact Context: **default deny**; the public endpoint returns HTTP
  `404` for an empty JSON request.
- Global `coach_fact_context_rollout_enabled`: **absent/not `true`**.
- Active reviewed, unexpired `coach_fact_context_v1` membership: **0**.
- Consent rows / eligible real accounts: **0**.
- Idempotency rows: **0**.
- Allowlist: **unchanged**.
- Longitudinal Intelligence: **OFF**.
- Legacy Coach: **available**.

## Remaining platform limitation

The available APIs do not expose a separate numeric deployment/build ID or
schema-diff transcript. The Replit-issued publish record, verified ancestry to
the authorized commit, successful deployment metadata, and matching
post-publish schema fingerprint are the strongest supported immutable linkage
available without re-publishing or adding unsupported project bookkeeping.

## Final determination

**Determination: B. DOCUMENTARY GOVERNANCE GAP — RESOLVED.**

The missing production `__drizzle_migrations` journal is a documentation-model
mismatch, not a deployment failure. The reviewed Phase 2B schema is present,
the Replit Publish record provides immutable commit lineage, and the final
dark-state recheck passed.

The system is ready only for a **separately authorized, non-production
synthetic rehearsal**. This report does not authorize that rehearsal,
activation, real-user enrollment, or any production change.

MIGRATION GOVERNANCE VERDICT: BLOCKER RESOLVED