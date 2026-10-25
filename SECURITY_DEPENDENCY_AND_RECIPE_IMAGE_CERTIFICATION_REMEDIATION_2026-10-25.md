# Calora Security Dependency and Recipe-Image Certification Remediation

Date: 2026-10-25

## Scope

This remediation covers the reproducible `pnpm audit` findings, compatibility work required to move the workspace to patched dependency releases, and isolated database-backed recipe-image lifecycle verification. No production credentials, customer data, production database, production storage, or native/mobile build was accessed.

## Dependency audit findings and fixes

The initial workspace audit reproduced 13 advisories across 1,206 dependencies: 4 high, 7 moderate, and 2 low. The affected paths were:

- `artifacts__api-server>express>body-parser` at 2.3.0;
- `artifacts__calora>jsdom>undici` at 8.11.2;
- `artifacts__calora>@expo/cli>undici` at 6.28.1;
- `artifacts__calora>expo-build-properties>ajv>fast-uri` at 3.1.8;
- `artifacts__api-server>vitest>@vitest/mocker` at 4.1.11; and
- `artifacts__api-server>zod` at 3.25.76.

The remediation updates the workspace to Zod `^4.6.6`, Vitest `^4.1.12`, and Zod Validation Error `^5.0.0`; pins patched transitive releases `body-parser 2.4.0`, `undici 8.12.2` and `6.29.1`, and `fast-uri 3.1.9`; and refreshes `pnpm-lock.yaml`. The Zod Validation Error major update removes its Zod 3 peer mismatch.

The final command `pnpm audit --audit-level high` reports `No known vulnerabilities found` and the machine-readable audit reports zero info, low, moderate, high, and critical vulnerabilities.

## Compatibility fixes

Zod 4 changed the generated expression `zod.coerce.string().uuid()` so it no longer typechecks. The authoritative Orval configuration now targets Zod 4 (`lib/api-spec/orval.config.ts`), and the generated API schema is regenerated in Zod 4 syntax. This replaces the previous manual generated-file workaround and keeps future code generation reproducible.

The planner route normalizes Zod 3 and Zod 4 enum issue codes to the established safe client message, preserving the existing 400 response contract.

## Disposable PostgreSQL validation

A local PostgreSQL 16.15 service was installed in the sandbox only. A fresh database was created, bootstrapped with the reviewed empty-target baseline, migrated, and provisioned with support objects. The database was not connected to production.

The complete API PostgreSQL integration suite passed after building the local API artifact: 10 test files and 42 tests passed.

The first run’s only failure was the expected build precondition for the rolling-restart rehearsal; after building the artifact, the rerun passed fully.

## Automated validation

- API offline suite: 42 test files, 523 tests passed.
- Planner compatibility test: 12 tests passed.
- Mobile suite under Node 24.11.1 after final Orval regeneration: 165 test files, 1,822 tests passed.
- Scripts and governance suite: 127 tests passed; image-governance suite: 13 tests passed.
- Full workspace TypeScript validation under Node 24.11.1 after final Orval regeneration: passed for libraries, API server, mobile app, gateway, mockup sandbox, and scripts.
- Orval code generation plus generated-library typecheck: passed and is idempotent.
- API compatibility contract: 8 tests passed, including the Zod 4 pagination-schema form.
- Focused API build: passed.

Node 24.11.1 was used for the final workspace validation because patched `undici` 8.12.2 requires a supported Node 22/24 patch level; the sandbox’s system Node 22.13.0 is below that dependency’s declared minimum. This was treated as a local runtime mismatch, not suppressed.

## Isolated recipe-image lifecycle

The isolated staging harness ran against disposable PostgreSQL, process-local mock Auth, mock private storage, mock RevenueCat, and a local image provider. It generated no production image and used no production credentials.

Sanitized evidence:

- Run ID: `51d7dd37-e4ba-49a2-8cbd-1a85b1d3d48a`
- Accepted image SHA-256: `a515265d80ccbdef626c99a2a90b8fee2cf7275daf57572c04805e6221fabff9`
- Expected distinct reference SHA-256: `842441e457ecc72bdd2d6d08ec359ce83f386c6672698385d11e00029d9994af`
- Anonymous preview: 401
- Cross-account preview: 404
- Owner preview, review acceptance, delivery, and render acknowledgement: passed
- Deliberate salmon/lentil mismatch: human visual mismatch rejection passed
- Terminal cleanup: 0 recipe-media rows, 0 storage objects, owner Auth deleted, one terminal tombstone retained
- Final staging verdict: PASS in 4.3 seconds

The mismatch test is staging evidence only; no claim is made that it occurred against the real production provider.

## Protected-check diagnosis

The first PR 225 release-validation run failed because Orval regenerated the Zod output in Zod 3 mode while the workspace had been upgraded to Zod 4. The generator configuration is now corrected to Zod 4 mode. This was validated locally with the exact code-generation command used by CI; PR checks must be rerun after the follow-up commit.

## Authorization and deployment boundaries

No production recipe-image workflow was dispatched as part of this remediation. No historical QA recovery was attempted. No native build was triggered. The source changes are prepared on a protected feature branch for normal CI, review, squash merge, and then the ordinary validated API deployment path.

## Verdict

**PASS for dependency remediation, local PostgreSQL integration, workspace compatibility, and isolated recipe-image lifecycle staging.**

Production live-provider verification remains a separate authorization-controlled operation and is not certified by this report.
