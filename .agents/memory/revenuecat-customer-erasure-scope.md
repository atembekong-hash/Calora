---
name: RevenueCat customer erasure scope
description: Operational boundary for deleting existing RevenueCat customer records during Calora account erasure.
---

An existing RevenueCat customer must never be treated as erased unless the provider deletion succeeds. Only a verified customer lookup returning 404 may be treated as no provider record.

**Why:** The available OAuth connection can read customers but does not offer the customer read/write permission required by RevenueCat’s v2 customer deletion endpoint. Existing-customer deletion therefore returns an authorization error even though lookup succeeds.

**How to apply:** Keep account deletion checkpointed and retryable at the RevenueCat stage on authorization failure. Before declaring account erasure release-ready for customers with billing history, verify customer read/write permission or an approved equivalent provider-side erasure process.