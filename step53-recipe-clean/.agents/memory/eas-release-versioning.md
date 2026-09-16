---
name: EAS release versioning
description: How Calora's EAS production auto-increment interacts with explicit native build numbers.
---

Calora's production EAS profile enables automatic version increments. EAS may update the local Expo config and build a number higher than the explicitly configured `versionCode`.

**Why:** A release requirement can name a precise Android build number while the production profile independently increments it, resulting in a queued artifact with an unintended version.

**How to apply:** Before queuing a production build, reconcile the requested final native version with the active EAS increment policy. Re-resolve Expo config afterward because the CLI may rewrite config formatting or version values locally.