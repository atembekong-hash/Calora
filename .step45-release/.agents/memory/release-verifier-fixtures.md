---
name: Release verifier fixtures
description: Synthetic public-release verifier fixtures must honor the shared attestation response contract.
---

Release verifier fixtures must provide the complete public attestation shape and a response URL on the requested origin when exercising the real verifier import.

**Why:** The shared attestation helper validates both the release identity fields and the response origin before the verifier can inspect the rest of the fixture.

**How to apply:** When copying the verifier into a temporary checkout, copy its relative attestation helper and make synthetic `/api/version` responses look like real same-origin fetch responses.