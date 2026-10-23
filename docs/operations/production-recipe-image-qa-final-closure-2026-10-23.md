# Calora Recipe-Image End-to-End Verification — Final Closure Report

**Date:** 23 October 2026 UTC
**Source baseline:** protected `main` at `c08d8048a5060b6ba75b339621c1c62e20040592`
**Scope:** Consolidated recipe-image staging verification and the authorized, recovery-only investigation for historical production run `39891020186`. This report does not repeat the completed QA #1–#6 investigations; it records their decisive outcomes and the current production boundary.

## 1. Final verdict

**BLOCKED — production cleanup and live third-party image-provider verification remain unproven.**

A complete, isolated, compiled-API staging lifecycle is **PASS**. It verifies Calora's actual application routes, private review policy, image-delivery behavior, acceptance/rejection enforcement, account deletion saga, and storage cleanup. It does **not** prove a live production image-provider request or terminal cleanup of the historical production QA aliases.

The one owner-authorized recovery-only production run in this closure, [run `39937973457`](https://github.com/atembekong-hash/Calora/actions/runs/39937973457), failed closed with the sanitized result:

```json
{"failure":"qa_admin_request_unavailable","result":"fail","schemaVersion":"calora.production-recipe-image-qa-recovery.v3","transport":"dns"}
```

The normal image-generation step was skipped. No new image was generated, accepted, rejected, published, or delivered by this run.

## 2. Current release and protected execution controls

At dispatch time, and again before the recovery job was allowed to execute:

- Protected `main` was `c08d8048a5060b6ba75b339621c1c62e20040592`.
- The required same-SHA **Release validation** run [`39934528356`](https://github.com/atembekong-hash/Calora/actions/runs/39934528356) succeeded.
- Both `https://mycaloraapp.com/api/version` and `https://app.mycaloraapp.com/api/version` returned that exact Git commit over HTTPS.
- Both public origins returned HTTP `200` from `/api/healthz`.
- The `calora-production-recipe-image-qa` GitHub Environment remained restricted to protected branches and required one reviewer. The recovery run stayed in `waiting` state until the owner approved it.
- The runner's protected invocation and exact-release checks completed before the recovery step. `scripts/production-recipe-image-qa.mjs` validates the expected deployed commit at lines 213–239 and reuses it in recovery at lines 1216–1244.

No production secret, database, storage configuration, unrelated Railway service, or normal QA lifecycle was changed in this closure.

## 3. Prior QA outcomes carried forward

| Workstream | Decisive finding | Current status |
| --- | --- | --- |
| QA #1–#4 | The original `qa_account_provision_failed` HTTP `404` was caused by a path-qualified Supabase target that doubled the Auth route. The runner now requires a root-only HTTPS `*.supabase.co` origin before an Auth request. | Remediated in source; no historical account creation was proven by that failed request. |
| QA #5 | A recovery attempt could not reach the Auth Admin request path and failed closed; a sanitized transport diagnostic was added without retaining raw failures. | Superseded by the more specific QA #6 classifier. |
| QA #6 | Broad `connection` was split into fixed redacted categories: timeout, redirect, proxy, TLS, DNS, network, TCP, socket, or unknown. | Merged and deployed in protected source. |
| Isolated staging | Complete compiled-API lifecycle exercised with clean local identity, database, provider, storage, and deletion transports. | **PASS**; controlled evidence only. |
| This recovery | One approved recovery-only run reported `qa_admin_request_unavailable` with category `dns`. | **BLOCKED**; no automatic retry is permitted. |

References: [QA #3 forensic](production-recipe-image-qa-3-forensic-2026-10-22.md), [QA #4 forensic](production-recipe-image-qa-4-recovery-forensic-2026-10-23.md), [QA #5 transport forensic](production-recipe-image-qa-5-recovery-transport-forensic-2026-10-23.md), [QA #6 connection forensic](production-recipe-image-qa-6-connection-forensic-2026-10-23.md), and [isolated staging verification](isolated-recipe-image-staging-verification-2026-10-23.md).

## 4. Demonstrated staging end-to-end result

The staging runner executed the real compiled Calora API against a fresh, disposable local PostgreSQL database and role; two process-local disposable Auth identities; loopback TLS Supabase-compatible Auth and S3-compatible storage; a local RevenueCat-compatible deletion endpoint; and a local controlled image-provider endpoint. It contacted no production Calora, Supabase, Railway, RevenueCat, or storage service.

A human visual review of the controlled fixtures confirmed the following image-integrity outcomes:

1. A lentil-and-mushroom bowl image was accepted only after it visibly matched the lentil-and-mushroom recipe.
2. That same image was explicitly rejected for a citrus-salmon recipe because it did not depict salmon or citrus.

The passing lifecycle finished in 4.9 seconds and asserted:

- authenticated image creation reached terminal `stored` / `needs_review` state with HTTP `200`, rather than perpetual `generating`;
- owner review preview returned HTTP `200`, an HTTPS fifteen-minute review capability, and `private, no-store`;
- anonymous preview access was denied with `401` and separate-account access with `404`;
- accepted media received ordinary delivery only after acceptance; rejected media withheld an ordinary image locator;
- rendered acknowledgement returned `204`;
- account deletion returned `200`, post-deletion media access returned `401`, and terminal cleanup found zero media rows and zero storage objects before the disposable database was dropped.

Focused API recipe-image and storage coverage passed **3 files / 51 tests**. The RevenueCat origin guard, staging-harness contract, scripts typecheck, library and API TypeScript checks, API production-bundle build, and full isolated lifecycle also passed. The staging evidence was checked to contain no token, service key, locator, password, account identifier, or database identifier.

This is strong application-lifecycle evidence, but it cannot establish production provider availability or production media semantic accuracy.

## 5. Authorized production recovery evidence

The owner authorized exactly one recovery-only execution for original run `39891020186`, and separately approved the Environment deployment gate. Run `39937973457` completed from the current protected release with these immutable step outcomes:

| Step | Outcome |
| --- | --- |
| Check out protected main source | PASS |
| Verify protected invocation | PASS |
| Run normal private-review/rejection lifecycle | **SKIPPED** |
| Recover interrupted disposable QA lifecycle | Completed with a sanitized failure result |
| Enforce passing sanitized result | **FAIL** as designed |
| Upload sanitized QA evidence | PASS |

The evidence artifact is retained by GitHub until 6 November 2026 UTC. It reports no secret, signed URL, account identifier, request body, response body, or raw runtime exception.

The recovery runner's DNS category is intentionally limited to Node/Undici DNS-class codes `EAI_AGAIN`, `EAI_FAIL`, `EAI_NODATA`, and `ENOTFOUND` (`scripts/production-recipe-image-qa.mjs`, lines 128–196). It serializes only the fixed category (`lines 294–305` and `1165–1179`). Therefore `dns` proves that the first Auth Admin request failed in a DNS-class fetch path; it does not distinguish a temporary resolver lookup failure from any one underlying hosted-runner resolver condition.

## 6. Independent read-only transport evidence

The non-secret Calora Supabase hostname had matching local-resolver and public DNS-over-HTTPS A records during this investigation. Its unauthenticated `/auth/v1/health` endpoint returned the expected `401` with no redirect. This establishes that the public hostname was resolving and serving an Auth boundary from the sandbox at observation time; it does not prove GitHub-hosted-runner DNS behavior minutes earlier.

A read-only aggregate-only Supabase unified-log query over the exact recovery job window (`2026-10-23T10:27:48Z` through `10:28:02Z`) found **zero** Auth log entries for `/auth/v1/admin/users`, `/auth/v1/token`, or `/auth/v1/user`. It returned no user data, messages, identifiers, request IDs, IP addresses, headers, or payloads.

Together, the sanitized `dns` category and zero matching Auth ingress entries demonstrate that the recovery's failed Auth Admin operation did not reach Supabase ingress. They rule out a demonstrated Calora API routing, recipe-media, storage, database, account-deletion-saga, or live-provider defect in this run. The underlying GitHub-hosted-runner DNS condition remains unobservable by design because raw exception details are intentionally excluded from workflow output and artifacts.

## 7. Identity, cleanup, and image integrity status

| Assertion | Verdict | Evidence boundary |
| --- | --- | --- |
| No normal lifecycle ran in recovery | **PASS** | GitHub step state: normal lifecycle skipped. |
| No image was created by this closure recovery | **PASS** | Recovery-only route; normal lifecycle skipped before account/media action. |
| Historical bounded QA aliases are deleted | **UNVERIFIED / BLOCKED** | DNS-class failure occurred before successful reconciliation; no deletion success artifact exists. |
| This recovery's failed Auth Admin request reached Supabase | **NO** | Sanitized `dns` result plus zero matching bounded-window ingress aggregates. |
| Production customer records were enumerated or changed | **PASS — not performed** | Only aggregate log counts were queried; no user/table listing or production data mutation occurred. |
| Live generated image matched its requested recipe | **NOT EXECUTED** | Normal production image generation remains separately unauthorized. |
| Controlled staged image mismatch was rejected | **PASS** | Completed isolated lifecycle and visual semantic review. |
| Live provider failure substitutes an unrelated photograph | **NOT EXECUTED** | No live generation request was authorized in this closure. |

No assertion above treats an unexecuted live workflow as a pass.

## 8. Root cause and remediation decision

**Immediate demonstrated cause:** a GitHub-hosted runner encountered a Node DNS-class failure before it could reach the Supabase Auth Admin endpoint. The enhanced fixed category correctly exposed this as `dns` rather than the former broad `connection` label.

**Not demonstrated:** a source defect, malformed root origin, Supabase project outage, invalid credential, wrong Auth route, TLS/redirect problem, production API defect, or orphaned storage object. The root-only URL guard already prevents the prior doubled-route mistake before credentials can be sent.

**Code decision:** no additional code change is justified by the available evidence. Retrying, adding DNS fallbacks, bypassing HTTPS controls, switching to raw IPs, logging raw errors, weakening cleanup, adding direct administrative account deletion, or broadening credentials would weaken the established safety boundary without proving a Calora defect.

## 9. Required next action

A future attempt requires a **new, explicit owner authorization** for exactly one recovery-only workflow dispatch, using the then-current protected-main SHA, exact two-origin release equality, and the existing GitHub Environment reviewer gate. It must not run automatically.

Before requesting that authorization, the owner may choose to wait for a known GitHub Actions networking incident to clear or perform any supported GitHub-hosted-runner network diagnostic outside the credentialed workflow. No production credential, direct user search, storage listing, account deletion, normal image lifecycle, or deployment is authorized by this report.

Only if a later recovery artifact returns `result: "pass"` can the two bounded historical aliases be certified as terminally cleaned. Only after that, and with a separate explicit authorization, may the normal production recipe-image lifecycle be dispatched to test one private generated image, human semantic review, explicit rejection, and terminal cleanup.

## 10. Files and change status

No new application or workflow source remediation was required after this run. This documentation-only report consolidates evidence already produced by protected PRs through **PR #217**. The current branch will be submitted through the normal protected GitHub pull-request process; it does not trigger a deployment, native build, or production QA workflow.
