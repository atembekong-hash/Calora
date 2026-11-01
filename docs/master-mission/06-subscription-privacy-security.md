# 6. Subscription, Privacy, and Security

Membership, RevenueCat identity/entitlement logic, referrals, account deletion safeguards, rate-limit contracts, ownership checks, and privacy API contracts were preserved. No purchase, restore, deletion, or privacy request was submitted against a real production account.

The new Settings entry is non-destructive until the user explicitly submits a formal request. Backend validation, authentication, account-deletion fencing, and request history remain authoritative.
