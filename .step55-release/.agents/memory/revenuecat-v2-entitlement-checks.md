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

The RevenueCat management connection can be authorized for v2 customer reads
while rejecting its customer-create operation. For a newly provisioned internal
QA account, establish the initial RevenueCat identity through Calora's existing
mobile-supported subscriber-resolution path, then return to v2 for the
server-authoritative empty-entitlement check.

**Why:** Customer creation through the management connector returned `403`,
while the normal mobile identity path created the isolated customer and v2 then
returned its empty entitlement and subscription records.

**How to apply:** Do not grant an entitlement or invent a customer record to
test a deny path. Use the normal client identity behavior for a designated QA
account, confirm v2 has no active entitlement, and make exactly one protected
request for the proof.