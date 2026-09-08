---
name: Branded apex artifact routing
description: Routing rule for custom domains in projects containing both an API and Expo artifact.
---

When a custom domain must serve API-owned public pages, the API artifact must
own the `/` service path and the Expo artifact must use a separate path. A
custom domain attached to the project can otherwise serve the Expo landing
page at the apex even while API health and legal routes pass.

**Why:** Calora's first branded-domain verification passed all API paths but
the apex still served the Expo “Preview this app on your phone” page because
the mobile artifact owned `/`.

**How to apply:** Before declaring a multi-artifact branded domain complete,
inspect the live apex content, not only the health endpoint. Keep native
identifiers and native origins unchanged while assigning production web route
ownership through validated artifact configuration.