---
name: Replit production state
description: How to interpret a registered but non-serving Replit production URL during restore work.
---

Treat a Replit deployment as unavailable when deployment metadata reports
`hasSuccessfulBuild: false`, even if `isDeployed` is true and a public
`primaryUrl` exists. The generated URL may return Replit’s generic “This app
isn't live yet” 404 instead of reaching the artifact.

**Why:** A historical Calora URL was registered and public but had no
successful current build; local API verification alone could not establish
production availability.

**How to apply:** Check deployment metadata first, then probe the
authoritative URL. Do not connect a custom domain or claim restoration until
the current build is successful and the required HTTPS route matrix reaches the
artifact.

Also compare the live `/api/version` commit and source tree with the exact
approved candidate before calling a production restore complete. A healthy API
can still be serving an older, internally valid release.

**Why:** The canonical Calora host returned healthy routes and a valid release
attestation while reporting a previous published commit rather than the pushed
release candidate.

**How to apply:** Treat health, legal, association, and CORS passes as
availability evidence only; require exact source-tree equality through the
public release verifier before release approval.