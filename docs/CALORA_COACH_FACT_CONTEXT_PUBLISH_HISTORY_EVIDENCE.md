# Calora Coach Fact Context — Publish History Evidence

**Evidence date:** 2026-08-22  
**Scope:** Retrieval and reconciliation of existing, read-only Replit Publish
history evidence.  
**Hard boundary honored:** No re-publish, migration, production modification,
schema change, journal write, feature activation, or synthetic rehearsal was
performed.

## Exact Publish-history record

| Field | Evidence |
| --- | --- |
| Publish record | `a554656389b1ff6cff0e98a55eb9d27f6e372b79` |
| Platform author | `Replit Agent <agent@replit.com>` |
| Platform committer | `Replit Agent <agent@replit.com>` |
| Subject | `Published your App` |
| Publish timestamp | `2026-08-22T06:42:55Z` |
| Immutable Git tree | `becc1810c92d642df99879450eb620fd02bda48e` |
| Publish-record parents | `b86a928cf155ea3128dd313f0d7b021003227dd5`, `400532f071d0156569e38633fbea143b01906daa` |

This is the existing Replit-issued publication record retained in the
repository history. Deployment logs also record artifact startup in the
corresponding publish window, beginning at `2026-08-22T06:42:29.672Z`.

## Production application identity and status

| Field | Evidence |
| --- | --- |
| Public application URL | `https://calorie-coach-pie35449.replit.app` |
| Deployment type | Autoscale |
| Visibility | Public |
| Current build status | Successful |
| Deployment/build ID | Not exposed by the available supported API |

The available Publish/deployment API does not expose a separate build ID,
deployed-revision field, or schema-diff transcript. This report does not
invent any of those identifiers.

## Relationship to the authorized revision

**Authorized commit:**
`a85b0b36e0c6b246b48388431ac3e7e76f824405`

Read-only Git ancestry verification established:

```text
authorized_commit_is_ancestor_of_publish_record=true
```

The authorized commit is therefore in the immutable lineage of the
Replit-issued `Published your App` record. This is stronger than matching the
publish timestamp to the commit timestamp and is the supported repository
evidence that ties the reviewed Phase 2B content to the publication.

## Relationship to production schema evidence

The post-publish read-only managed PostgreSQL comparison still reports all
four Phase 2B tables:

1. `calora_coach_fact_context_consents`
2. `calora_server_config`
3. `calora_cohort_memberships`
4. `calora_coach_fact_context_idempotency`

The ordered production metadata fingerprint remains:

```text
algorithm: MD5
schema fingerprint: 13931375fbf1f6b2ec5a3efef31e2c07
canonical metadata lines: 35
```

The fingerprint covers the expected columns, PostgreSQL types, primary keys,
unique indexes, foreign key, cascade behavior, consent-state check, and
metadata-only fields. No difference from the reviewed Phase 2B schema was
found.

## Final dark-state confirmation

The post-retrieval production recheck confirms:

- Client `intelligence.coach.fact_context`: **OFF**.
- Server Fact Context: **default deny**; the public endpoint returned HTTP
  `404` for an empty JSON request.
- Global `coach_fact_context_rollout_enabled`: **absent/not `true`**.
- Active reviewed, unexpired `coach_fact_context_v1` membership: **0**.
- Consent rows / eligible real accounts: **0**.
- Idempotency rows: **0**.
- Allowlist: **unchanged**.
- Longitudinal Intelligence: **OFF**.
- Legacy Coach: **available**.

## Remaining limitation

The platform does not expose a separate numeric deployment/build ID or
schema-diff log through the available APIs. The Replit-issued publish record,
its verified ancestry to the authorized commit, current successful deployment
metadata, and the matching post-publish schema fingerprint provide the
strongest supported immutable linkage available without re-publishing or
introducing unsupported project bookkeeping.

The migration-governance blocker is closed. The system is ready only for a
separately authorized, non-production synthetic rehearsal; this report does
not authorize that rehearsal or any activation.

PUBLISH EVIDENCE VERDICT: VERIFIED — MIGRATION GOVERNANCE BLOCKER CLOSED