---
name: Association provider evidence
description: Durable constraints for validating Apple and Google native association caches.
---

Apple’s association CDN returns the AASA document directly, while Google’s
Digital Asset Links `statements:list` endpoint wraps statements in a
`statements` array and nests Android identity under `target.androidApp`.

**Why:** The two providers expose different cache/checker response contracts;
treating the Google response like the app’s `assetlinks.json` array can report
a healthy direct file while missing stale or incomplete checker evidence.

**How to apply:** A release evidence command must query both provider URLs,
validate HTTP/JSON responses and the exact callback/package/certificate claims,
and avoid logging certificate values or full response bodies.