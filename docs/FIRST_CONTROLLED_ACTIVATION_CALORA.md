# Calora Coach Fact Context — First Controlled Activation

**Initial activation review date:** 2026-08-22
**Activation outcome:** Stopped at the mandatory pre-activation safety gate.  
**Initial-review production mutations:** None.

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

## 7. Initial-review final production state

```text
process_gate=unset/off
rollout_config_count=0
active_reviewed_cohort_count=0
consent_count=0
nonce_count=0
eligible_account_count=0
```

During the initial review, no Coach Fact Context provider traffic, account
enrollment, consent, cohort membership, rollout configuration, process-gate
setting, database schema, or deployment changed. No credentials, account
identifiers, tokens, prompts, facts, or provider response content are recorded
here.

## 8. Initial-review residual risk and recommendation

At the time of the initial review, activation could not proceed until all of the
following were separately cleared:

1. the originally designated account is confirmed, authenticated through an
   approved internal path, and remains explicitly authorized;
2. an explicit reviewed decision reconciles the calorie/protein-only activation
   brief with the existing four-type frozen allowlist, followed by any necessary
   reviewed implementation and release work;
3. the client capability can be enabled through a reviewed release while
   retaining the one-account server controls; and
4. the missing-RevenueCat-customer Premium behavior is evaluated and corrected
   or formally accepted as a bounded fail-closed condition.

## 9. Pilot-account preparation update

**Preparation date:** 2026-08-22
**Activation outcome:** Still held; no rollout was enabled.

The same previously designated internal account was re-verified without
recording its identifier, email address, token, or credential. Exactly one
confirmed, password-capable account carried both the expected internal-test
marker and explicit authorization-purpose marker. Its approved internal
authentication fixture was repaired through the Supabase administrative path,
then that same account authenticated successfully.

The server-owned consent API was exercised using only that authenticated
session against the running development API:

1. the current status returned `not_consented` for document version
   `2026-08-21`;
2. accepting the reviewed disclosure returned `consented_current`; and
3. a subsequent server read returned the same current state and document
   version.

The administrative authentication-fixture repair and the development
server-owned consent acceptance are the only operational mutations in this
preparation update. This dated entry is the approval/audit record for those
bounded actions. It does not supersede the initial review's historical
production snapshot above.

## 10. Post-preparation control snapshot

The following sanitized verification was taken immediately after the
development consent acceptance:

```text
approved_account_selection=exactly_one_confirmed_internal_and_purpose_marked_account
authentication=successful_via_approved_internal_fixture
consent_document_version=2026-08-21
current_consent_count=1
enabled_rollout_config_count=0
active_reviewed_cohort_count=0
nonce_count=0
process_gate=off (authenticated dark endpoint returned 404 before body validation)
```

The dark endpoint remained unavailable (`404`) for the authenticated,
consented account. No Fact Context request reached payload validation, rollout
eligibility, nonce creation, or provider egress. With the process gate off and
no enabled rollout configuration or active reviewed cohort, eligible-account
count remains `0`.

The following were not changed: the process gate, global rollout
configuration, cohort membership, client feature gate, Fact Context allowlist,
provider configuration, production Fact Context controls, or any unrelated
account. The account is prepared for a future separately approved activation,
but is not eligible for Fact Context while the deny-all controls remain in
place.


## 11. Approved first-activation fact boundary

**Decision date:** 2026-08-22
**Decision:** The first controlled activation may share only the following
current-day, deterministic facts with Coach:

1. logged calorie consumed and app calorie target; and
2. logged protein consumed and app protein target.

The corresponding permitted fact types are `daily.calorie_status` and
`daily.protein_status`. Their existing deterministic statements may include
the derived remaining value needed to validate their consumed/target
arithmetic, but no separate fact category is approved by this decision.

`daily.meal_distribution` and `daily.logging_completeness` are not approved
for this activation. They must not be constructed by the mobile client,
accepted by the server, represented in the Fact Context request/response
schemas, or cited in Coach observations.

This is a narrowing decision only. It does not authorize a process gate,
global rollout, cohort membership, consent change, provider request, client
feature flag, or any production activation. The client Fact Context capability
remains dark by default, and the existing server-side deny-all controls remain
required for any later, separately reviewed activation.

## 12. Remediation integration and current final state

The three remediation tracks are now reflected in the project:

| Remediation | Current status | Activation effect |
| --- | --- | --- |
| Approved pilot-account readiness | The original authorized internal account is confirmed, has an approved authentication fixture, and completed the current consent flow in development. | It is prepared for a future verification; it is not enrolled or eligible in production. |
| Fact-only boundary | Server, mobile request construction, schemas, and tests are narrowed to calorie status and protein status only. | No meal-distribution or logging-completeness fact can be selected by the updated source. The client feature remains dark by default. |
| Missing RevenueCat customer handling | Server authorization and regression coverage now classify a missing RevenueCat customer as a stable fail-closed access denial. | The fix must be included in, and rechecked against, the next production deployment. |

These remediations supersede the corresponding initial-review concerns, but
they do not change the following production controls:

```text
process_gate=off
global_rollout=disabled_or_absent
active_reviewed_cohort_count=0
production_fact_context_consent_enrollments=0
eligible_account_count=0
provider_requests_during_this_activation_record=0
```

