---
name: Referral rewards design
description: Rules for the invite/referral Pro-reward system and its RevenueCat wiring.
---

# Referral rewards

Rule: each completed referral grants 30 days of Pro to both people. Rewards are server-authoritative, idempotent per side, uncapped, and always EXTEND entitlement end dates.

**Why:** Promo grants via RevenueCat v1 promotional entitlements replace end dates unless the server computes `max(now, current expiry) + days`. Double-grants and provider retries remain the main integrity risks.

**How to apply:**
- Grants go through the API server only (RevenueCat Replit connection proxy, `/v1/subscribers/.../promotional` with `end_time_ms`). Never grant client-side.
- Claim-first idempotency: atomically set the per-side `*_rewarded_at` timestamp (`WHERE ... IS NULL`) before calling the provider; release the claim on provider failure.
- RevenueCat app_user_id = Supabase user id; client calls `Purchases.logIn(user.id)` and customer-info queries wait until identity sync settles.
- Activation is server-gated on a durable meal save anchored to a server-created qualifying capture session; plain manual diary rows and unanchored sync rows remain valid logs but cannot unlock rewards. Unqualified activations return status "pending" and the client retries next session.
- Public API keys are env-selected per platform; only the key for the current runtime is required (test key in dev/web preview).

**Qualification anchor:** referral qualification keys off a server-observed, allowlisted capture (food photo, barcode, or nutrition-label) that is persisted through the verified first-log or anchored sync path; client-submitted diary content alone is never enough.
