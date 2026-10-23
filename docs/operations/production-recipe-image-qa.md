# Production recipe-image QA procedure

`Production recipe-image QA` is a manually dispatched GitHub Actions workflow for one bounded, authenticated Create recipe-image lifecycle. It verifies the deployed production API without using a personal account or storing a reusable bearer token.

The workflow is intentionally not triggered by pull requests or ordinary pushes. Its only job is skipped unless the ref is protected `main`, checks out the immutable workflow SHA with checkout credentials disabled, requires the exact source-SHA confirmation, and runs in the dedicated `calora-production-recipe-image-qa` environment.

## Protected configuration

Configure these environment-scoped GitHub Actions secrets in `calora-production-recipe-image-qa`. They must not be committed, printed, copied into chat, supplied as workflow inputs, or stored in artifacts.

- `CALORA_QA_API_BASE_URL`: `https://mycaloraapp.com/api`
- `CALORA_QA_SUPABASE_URL`: the Calora Supabase project HTTPS **origin** only, in the form `https://<project-ref>.supabase.co`; do not include `/auth/v1`, `/rest/v1`, any other path, a query, fragment, or credentials
- `CALORA_QA_SUPABASE_ANON_KEY`: the matching public Supabase key
- `CALORA_QA_SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase Admin key, scoped only to this protected environment
- `CALORA_QA_TEST_PASSWORD`: a random workflow-only password
- `CALORA_QA_RECIPE_PHOTO_ORIGIN`: exact HTTPS origin serving the private recipe-photo signed locators, without a path, query, credentials, or fragment

Maintain a GitHub **Required reviewers** deployment-protection rule on this environment with an owner-designated approver and enable **Prevent self-review**. The 2026-10-23 read-only control check found both required-reviewer and branch-policy protection rules on `calora-production-recipe-image-qa`; manual `workflow_dispatch` and the protected-main guard remain independent controls. The reviewer policy is configured outside this source file and must not be removed or bypassed.

No secret is at workflow or job scope. The API base, Supabase configuration, test password, and the service-role key are injected only into the two trusted Node.js runner steps that need them. Checkout, invocation guard, report validation, and artifact upload do not receive them. The checked-out runner uses only Node built-ins and is tied to the protected `main` SHA before any secret-bearing step begins.

## Invocation controls

A normal verification requires both inputs:

- `expected_commit`: the exact 40-character current protected `main` commit expected on the live API.
- `confirmation`: literal `RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA`.

The normal runner refuses to provision any identity until the live `/api/version` value matches the expected protected source SHA. It also rejects a path-qualified Supabase URL before it sends any credentialed Auth request, so an Auth API path cannot be accidentally appended twice. `workflow_dispatch` from any other branch creates no executing QA job because the job has an explicit `refs/heads/main` guard; protected-environment secrets are not supplied to a skipped job. Once the required-reviewer rule above is configured, a designated reviewer must approve the environment deployment before those secrets are released to the runner.

`recovery_run_id` is optional. Leave it blank for a normal lifecycle. An authorized cleanup-only rerun may provide the numeric GitHub run ID of an interrupted QA job. This is an internal QA identifier, not a credential. A recovery operation has no image-generation step and must still receive the literal confirmation, run from protected `main`, and reach a terminal cleanup result.

## Bounded lifecycle

The normal runner creates two fresh confirmed Auth accounts with deterministic internal `qa.invalid` addresses derived from the GitHub run ID. It obtains short-lived user tokens only through normal password authentication and keeps tokens in process memory.

It verifies the deployed source release, confirms the media-owning account has an empty owner-scoped media list, requests one QA recipe photo, and requires terminal `stored` plus `needs_review`. It verifies a private `no-store` owner-only review preview whose signed locator uses the configured private recipe-photo origin. It then requires anonymous denial and second-account owner-isolation denial for that preview.

The runner fetches the private review image only to prove content delivery, does not retain its bytes, and rejects—not accepts or publishes—the image. It requires the rejected terminal state to omit a normal image locator.

Both disposable accounts use the owner-scoped `DELETE /v1/account` saga after either has contacted a Calora API. That ensures the server carries out its storage-prefix verification, database cleanup, billing cleanup, Auth teardown, and deletion-tombstone logic. The runner requires HTTP 200, requires the same account token to be rejected by the media endpoint, and for the media-owning account requires the previously issued signed image locator to become unavailable. HTTP 202 is intentionally a non-terminal QA failure: it means deletion may continue server-side but does not prove the test fixture was erased during this run.

The only direct Supabase Admin deletion is a narrowly constrained fallback for an account known to have been created but never to have called a Calora API—for example, a normal sign-in failure. Once a Calora API call may have occurred, direct Auth deletion is prohibited and the owner-scoped deletion saga is mandatory.

## Failure and interrupted-run recovery

Before creating either account, the runner writes a `0600` temporary recovery envelope in the GitHub runner temporary directory. It contains only:

- the numeric GitHub QA run ID;
- internal Auth identifiers; and
- booleans recording whether an account may have called a Calora API.

It contains no service-role key, password, bearer token, email address, recipe payload, signed locator, image bytes, request ID, or customer data. The envelope is never printed, uploaded, or retained after terminal cleanup.

After a successful protected-invocation guard, the workflow always executes the recovery runner. If that guard fails—such as when the supplied expected commit differs from the immutable checked-out `GITHUB_SHA`—recovery, report enforcement, and artifact upload are skipped. No privileged QA step receives credentials in that case. When recovery has an envelope or an explicit `recovery_run_id` to process, it first requires the same exact live-release attestation as the normal lifecycle before it can clean an account. A no-work recovery returns `not_needed` without contacting production. If a normal run was interrupted but the runner workspace remains available, recovery reads this non-secret envelope. If a runner was lost or the file cannot be trusted, an authorized operator can dispatch a cleanup-only run using `recovery_run_id`; the runner reconstructs only its own deterministic QA account names, signs in normally, and sends any account that may have touched Calora through the account-deletion saga.

An Admin account-create request is recorded as potentially having occurred before it is sent. If its response is lost, malformed, or otherwise ambiguous, the runner keeps that non-secret recovery record and fails certification rather than assuming no identity was created. A later authorized recovery run first attempts normal sign-in. Only when that candidate has no Auth identifier and is known never to have called Calora does it issue one bounded Admin create for the exact deterministic alias, persist the returned identifier, and directly delete that exact pre-API identity. This reconciles a create request that never reached Auth without listing or searching users. A duplicate response, a failed second sign-in, an unavailable provider, a known identifier after a failed sign-in, or any possibility of Calora API use remains a failing, recoverable state; it is never treated as proof of absence.

When a network request throws before an HTTP response is available, sanitized QA evidence may include one fixed `transport` category: `timeout`, `redirect`, `connection`, or `unknown`. It never includes the original error name, message, URL, headers, credential, request body, response body, account identity, or provider diagnostic. A transport category does not prove that Auth accepted or rejected a request; it only distinguishes the safe next investigation path in a separately authorized recovery run.

Recovery attempts both identities independently. A cleanup failure remains `fail`, preserves the local envelope when present, and makes the GitHub workflow fail. A recovery run can return `pass` only after every applicable identity reaches its required terminal cleanup state; `not_needed` is accepted only when a normal run left no recovery work and no explicit recovery ID was requested. The workflow validates the recovery result before it accepts or uploads a primary QA report.

## Evidence and scope

Runner output is redirected to private temporary JSON files rather than streamed to logs. The workflow uploads only the sanitized primary and recovery JSON reports for 14 days. They contain status codes, latency, boolean assertions, terminal states, expected-release match, and fixed failure codes only. They intentionally contain no credentials, account IDs, signed URLs, image content, customer data, or response bodies.

A terminal account-deletion response plus media-token revocation and the media-owning preview’s unavailability are evidence that Calora’s server-side deletion saga completed its configured private-media cleanup. This does not independently prove erasure from external model-provider retention systems or uncontrolled device-local screenshots/downloads. Those scopes must not be represented as verified by this API workflow.

The image is never accepted or published. This workflow verifies delivery and access controls, not automated semantic image correctness. A qualified human reviewer is still required before any image could be accepted for display.
