---
name: Disposable provider failure rehearsal
description: Safe production rehearsal boundary for account-erasure provider retries.
---

Production account-erasure failure rehearsals must remain scoped to one
disposable provider customer. Use a bounded customer-specific verification
race, then remove that customer through the real provider path; never replace
or invalidate the global erasure credential.

**Why:** A global invalid credential would make every real account deletion
retry fail during the rehearsal. A disposable customer recreation can exercise
the same post-delete verification failure while leaving unrelated customers
and the production credential untouched.

**How to apply:** Confirm the deployed source identity first, use only a newly
created disposable Auth identity and provider customer, retain only aggregate
warning fields, remove the provider customer after one recovery warning, wait
for the next recovery cycle, and prove that no disposable checkpoint remains.
