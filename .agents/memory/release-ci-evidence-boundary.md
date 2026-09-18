---
name: Release CI evidence boundary
description: How Calora's offline release-validation environment and source-attestation evidence should remain aligned.
---

Offline unit tests may use deterministic loopback or `.invalid` configuration sentinels only when their providers and database access are fully mocked. Production runtime configuration must continue to fail closed when its real requirements are absent.

**Why:** Import-time configuration validation otherwise prevents offline tests from reaching their intended mocks. Conversely, a release workflow must not require or upload a package-provenance artifact that the supported build intentionally does not emit.

**How to apply:** Keep test-only sentinels scoped to CI test steps, run database integration coverage in explicit fresh-schema jobs, and retain clean-source, release-attestation, and built deletion-fence checks as the release evidence boundary unless final-package provenance is explicitly implemented.