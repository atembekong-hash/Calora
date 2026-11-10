# Mission 429 — RevenueCat Webhook and Entitlement Lifecycle Engineering

**Assessment date:** 2026-11-08
**Baseline:** protected `main` after Mission 428
**Scope:** authenticated RevenueCat webhook ingestion, replay safety, subscription lifecycle ordering, and disposable PostgreSQL evidence. No production provider state, database, deployment, customer data, native build, or store operation was touched.

## Verdict

**PASS for the bounded implementation and disposable rehearsal; CONDITIONAL for production certification.** The API now has a durable, HMAC-authenticated RevenueCat event ingress with idempotent event IDs, monotonic event application, cancellation/expiration semantics, and unknown-user dead-lettering. Production remains uncertified until the reviewed migration is applied, the production webhook secret and endpoint are configured, provider delivery is verified, and signed Android/iOS validation is completed under separate authorization.

## Implementation

- Added `artifacts/api-server/src/routes/revenuecatWebhook.ts`.
- Preserved exact raw JSON bytes before the global Express JSON parser and verified `X-RevenueCat-Webhook-Signature` using HMAC-SHA256, timestamp freshness, and timing-safe comparison. A configured exact authorization token remains an explicit fallback for environments that use RevenueCat's authorization-header mode; unsigned requests fail closed.
- Added event-id idempotency in `calora_revenuecat_webhook_events`. Duplicate deliveries are acknowledged without reapplying subscription state.
- Added `last_event_timestamp_ms` to subscriptions and guarded upserts so an older delivery cannot overwrite a newer lifecycle state.
- Mapped lifecycle semantics: purchase/renewal/uncancellation/extension to `active`, cancellation and billing issues to `cancelled` without prematurely revoking access, and expiration to `expired`.
- Unknown `app_user_id` values are retained in the ledger as `dead_letter` rather than creating an unowned subscription row. Malformed JSON, missing event IDs/types, stale signatures, and invalid signatures fail closed.
- Added the deliberately non-auto-applied migration artifact `artifacts/security/mission-429/migrations/0021_revenuecat_webhook_lifecycle.sql`. It creates the ledger, indexes, and subscription ordering column.

## Validation evidence

| Validation | Result |
|---|---:|
| RevenueCat webhook unit suite | **5/5 passed** |
| Disposable PostgreSQL real-handler rehearsal | **2/2 passed** |
| Complete API offline suite | **569 passed, 57 skipped across 62 files** |
| Mission 417 security contracts | **3/3 passed** |
| Database package TypeScript check | passed |
| API TypeScript check | passed |

The disposable rehearsal used the existing local PostgreSQL 16 database `calora_m422_rls_1794144980`, synthetic user `mission429-revenuecat-user`, a disposable admin connection, and a synthetic HMAC secret. It exercised initial purchase, cancellation, stale renewal suppression, duplicate cancellation delivery, expiration, and unknown-user dead-lettering. The provider was not contacted and no real credit or subscription was changed.

## Security and operational boundaries

The webhook route does not call RevenueCat while holding the database transaction. It records and applies the bounded local lifecycle update in one short transaction, then returns. The event ledger is durable and auditable, but a production migration and permissions review are required before deployment. The migration is not in the normal auto-applied migration directory by design.

The existing client-side and server-side entitlement enforcement paths still require a production reconciliation review: webhook state is evidence and lifecycle cache, while authoritative active access should continue to respect the configured provider verification contract. Cancellation is intentionally non-revoking until expiration, matching RevenueCat lifecycle semantics.

## Remaining production gates

1. Review and approve the migration and least-privilege database grants for the production runtime.
2. Configure the production RevenueCat webhook URL and signing/authorization secret through the protected secret mechanism; do not place secrets in source or logs.
3. Send a provider test event and verify a production-safe health/read-only evidence path without changing customer entitlements.
4. Run the full production deployment and serving-provenance checks under explicit authorization.
5. Complete signed Android and iOS candidate validation separately. This mission did not trigger or authorize native builds.

Overall CAL-15 and launch certification remain **CONDITIONAL / NOT FULLY CERTIFIED**. No production migration, deployment, provider mutation, customer-data query, native build, store submission, or live credit/subscription change was performed.
