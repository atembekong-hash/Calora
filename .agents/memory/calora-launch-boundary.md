---
name: Calora launch boundary
description: Durable boundary between the local-first preview and native/production launch integrations.
---

Calora's first shippable milestone is intentionally local-first: diary, onboarding, saved meals, insights, themes, export/delete presentation, and an explicit offline outbox can work without pretending server or native integrations exist.

**Why:** Native billing, HealthKit/Health Connect, authenticated account sync, and production API handlers were not authorized or available during the initial build; faking them would undermine the product's trust positioning.

**How to apply:** Keep unavailable native capabilities in explicit permission-required, unavailable-store, or needs-connection states until their real providers and production routes are connected. Do not label local changes as synced or imply payment/entitlement.