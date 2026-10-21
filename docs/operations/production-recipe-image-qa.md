# Production recipe-image QA procedure

`Production recipe-image QA` is a manually dispatched GitHub Actions workflow for one bounded, authenticated Create recipe-image lifecycle. It exists to verify the deployed production API without using a personal account or storing a reusable bearer token.

The workflow is intentionally not triggered by pull requests or ordinary pushes. It can run only from protected `main`, uses the dedicated `calora-production-recipe-image-qa` environment with owner approval, requires the exact expected deployed commit, and requires the literal confirmation `RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA`.

## Protected configuration

Configure these environment-scoped GitHub Actions secrets in `calora-production-recipe-image-qa`. They must not be committed, printed, or copied into chat.

- `CALORA_QA_API_BASE_URL`: `https://mycaloraapp.com/api`
- `CALORA_QA_SUPABASE_URL`: the Calora Supabase project URL
- `CALORA_QA_SUPABASE_ANON_KEY`: the matching public Supabase key
- `CALORA_QA_SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase Admin key, scoped to this protected workflow only
- `CALORA_QA_TEST_PASSWORD`: a random workflow-only password

The workflow creates one fresh confirmed Auth account with a random internal `qa.invalid` address, signs in normally to obtain a short-lived user token in memory, and never emits its account identity, password, token, signed review locator, request ID, recipe payload, or image bytes.

## Bounded lifecycle

The runner first verifies `/api/version` equals the exact protected-main workflow SHA. It creates two fresh disposable identities, confirms the media-owning account has an empty owner-scoped media list, requests one QA recipe photo, and verifies the result reaches `stored` plus `needs_review`. It verifies a private `no-store` review preview whose locator returns image content, requires an anonymous request to be denied, and requires the second account to receive an owner-isolation denial for that preview. It then rejects the image, verifies the resulting `stored` plus `rejected` terminal state without a normal image locator, and calls the owner-scoped account-deletion endpoint.

The workflow treats cleanup as successful only when account deletion returns HTTP 200 and the same token is then rejected by the media endpoint. It does not use a direct Admin deletion after attempting recipe-media generation. This preserves the server-side deletion saga’s storage-prefix verification, database cleanup, billing cleanup, and Auth teardown. A failed cleanup is a failure result that requires operational follow-up; the runner does not conceal it by deleting the Auth identity directly.

Before either account can reach the media request, the runner writes a permission-restricted temporary recovery envelope in the GitHub runner’s temporary directory. An `always()` recovery step reads it only if needed, invokes the owner-scoped deletion saga for any media-owning account, deletes a media-free account directly, and removes the envelope after terminal cleanup. The envelope is never logged, uploaded, or retained as an artifact.

The image is never accepted or published. The workflow only verifies image delivery as a private review artifact; it does not claim automated semantic confirmation that generated pixels accurately depict the recipe. The rejected state preserves the rule that a wrong image is worse than no image. A human review is still required before any image could be accepted for display.

## Evidence and scope

The workflow uploads a 14-day sanitized JSON artifact containing only status codes, latency, boolean assertions, terminal states, and the expected-release match. It intentionally contains no credentials, account IDs, signed URLs, image content, or customer data.

A terminal account-deletion response is evidence that Calora’s server-side deletion saga completed its configured owner-prefix cleanup. It does not independently prove deletion from external model-provider retention systems or from uncontrolled device-local screenshots and downloads. Those scopes must not be represented as verified by this API workflow.
