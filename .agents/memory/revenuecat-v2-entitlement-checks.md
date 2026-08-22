---
name: RevenueCat v2 entitlement checks
description: RevenueCat connector compatibility for server-side Premium authorization.
---

Server-side Premium authorization must resolve the configured entitlement lookup
key through RevenueCat v2, then compare that opaque entitlement ID with the
customer's v2 active-entitlement records. Treat any missing configuration or
provider failure as denied/unavailable, never as Premium access.

**Why:** A repaired Replit RevenueCat connection successfully authorized v2
project and customer reads while the legacy v1 subscriber endpoint still
returned an authorization failure for an active internal test customer.

**How to apply:** Keep entitlement-gated endpoints on the connector's supported
v2 project/customer API. Test both an active record and an empty active-record
response, and verify a real internal Premium account can reach the protected
route without an entitlement-verification failure.