No account identifier, credential, token, prompt, fact value, or provider
response is recorded in this report. No percentage rollout, additional account,
Legacy Coach change, or Phase 2C work is authorized by these remediation
updates.

## 13. Remaining conditions before a new activation review

A separate, fresh production review is still required before changing any
activation control. It must:

1. verify the released production source includes the narrowed fact boundary
   and stable missing-customer Premium behavior;
2. re-verify the same approved pilot account through the production
   authentication and server-owned consent flow, without substituting another
   account;
3. confirm current health and the Premium `200` / `401` / `403` controls;
4. confirm process gate off, global rollout off, no other consent or cohort
   enrollment, no nonce records, and Legacy Coach availability;
5. use a separately reviewed client release to enable the Fact Context
   capability only when all server-side one-account controls are ready; and
6. obtain explicit approval for the limited live request, replay check, and
   reversibility sequence described in the controlled-activation procedure.

## 14. Separately authorized one-account activation review

**Review date:** 2026-08-22
**Authorization:** Written authorization for the exact one-account activation,
live-request, replay-check, and immediate-rollback sequence was confirmed before
any control change was considered.

The authorization remained limited to the previously approved pilot. It did not
authorize a second account, percentage rollout, ordinary-user enrollment,
allowlist expansion, Legacy Coach changes, or Phase 2C work.

### Fresh production preflight

The review repeated production-safe checks immediately before any possible
activation action:

| Check | Result |
| --- | --- |
| Active deployment | Healthy public autoscale deployment with a successful build |
| `GET /api/healthz` | `200` |
| Process gate observable behavior | Fact Context `POST` returned `404` before body handling |
| Global rollout enabled rows | `0` |
| Active reviewed cohort members | `0` |
| Current approved Fact Context consent rows | `1` — the approved pilot only |
| Unexpired Fact Context nonce rows | `0` |
| Client/server fact boundary | Only `daily.calorie_status` and `daily.protein_status` |

The single current consent is server-owned but is not sufficient to make any
account eligible. With the process gate closed, no enabled global rollout row,
and no reviewed cohort membership, the approved pilot and every other account
remain denied.

### Safe stop before activation

The approved production controls are intentionally offline-only:

- the process gate is a deployed runtime environment setting;
- the global rollout and reviewed cohort are managed PostgreSQL state; and
- the public application exposes no client-facing or administrative activation
  endpoint.

This review environment exposes production database reads only and deployment
metadata only. It has no supported production mutation authority for those
controls. No attempt was made to bypass that boundary with ad-hoc SQL, a
one-off production script, a temporary admin route, or a deployment change.

Consequently, the live activation portion was not started. No cohort membership,
global rollout configuration, consent state, process gate, client capability,
or provider configuration changed. No live Fact Context request, provider
egress, response validation event, nonce claim, replay request, or rollback
toggle occurred.

### Provider, replay, and rollback evidence status

The reviewed implementation continues to enforce the two-fact allowlist,
metadata-only nonce claim, deterministic response validation, and
post-provider authorization recheck. The prior synthetic and pending-request
rehearsals remain evidence for those controls only; they are not represented as
new production egress or rollback evidence here.

Because no activation control was changed, immediate rollback was inherent in
the preserved deny-all state rather than exercised through a production toggle.
No account identifier, credential, token, prompt, fact value, request body, or
provider response was read or recorded during this review.

### Final production state

```text
process_gate=off (Fact Context route=404 before request handling)
client_fact_context_capability=off
global_rollout_enabled_count=0
active_reviewed_cohort_count=0
current_fact_context_consent_count=1 (approved pilot only; insufficient alone)
unexpired_fact_context_nonce_count=0
eligible_account_count=0
provider_requests_during_review=0
```

### Residual risk and next action

The required one-account live evidence remains outstanding. It must be performed
by an authorized production operator with supported control-plane access, using
the already approved pilot and the exact written sequence: activate only the
minimum controls, verify one eligible account after each transition, perform
the bounded live and replay checks, then restore every activation control to
deny-all. Do not add an application admin endpoint or use an ad-hoc production
database write merely to make that operation available.

FIRST ACTIVATION VERDICT: HOLD — MORE OBSERVATION OR REMEDIATION REQUIRED

## 15. Control-plane handoff verification

**Verification date:** 2026-08-22
**Outcome:** The approved live sequence remains unstarted because this review
environment has production read access and deployment metadata access only.

Immediately before handoff, aggregate-only production verification returned:

```text
deployment=active_autoscale_with_successful_build
global_rollout_enabled_count=0
active_reviewed_cohort_count=0
current_fact_context_consent_count=1 (approved pilot only)
unexpired_fact_context_nonce_count=0
```

The process gate was not changed and the server-owned consent was not changed.
No cohort membership, global rollout configuration, client capability, provider
configuration, or deployment changed. No Fact Context request, replay request,
nonce claim, provider egress, or response validation event occurred.

The remaining authorized sequence must be run by a production operator with
supported control-plane access: enable only the process gate, global rollout,
and reviewed pilot cohort; verify aggregate eligibility is exactly one after
each transition; make the single bounded request and its replay check; then
restore every control to the deny-all baseline. No public or temporary
administrative endpoint, ad-hoc production SQL, or deployment workaround is an
approved substitute.