---
name: Referral rewards design
description: Rules for the invite/referral Pro-reward system and its RevenueCat wiring.
---

# Referral rewards

Rule: referral rewards ("1 referral = 1 week of Pro each") must be server-authoritative, idempotent per side, and always EXTEND entitlement end dates.

**Why:** Promo grants via RevenueCat v1 promotional entitlements replace end dates unless the server computes `max(now, current expiry) + days`. Double-grants and cap overruns were the main review findings.

**How to apply:**
- Grants go through the API server only (RevenueCat Replit connection proxy, `/v1/subscribers/.../promotional` with `end_time_ms`). Never grant client-side.
- Claim-first idempotency: atomically set the per-side `*_rewarded_at` timestamp (`WHERE ... IS NULL`) before calling the provider; release the claim on provider failure.
- Referrer monthly cap (4) is counted under a `SELECT ... FOR UPDATE` lock on the referrer's `calora_referral_codes` row.
- RevenueCat app_user_id = Supabase user id; client calls `Purchases.logIn(user.id)` and customer-info queries wait until identity sync settles.
- Activation is server-gated on a durable diary record with server-verified provenance: the first-log sync must cite a server-issued capture session (persisted at analyze time for authenticated callers) that belongs to the user, is unused, recent, and nutritionally consistent with the submitted entry. A fabricated payload alone can never create the qualifying record; manual logs and anonymous captures cannot qualify. Unqualified activations return status "pending" and the client retries next session.
- Public API keys are env-selected per platform; only the key for the current runtime is required (test key in dev/web preview).

**Qualification anchor:** referral qualification must key off the claimed capture session (`reviewed_at`, stamped only by the verified first-log flow), never off the mere existence of a diary row — plain diary POSTs are client-fabricatable and would let scripts farm rewards.
