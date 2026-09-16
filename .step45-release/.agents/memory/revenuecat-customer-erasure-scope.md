---
name: RevenueCat customer erasure scope
description: Operational boundary for deleting existing RevenueCat customer records during Calora account erasure.
---

An existing RevenueCat customer must never be treated as erased unless the provider deletion succeeds and a post-deletion lookup returns 404. Only a verified initial lookup returning 404 may be treated as no provider record.

**Why:** The available OAuth connection can read customers but does not offer the customer read/write permission required by RevenueCat’s v2 customer deletion endpoint. A dedicated project-restricted server credential was therefore established for erasure; a real disposable-customer run verified lookup, deletion, post-delete absence, and terminal saga completion.

**How to apply:** Keep the managed connector for ordinary billing operations and the dedicated server credential only in the API erasure adapter. Preserve exact customer-ID response validation, bounded requests, mandatory post-delete 404 verification, and retryable checkpoints for every unverified outcome.