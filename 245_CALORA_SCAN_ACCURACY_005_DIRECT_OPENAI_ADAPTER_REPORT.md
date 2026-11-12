# 245 â€” CAL-SCAN-ACCURACY-005 Direct OpenAI Adapter Report

**Branch:** `fix/scan-accuracy-002`
**Status:** Adapter prepared and locally validated; paid execution remains owner-blocked.

## Adapter result

The API server now exports the existing production `analyzeFoodPhoto` function for internal use. A separate `directVisionBenchmarkAdapter.ts` reads a benchmark image locally, base64-encodes it, invokes an injected analyzer, records latency, and preserves reference metadata. It performs no HTTP routing, bearer-token validation, rate limiting, database persistence, or capture-session writes.

The adapter deliberately delegates analysis to the production function rather than copying its prompt or normalization rules. Therefore it retains the production model ID (`gpt-5.6-terra`), prompt, 4,096 completion-token setting, JSON response format, 15-second provider deadline, parser, and nutrition/provenance normalization.

Local validation:

- Direct adapter tests: **2/2 passed**.
- Existing capture regression suite: **66/66 passed**.
- API TypeScript build: **passed**.
- OpenAI requests: **0**.
- Production services and databases: untouched.

## Official OpenAI compatibility

OpenAIâ€™s model page lists `gpt-5.6-terra` as accepting text and image input, returning text, and supporting `v1/chat/completions` and `v1/responses`. It also lists structured outputs as supported. The current Calora request shape is therefore compatible with the documented Chat Completions endpoint. [1]

OpenAI recommends Responses for reasoning models, while confirming Chat Completions remains supported. Switching to Responses is not part of this benchmark preparation because it would change the request path and make results less comparable with Caloraâ€™s current production implementation. [2]

The Calora managed gateway and direct OpenAI access are not automatically production-equivalent. Calora currently uses `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`, which may provide gateway-specific routing, quotas, logging, model aliases, or policy controls. Direct testing would use OpenAIâ€™s API endpoint and a project-scoped OpenAI key. Results must therefore be labeled **direct OpenAI benchmark**, not production-gateway accuracy, unless the configured base URL is explicitly the same service.

## Minimum owner action in OpenAI Platform

1. As an organization owner, create a dedicated project named, for example, `Calora scan benchmark`.
2. In that projectâ€™s Limits page, allow only `gpt-5.6-terra` if model-level controls are available.
3. Set the project monthly spend limit to **$8.00** and enable **Enforce a hard limit**. Add alerts at approximately $6.00 and $7.50. The $8 limit leaves headroom below the approved $10 ceiling because OpenAI states that enforcement and spend recording are not instantaneous and actual spend can slightly exceed the configured amount. [3]
4. Create one project-scoped secret key with an expiry date. Use restricted permissions where available and do not use an organization-wide or production key. OpenAI documents project-scoped keys, key permissions, and expiry controls. [4]
5. Supply the key securely as `AI_INTEGRATIONS_OPENAI_API_KEY` and set `AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1` only in the isolated benchmark process. Do not commit or paste the key.
6. Authorize the benchmark run separately. The first run will be a three-image smoke test, followed by the bounded 68-meal baseline. Stop if the provider returns a billing, quota, or project-limit error.

## Remaining owner action

Only the dedicated project, model access, hard spend limit, short-lived project key, and secure environment injection remain. No Docker, Supabase, Railway, database, production credential, or native build is required for the direct benchmark.

**Verdict:** Adapter preparation **PASS**. Real accuracy measurement remains **BLOCKED** until the owner supplies the isolated OpenAI project credential with the enforceable $8 hard limit.

## References

[1]: https://developers.openai.com/api/docs/models/gpt-5.6-terra "GPT-5.6 Terra model reference"
[2]: https://developers.openai.com/api/docs/guides/reasoning "OpenAI reasoning models guide"
[3]: https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform "Managing projects in the API platform"
[4]: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety "Best practices for API key safety"
