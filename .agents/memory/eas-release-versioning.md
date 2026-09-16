---
name: EAS release versioning
description: How Calora's EAS production auto-increment interacts with explicit native build numbers.
---

Calora's production EAS profile enables automatic version increments. EAS may update the local Expo config and build a number higher than the explicitly configured native version, but `appVersionSource: local` can still queue a number below already-consumed EAS history unless the release flow reconciles it explicitly.

**Why:** A release requirement can name a precise native build number while the production profile independently increments only the local source value, resulting in a queued artifact with an unintended version and an unusable paid build.

**How to apply:** Before queuing a production build, compare App Store Connect and EAS history, use local version control with `autoIncrement: false` when an exact number is required, and fail closed unless the source number equals the live floor plus one. Re-resolve Expo config afterward because the CLI may rewrite local version values.