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
- Known boundary: "first approved food log" activation is client-signaled (diary is local-first, no server sync yet) — cannot be fully server-verified until diary sync ships.
- Public API keys are env-selected per platform; only the key for the current runtime is required (test key in dev/web preview).
