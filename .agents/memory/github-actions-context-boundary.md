---
name: GitHub Actions context boundary
description: GitHub Actions expression and provider-environment constraints for Calora’s mandatory CI.
---

At GitHub Actions job scope, use supported contexts such as `github.workspace`; the `runner` context is not available in job-level `env` and can reject the entire workflow before any job is created.

For tests that import a Replit-managed provider client, CI must provide deterministic test-only sentinels when the provider integration is not available in GitHub. Use a loopback endpoint and a placeholder key for OpenAI so test imports and local mocks work without external provider egress, plus explicit non-secret fixture values for stubbed object storage.

**Why:** The first remote workflow was rejected before scheduling because of `runner.temp` in job-level `env`; the next run reached the suite but built API startup and mocked recipe-photo tests failed because Replit-managed variables are not inherited by GitHub Actions.

**How to apply:** Validate workflow contexts before pushing. Keep provider sentinels loopback-only and scoped to the CI job; do not add real integration credentials to repository workflow configuration.