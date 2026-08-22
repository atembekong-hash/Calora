# Calora Coach Fact Context — First Controlled Activation

**Authorization received:** 2026-08-22  
**Authorized account:** `f669a97c-6213-4e51-9615-ae91129cfe02`  
**Activation outcome:** Stopped at the mandatory pre-activation safety gate.  
**Production mutations:** None.

## 1. Exact production state before activation

Read-only production checks returned:

```text
deployment:
  deployed=true
  build_successful=true
  deployment_type=autoscale
  visibility=public

database:
  database_name=neondb
  Phase 2B tables=present
  Coach Fact Context consent constraints=3
  rollout_config_row_exists=false
  rollout_enabled=false
  active_cohort_members=0
  consent_rows=0
  nonce_rows=0
  authorized_account_domain_rows=0
```

The production database was the expected managed PostgreSQL target and the
Phase 2B tables were present. The operational Fact Context rollout state was
deny-all: no config row, no active member, no consent, and no nonce row.

## 2. Authorized cohort size

The authorization named exactly one test account:

```text
f669a97c-6213-4e51-9615-ae91129cfe02
```

No cohort membership was inserted. Final authorized cohort size remained `0`.

## 3. Consent evidence

The selected Supabase Auth test account is not email-confirmed. It had no
production Calora domain account row and no server-authoritative Coach Fact
Context consent row.

The required current-version consent flow was therefore not attempted. Cohort
membership was not used as a substitute for consent.

## 4. Activation sequence

No activation sequence began. The work stopped after read-only preflight:

1. Verified production deployment metadata.
2. Verified Phase 2B table presence and current dark-state database controls.
3. Checked the selected account’s non-sensitive authentication/domain state.
4. Inspected production error signals.
5. Stopped before confirmation, consent, cohort insertion, rollout enablement,
   server-gate change, or Fact Context request.

## 5. Eligibility proof

No account was eligible. The selected account had no active consent, no cohort
membership, and global rollout was absent/off.

## 6. Real production request-path evidence

Not run. A production Fact Context request would have violated the mandatory
pre-activation gate after the health and account-confirmation findings below.

## 7. Provider-boundary structural proof

Not run in production. No provider request was made.

## 8. Exactly-one-architecture proof

Not run in production. No Fact Context or Legacy Coach request was initiated.

## 9. Response-validation results

Not run in production. No provider response was received.

## 10. Nonce/replay results

Not run in production. No nonce was claimed and no replay request was sent.

## 11. Rollback tests

Not run in production. Since controlled activation never started, no rollback
control was changed.

## 12. Errors or anomalies

The mandatory “production application health is normal” gate did not pass:

- deployment logs contain repeated health-check failures, including endpoint
  `500` responses and historical API process termination entries;
- current production logs show premium entitlement verification failures from
  RevenueCat (`401`), with affected premium-recipe requests contained as
  `503`; and
- the explicitly authorized test account is not email-confirmed, so the
  required authenticated current-consent path could not be verified safely.

The production server gate and reviewed client capability could not be
independently demonstrated from the available read-only production controls,
so those required gates remain unproven.

## 13. Privacy and logging findings

No Coach Fact Context traffic, provider egress, sensitive facts, user prompts,
or expanded context were created. The preflight used only structural deployment
and database state plus the selected account ID.

## 14. Regressions

No code, deployment, schema, environment, or production data changed. No new
regression was introduced by this stopped preflight.

## 15. Exact final production state

Production remained unchanged from its preflight state:

```text
rollout_config_row_exists=false
rollout_enabled=false
active_cohort_members=0
consent_rows=0
nonce_rows=0
authorized_account_domain_rows=0
```

No controlled account is eligible. Legacy Coach was not altered.

## 16. Residual risk

Activation must remain blocked until:

1. a confirmed internal/test account is available and explicitly authorized;
2. production health-check and entitlement-verification errors are understood
   and normal health is independently demonstrated; and
3. the production server gate and reviewed client Fact Context capability are
   independently verified in the expected state.

## 17. Recommendation for the next stage

Do not retry activation yet. First remediate or formally clear the production
health findings, confirm the designated internal test account, and perform a
fresh read-only pre-activation gate. A separate authorization is not required
to repeat that read-only gate, but no control change should occur until it
passes.

FIRST ACTIVATION VERDICT: HOLD — REMEDIATION OR MORE OBSERVATION REQUIRED