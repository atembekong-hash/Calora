# Calora Coach Fact Context — First Controlled Activation

**Activation review date:** 2026-08-22  
**Activation outcome:** Stopped at the mandatory pre-activation safety gate.  
**Production mutations:** None.

## 1. Scope and authorization boundary

This review used only the previously designated single internal account. It did
not substitute the dedicated Premium QA account, add another account, change a
rollout control, or make a Coach Fact Context request.

No percentage rollout, ordinary-user enrollment, Legacy Coach retirement, or
Phase 2C work was attempted.

## 2. Fresh production preflight

| Check | Result |
| --- | --- |
| Published deployment | Active public autoscale deployment with successful build |
| `GET /api` | `200` |
| `GET /api/healthz` | `200` |
| RevenueCat v2 project lookup | `200` |
| RevenueCat v2 entitlement lookup | `200` |
| Entitled Premium Recipes control | Authenticated `200` |
| Anonymous Premium Recipes control | `401` |
| Confirmed non-entitled Premium Recipes control | Authenticated `403` |
| Fact Context process gate | Unset/off |
| Global rollout configuration | No row; deny-all |
| Active reviewed cohort members | `0` |
| Current Fact Context consent rows | `0` |
| Fact Context nonce rows | `0` |

The API and the requested Premium control paths passed. Historical deployment
logs still contain startup-time probe failures, but the current public health
responses above were healthy.

## 3. Mandatory account gate

The previously designated account was found, but it is not email-confirmed,
does not carry the expected internal-test marker, could not authenticate through
the approved internal test fixtures, and has no resolved RevenueCat customer.

The required server-owned current-consent flow therefore could not be safely
performed. No consent record was created and no other account was substituted.

## 4. Frozen boundary and client readiness

Two additional material activation prerequisites do not match the approved
single-account brief:

1. The deployed mobile client keeps `intelligence.coach.fact_context` disabled,
   so it cannot select the Fact Context architecture in a real Coach UI flow.
2. The deployed server and client frozen allowlists include four fact types:
   calorie status, protein status, meal distribution, and logging completeness.
   The activation brief authorizes only calorie and protein consumed/target
   facts. This discrepancy must be resolved by explicit governance and a
   separately reviewed code change; it was not narrowed or expanded during this
   review.

Legacy Coach remains implemented as the explicit unavailable-path fallback. No
Fact Context request can trigger a Legacy request after Fact Context egress
begins.

## 5. Provider, replay, and rollback evidence

No live Fact Context provider request, request nonce, response, or sensitive
fact payload was created because the account and boundary gates failed before
activation.

The following controls were re-inspected, but not exercised against production
because no account was eligible:

- server process gate;
- global database rollout gate;
- reviewed, expiring cohort membership;
- server-owned consent revoke;
- nonce replay ledger; and
- post-provider lifecycle re-checks that discard a response after consent,
  cohort, global-gate, or server-gate revocation.

The production state remained deny-all throughout.

## 6. Additional observation

Current deployment logs include contained `503` responses when a Premium
request reaches RevenueCat for a customer that does not exist. This did not
affect the independently verified entitled, anonymous, or confirmed
non-entitled controls above, but it should be addressed before treating
Premium authorization behavior as uniformly stable for all authenticated
accounts.

## 7. Exact final production state

```text
process_gate=unset/off
rollout_config_count=0
active_reviewed_cohort_count=0
consent_count=0
nonce_count=0
eligible_account_count=0
```

No Coach Fact Context provider traffic, account enrollment, consent, cohort
membership, rollout configuration, process-gate setting, database schema, or
deployment changed. No credentials, account identifiers, tokens, prompts,
facts, or provider response content are recorded here.

## 8. Residual risk and recommendation

Do not activate until all of the following are separately cleared:

1. the originally designated account is confirmed, authenticated through an
   approved internal path, and remains explicitly authorized;
2. an explicit reviewed decision reconciles the calorie/protein-only activation
   brief with the existing four-type frozen allowlist, followed by any necessary
   reviewed implementation and release work;
3. the client capability can be enabled through a reviewed release while
   retaining the one-account server controls; and
4. the missing-RevenueCat-customer Premium behavior is evaluated and corrected
   or formally accepted as a bounded fail-closed condition.

FIRST ACTIVATION VERDICT: HOLD — MORE OBSERVATION OR REMEDIATION REQUIRED